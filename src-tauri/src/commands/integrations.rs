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
