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
    // Fast-path: read instantaneous atomic in-memory cache populated by dedicated SMTC background thread
    // This eliminates blocking WinRT COM calls on Tauri IPC worker threads and guarantees <1µs latency with zero thread deadlock.
    Ok(crate::media::get_cached_playback_state())
}

#[tauri::command]
pub fn trigger_playback_control(action: String, position_ms: Option<u64>) -> Result<(), String> {
    let backend = crate::media::get_platform_backend();
    backend.trigger_control(&action, position_ms.unwrap_or(0));
    Ok(())
}

#[tauri::command]
pub fn get_music_app_volume() -> Result<Option<crate::models::MusicAppVolumeInfo>, String> {
    #[cfg(target_os = "windows")]
    {
        crate::media::windows_smtc::get_music_app_volume_info()
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(None)
    }
}

#[tauri::command]
pub fn adjust_music_app_volume(delta: Option<f32>, target: Option<f32>) -> Result<Option<crate::models::MusicAppVolumeInfo>, String> {
    #[cfg(target_os = "windows")]
    {
        if let Some(target_val) = target {
            crate::media::windows_smtc::set_music_app_volume(target_val)
        } else if let Some(delta_val) = delta {
            crate::media::windows_smtc::step_music_app_volume(delta_val)
        } else {
            crate::media::windows_smtc::get_music_app_volume_info()
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(None)
    }
}

#[tauri::command]
pub fn toggle_music_app_mute() -> Result<Option<crate::models::MusicAppVolumeInfo>, String> {
    #[cfg(target_os = "windows")]
    {
        crate::media::windows_smtc::toggle_music_app_mute()
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(None)
    }
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
    let trimmed = url.trim();
    if trimmed.is_empty() || trimmed.contains('\0') || trimmed.contains('\r') || trimmed.contains('\n') {
        return Err("Invalid URL".to_string());
    }

    if trimmed.starts_with("spotify:") {
        // Spotify URIs only allow safe identifier characters
        if trimmed.chars().all(|c| c.is_alphanumeric() || c == ':' || c == '/' || c == '?' || c == '=' || c == '&' || c == '_' || c == '-') {
            open::that(trimmed).map_err(|e| e.to_string())?;
            return Ok(());
        } else {
            return Err("Invalid characters in Spotify URI".to_string());
        }
    }

    let parsed = reqwest::Url::parse(trimmed).map_err(|e| format!("Invalid URL: {e}"))?;
    let scheme = parsed.scheme();
    if scheme != "https" && scheme != "http" {
        return Err("Only HTTP, HTTPS, and Spotify schemes are allowed".to_string());
    }

    open::that(parsed.as_str()).map_err(|e| e.to_string())?;
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

    let client = get_shared_client();

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
    if text.trim().is_empty() {
        return Ok(serde_json::json!({ "text": null, "src": "empty" }));
    }

    let client = get_shared_client();
    let user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    let clients = ["dict-chrome-ex", "gtx"];
    let mut last_err = String::new();

    for google_client in clients {
        let url = format!("https://translate.googleapis.com/translate_a/single?client={google_client}&sl=auto&tl={target_lang}&dt=t");
        let res = client.post(&url)
            .header("Content-Type", "application/x-www-form-urlencoded")
            .header("User-Agent", user_agent)
            .form(&[("q", &text)])
            .send()
            .await;

        match res {
            Ok(resp) if resp.status().is_success() => {
                if let Ok(data) = resp.json::<serde_json::Value>().await {
                    let mut full_translation = String::new();
                    if let Some(arr) = data[0].as_array() {
                        for item in arr {
                            if let Some(s) = item[0].as_str() {
                                full_translation.push_str(s);
                            }
                        }
                    }
                    let src_lang = data[2].as_str().unwrap_or("unknown");

                    crate::log_to_file(&format!(
                        "[Translate API] Success via client='{}': src='{}', target='{}', chars={}",
                        google_client, src_lang, target_lang, full_translation.len()
                    ));

                    // Normalize language tags for comparison (e.g., 'en-US' matches 'en')
                    let src_base = src_lang.split('-').next().unwrap_or(src_lang).to_lowercase();

                    let is_explicit_skip = skip_lang.as_deref().map_or(false, |sl| {
                        if sl == "none" || sl.is_empty() {
                            return false;
                        }
                        let sl_base = sl.split('-').next().unwrap_or(sl).to_lowercase();
                        src_lang.eq_ignore_ascii_case(sl) || src_base == sl_base
                    });

                    if is_explicit_skip {
                        crate::log_to_file(&format!(
                            "[Translate API] Skipping translation: is_explicit_skip=true (src='{}', target='{}')",
                            src_lang, target_lang
                        ));
                        return Ok(serde_json::json!({ "text": null, "src": src_lang, "skipped": true }));
                    }

                    if full_translation.trim().is_empty() {
                        return Ok(serde_json::json!({ "text": null, "src": src_lang }));
                    }

                    return Ok(serde_json::json!({ "text": full_translation, "src": src_lang }));
                }
            }
            Ok(resp) => {
                let status = resp.status();
                last_err = format!("HTTP {}", status);
                crate::log_to_file(&format!("[Translate API] Client '{}' returned non-success status: {}", google_client, status));
            }
            Err(e) => {
                last_err = e.to_string();
                crate::log_to_file(&format!("[Translate API] Client '{}' request error: {}", google_client, e));
            }
        }
    }

    crate::log_to_file(&format!("[Translate API] All translation endpoints failed. Last error: {}", last_err));
    Ok(serde_json::json!({ "text": null, "src": "error", "error": last_err }))
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

struct CachedSpotifyToken {
    token: String,
    expires_at: std::time::Instant,
}

static SPOTIFY_TOKEN_CACHE: OnceLock<tokio::sync::RwLock<Option<CachedSpotifyToken>>> = OnceLock::new();

fn get_spotify_token_cache() -> &'static tokio::sync::RwLock<Option<CachedSpotifyToken>> {
    SPOTIFY_TOKEN_CACHE.get_or_init(|| tokio::sync::RwLock::new(None))
}

pub fn extract_primary_artist(artist: &str) -> String {
    let mut s = artist.to_string();
    let lower = s.to_lowercase();
    for sep in &[" feat. ", " feat ", " ft. ", " ft ", " with ", " / ", " vs. ", " vs "] {
        if let Some(pos) = lower.find(sep) {
            s.truncate(pos);
            break;
        }
    }
    let primary = s.split(&[';', ',', '&'][..]).next().unwrap_or(artist).trim();
    if primary.is_empty() {
        artist.trim().to_string()
    } else {
        primary.to_string()
    }
}

pub fn is_disqualified_cover(query: &str, candidate_text: &str) -> bool {
    let q_lower = query.to_lowercase();
    let c_lower = candidate_text.to_lowercase();
    let blacklisted = [
        "karaoke",
        "tribute",
        "originally performed by",
        "in the style of",
        "backing track",
        "piano version",
        "2 pianos version",
        "piano cover",
        "acoustic cover",
        "instrumental",
        "cover version",
        " cover",
        "(cover",
        "[cover",
    ];
    for term in blacklisted {
        if c_lower.contains(term) && !q_lower.contains(term) {
            return true;
        }
    }
    false
}

pub fn evaluate_candidate_match(req_title: &str, req_artist: &str, cand_title: &str, cand_artists: &[String]) -> (bool, f32) {
    let combined_cand = format!("{} {}", cand_title, cand_artists.join(" "));
    let combined_req = format!("{} {}", req_title, req_artist);
    if is_disqualified_cover(&combined_req, &combined_cand) {
        return (false, 0.0);
    }

    let title_score = crate::commands::lyrics::fuzzy::compute_similarity_score(req_title, cand_title);

    let mut max_artist_score: f32 = 0.0;
    for a in cand_artists {
        let score = crate::commands::lyrics::fuzzy::compute_similarity_score(req_artist, a);
        if score > max_artist_score {
            max_artist_score = score;
        }
    }

    let combined = (title_score * 0.5) + (max_artist_score * 0.5);
    let passes = (combined >= 0.70 && max_artist_score >= 0.60) || (title_score >= 0.90 && max_artist_score >= 0.55);
    (passes, combined)
}

async fn get_or_fetch_spotify_token(client: &reqwest::Client) -> Option<String> {
    let cache = get_spotify_token_cache();
    {
        let read = cache.read().await;
        if let Some(cached) = &*read {
            if std::time::Instant::now() < cached.expires_at {
                return Some(cached.token.clone());
            }
        }
    }

    let mut write = cache.write().await;
    if let Some(cached) = &*write {
        if std::time::Instant::now() < cached.expires_at {
            return Some(cached.token.clone());
        }
    }

    let (client_id, client_secret) = if let Ok(Some(cfg)) = crate::commands::config::load_config() {
        let cid = cfg.get("spotify_client_id").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
        let csec = cfg.get("spotify_client_secret").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
        if !cid.is_empty() && !csec.is_empty() {
            (cid, csec)
        } else {
            ("3f974573800a4ff5b325de9795b8e603".to_string(), "ff188d2860ff44baa57acc79c121a3b9".to_string())
        }
    } else {
        ("3f974573800a4ff5b325de9795b8e603".to_string(), "ff188d2860ff44baa57acc79c121a3b9".to_string())
    };

    let auth_str = format!("{}:{}", client_id, client_secret);
    let b64_auth = crate::models::base64_encode(auth_str.as_bytes());

    let res = client.post("https://accounts.spotify.com/api/token")
        .header("Authorization", format!("Basic {}", b64_auth))
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body("grant_type=client_credentials")
        .send()
        .await
        .ok()?;

    if res.status().is_success() {
        let json: serde_json::Value = res.json().await.ok()?;
        if let Some(token) = json["access_token"].as_str() {
            let expires_in_secs = json["expires_in"].as_u64().unwrap_or(3600);
            let safe_duration = std::time::Duration::from_secs(expires_in_secs.saturating_sub(60).max(60));
            let expires_at = std::time::Instant::now() + safe_duration;
            *write = Some(CachedSpotifyToken {
                token: token.to_string(),
                expires_at,
            });
            return Some(token.to_string());
        }
    }
    None
}

async fn search_spotify_art(
    client: &reqwest::Client,
    token: &str,
    clean_t: &str,
    primary_a: &str,
    album_opt: Option<&str>,
) -> Option<String> {
    // 1. Search by track and artist
    let track_query = format!("track:{} artist:{}", clean_t, primary_a);
    let track_url = format!(
        "https://api.spotify.com/v1/search?q={}&type=track&limit=5",
        urlencoding::encode(&track_query)
    );

    if let Ok(res) = client.get(&track_url).header("Authorization", format!("Bearer {}", token)).send().await {
        if res.status().is_success() {
            if let Ok(json) = res.json::<serde_json::Value>().await {
                if let Some(items) = json["tracks"]["items"].as_array() {
                    let mut best_art: Option<(f32, String)> = None;
                    for item in items {
                        let cand_title = item["name"].as_str().unwrap_or("");
                        let cand_artists: Vec<String> = item["artists"]
                            .as_array()
                            .map(|arr| {
                                arr.iter()
                                    .filter_map(|a| a["name"].as_str().map(|s| s.to_string()))
                                    .collect()
                            })
                            .unwrap_or_default();

                        let (passes, score) = evaluate_candidate_match(clean_t, primary_a, cand_title, &cand_artists);
                        if passes {
                            if let Some(images) = item["album"]["images"].as_array() {
                                if let Some(first_img) = images.first() {
                                    if let Some(url) = first_img["url"].as_str() {
                                        if best_art.as_ref().map_or(true, |(best_score, _)| score > *best_score) {
                                            best_art = Some((score, url.to_string()));
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if let Some((_, url)) = best_art {
                        return Some(url);
                    }
                }
            }
        }
    }

    // 2. Search by album if available
    if let Some(album) = album_opt {
        let clean_alb = crate::commands::lyrics::fuzzy::clean_title(album);
        if !clean_alb.is_empty() {
            let album_query = format!("album:{} artist:{}", clean_alb, primary_a);
            let album_url = format!(
                "https://api.spotify.com/v1/search?q={}&type=album&limit=5",
                urlencoding::encode(&album_query)
            );
            if let Ok(res) = client.get(&album_url).header("Authorization", format!("Bearer {}", token)).send().await {
                if res.status().is_success() {
                    if let Ok(json) = res.json::<serde_json::Value>().await {
                        if let Some(items) = json["albums"]["items"].as_array() {
                            let mut best_art: Option<(f32, String)> = None;
                            for item in items {
                                let cand_title = item["name"].as_str().unwrap_or("");
                                let cand_artists: Vec<String> = item["artists"]
                                    .as_array()
                                    .map(|arr| {
                                        arr.iter()
                                            .filter_map(|a| a["name"].as_str().map(|s| s.to_string()))
                                            .collect()
                                    })
                                    .unwrap_or_default();

                                let (passes, score) = evaluate_candidate_match(&clean_alb, primary_a, cand_title, &cand_artists);
                                if passes {
                                    if let Some(images) = item["images"].as_array() {
                                        if let Some(first_img) = images.first() {
                                            if let Some(url) = first_img["url"].as_str() {
                                                if best_art.as_ref().map_or(true, |(best_score, _)| score > *best_score) {
                                                    best_art = Some((score, url.to_string()));
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            if let Some((_, url)) = best_art {
                                return Some(url);
                            }
                        }
                    }
                }
            }
        }
    }

    // 3. Loose query with track + artist
    let loose_query = format!("{} {}", clean_t, primary_a);
    let loose_url = format!(
        "https://api.spotify.com/v1/search?q={}&type=track&limit=5",
        urlencoding::encode(&loose_query)
    );
    if let Ok(res) = client.get(&loose_url).header("Authorization", format!("Bearer {}", token)).send().await {
        if res.status().is_success() {
            if let Ok(json) = res.json::<serde_json::Value>().await {
                if let Some(items) = json["tracks"]["items"].as_array() {
                    let mut best_art: Option<(f32, String)> = None;
                    for item in items {
                        let cand_title = item["name"].as_str().unwrap_or("");
                        let cand_artists: Vec<String> = item["artists"]
                            .as_array()
                            .map(|arr| {
                                arr.iter()
                                    .filter_map(|a| a["name"].as_str().map(|s| s.to_string()))
                                    .collect()
                            })
                            .unwrap_or_default();

                        let (passes, score) = evaluate_candidate_match(clean_t, primary_a, cand_title, &cand_artists);
                        if passes {
                            if let Some(images) = item["album"]["images"].as_array() {
                                if let Some(first_img) = images.first() {
                                    if let Some(url) = first_img["url"].as_str() {
                                        if best_art.as_ref().map_or(true, |(best_score, _)| score > *best_score) {
                                            best_art = Some((score, url.to_string()));
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if let Some((_, url)) = best_art {
                        return Some(url);
                    }
                }
            }
        }
    }

    None
}

async fn search_itunes_art(
    client: &reqwest::Client,
    clean_t: &str,
    primary_a: &str,
) -> Option<String> {
    let term = format!("{} {}", clean_t, primary_a);
    let url = format!(
        "https://itunes.apple.com/search?term={}&limit=5&entity=song",
        urlencoding::encode(&term)
    );
    if let Ok(res) = client.get(&url).send().await {
        if res.status().is_success() {
            if let Ok(json) = res.json::<serde_json::Value>().await {
                if let Some(results) = json["results"].as_array() {
                    let mut best_art: Option<(f32, String)> = None;
                    for item in results {
                        let cand_title = item["trackName"].as_str().unwrap_or("");
                        let cand_artist = item["artistName"].as_str().unwrap_or("");
                        let cand_artists = vec![cand_artist.to_string()];

                        let (passes, score) = evaluate_candidate_match(clean_t, primary_a, cand_title, &cand_artists);
                        if passes {
                            if let Some(raw_art) = item["artworkUrl100"].as_str().or_else(|| item["artworkUrl60"].as_str()) {
                                let high_res = raw_art
                                    .replace("100x100bb.jpg", "600x600bb.jpg")
                                    .replace("60x60bb.jpg", "600x600bb.jpg");
                                if best_art.as_ref().map_or(true, |(best_score, _)| score > *best_score) {
                                    best_art = Some((score, high_res));
                                }
                            }
                        }
                    }
                    if let Some((_, url)) = best_art {
                        return Some(url);
                    }
                }
            }
        }
    }
    None
}

async fn search_deezer_art(
    client: &reqwest::Client,
    clean_t: &str,
    primary_a: &str,
) -> Option<String> {
    let term = format!("{} {}", clean_t, primary_a);
    let url = format!(
        "https://api.deezer.com/search?q={}&limit=5",
        urlencoding::encode(&term)
    );
    if let Ok(res) = client.get(&url).send().await {
        if res.status().is_success() {
            if let Ok(json) = res.json::<serde_json::Value>().await {
                if let Some(data) = json["data"].as_array() {
                    let mut best_art: Option<(f32, String)> = None;
                    for item in data {
                        let cand_title = item["title"].as_str().unwrap_or("");
                        let cand_artist = item["artist"]["name"].as_str().unwrap_or("");
                        let cand_artists = vec![cand_artist.to_string()];

                        let (passes, score) = evaluate_candidate_match(clean_t, primary_a, cand_title, &cand_artists);
                        if passes {
                            let album = &item["album"];
                            if let Some(cover) = album["cover_xl"].as_str()
                                .or_else(|| album["cover_big"].as_str())
                                .or_else(|| album["cover_medium"].as_str())
                            {
                                if best_art.as_ref().map_or(true, |(best_score, _)| score > *best_score) {
                                    best_art = Some((score, cover.to_string()));
                                }
                            }
                        }
                    }
                    if let Some((_, url)) = best_art {
                        return Some(url);
                    }
                }
            }
        }
    }
    None
}

async fn search_netease_art(
    client: &reqwest::Client,
    clean_t: &str,
    primary_a: &str,
) -> Option<String> {
    let query = format!("{} {}", clean_t, primary_a);
    let url = format!(
        "https://interface.music.163.com/api/search/get/web?csrf_token=&hlpretag=&hlposttag=&s={}&type=1&offset=0&total=true&limit=3",
        urlencoding::encode(&query)
    );
    if let Ok(res) = client.get(&url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .header("Referer", "https://music.163.com")
        .header("X-Real-IP", "118.88.88.88")
        .send()
        .await
    {
        if res.status().is_success() {
            if let Ok(json) = res.json::<serde_json::Value>().await {
                if let Some(songs) = json["result"]["songs"].as_array() {
                    let mut best_art: Option<(f32, String)> = None;
                    for song in songs {
                        let cand_title = song["name"].as_str().unwrap_or("");
                        let cand_artists: Vec<String> = song["artists"]
                            .as_array()
                            .map(|arr| {
                                arr.iter()
                                    .filter_map(|a| a["name"].as_str().map(|s| s.to_string()))
                                    .collect()
                            })
                            .unwrap_or_default();

                        let (passes, score) = evaluate_candidate_match(clean_t, primary_a, cand_title, &cand_artists);
                        if passes {
                            if let Some(pic_url) = song["album"]["picUrl"].as_str() {
                                if !pic_url.is_empty() {
                                    if best_art.as_ref().map_or(true, |(best_score, _)| score > *best_score) {
                                        best_art = Some((score, pic_url.to_string()));
                                    }
                                }
                            }
                        }
                    }
                    if let Some((_, url)) = best_art {
                        return Some(url);
                    }
                }
            }
        }
    }
    None
}

#[tauri::command]
pub async fn fetch_track_artwork(track: String, artist: String, album: Option<String>) -> Result<Option<String>, String> {
    let clean_t = crate::commands::lyrics::fuzzy::clean_title(&track);
    let clean_a = crate::commands::lyrics::fuzzy::clean_artist(&artist);
    let primary_a = extract_primary_artist(&clean_a);

    if clean_t.is_empty() {
        return Ok(None);
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(2500))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());

    // Tier 1: Spotify Web API (via client credentials, album-art flow)
    if let Some(token) = get_or_fetch_spotify_token(&client).await {
        if let Some(art) = search_spotify_art(&client, &token, &clean_t, &primary_a, album.as_deref()).await {
            return Ok(Some(art));
        }
    }

    // Tier 2: iTunes API (limit=5, scored candidates)
    if let Some(art) = search_itunes_art(&client, &clean_t, &primary_a).await {
        return Ok(Some(art));
    }

    // Tier 3: Deezer API (limit=5, scored candidates)
    if let Some(art) = search_deezer_art(&client, &clean_t, &primary_a).await {
        return Ok(Some(art));
    }

    // Tier 4: NetEase Cloud Music (limit=3, scored candidates)
    if let Some(art) = search_netease_art(&client, &clean_t, &primary_a).await {
        return Ok(Some(art));
    }

    // If no candidate achieved >= 0.70 similarity across all tiers,
    // return Ok(None) to preserve clean placeholder rather than showing the wrong artist!
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_primary_artist() {
        assert_eq!(extract_primary_artist("The Weeknd, Daft Punk"), "The Weeknd");
        assert_eq!(extract_primary_artist("Taylor Swift & Post Malone"), "Taylor Swift");
        assert_eq!(extract_primary_artist("Ed Sheeran feat. Justin Bieber"), "Ed Sheeran");
        assert_eq!(extract_primary_artist("Billie Eilish with Khalid"), "Billie Eilish");
        assert_eq!(extract_primary_artist("YOASOBI"), "YOASOBI");
    }

    #[test]
    fn test_is_disqualified_cover() {
        // Query has no cover/tribute tag, candidate does -> disqualified
        assert!(is_disqualified_cover("夜に駆ける YOASOBI", "YOASOBI - 夜に駆ける [2 pianos version] KayThePianist"));
        assert!(is_disqualified_cover("Idol YOASOBI", "IDOL KARAOKE Original by YOASOBI"));
        assert!(is_disqualified_cover("Shape of You Ed Sheeran", "Shape of You (Tribute Version)"));
        assert!(is_disqualified_cover("Cruel Summer Taylor Swift", "Cruel Summer - Acoustic Piano Cover"));

        // Query explicitly requests cover -> not disqualified
        assert!(!is_disqualified_cover("Shape of You Piano Version", "Shape of You Piano Version"));
    }

    #[test]
    fn test_evaluate_candidate_match() {
        // Authentic match
        let (passes, score) = evaluate_candidate_match(
            "Blinding Lights",
            "The Weeknd",
            "Blinding Lights",
            &["The Weeknd".to_string()]
        );
        assert!(passes);
        assert!(score >= 0.95);

        // Disqualified piano tribute
        let (passes, _) = evaluate_candidate_match(
            "夜に駆ける",
            "YOASOBI",
            "YOASOBI - 夜に駆ける [2 pianos version]",
            &["KayThePianist".to_string()]
        );
        assert!(!passes);

        // Completely wrong artist (same song name "Home")
        let (passes, _) = evaluate_candidate_match(
            "Home",
            "Edward Sharpe & The Magnetic Zeros",
            "Home",
            &["Justin Bieber".to_string()]
        );
        assert!(!passes);
    }
}



