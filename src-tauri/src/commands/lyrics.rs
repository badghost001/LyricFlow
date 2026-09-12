#[tauri::command]
pub async fn fetch_spotify_lyrics(track_id: String, token: Option<String>) -> Result<serde_json::Value, String> {
    let Some(t) = token else {
        return Err("No Spotify access token provided".to_string());
    };

    let client = reqwest::Client::new();
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
    let client = reqwest::Client::new();
    let query = format!("{track_name} {artist_name}");
    let search_url = format!("http://music.163.com/api/search/get/web?csrf_token=&hlpretag=&hlposttag=&s={}&type=1&offset=0&total=true&limit=1", urlencoding(&query));

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
pub async fn get_genius_fact(artist: String, track: String) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "fact": null,
        "artist": artist,
        "track": track
    }))
}

#[tauri::command]
pub async fn get_genius_annotations(artist: String, track: String) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "annotations": [],
        "artist": artist,
        "track": track
    }))
}

#[tauri::command]
pub async fn fetch_genius_fact(track_name: String, artist_name: String) -> Result<serde_json::Value, String> {
    get_genius_fact(artist_name, track_name).await
}

#[tauri::command]
pub async fn fetch_genius_lyrics(track_name: String, artist_name: String) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "lyrics": null,
        "artist": artist_name,
        "track": track_name
    }))
}

fn urlencoding(s: &str) -> String {
    let mut out = String::new();
    for b in s.bytes() {
        if b.is_ascii_alphanumeric() || b == b'-' || b == b'_' || b == b'.' || b == b'~' {
            out.push(b as char);
        } else {
            out.push_str(&format!("%{:02X}", b));
        }
    }
    out
}
