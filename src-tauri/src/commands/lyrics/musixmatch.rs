use super::fuzzy::{clean_artist, clean_title, compute_similarity_score, has_lrc_timestamps};
use super::models::{LyricLineParsed, LyricsCandidate, SyncType, WordTiming};
use reqwest::header::{HeaderMap, HeaderValue};
use reqwest::Client;
use serde_json::Value;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

static CACHED_TOKEN: Mutex<Option<(String, u64)>> = Mutex::new(None);

pub async fn search_musixmatch(
    client: &Client,
    track: &str,
    artist: &str,
    custom_token: Option<&str>,
) -> Option<LyricsCandidate> {
    let clean_t = clean_title(track);
    let clean_a = clean_artist(artist);
    let search_query = format!("{} {}", clean_t, clean_a);

    let token = get_or_fetch_token(client, custom_token).await?;

    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);

    let url = format!(
        "https://apic-desktop.musixmatch.com/ws/1.1/macro.subtitles.get?format=json&namespace=lyrics_richsynced&optional_calls=track.richsync&subtitle_format=lrc&q_track={}&q_artist={}&app_id=web-desktop-app-v1.0&usertoken={}&t={}",
        urlencoding::encode(&clean_t),
        urlencoding::encode(&clean_a),
        urlencoding::encode(&token),
        now_ms
    );

    let mut headers = HeaderMap::new();
    headers.insert(
        "authority",
        HeaderValue::from_static("apic-desktop.musixmatch.com"),
    );
    headers.insert(
        "cookie",
        HeaderValue::from_static("AWSELBCORS=0; AWSELB=0"),
    );
    headers.insert(
        "User-Agent",
        HeaderValue::from_static("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"),
    );

    let res = match client.get(&url).headers(headers).send().await {
        Ok(r) => r,
        Err(_) => return None,
    };

    if !res.status().is_success() {
        return None;
    }

    let json: Value = match res.json().await {
        Ok(j) => j,
        Err(_) => return None,
    };

    let macro_calls = &json["message"]["body"]["macro_calls"];
    if !macro_calls.is_object() {
        return None;
    }

    // Verify track metadata similarity to prevent false matches
    let matched_track = &macro_calls["matcher.track.get"]["message"]["body"]["track"];
    let matched_title = matched_track["track_name"].as_str().unwrap_or("");
    let matched_artist = matched_track["artist_name"].as_str().unwrap_or("");
    let matched_query = format!("{} {}", matched_title, matched_artist);

    let score = compute_similarity_score(&search_query, &matched_query);
    // Reject if score is too low or if dummy data
    if score < 0.65 || matched_title.to_lowercase() == "nokia" && !clean_t.to_lowercase().contains("nokia") {
        return None;
    }

    let track_id = matched_track["track_id"]
        .as_i64()
        .map(|i| i.to_string())
        .unwrap_or_else(|| "mxm_match".to_string());

    // 1. Try RichSync (Word-by-Word synced)
    let richsync_call = &macro_calls["track.richsync.get"];
    if richsync_call["message"]["header"]["status_code"].as_i64() == Some(200) {
        if let Some(rich_body_str) = richsync_call["message"]["body"]["richsync"]["richsync_body"].as_str() {
            if let Ok(rich_json) = serde_json::from_str::<Value>(rich_body_str) {
                if let Some((enhanced_lrc, parsed_lines)) = parse_richsync_json(&rich_json) {
                    if !parsed_lines.is_empty() {
                        return Some(LyricsCandidate {
                            provider: "Musixmatch".to_string(),
                            sync_type: SyncType::WordSynced,
                            raw_lrc: enhanced_lrc,
                            translation_lrc: None,
                            parsed_lines: Some(parsed_lines),
                            candidate_id: track_id,
                            score,
                            candidate_info: Some("RichSync".to_string()),
                            duration_diff_sec: None,
                        });
                    }
                }
            }
        }
    }

    // 2. Try Subtitles (Line-synced LRC)
    let sub_call = &macro_calls["track.subtitles.get"];
    if sub_call["message"]["header"]["status_code"].as_i64() == Some(200) {
        if let Some(sub_list) = sub_call["message"]["body"]["subtitle_list"].as_array() {
            if let Some(first_sub) = sub_list.first() {
                if let Some(lrc_body) = first_sub["subtitle"]["subtitle_body"].as_str() {
                    let trimmed = lrc_body.trim();
                    if !trimmed.is_empty() && has_lrc_timestamps(trimmed) {
                        return Some(LyricsCandidate {
                            provider: "Musixmatch".to_string(),
                            sync_type: SyncType::LineSynced,
                            raw_lrc: trimmed.to_string(),
                            translation_lrc: None,
                            parsed_lines: None,
                            candidate_id: track_id,
                            score,
                            candidate_info: Some("Subtitles".to_string()),
                            duration_diff_sec: None,
                        });
                    }
                }
            }
        }
    }

    // 3. Try Plaintext Lyrics
    let lyrics_call = &macro_calls["track.lyrics.get"];
    if lyrics_call["message"]["header"]["status_code"].as_i64() == Some(200) {
        if let Some(plain_body) = lyrics_call["message"]["body"]["lyrics"]["lyrics_body"].as_str() {
            let trimmed = plain_body.trim();
            if !trimmed.is_empty() && trimmed.to_lowercase() != "instrumental" {
                return Some(LyricsCandidate {
                    provider: "Musixmatch".to_string(),
                    sync_type: SyncType::PlainText,
                    raw_lrc: trimmed.to_string(),
                    translation_lrc: None,
                    parsed_lines: None,
                    candidate_id: track_id,
                    score,
                    candidate_info: Some("Plain".to_string()),
                    duration_diff_sec: None,
                });
            }
        }
    }

    None
}

async fn get_or_fetch_token(client: &Client, custom_token: Option<&str>) -> Option<String> {
    if let Some(tok) = custom_token {
        let trimmed = tok.trim();
        if !trimmed.is_empty() && trimmed != "00000000000000000000000000000000000000000000000000000000" {
            return Some(trimmed.to_string());
        }
    }

    let now_sec = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    // Check cached token (valid for 10 minutes = 600s)
    if let Ok(guard) = CACHED_TOKEN.lock() {
        if let Some((ref tok, exp)) = *guard {
            if now_sec < exp {
                return Some(tok.clone());
            }
        }
    }

    // Fetch token from Musixmatch
    let now_ms = now_sec * 1000;
    let url = format!(
        "https://apic-desktop.musixmatch.com/ws/1.1/token.get?app_id=web-desktop-app-v1.0&user_language=en&t={}",
        now_ms
    );

    let mut headers = HeaderMap::new();
    headers.insert(
        "authority",
        HeaderValue::from_static("apic-desktop.musixmatch.com"),
    );
    headers.insert(
        "cookie",
        HeaderValue::from_static("AWSELBCORS=0; AWSELB=0"),
    );
    headers.insert(
        "User-Agent",
        HeaderValue::from_static("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"),
    );

    if let Ok(res) = client.get(&url).headers(headers).send().await {
        if res.status().is_success() {
            if let Ok(json) = res.json::<Value>().await {
                if let Some(tok) = json["message"]["body"]["user_token"].as_str() {
                    let tok_str = tok.to_string();
                    if tok_str != "00000000000000000000000000000000000000000000000000000000" {
                        if let Ok(mut guard) = CACHED_TOKEN.lock() {
                            *guard = Some((tok_str.clone(), now_sec + 600));
                        }
                        return Some(tok_str);
                    }
                }
            }
        }
    }

    None
}

/// Parses Musixmatch RichSync JSON array into Enhanced LRC format and LyricLineParsed array
fn parse_richsync_json(json: &Value) -> Option<(String, Vec<LyricLineParsed>)> {
    let arr = json.as_array()?;
    let mut enhanced_lrc = String::new();
    let mut parsed_lines = Vec::new();

    for line_val in arr {
        let ts = line_val["ts"].as_f64()?;
        let line_time_ms = (ts * 1000.0) as u32;
        let l_words = line_val["l"].as_array()?;

        let mut line_text_parts = Vec::new();
        let mut words = Vec::new();
        let mut lrc_line = format!("[{}] ", format_lrc_timestamp(ts));

        for word_val in l_words {
            let c = word_val["c"].as_str().unwrap_or("").trim();
            let o = word_val["o"].as_f64().unwrap_or(0.0);
            let word_time_ms = ((ts + o) * 1000.0) as u32;

            if !c.is_empty() {
                line_text_parts.push(c);
                lrc_line.push_str(&format!("<{}> {} ", format_lrc_timestamp(ts + o), c));
                words.push(WordTiming {
                    text: c.to_string(),
                    time_ms: word_time_ms,
                    duration_ms: None,
                });
            }
        }

        lrc_line.push('\n');
        enhanced_lrc.push_str(&lrc_line);

        let full_text = line_text_parts.join(" ");
        if !full_text.is_empty() {
            parsed_lines.push(LyricLineParsed {
                time_ms: line_time_ms,
                text: full_text,
                words,
                sub_text: None,
            });
        }
    }

    Some((enhanced_lrc, parsed_lines))
}

fn format_lrc_timestamp(sec: f64) -> String {
    let total_cs = (sec * 100.0) as u64;
    let cs = total_cs % 100;
    let total_sec = total_cs / 100;
    let s = total_sec % 60;
    let m = total_sec / 60;
    format!("{:02}:{:02}.{:02}", m, s, cs)
}
