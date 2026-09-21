use super::fuzzy::{clean_artist, clean_title};
use super::genius::search_genius;
use super::lrclib::search_lrclib;
use super::models::{LyricsCandidate, LyricsSearchOptions, SyncType};
use super::musixmatch::search_musixmatch;
use super::netease::search_netease;
use reqwest::Client;
use serde_json::Value;

pub async fn query_all_candidates(
    client: &Client,
    track: &str,
    artist: &str,
    duration_ms: u32,
    options: &LyricsSearchOptions,
) -> Vec<LyricsCandidate> {
    let clean_t = clean_title(track);
    let clean_a = clean_artist(artist);
    let duration_sec = duration_ms / 1000;

    // --- TIER 1: Simultaneous Multi Query (Cloudflare Proxy + LRCLIB + Musixmatch) ---
    let proxy_task = search_cloudflare_proxy(
        client,
        &clean_t,
        &clean_a,
        duration_sec,
        options.spotify_token.as_deref(),
    );
    let mxm_task = search_musixmatch(
        client,
        &clean_t,
        &clean_a,
        options.musixmatch_token.as_deref(),
    );
    let lrclib_task = search_lrclib(client, &clean_t, &clean_a, duration_sec);

    let (proxy_res, mxm_res, lrclib_res) = tokio::join!(proxy_task, mxm_task, lrclib_task);

    let mut tier1_candidates: Vec<LyricsCandidate> = Vec::new();
    if let Some(proxy_cand) = proxy_res {
        tier1_candidates.push(proxy_cand);
    }
    if let Some(mxm_cand) = mxm_res {
        tier1_candidates.push(mxm_cand);
    }
    tier1_candidates.extend(lrclib_res);

    let has_tier1_synced = tier1_candidates
        .iter()
        .any(|c| c.sync_type != SyncType::PlainText);

    // If Tier 1 found synced lyrics and this is the default primary lookup (candidate_index == 0),
    // return immediately without triggering Tier 2 network calls.
    if options.candidate_index == 0 && has_tier1_synced {
        sort_lyrics_candidates(&mut tier1_candidates);
        label_candidates(&mut tier1_candidates);
        return tier1_candidates;
    }

    // --- TIER 2: Secondary Providers & Fallbacks ---
    // Triggered only if Tier 1 yielded no synced lyrics or if user explicitly cycles candidates
    let mut tier2_candidates: Vec<LyricsCandidate> = Vec::new();

    // 1. Spotify Color-Lyrics (if token and track_id provided)
    if let (Some(token), Some(t_id)) = (&options.spotify_token, &options.spotify_track_id) {
        if !token.is_empty() && !t_id.is_empty() {
            let sp_url = format!(
                "https://spclient.wg.spotify.com/color-lyrics/v2/track/{}?format=json&vType=0&market=from_token",
                t_id
            );
            if let Ok(res) = client
                .get(&sp_url)
                .header("Authorization", format!("Bearer {token}"))
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
                .header("App-Platform", "WebPlayer")
                .send()
                .await
            {
                if res.status().is_success() {
                    if let Ok(json) = res.json::<Value>().await {
                        if let Some(candidate) = parse_spotify_color_lyrics(&json, t_id) {
                            tier2_candidates.push(candidate);
                        }
                    }
                }
            }
        }
    }

    // 2. NetEase Cloud Music (Line sync + translations)
    let netease_res = search_netease(client, &clean_t, &clean_a).await;
    tier2_candidates.extend(netease_res);

    // 3. Genius plaintext fallback if still no synced candidates across Tier 1 + Tier 2
    let has_any_synced = has_tier1_synced
        || tier2_candidates.iter().any(|c| c.sync_type != SyncType::PlainText);

    if !has_any_synced {
        if let Some(genius_cand) = search_genius(client, &clean_t, &clean_a).await {
            tier2_candidates.push(genius_cand);
        }
    }

    let mut all_candidates = tier1_candidates;
    all_candidates.extend(tier2_candidates);

    sort_lyrics_candidates(&mut all_candidates);
    label_candidates(&mut all_candidates);

    all_candidates
}

fn sort_lyrics_candidates(candidates: &mut [LyricsCandidate]) {
    candidates.sort_by_cached_key(|c| {
        let type_rank = match (c.sync_type, c.provider.as_str()) {
            (SyncType::WordSynced, "Musixmatch") => 0,
            (SyncType::WordSynced, _) => 1,
            (SyncType::LineSynced, "Spotify") => 2,
            (SyncType::LineSynced, "Spotify (Proxy)") => 2,
            (SyncType::LineSynced, "LRCLIB") => 3,
            (SyncType::LineSynced, "LRCLIB (Proxy)") => 3,
            (SyncType::LineSynced, "Musixmatch") => 4,
            (SyncType::LineSynced, _) => 5,
            (SyncType::PlainText, _) => 6,
        };
        let score_val = if c.score.is_nan() { 0.0 } else { c.score.clamp(0.0, 1.0) };
        let score_rank = 10_000i32 - (score_val * 10_000.0) as i32;
        (type_rank, score_rank)
    });
}

fn label_candidates(candidates: &mut [LyricsCandidate]) {
    let total = candidates.len();
    for (idx, cand) in candidates.iter_mut().enumerate() {
        if total > 1 {
            cand.candidate_info = Some(format!("#{}/{} ({})", idx + 1, total, cand.provider));
        } else {
            cand.candidate_info = Some(cand.provider.clone());
        }
    }
}

pub async fn search_best_lyrics(
    client: &Client,
    track: &str,
    artist: &str,
    duration_ms: u32,
    options: LyricsSearchOptions,
) -> Option<LyricsCandidate> {
    let candidates = query_all_candidates(client, track, artist, duration_ms, &options).await;
    if candidates.is_empty() {
        return None;
    }

    let chosen_idx = options.candidate_index % candidates.len();
    candidates.into_iter().nth(chosen_idx)
}

fn parse_spotify_color_lyrics(json: &Value, track_id: &str) -> Option<LyricsCandidate> {
    let lyrics_obj = &json["lyrics"];
    let lines = lyrics_obj["lines"].as_array()?;
    if lines.is_empty() {
        return None;
    }

    let sync_type_str = lyrics_obj["syncType"].as_str().unwrap_or("");
    let is_word_synced = sync_type_str == "LINE_SYNCED" && lines.iter().any(|l| l["syllables"].is_array());
    let sync_type = if is_word_synced {
        SyncType::WordSynced
    } else if sync_type_str == "LINE_SYNCED" {
        SyncType::LineSynced
    } else {
        SyncType::PlainText
    };

    let mut raw_lrc = String::new();
    let mut parsed_lines = Vec::new();

    for line in lines {
        let start_ms = line["startTimeMs"].as_str().and_then(|s| s.parse::<u32>().ok()).unwrap_or(0);
        let text = line["words"].as_str().unwrap_or("").trim();
        if text.is_empty() {
            continue;
        }

        let min = start_ms / 60000;
        let sec = (start_ms % 60000) / 1000;
        let cs = (start_ms % 1000) / 10;
        raw_lrc.push_str(&format!("[{:02}:{:02}.{:02}] {}\n", min, sec, cs, text));

        let mut words = Vec::new();
        if let Some(syllables) = line["syllables"].as_array() {
            for syl in syllables {
                let syl_text = syl["text"].as_str().unwrap_or("").trim();
                let syl_offset = syl["offsetMs"].as_str().and_then(|s| s.parse::<u32>().ok()).unwrap_or(0);
                if !syl_text.is_empty() {
                    words.push(super::models::WordTiming {
                        text: syl_text.to_string(),
                        time_ms: start_ms + syl_offset,
                        duration_ms: None,
                    });
                }
            }
        }

        parsed_lines.push(super::models::LyricLineParsed {
            time_ms: start_ms,
            text: text.to_string(),
            words,
            sub_text: None,
        });
    }

    Some(LyricsCandidate {
        provider: "Spotify".to_string(),
        sync_type,
        raw_lrc,
        translation_lrc: None,
        parsed_lines: Some(parsed_lines),
        candidate_id: track_id.to_string(),
        score: 1.0,
        candidate_info: Some("Spotify".to_string()),
        duration_diff_sec: None,
    })
}

async fn search_cloudflare_proxy(
    client: &Client,
    track: &str,
    artist: &str,
    duration_sec: u32,
    token: Option<&str>,
) -> Option<LyricsCandidate> {
    let clean_t = clean_title(track);
    let clean_a = clean_artist(artist);
    let mut url = format!(
        "https://lyricsplus.mathurdeepit12.workers.dev/lyrics?artist={}&title={}",
        urlencoding::encode(&clean_a),
        urlencoding::encode(&clean_t)
    );
    if duration_sec > 0 {
        url.push_str(&format!("&duration={}", duration_sec));
    }
    if let Some(tok) = token {
        if !tok.is_empty() {
            url.push_str(&format!("&token={}", urlencoding::encode(tok)));
        }
    }
    let res = client
        .get(&url)
        .header("User-Agent", "LyricFlow/1.3.0")
        .send()
        .await
        .ok()?;
    if !res.status().is_success() {
        return None;
    }
    let data = res.json::<Value>().await.ok()?;
    let source = data["source"].as_str().unwrap_or("Proxy");
    let sync_type_str = data["syncType"].as_str().unwrap_or("LINE_SYNCED");
    let sync_type = if sync_type_str == "WORD_SYNCED" {
        SyncType::WordSynced
    } else if sync_type_str == "LINE_SYNCED" {
        SyncType::LineSynced
    } else {
        SyncType::PlainText
    };

    if source == "Spotify" {
        if let Some(lines) = data["lines"].as_array() {
            let mut raw_lrc = String::new();
            for l in lines {
                let start_ms = l["startTimeMs"].as_str().and_then(|s| s.parse::<u32>().ok()).unwrap_or(0);
                let text = l["words"].as_str().unwrap_or("");
                let min = start_ms / 60000;
                let sec = (start_ms % 60000) / 1000;
                let cs = (start_ms % 1000) / 10;
                raw_lrc.push_str(&format!("[{:02}:{:02}.{:02}] {}\n", min, sec, cs, text));
            }
            return Some(LyricsCandidate {
                provider: "Spotify (Proxy)".to_string(),
                sync_type,
                raw_lrc,
                translation_lrc: None,
                parsed_lines: None,
                candidate_id: format!("spotify_{}_{}", clean_a, clean_t),
                score: 1.0,
                candidate_info: Some("Spotify (Proxy)".to_string()),
                duration_diff_sec: Some(0),
            });
        }
    } else if let Some(raw_lrc) = data["rawLRC"].as_str() {
        if !raw_lrc.is_empty() {
            return Some(LyricsCandidate {
                provider: "LRCLIB (Proxy)".to_string(),
                sync_type,
                raw_lrc: raw_lrc.to_string(),
                translation_lrc: None,
                parsed_lines: None,
                candidate_id: format!("proxy_{}_{}", clean_a, clean_t),
                score: 0.95,
                candidate_info: Some("LRCLIB (Proxy)".to_string()),
                duration_diff_sec: Some(0),
            });
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::lyrics::models::{LyricsCandidate, SyncType};

    fn make_dummy_cand(provider: &str, sync_type: SyncType, score: f32) -> LyricsCandidate {
        LyricsCandidate {
            provider: provider.to_string(),
            sync_type,
            raw_lrc: String::new(),
            translation_lrc: None,
            parsed_lines: None,
            candidate_id: "test".to_string(),
            score,
            candidate_info: None,
            duration_diff_sec: None,
        }
    }

    #[test]
    fn test_musixmatch_wordsync_priority() {
        let mut candidates = vec![
            make_dummy_cand("LRCLIB", SyncType::LineSynced, 0.95),
            make_dummy_cand("Musixmatch", SyncType::WordSynced, 0.90),
            make_dummy_cand("NetEase", SyncType::LineSynced, 0.99),
        ];
        sort_lyrics_candidates(&mut candidates);
        assert_eq!(candidates[0].provider, "Musixmatch");
        assert_eq!(candidates[0].sync_type, SyncType::WordSynced);
        assert_eq!(candidates[1].provider, "LRCLIB");
        assert_eq!(candidates[2].provider, "NetEase");
    }

    #[test]
    fn test_lrclib_linesync_priority_over_musixmatch_linesync() {
        let mut candidates = vec![
            make_dummy_cand("Musixmatch", SyncType::LineSynced, 0.95),
            make_dummy_cand("LRCLIB", SyncType::LineSynced, 0.90),
            make_dummy_cand("NetEase", SyncType::LineSynced, 0.99),
        ];
        sort_lyrics_candidates(&mut candidates);
        assert_eq!(candidates[0].provider, "LRCLIB");
        assert_eq!(candidates[1].provider, "Musixmatch");
        assert_eq!(candidates[2].provider, "NetEase");
    }

    #[test]
    fn test_linesync_over_plaintext() {
        let mut candidates = vec![
            make_dummy_cand("LRCLIB", SyncType::PlainText, 0.99),
            make_dummy_cand("Musixmatch", SyncType::PlainText, 0.99),
            make_dummy_cand("NetEase", SyncType::LineSynced, 0.80),
        ];
        sort_lyrics_candidates(&mut candidates);
        assert_eq!(candidates[0].provider, "NetEase");
        assert_eq!(candidates[0].sync_type, SyncType::LineSynced);
    }
}
