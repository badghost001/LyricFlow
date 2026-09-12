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

#[derive(serde::Serialize, serde::Deserialize)]
pub struct GeniusAnnotation {
    pub fragment: String,
    pub text: String,
}

#[tauri::command]
pub async fn fetch_genius_fact(track_name: String, artist_name: String) -> Result<Option<String>, String> {
    let clean_artist = artist_name
        .trim_end_matches("VEVO")
        .trim_end_matches("- Topic")
        .trim_end_matches("Official")
        .trim();
    let clean_track = track_name.split('(').next().unwrap_or(&track_name).split('[').next().unwrap_or(&track_name).trim();

    let client = reqwest::Client::new();
    let query = format!("{clean_artist} {clean_track}");
    let search_url = format!("https://genius.com/api/search/multi?per_page=1&q={}", urlencoding(&query));

    let res = client.get(&search_url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Ok(None);
    }

    let search_data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let mut song_id = None;
    if let Some(sections) = search_data["response"]["sections"].as_array() {
        for sec in sections {
            let stype = sec["type"].as_str().unwrap_or("");
            if stype == "song" || stype == "top_hit" {
                if let Some(hits) = sec["hits"].as_array() {
                    for hit in hits {
                        if hit["type"].as_str() == Some("song") {
                            if let Some(id) = hit["result"]["id"].as_i64() {
                                song_id = Some(id);
                                break;
                            }
                        }
                    }
                }
            }
            if song_id.is_some() { break; }
        }
    }

    let Some(id) = song_id else { return Ok(None); };

    let fact_url = format!("https://genius.com/api/songs/{id}?text_format=plain");
    let fact_res = client.get(&fact_url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !fact_res.status().is_success() {
        return Ok(None);
    }

    let song_data: serde_json::Value = fact_res.json().await.map_err(|e| e.to_string())?;
    let plain = song_data["response"]["song"]["description"]["plain"].as_str().map(|s| s.to_string());
    Ok(plain)
}

#[tauri::command]
pub async fn get_genius_fact(artist: String, track: String) -> Result<Option<String>, String> {
    fetch_genius_fact(track, artist).await
}

#[tauri::command]
pub async fn get_genius_annotations(artist: String, track: String) -> Result<Vec<GeniusAnnotation>, String> {
    let clean_artist = artist
        .trim_end_matches("VEVO")
        .trim_end_matches("- Topic")
        .trim_end_matches("Official")
        .trim();
    let clean_track = track.split('(').next().unwrap_or(&track).split('[').next().unwrap_or(&track).trim();

    let client = reqwest::Client::new();
    let query = format!("{clean_artist} {clean_track}");
    let search_url = format!("https://genius.com/api/search/multi?per_page=1&q={}", urlencoding(&query));

    let res = client.get(&search_url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Ok(vec![]);
    }

    let search_data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let mut song_id = None;
    if let Some(sections) = search_data["response"]["sections"].as_array() {
        for sec in sections {
            let stype = sec["type"].as_str().unwrap_or("");
            if stype == "song" || stype == "top_hit" {
                if let Some(hits) = sec["hits"].as_array() {
                    for hit in hits {
                        if hit["type"].as_str() == Some("song") {
                            if let Some(id) = hit["result"]["id"].as_i64() {
                                song_id = Some(id);
                                break;
                            }
                        }
                    }
                }
            }
            if song_id.is_some() { break; }
        }
    }

    let Some(id) = song_id else { return Ok(vec![]); };

    let ref_url = format!("https://genius.com/api/referents?song_id={id}&per_page=50&text_format=plain");
    let ref_res = client.get(&ref_url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !ref_res.status().is_success() {
        return Ok(vec![]);
    }

    let ref_data: serde_json::Value = ref_res.json().await.map_err(|e| e.to_string())?;
    let mut annotations = Vec::new();
    if let Some(referents) = ref_data["response"]["referents"].as_array() {
        for r in referents {
            let body_text = r["annotations"][0]["body"]["plain"].as_str().unwrap_or("").trim();
            let fragment = r["fragment"].as_str().unwrap_or("").trim();
            if !fragment.is_empty() && body_text.len() > 10 && body_text != "?" {
                annotations.push(GeniusAnnotation {
                    fragment: fragment.to_string(),
                    text: body_text.to_string(),
                });
            }
        }
    }

    Ok(annotations)
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
