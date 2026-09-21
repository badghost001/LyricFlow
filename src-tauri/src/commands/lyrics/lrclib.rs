use super::fuzzy::{clean_artist, clean_title, compute_similarity_score, has_lrc_timestamps};
use super::models::{LyricsCandidate, SyncType};
use reqwest::Client;
use serde_json::Value;

pub async fn search_lrclib(
    client: &Client,
    track: &str,
    artist: &str,
    duration_sec: u32,
) -> Vec<LyricsCandidate> {
    let clean_t = clean_title(track);
    let clean_a = clean_artist(artist);
    let search_query = format!("{} {}", clean_t, clean_a);

    let mut candidates: Vec<LyricsCandidate> = Vec::new();

    // 1. Try fast exact GET if duration is available
    if duration_sec > 0 {
        let url = format!(
            "https://lrclib.net/api/get?track_name={}&artist_name={}&duration={}",
            urlencoding::encode(&clean_t),
            urlencoding::encode(&clean_a),
            duration_sec
        );
        if let Ok(res) = client.get(&url).header("User-Agent", "LyricFlow/1.3.0").send().await {
            if res.status().is_success() {
                if let Ok(json) = res.json::<Value>().await {
                    if let Some(candidate) = parse_lrclib_item(&json, &search_query, duration_sec) {
                        candidates.push(candidate);
                    }
                }
            }
        }
    }

    // 2. Query search endpoints (both targeted track+artist and combined q)
    let search_url1 = format!(
        "https://lrclib.net/api/search?track_name={}&artist_name={}",
        urlencoding::encode(&clean_t),
        urlencoding::encode(&clean_a)
    );
    let search_url2 = format!(
        "https://lrclib.net/api/search?q={}",
        urlencoding::encode(&search_query)
    );

    let (res1, res2) = tokio::join!(
        client.get(&search_url1).header("User-Agent", "LyricFlow/1.3.0").send(),
        client.get(&search_url2).header("User-Agent", "LyricFlow/1.3.0").send()
    );

    let mut raw_items: Vec<Value> = Vec::new();
    if let Ok(r) = res1 {
        if r.status().is_success() {
            if let Ok(arr) = r.json::<Vec<Value>>().await {
                raw_items.extend(arr);
            }
        }
    }
    if let Ok(r) = res2 {
        if r.status().is_success() {
            if let Ok(arr) = r.json::<Vec<Value>>().await {
                raw_items.extend(arr);
            }
        }
    }

    // Deduplicate by ID
    let mut seen_ids = std::collections::HashSet::new();
    for c in &candidates {
        seen_ids.insert(c.candidate_id.clone());
    }

    for item in raw_items {
        if let Some(id) = item["id"].as_i64() {
            let id_str = id.to_string();
            if !seen_ids.insert(id_str) {
                continue;
            }
            if let Some(candidate) = parse_lrclib_item(&item, &search_query, duration_sec) {
                // Only accept reasonable matches
                if candidate.score >= 0.65 {
                    candidates.push(candidate);
                }
            }
        }
    }

    // Sort candidates:
    // 1. LineSynced before PlainText (type_rank 0 vs 1)
    // 2. Duration proximity bucketed by 3-second bands (strictly transitive)
    // 3. Match score descending (using integer score rank for mathematically strict total order)
    candidates.sort_by_cached_key(|c| {
        let type_rank = if c.sync_type == SyncType::LineSynced { 0 } else { 1 };
        let bucket = if duration_sec > 0 {
            c.duration_diff_sec.unwrap_or(999).max(0) / 3
        } else {
            0
        };
        let score_val = if c.score.is_nan() { 0.0 } else { c.score.clamp(0.0, 1.0) };
        let score_rank = 10_000i32 - (score_val * 10_000.0) as i32;
        (type_rank, bucket, score_rank)
    });

    candidates
}

fn parse_lrclib_item(
    item: &Value,
    search_query: &str,
    target_duration: u32,
) -> Option<LyricsCandidate> {
    let synced = item["syncedLyrics"].as_str().unwrap_or("").trim();
    let plain = item["plainLyrics"].as_str().unwrap_or("").trim();

    let (raw_lrc, sync_type) = if !synced.is_empty() && has_lrc_timestamps(synced) {
        (synced.to_string(), SyncType::LineSynced)
    } else if !plain.is_empty() {
        (plain.to_string(), SyncType::PlainText)
    } else {
        return None;
    };

    let track_name = item["trackName"].as_str().unwrap_or("");
    let artist_name = item["artistName"].as_str().unwrap_or("");
    let candidate_query = format!("{} {}", track_name, artist_name);
    let score = compute_similarity_score(search_query, &candidate_query);

    let item_dur = item["duration"].as_f64().unwrap_or(0.0) as u32;
    let duration_diff_sec = if target_duration > 0 && item_dur > 0 {
        Some((item_dur as i32 - target_duration as i32).abs())
    } else {
        None
    };

    let id = item["id"].as_i64().map(|i| i.to_string()).unwrap_or_default();

    Some(LyricsCandidate {
        provider: "LRCLIB".to_string(),
        sync_type,
        raw_lrc,
        translation_lrc: None,
        parsed_lines: None,
        candidate_id: id,
        score,
        candidate_info: None,
        duration_diff_sec,
    })
}
