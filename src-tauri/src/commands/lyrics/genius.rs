use super::fuzzy::{clean_artist, clean_title, compute_similarity_score};
use super::models::{LyricsCandidate, SyncType};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GeniusAnnotation {
    pub fragment: String,
    pub text: String,
}

pub async fn search_genius(
    client: &Client,
    track: &str,
    artist: &str,
) -> Option<LyricsCandidate> {
    let clean_a = clean_artist(artist);
    let clean_t = clean_title(track);
    let query = format!("{} {}", clean_a, clean_t);

    let search_url = format!(
        "https://genius.com/api/search/multi?per_page=3&q={}",
        urlencoding::encode(&query)
    );

    let res = client
        .get(&search_url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
        .send()
        .await
        .ok()?;

    if !res.status().is_success() {
        return None;
    }

    let search_data: Value = res.json().await.ok()?;
    let sections = search_data["response"]["sections"].as_array()?;

    let mut song_hit = None;
    for sec in sections {
        let stype = sec["type"].as_str().unwrap_or("");
        if stype == "song" || stype == "top_hit" {
            if let Some(hits) = sec["hits"].as_array() {
                for hit in hits {
                    if hit["type"].as_str() == Some("song") {
                        song_hit = Some(hit["result"].clone());
                        break;
                    }
                }
            }
        }
        if song_hit.is_some() {
            break;
        }
    }

    let hit = song_hit?;
    let song_id = hit["id"].as_i64()?.to_string();
    let hit_title = hit["title"].as_str().unwrap_or("");
    let hit_artist = hit["primary_artist"]["name"].as_str().unwrap_or("");
    let candidate_query = format!("{} {}", hit_title, hit_artist);

    let score = compute_similarity_score(&query, &candidate_query);
    if score < 0.65 {
        return None;
    }

    // Attempt to scrape plain lyrics from song URL if available
    let song_path = hit["path"].as_str()?;
    let full_url = format!("https://genius.com{}", song_path);

    let page_res = client
        .get(&full_url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .send()
        .await
        .ok()?;

    if !page_res.status().is_success() {
        return None;
    }

    let html = page_res.text().await.ok()?;
    let lyrics_text = extract_lyrics_from_genius_html(&html);

    if lyrics_text.trim().is_empty() {
        return None;
    }

    Some(LyricsCandidate {
        provider: "Genius".to_string(),
        sync_type: SyncType::PlainText,
        raw_lrc: lyrics_text,
        translation_lrc: None,
        parsed_lines: None,
        candidate_id: song_id,
        score,
        candidate_info: Some("Genius".to_string()),
        duration_diff_sec: None,
    })
}

fn extract_lyrics_from_genius_html(html: &str) -> String {
    let mut out = String::new();
    let container_marker = "data-lyrics-container=\"true\"";

    for part in html.split(container_marker).skip(1) {
        if let Some(tag_end) = part.find('>') {
            let content_after = &part[tag_end + 1..];
            // Read until next container closing or next section
            let end_idx = content_after.find("</div>").unwrap_or(content_after.len());
            let chunk = &content_after[..end_idx];

            let cleaned = chunk
                .replace("<br/>", "\n")
                .replace("<br />", "\n")
                .replace("<br>", "\n");

            // Strip any remaining html tags
            let mut in_tag = false;
            let mut line_buf = String::new();
            for ch in cleaned.chars() {
                if ch == '<' {
                    in_tag = true;
                } else if ch == '>' {
                    in_tag = false;
                } else if !in_tag {
                    line_buf.push(ch);
                }
            }
            out.push_str(&line_buf);
            out.push('\n');
        }
    }

    out.trim().to_string()
}

pub async fn fetch_genius_fact(
    client: &Client,
    track_name: &str,
    artist_name: &str,
) -> Result<Option<String>, String> {
    let clean_a = clean_artist(artist_name);
    let clean_t = clean_title(track_name);
    let query = format!("{} {}", clean_a, clean_t);

    let search_url = format!(
        "https://genius.com/api/search/multi?per_page=1&q={}",
        urlencoding::encode(&query)
    );

    let res = client
        .get(&search_url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Ok(None);
    }

    let search_data: Value = res.json().await.map_err(|e| e.to_string())?;
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
            if song_id.is_some() {
                break;
            }
        }
    }

    let Some(id) = song_id else {
        return Ok(None);
    };

    let fact_url = format!("https://genius.com/api/songs/{id}?text_format=plain");
    let fact_res = client
        .get(&fact_url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !fact_res.status().is_success() {
        return Ok(None);
    }

    let song_data: Value = fact_res.json().await.map_err(|e| e.to_string())?;
    let plain = song_data["response"]["song"]["description"]["plain"]
        .as_str()
        .map(|s| s.to_string());
    Ok(plain)
}

pub async fn get_genius_annotations(
    client: &Client,
    artist: &str,
    track: &str,
) -> Result<Vec<GeniusAnnotation>, String> {
    let clean_a = clean_artist(artist);
    let clean_t = clean_title(track);
    let query = format!("{} {}", clean_a, clean_t);

    let search_url = format!(
        "https://genius.com/api/search/multi?per_page=1&q={}",
        urlencoding::encode(&query)
    );

    let res = client
        .get(&search_url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Ok(vec![]);
    }

    let search_data: Value = res.json().await.map_err(|e| e.to_string())?;
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
            if song_id.is_some() {
                break;
            }
        }
    }

    let Some(id) = song_id else {
        return Ok(vec![]);
    };

    let ref_url = format!("https://genius.com/api/referents?song_id={id}&per_page=50&text_format=plain");
    let ref_res = client
        .get(&ref_url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !ref_res.status().is_success() {
        return Ok(vec![]);
    }

    let ref_data: Value = ref_res.json().await.map_err(|e| e.to_string())?;
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
