use crate::models::SpotifyPlaybackState;
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

#[tauri::command]
pub fn get_local_playback() -> Result<Option<SpotifyPlaybackState>, String> {
    let backend = crate::media::get_platform_backend();
    let playback = backend.poll_playback().and_then(|meta| meta.to_spotify_playback_state());
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
    let title = track["name"].as_str().or_else(|| track["title"].as_str()).unwrap_or("Now Playing");
    let artist = track["artists"][0]["name"].as_str().or_else(|| track["artist"].as_str()).unwrap_or("Unknown Artist");

    let _ = app.notification()
        .builder()
        .title(title)
        .body(format!("Playing - {artist}"))
        .show();

    Ok(())
}

#[tauri::command]
pub fn init_discord_rpc(_client_id: String) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub fn update_discord_rpc(_data: serde_json::Value) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub async fn lastfm_api(data: serde_json::Value) -> Result<serde_json::Value, String> {
    let method = data["method"].as_str().unwrap_or("");
    let api_key = data["apiKey"].as_str().unwrap_or("");
    let api_secret = data["apiSecret"].as_str().unwrap_or("");
    let session_key = data["sessionKey"].as_str().unwrap_or("");

    if api_key.is_empty() {
        return Err("Missing Last.fm API key".to_string());
    }

    let mut params = vec![
        ("method", method.to_string()),
        ("api_key", api_key.to_string()),
    ];

    if !session_key.is_empty() {
        params.push(("sk", session_key.to_string()));
    }

    if let Some(obj) = data["params"].as_object() {
        for (k, v) in obj {
            if let Some(s) = v.as_str() {
                params.push((k.as_str(), s.to_string()));
            }
        }
    }

    // Sort params alphabetically for Last.fm MD5 signature
    params.sort_by(|a, b| a.0.cmp(b.0));

    let mut sig_base = String::new();
    for (k, v) in &params {
        sig_base.push_str(k);
        sig_base.push_str(v);
    }
    sig_base.push_str(api_secret);

    let api_sig = format!("{:x}", md5::compute(sig_base.as_bytes()));
    params.push(("api_sig", api_sig));
    params.push(("format", "json".to_string()));

    let client = reqwest::Client::new();
    let res = client.post("https://ws.audioscrobbler.com/2.0/")
        .form(&params)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    Ok(json)
}

#[tauri::command]
pub async fn translate_text(text: String, target_lang: String, skip_lang: Option<String>) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
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
    let client = reqwest::Client::new();
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
    let client = reqwest::Client::new();
    let res = client.get("https://open.spotify.com/get_access_token?reason=transport&productType=web_player")
        .header("Cookie", format!("sp_dc={sp_dc}"))
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36")
        .header("Accept", "application/json")
        .header("App-Platform", "WebPlayer")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if res.status().is_success() {
        let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
        if let Some(tok) = json["accessToken"].as_str() {
            return Ok(Some(tok.to_string()));
        }
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

    let client = reqwest::Client::new();
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
    let (mut stream, _) = listener.accept().await.map_err(|e| e.to_string())?;

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

    let client = reqwest::Client::new();
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
        let html_err = format!("HTTP/1.1 500 Internal Server Error\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\n\r\n<html><body style=\"font-family: sans-serif; background: #121212; color: #ff5555; text-align: center; padding-top: 50px;\"><h1>Connection Failed</h1><p>{err_txt}</p></body></html>");
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

