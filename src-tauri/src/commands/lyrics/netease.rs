use super::fuzzy::{clean_artist, clean_title, compute_similarity_score, has_lrc_timestamps};
use super::models::{LyricsCandidate, SyncType};
use reqwest::Client;
use serde_json::Value;

pub async fn search_netease(
    client: &Client,
    track: &str,
    artist: &str,
) -> Vec<LyricsCandidate> {
    let clean_t = clean_title(track);
    let clean_a = clean_artist(artist);
    let query = format!("{} {}", clean_t, clean_a);

    let search_url = format!(
        "http://music.163.com/api/search/get/web?csrf_token=&hlpretag=&hlposttag=&s={}&type=1&offset=0&total=true&limit=3",
        urlencoding::encode(&query)
    );

    let search_res = match client
        .get(&search_url)
        .header("User-Agent", "Mozilla/5.0")
        .header("Referer", "http://music.163.com")
        .send()
        .await
    {
        Ok(r) => r,
        Err(_) => return Vec::new(),
    };

    if !search_res.status().is_success() {
        return Vec::new();
    }

    let search_json: Value = match search_res.json().await {
        Ok(j) => j,
        Err(_) => return Vec::new(),
    };

    let songs = match search_json["result"]["songs"].as_array() {
        Some(s) => s,
        None => return Vec::new(),
    };

    let mut candidates = Vec::new();

    for song in songs.iter().take(2) {
        let song_id = match song["id"].as_i64() {
            Some(id) => id,
            None => continue,
        };

        let song_name = song["name"].as_str().unwrap_or("");
        let song_artist = song["artists"][0]["name"].as_str().unwrap_or("");
        let candidate_query = format!("{} {}", song_name, song_artist);
        let score = compute_similarity_score(&query, &candidate_query);

        if score < 0.60 {
            continue;
        }

        let lyric_url = format!(
            "http://music.163.com/api/song/lyric?os=pc&id={}&lv=-1&kv=-1&tv=-1",
            song_id
        );

        let lyric_res = match client
            .get(&lyric_url)
            .header("User-Agent", "Mozilla/5.0")
            .header("Referer", "http://music.163.com")
            .send()
            .await
        {
            Ok(r) => r,
            Err(_) => continue,
        };

        if !lyric_res.status().is_success() {
            continue;
        }

        if let Ok(lyric_json) = lyric_res.json::<Value>().await {
            let lrc_body = lyric_json["lrc"]["lyric"].as_str().unwrap_or("").trim();
            let tlrc_body = lyric_json["tlyric"]["lyric"].as_str().unwrap_or("").trim();

            if !lrc_body.is_empty() {
                let sync_type = if has_lrc_timestamps(lrc_body) {
                    SyncType::LineSynced
                } else {
                    SyncType::PlainText
                };

                let translation_lrc = if !tlrc_body.is_empty() && has_lrc_timestamps(tlrc_body) {
                    Some(tlrc_body.to_string())
                } else {
                    None
                };

                candidates.push(LyricsCandidate {
                    provider: "NetEase".to_string(),
                    sync_type,
                    raw_lrc: lrc_body.to_string(),
                    translation_lrc,
                    parsed_lines: None,
                    candidate_id: song_id.to_string(),
                    score,
                    candidate_info: Some("NetEase".to_string()),
                    duration_diff_sec: None,
                });
            }
        }
    }

    candidates
}
