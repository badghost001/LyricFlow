use crate::models::SpotifyPlaybackState;
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;
use std::sync::OnceLock;

static SHARED_HTTP_CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

fn get_shared_client() -> &'static reqwest::Client {
    SHARED_HTTP_CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(6))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new())
    })
}

#[tauri::command]
pub fn get_local_playback() -> Result<Option<SpotifyPlaybackState>, String> {
    if let Some(cached) = crate::media::get_cached_playback_state() {
        return Ok(Some(cached));
    }
    let backend = crate::media::get_platform_backend();
    let playback = backend.poll_playback().and_then(|meta| meta.to_spotify_playback_state());
    if let Some(ref state) = playback {
        crate::media::set_cached_playback_state(state.clone());
    }
    Ok(playback)
}

#[tauri::command]
pub fn trigger_playback_control(action: String, position_ms: Option<u64>) -> Result<(), String> {
    let backend = crate::media::get_platform_backend();
    backend.trigger_control(&action, position_ms.unwrap_or(0));
    Ok(())
}

#[tauri::command]
pub fn show_now_playing_notification(app: AppHandle, track: serde_json::Value) -> Result<(), String> {
    tauri::async_runtime::spawn(async move {
        let title = track["name"].as_str().or_else(|| track["title"].as_str()).unwrap_or("Now Playing").to_string();
        let artist = track["artists"][0]["name"].as_str().or_else(|| track["artist"].as_str()).unwrap_or("Unknown Artist").to_string();

        let _ = app.notification()
            .builder()
            .title(&title)
            .body(format!("Playing - {artist}"))
            .show();
    });

    Ok(())
}

#[tauri::command]
pub async fn open_external(url: String) -> Result<(), String> {
    if !url.starts_with("http://") && !url.starts_with("https://") && !url.starts_with("spotify:") {
        return Err("Invalid URL scheme".to_string());
    }

    open::that(&url).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn lastfm_api(data: serde_json::Value) -> Result<serde_json::Value, String> {
    let method = data["method"].as_str().unwrap_or("");
    let api_key = data["apiKey"].as_str().unwrap_or("");
    let api_secret = data["apiSecret"].as_str().unwrap_or("");
    let session_key = data["sessionKey"].as_str().unwrap_or("");

    crate::log_to_file(&format!("[Last.fm API] Calling method='{}'", method));

    if api_key.is_empty() {
        return Err("Missing Last.fm API key".to_string());
    }

    let auth_required = matches!(
        method,
        "auth.getSession" | "track.updateNowPlaying" | "track.scrobble" | "track.love" | "track.unlove"
    );

    let mut params: Vec<(String, String)> = vec![
        ("method".to_string(), method.to_string()),
        ("api_key".to_string(), api_key.to_string()),
    ];

    if !session_key.is_empty() {
        params.push(("sk".to_string(), session_key.to_string()));
    }

    if let Some(obj) = data["params"].as_object() {
        for (k, v) in obj {
            if let Some(s) = v.as_str() {
                params.push((k.clone(), s.to_string()));
            } else if let Some(n) = v.as_i64() {
                params.push((k.clone(), n.to_string()));
            } else if let Some(n) = v.as_u64() {
                params.push((k.clone(), n.to_string()));
            } else if let Some(b) = v.as_bool() {
                params.push((k.clone(), b.to_string()));
            }
        }
    }

    if auth_required && !api_secret.is_empty() {
        // Sort params alphabetically for Last.fm MD5 signature (excluding format and api_sig)
        params.sort_by(|a, b| a.0.cmp(&b.0));

        let mut sig_base = String::new();
        for (k, v) in &params {
            sig_base.push_str(k);
            sig_base.push_str(v);
        }
        sig_base.push_str(api_secret);

        let api_sig = format!("{:x}", md5::compute(sig_base.as_bytes()));
        params.push(("api_sig".to_string(), api_sig));
    }

    params.push(("format".to_string(), "json".to_string()));

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) LyricFlow/1.3.0")
        .build()
        .map_err(|e| e.to_string())?;

    let res = if auth_required {
        client
            .post("https://ws.audioscrobbler.com/2.0/")
            .form(&params)
            .send()
            .await
            .map_err(|e| e.to_string())?
    } else {
        client
            .get("https://ws.audioscrobbler.com/2.0/")
            .query(&params)
            .send()
            .await
            .map_err(|e| e.to_string())?
    };

    let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    crate::log_to_file(&format!("[Last.fm API] Result for method='{}': {:?}", method, json));
    Ok(json)
}

#[tauri::command]
pub async fn translate_text(text: String, target_lang: String, skip_lang: Option<String>) -> Result<serde_json::Value, String> {
    let client = get_shared_client();
    let url = format!("https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl={target_lang}&dt=t");
    let res = client.post(&url)
        .header("Content-Type", "application/x-www-form-urlencoded")
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
        .form(&[("q", &text)])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Ok(serde_json::json!({ "text": null, "src": "error" }));
    }

    let data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let mut full_translation = String::new();
    if let Some(arr) = data[0].as_array() {
        for item in arr {
            if let Some(s) = item[0].as_str() {
                full_translation.push_str(s);
            }
        }
    }
    let src_lang = data[2].as_str().unwrap_or("unknown");

    if src_lang.eq_ignore_ascii_case(&target_lang) ||
       skip_lang.as_deref().map_or(false, |sl| sl != "none" && src_lang.eq_ignore_ascii_case(sl)) {
        return Ok(serde_json::json!({ "text": null, "src": src_lang }));
    }

    Ok(serde_json::json!({ "text": full_translation, "src": src_lang }))
}

#[tauri::command]
pub async fn fetch_music_news(query: String) -> Result<String, String> {
    let client = get_shared_client();
    let encoded_query = query.replace(' ', "+");
    let url = format!("https://news.google.com/rss/search?q={encoded_query}");
    let res = client.get(&url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .header("Accept", "application/rss+xml, application/xml, text/xml, */*")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let text = res.text().await.map_err(|e| e.to_string())?;
    Ok(text)
}

#[tauri::command]
pub async fn get_access_token(sp_dc: String) -> Result<Option<String>, String> {
    crate::log_to_file(&format!("[Spotify Auth] Fetching access token with sp_dc length={}", sp_dc.len()));
    let client = get_shared_client();
    let res = client.get("https://open.spotify.com/get_access_token?reason=transport&productType=web_player")
        .header("Cookie", format!("sp_dc={sp_dc}"))
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36")
        .header("Accept", "application/json")
        .header("App-Platform", "WebPlayer")
        .header("Referer", "https://open.spotify.com/")
        .send()
        .await
        .map_err(|e| {
            crate::log_to_file(&format!("[Spotify Auth] Request error: {e}"));
            e.to_string()
        })?;

    let status = res.status();
    crate::log_to_file(&format!("[Spotify Auth] get_access_token HTTP status: {status}"));

    if status.is_success() {
        let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
        if let Some(tok) = json["accessToken"].as_str() {
            crate::log_to_file("[Spotify Auth] Successfully extracted accessToken!");
            return Ok(Some(tok.to_string()));
        } else {
            crate::log_to_file(&format!("[Spotify Auth] 'accessToken' not found in response: {json:?}"));
        }
    } else {
        let err_body = res.text().await.unwrap_or_default();
        crate::log_to_file(&format!("[Spotify Auth] Error response body: {err_body}"));
    }
    Ok(None)
}

#[tauri::command]
pub async fn refresh_token() -> Result<Option<String>, String> {
    let config = crate::commands::config::load_config().map_err(|e| e.to_string())?;
    let Some(mut cfg) = config else { return Ok(None); };

    let refresh_token = cfg["refresh_token"]
        .as_str()
        .or_else(|| cfg["refreshToken"].as_str())
        .unwrap_or("")
        .to_string();
    let client_id = cfg["client_id"]
        .as_str()
        .or_else(|| cfg["clientId"].as_str())
        .unwrap_or("")
        .to_string();

    if refresh_token.is_empty() || client_id.is_empty() {
        return Ok(None);
    }

    let client = get_shared_client();
    let res = client.post("https://accounts.spotify.com/api/token")
        .form(&[
            ("grant_type", "refresh_token"),
            ("refresh_token", refresh_token.as_str()),
            ("client_id", client_id.as_str()),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if res.status().is_success() {
        let token_data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
        if let Some(access_token) = token_data["access_token"].as_str() {
            cfg["access_token"] = serde_json::json!(access_token);
            if let Some(new_refresh) = token_data["refresh_token"].as_str() {
                cfg["refresh_token"] = serde_json::json!(new_refresh);
            }
            if let Some(expires_in) = token_data["expires_in"].as_i64() {
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_secs() as i64)
                    .unwrap_or(0);
                cfg["expires_at"] = serde_json::json!(now + expires_in);
            }
            let _ = crate::commands::config::save_config(cfg);
            return Ok(Some(access_token.to_string()));
        }
    }
    Ok(None)
}

#[tauri::command]
pub async fn start_oauth_server(client_id: String, code_verifier: String, _code_challenge: Option<String>) -> Result<serde_json::Value, String> {
    use tokio::net::TcpListener;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    let listener = TcpListener::bind("127.0.0.1:4882").await.map_err(|e| e.to_string())?;
    let (mut stream, _) = match tokio::time::timeout(std::time::Duration::from_secs(180), listener.accept()).await {
        Ok(res) => res.map_err(|e| e.to_string())?,
        Err(_) => return Err("OAuth server timed out waiting for browser callback (180s)".to_string()),
    };

    let mut buf = [0u8; 4096];
    let n = stream.read(&mut buf).await.map_err(|e| e.to_string())?;
    let req = String::from_utf8_lossy(&buf[..n]);

    let first_line = req.lines().next().unwrap_or("");
    let code = if let Some(idx) = first_line.find("code=") {
        let after = &first_line[idx + 5..];
        let end = after.find('&').or_else(|| after.find(' ')).unwrap_or(after.len());
        after[..end].to_string()
    } else {
        let err_response = "HTTP/1.1 400 Bad Request\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\nMissing authorization code";
        let _ = stream.write_all(err_response.as_bytes()).await;
        return Err("Missing authorization code".to_string());
    };

    let client = get_shared_client();
    let res = client.post("https://accounts.spotify.com/api/token")
        .form(&[
            ("client_id", client_id.as_str()),
            ("grant_type", "authorization_code"),
            ("code", code.as_str()),
            ("redirect_uri", "http://127.0.0.1:4882/callback"),
            ("code_verifier", code_verifier.as_str()),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let err_txt = res.text().await.unwrap_or_default();
        let safe_err = err_txt
            .replace('&', "&amp;")
            .replace('<', "&lt;")
            .replace('>', "&gt;")
            .replace('"', "&quot;");
        let html_err = format!("HTTP/1.1 500 Internal Server Error\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\n\r\n<html><body style=\"font-family: sans-serif; background: #121212; color: #ff5555; text-align: center; padding-top: 50px;\"><h1>Connection Failed</h1><p>{safe_err}</p></body></html>");
        let _ = stream.write_all(html_err.as_bytes()).await;
        return Err(err_txt);
    }

    let token_data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let access_token = token_data["access_token"].as_str().unwrap_or("").to_string();
    let refresh_token = token_data["refresh_token"].as_str().unwrap_or("").to_string();
    let expires_in = token_data["expires_in"].as_i64().unwrap_or(3600);
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0);

    let config = serde_json::json!({
        "client_id": client_id,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_at": now + expires_in
    });

    let _ = crate::commands::config::save_config(config.clone());

    let success_html = "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\n\r\n<html><body style=\"font-family: sans-serif; background: #121212; color: #1db954; text-align: center; padding-top: 50px;\"><h1>Connection Successful!</h1><p style=\"color: #b3b3b3;\">You can now close this tab and return to LyricFlow.</p></body></html>";
    let _ = stream.write_all(success_html.as_bytes()).await;

    Ok(config)
}

#[tauri::command]
pub async fn login_via_web(app: AppHandle) -> Result<serde_json::Value, String> {
    use tauri::Manager;

    crate::log_to_file("[Spotify Login] login_via_web called");

    if let Some(existing) = app.get_webview_window("spotify-login") {
        crate::log_to_file("[Spotify Login] Closing existing spotify-login window");
        let _ = existing.close();
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
    }

    let login_url = "https://accounts.spotify.com/en/login?continue=https%3A%2F%2Fopen.spotify.com%2F";
    let chrome_ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";

    let login_win = tauri::WebviewWindowBuilder::new(
        &app,
        "spotify-login",
        tauri::WebviewUrl::External(login_url.parse().map_err(|e| format!("{e}"))?),
    )
    .title("Login to Spotify")
    .inner_size(500.0, 720.0)
    .center()
    .user_agent(chrome_ua)
    .build()
    .map_err(|e| {
        crate::log_to_file(&format!("[Spotify Login] Failed to create window: {e}"));
        e.to_string()
    })?;

    let _ = login_win.show();
    let _ = login_win.set_focus();
    crate::log_to_file("[Spotify Login] Login window created and shown successfully");

    let found_sp_dc = std::sync::Arc::new(std::sync::Mutex::new(None::<String>));

    #[cfg(target_os = "windows")]
    {
        use windows::core::Interface;
        use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2_2;
        use webview2_com::GetCookiesCompletedHandler;

        for step in 0..500 {
            tokio::time::sleep(std::time::Duration::from_millis(600)).await;

            let Some(win) = app.get_webview_window("spotify-login") else {
                crate::log_to_file(&format!("[Spotify Login] Window closed at poll step {step}"));
                break;
            };

            if found_sp_dc.lock().unwrap().is_some() {
                crate::log_to_file("[Spotify Login] sp_dc already acquired, exiting poll loop");
                break;
            }

            let sp_dc_clone = found_sp_dc.clone();
            let _ = win.with_webview(move |webview| {
                unsafe {
                    if let Ok(core) = webview.controller().CoreWebView2() {
                        if let Ok(core2) = core.cast::<ICoreWebView2_2>() {
                            if let Ok(cookie_mgr) = core2.CookieManager() {
                                // 1. Global: empty string matches ALL cookies across ALL sites/domains in WebView2
                                let sp_dc_1 = sp_dc_clone.clone();
                                let handler_all = GetCookiesCompletedHandler::create(Box::new(move |_hr, list| {
                                    if let Some(cookie_list) = list {
                                        let mut count = 0u32;
                                        if cookie_list.Count(&mut count).is_ok() && count > 0 {
                                            for i in 0..count {
                                                if let Ok(cookie) = cookie_list.GetValueAtIndex(i) {
                                                    let mut name_ptr = windows::core::PWSTR::null();
                                                    let mut val_ptr = windows::core::PWSTR::null();
                                                    if cookie.Name(&mut name_ptr).is_ok() && cookie.Value(&mut val_ptr).is_ok() {
                                                        let name = name_ptr.to_string().unwrap_or_default();
                                                        let val = val_ptr.to_string().unwrap_or_default();
                                                        windows::Win32::System::Com::CoTaskMemFree(Some(name_ptr.0 as *const _));
                                                        windows::Win32::System::Com::CoTaskMemFree(Some(val_ptr.0 as *const _));

                                                        if name == "sp_dc" && !val.is_empty() {
                                                            let mut lock = sp_dc_1.lock().unwrap();
                                                            if lock.is_none() {
                                                                crate::log_to_file("[Spotify Login] Captured sp_dc from global cookie manager!");
                                                                *lock = Some(val);
                                                            }
                                                            break;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    Ok(())
                                }));
                                let _ = cookie_mgr.GetCookies(windows::core::w!(""), &handler_all);

                                // 2. open.spotify.com specifically
                                let sp_dc_2 = sp_dc_clone.clone();
                                let handler_open = GetCookiesCompletedHandler::create(Box::new(move |_hr, list| {
                                    if let Some(cookie_list) = list {
                                        let mut count = 0u32;
                                        if cookie_list.Count(&mut count).is_ok() && count > 0 {
                                            for i in 0..count {
                                                if let Ok(cookie) = cookie_list.GetValueAtIndex(i) {
                                                    let mut name_ptr = windows::core::PWSTR::null();
                                                    let mut val_ptr = windows::core::PWSTR::null();
                                                    if cookie.Name(&mut name_ptr).is_ok() && cookie.Value(&mut val_ptr).is_ok() {
                                                        let name = name_ptr.to_string().unwrap_or_default();
                                                        let val = val_ptr.to_string().unwrap_or_default();
                                                        windows::Win32::System::Com::CoTaskMemFree(Some(name_ptr.0 as *const _));
                                                        windows::Win32::System::Com::CoTaskMemFree(Some(val_ptr.0 as *const _));

                                                        if name == "sp_dc" && !val.is_empty() {
                                                            let mut lock = sp_dc_2.lock().unwrap();
                                                            if lock.is_none() {
                                                                crate::log_to_file("[Spotify Login] Captured sp_dc from open.spotify.com!");
                                                                *lock = Some(val);
                                                            }
                                                            break;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    Ok(())
                                }));
                                let _ = cookie_mgr.GetCookies(windows::core::w!("https://open.spotify.com"), &handler_open);

                                // 3. accounts.spotify.com specifically
                                let sp_dc_3 = sp_dc_clone.clone();
                                let handler_acc = GetCookiesCompletedHandler::create(Box::new(move |_hr, list| {
                                    if let Some(cookie_list) = list {
                                        let mut count = 0u32;
                                        if cookie_list.Count(&mut count).is_ok() && count > 0 {
                                            for i in 0..count {
                                                if let Ok(cookie) = cookie_list.GetValueAtIndex(i) {
                                                    let mut name_ptr = windows::core::PWSTR::null();
                                                    let mut val_ptr = windows::core::PWSTR::null();
                                                    if cookie.Name(&mut name_ptr).is_ok() && cookie.Value(&mut val_ptr).is_ok() {
                                                        let name = name_ptr.to_string().unwrap_or_default();
                                                        let val = val_ptr.to_string().unwrap_or_default();
                                                        windows::Win32::System::Com::CoTaskMemFree(Some(name_ptr.0 as *const _));
                                                        windows::Win32::System::Com::CoTaskMemFree(Some(val_ptr.0 as *const _));

                                                        if name == "sp_dc" && !val.is_empty() {
                                                            let mut lock = sp_dc_3.lock().unwrap();
                                                            if lock.is_none() {
                                                                crate::log_to_file("[Spotify Login] Captured sp_dc from accounts.spotify.com!");
                                                                *lock = Some(val);
                                                            }
                                                            break;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    Ok(())
                                }));
                                let _ = cookie_mgr.GetCookies(windows::core::w!("https://accounts.spotify.com"), &handler_acc);
                            }
                        }
                    }
                }
            });
        }
    }

    let captured = found_sp_dc.lock().unwrap().clone();
    if let Some(sp_dc_val) = captured {
        crate::log_to_file(&format!("[Spotify Login] Successfully acquired sp_dc (len={}), closing login window", sp_dc_val.len()));
        if let Some(win) = app.get_webview_window("spotify-login") {
            let _ = win.close();
        }

        let config = serde_json::json!({
            "sp_dc": sp_dc_val,
            "localMode": false,
            "success": true
        });

        let _ = crate::commands::config::save_config(config.clone());
        return Ok(config);
    }

    crate::log_to_file("[Spotify Login] No sp_dc captured; returning null");
    Ok(serde_json::Value::Null)
}

#[tauri::command]
pub async fn fetch_image_data_url(url: String) -> Result<String, String> {
    if url.starts_with("data:image/") {
        return Ok(url);
    }

    // SSRF & protocol validation
    let parsed = reqwest::Url::parse(&url).map_err(|e| format!("Invalid URL: {e}"))?;
    let scheme = parsed.scheme();
    if scheme != "https" && scheme != "http" {
        return Err("Only HTTP and HTTPS URLs are allowed".to_string());
    }

    if let Some(host_str) = parsed.host_str() {
        let host_lower = host_str.to_lowercase();
        // Prohibit localhost and common link-local / loopback hostnames
        if host_lower == "localhost"
            || host_lower == "127.0.0.1"
            || host_lower == "0.0.0.0"
            || host_lower == "::1"
            || host_lower == "[::1]"
            || host_lower.ends_with(".localhost")
            || host_lower.ends_with(".local")
        {
            return Err("Access to loopback/local address is forbidden".to_string());
        }
        // Check IP address restrictions
        if let Ok(ip) = host_str.parse::<std::net::IpAddr>() {
            if ip.is_loopback() || ip.is_unspecified() {
                return Err("Access to loopback or unspecified IP is forbidden".to_string());
            }
            if let std::net::IpAddr::V4(ipv4) = ip {
                let octets = ipv4.octets();
                // 169.254.0.0/16 link-local (cloud metadata)
                if octets[0] == 169 && octets[1] == 254 {
                    return Err("Access to link-local metadata address is forbidden".to_string());
                }
                // 127.0.0.0/8 loopback
                if octets[0] == 127 {
                    return Err("Access to loopback address is forbidden".to_string());
                }
            }
        }
    } else {
        return Err("URL missing host".to_string());
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| e.to_string())?;

    let res = client.get(parsed).send().await.map_err(|e| e.to_string())?;

    // Reject non-image content-type to avoid leaking non-image data
    let content_type = res
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/jpeg")
        .to_string();

    if !content_type.to_lowercase().starts_with("image/") && !content_type.to_lowercase().contains("octet-stream") {
        return Err("Target URL did not return an image content-type".to_string());
    }

    // Limit maximum image download size to 10 MB to prevent memory exhaustion DoS
    if let Some(len) = res.content_length() {
        if len > 10 * 1024 * 1024 {
            return Err("Image exceeds maximum allowed size (10 MB)".to_string());
        }
    }

    let bytes = res.bytes().await.map_err(|e| e.to_string())?;
    if bytes.len() > 10 * 1024 * 1024 {
        return Err("Image exceeds maximum allowed size (10 MB)".to_string());
    }

    let b64 = crate::models::base64_encode(&bytes);
    Ok(format!("data:{};base64,{}", content_type, b64))
}

#[tauri::command]
pub async fn fetch_track_artwork(track: String, artist: String) -> Result<Option<String>, String> {
    let clean_t = crate::commands::lyrics::fuzzy::clean_title(&track);
    let clean_a = crate::commands::lyrics::fuzzy::clean_artist(&artist);
    if clean_t.is_empty() {
        return Ok(None);
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(1800))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());

    let itunes_term = format!("{} {}", clean_t, clean_a);
    let itunes_url = format!(
        "https://itunes.apple.com/search?term={}&limit=1&entity=song",
        urlencoding::encode(&itunes_term)
    );
    let deezer_url = format!(
        "https://api.deezer.com/search?q={}&limit=1",
        urlencoding::encode(&itunes_term)
    );

    let client1 = client.clone();
    let itunes_task = async move {
        if let Ok(res) = client1.get(&itunes_url).send().await {
            if res.status().is_success() {
                if let Ok(json) = res.json::<serde_json::Value>().await {
                    if let Some(results) = json["results"].as_array() {
                        if let Some(first) = results.first() {
                            if let Some(raw_art) = first["artworkUrl100"].as_str().or_else(|| first["artworkUrl60"].as_str()) {
                                return Some(raw_art
                                    .replace("100x100bb.jpg", "600x600bb.jpg")
                                    .replace("60x60bb.jpg", "600x600bb.jpg"));
                            }
                        }
                    }
                }
            }
        }
        None
    };

    let client2 = client.clone();
    let deezer_task = async move {
        if let Ok(res) = client2.get(&deezer_url).send().await {
            if res.status().is_success() {
                if let Ok(json) = res.json::<serde_json::Value>().await {
                    if let Some(data) = json["data"].as_array() {
                        if let Some(first) = data.first() {
                            let album = &first["album"];
                            if let Some(cover) = album["cover_xl"].as_str()
                                .or_else(|| album["cover_big"].as_str())
                                .or_else(|| album["cover_medium"].as_str())
                            {
                                return Some(cover.to_string());
                            }
                        }
                    }
                }
            }
        }
        None
    };

    let (itunes_res, deezer_res) = tokio::join!(itunes_task, deezer_task);

    if let Some(art) = itunes_res {
        return Ok(Some(art));
    }
    if let Some(art) = deezer_res {
        return Ok(Some(art));
    }

    // Fallback: Query iTunes with just track name if combined search failed
    let track_only_url = format!(
        "https://itunes.apple.com/search?term={}&limit=1&entity=song",
        urlencoding::encode(&clean_t)
    );
    if let Ok(res) = client.get(&track_only_url).send().await {
        if res.status().is_success() {
            if let Ok(json) = res.json::<serde_json::Value>().await {
                if let Some(results) = json["results"].as_array() {
                    if let Some(first) = results.first() {
                        if let Some(raw_art) = first["artworkUrl100"].as_str() {
                            let high_res = raw_art.replace("100x100bb.jpg", "600x600bb.jpg");
                            return Ok(Some(high_res));
                        }
                    }
                }
            }
        }
    }

    Ok(None)
}

#[tauri::command]
pub async fn fetch_spotify_canvas(track_id: String, token: Option<String>) -> Result<Option<String>, String> {
    let clean_id = if track_id.starts_with("spotify:track:") {
        track_id.trim_start_matches("spotify:track:").to_string()
    } else {
        track_id.trim().to_string()
    };

    if clean_id.is_empty() {
        return Ok(None);
    }

    let auth_token = token.or_else(|| {
        let cfg = crate::commands::config::load_config().ok()??;
        cfg["access_token"].as_str().map(|s| s.to_string())
    });

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    if let Some(tok) = auth_token {
        if !tok.is_empty() {
            let uri = format!("spotify:track:{}", clean_id);
            let payload = serde_json::json!({
                "operationName": "getCanvas",
                "variables": { "uri": uri },
                "extensions": {
                    "persistedQuery": {
                        "version": 1,
                        "sha256Hash": "2e964070a7522d480ee2e6ff70ff081ee8a3e758787f65a1e2f9d8540b6e9a66"
                    }
                }
            });

            if let Ok(res) = client
                .post("https://api-partner.spotify.com/pathfinder/v1/query")
                .header("Authorization", format!("Bearer {}", tok))
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                .header("Content-Type", "application/json")
                .json(&payload)
                .send()
                .await
            {
                if res.status().is_success() {
                    if let Ok(json) = res.json::<serde_json::Value>().await {
                        if let Some(canvas_url) = json["data"]["trackUnion"]["canvas"]["url"].as_str() {
                            if !canvas_url.is_empty() {
                                crate::log_to_file(&format!("[Canvas] Found Spotify Canvas MP4 for track_id={}", clean_id));
                                return Ok(Some(canvas_url.to_string()));
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(None)
}

#[tauri::command]
pub async fn search_music_gif(track_name: String, artist_name: String) -> Result<Option<String>, String> {
    let clean_artist = artist_name
        .replace(" - Topic", "")
        .replace("- Topic", "")
        .replace("feat.", "")
        .replace("ft.", "")
        .trim()
        .to_string();

    let clean_track = track_name
        .split('(').next().unwrap_or(&track_name)
        .split('[').next().unwrap_or(&track_name)
        .split('-').next().unwrap_or(&track_name)
        .trim()
        .to_string();

    if clean_artist.is_empty() && clean_track.is_empty() {
        return Ok(None);
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    // Strategy 1: Artist + Track + "aesthetic"
    let q1 = format!("{} {} aesthetic", clean_artist, clean_track);
    let url1 = format!(
        "https://api.giphy.com/v1/gifs/search?api_key=Gc7131jiJuvI7IdN0HZ1D7nh0ow5BU6g&q={}&limit=3&rating=pg",
        urlencoding::encode(&q1)
    );

    if let Ok(res) = client.get(&url1).send().await {
        if res.status().is_success() {
            if let Ok(json) = res.json::<serde_json::Value>().await {
                if let Some(data) = json["data"].as_array() {
                    if let Some(first) = data.first() {
                        if let Some(gif_url) = first["images"]["original"]["url"].as_str() {
                            crate::log_to_file(&format!("[GIF Search] Found GIF for q='{}': {}", q1, gif_url));
                            return Ok(Some(gif_url.to_string()));
                        }
                    }
                }
            }
        }
    }

    // Strategy 2: Artist only
    if !clean_artist.is_empty() {
        let q2 = clean_artist.clone();
        let url2 = format!(
            "https://api.giphy.com/v1/gifs/search?api_key=Gc7131jiJuvI7IdN0HZ1D7nh0ow5BU6g&q={}&limit=3&rating=pg",
            urlencoding::encode(&q2)
        );
        if let Ok(res) = client.get(&url2).send().await {
            if res.status().is_success() {
                if let Ok(json) = res.json::<serde_json::Value>().await {
                    if let Some(data) = json["data"].as_array() {
                        if let Some(first) = data.first() {
                            if let Some(gif_url) = first["images"]["original"]["url"].as_str() {
                                crate::log_to_file(&format!("[GIF Search] Found artist GIF for q='{}': {}", q2, gif_url));
                                return Ok(Some(gif_url.to_string()));
                            }
                        }
                    }
                }
            }
        }
    }

    // Strategy 3: Lo-fi music aesthetic loop fallback
    let q3 = "lofi anime aesthetic music loop";
    let url3 = format!(
        "https://api.giphy.com/v1/gifs/search?api_key=Gc7131jiJuvI7IdN0HZ1D7nh0ow5BU6g&q={}&limit=3&rating=g",
        urlencoding::encode(q3)
    );
    if let Ok(res) = client.get(&url3).send().await {
        if res.status().is_success() {
            if let Ok(json) = res.json::<serde_json::Value>().await {
                if let Some(data) = json["data"].as_array() {
                    if let Some(first) = data.first() {
                        if let Some(gif_url) = first["images"]["original"]["url"].as_str() {
                            return Ok(Some(gif_url.to_string()));
                        }
                    }
                }
            }
        }
    }

    Ok(None)
}


