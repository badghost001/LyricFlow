pub mod models;
pub mod fuzzy;
pub mod lrclib;
pub mod musixmatch;
pub mod netease;
pub mod genius;
pub mod engine;

use models::{LyricsCandidate, LyricsSearchOptions};
use reqwest::Client;
use std::sync::OnceLock;

static HTTP_CLIENT: OnceLock<Client> = OnceLock::new();

fn get_client() -> &'static Client {
    HTTP_CLIENT.get_or_init(|| {
        Client::builder()
            .timeout(std::time::Duration::from_secs(8))
            .build()
            .unwrap_or_else(|_| Client::new())
    })
}

#[tauri::command]
pub async fn search_synced_lyrics(
    track_name: String,
    artist_name: String,
    duration_ms: u32,
    options: Option<LyricsSearchOptions>,
) -> Result<Option<LyricsCandidate>, String> {
    crate::log_to_file(&format!(
        "[Lyrics Command] search_synced_lyrics called: '{}' by '{}' (dur={}ms)",
        track_name, artist_name, duration_ms
    ));
    let opts = options.unwrap_or_default();
    let client = get_client();
    let result = engine::search_best_lyrics(client, &track_name, &artist_name, duration_ms, opts).await;
    if let Some(ref r) = result {
        crate::log_to_file(&format!(
            "[Lyrics Command] Lyrics found from provider='{}' sync_type={:?} candidate_info={:?}",
            r.provider, r.sync_type, r.candidate_info
        ));
    } else {
        crate::log_to_file(&format!(
            "[Lyrics Command] No lyrics found across all providers for '{}' by '{}'",
            track_name, artist_name
        ));
    }
    Ok(result)
}

#[tauri::command]
pub async fn get_lyrics_candidates(
    track_name: String,
    artist_name: String,
    duration_ms: u32,
    options: Option<LyricsSearchOptions>,
) -> Result<Vec<LyricsCandidate>, String> {
    let opts = options.unwrap_or_default();
    let client = get_client();
    let candidates = engine::query_all_candidates(client, &track_name, &artist_name, duration_ms, &opts).await;
    Ok(candidates)
}

// Backwards-compatible legacy commands
#[tauri::command]
pub async fn fetch_spotify_lyrics(track_id: String, token: Option<String>) -> Result<serde_json::Value, String> {
    let Some(t) = token else {
        return Err("No Spotify access token provided".to_string());
    };
    let client = get_client();
    let url = format!("https://spclient.wg.spotify.com/color-lyrics/v2/track/{track_id}?format=json&vType=0&market=from_token");
    let res = client.get(&url)
        .header("Authorization", format!("Bearer {t}"))
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
        .header("App-Platform", "WebPlayer")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(format!("Spotify lyrics API returned status {}", res.status()));
    }
    let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    Ok(json)
}

#[tauri::command]
pub async fn fetch_netease_lyrics(track_name: String, artist_name: String) -> Result<serde_json::Value, String> {
    let client = get_client();
    let clean_t = fuzzy::clean_title(&track_name);
    let clean_a = fuzzy::clean_artist(&artist_name);
    let query = format!("{clean_t} {clean_a}");
    let search_url = format!("http://music.163.com/api/search/get/web?csrf_token=&hlpretag=&hlposttag=&s={}&type=1&offset=0&total=true&limit=1", urlencoding::encode(&query));

    let search_res = client.get(&search_url)
        .header("User-Agent", "Mozilla/5.0")
        .header("Referer", "http://music.163.com")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let search_json: serde_json::Value = search_res.json().await.map_err(|e| e.to_string())?;
    let song_id = search_json["result"]["songs"][0]["id"].as_i64()
        .ok_or_else(|| "No NetEase song found".to_string())?;

    let lyric_url = format!("http://music.163.com/api/song/lyric?os=pc&id={song_id}&lv=-1&kv=-1&tv=-1");
    let lyric_res = client.get(&lyric_url)
        .header("User-Agent", "Mozilla/5.0")
        .header("Referer", "http://music.163.com")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let lyric_json: serde_json::Value = lyric_res.json().await.map_err(|e| e.to_string())?;
    Ok(lyric_json)
}

#[tauri::command]
pub async fn fetch_genius_fact(track_name: String, artist_name: String) -> Result<Option<String>, String> {
    let client = get_client();
    genius::fetch_genius_fact(client, &track_name, &artist_name).await
}

#[tauri::command]
pub async fn get_genius_fact(artist: String, track: String) -> Result<Option<String>, String> {
    let client = get_client();
    genius::fetch_genius_fact(client, &track, &artist).await
}

#[tauri::command]
pub async fn get_genius_annotations(artist: String, track: String) -> Result<Vec<genius::GeniusAnnotation>, String> {
    let client = get_client();
    genius::get_genius_annotations(client, &artist, &track).await
}

#[tauri::command]
pub async fn fetch_genius_lyrics(track_name: String, artist_name: String) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "lyrics": null,
        "artist": artist_name,
        "track": track_name
    }))
}
