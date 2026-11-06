use super::fuzzy::{clean_artist, clean_title};
use super::genius::search_genius;
use super::lrclib::search_lrclib;
use super::models::{LyricLineParsed, LyricsCandidate, LyricsSearchOptions, SyncType, WordTiming};
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

    // --- TIER 1: Multi Query (Cloudflare Proxy + LRCLIB + Musixmatch + NetEase) ---
    let mut tier1_candidates: Vec<LyricsCandidate> = Vec::new();

    if options.word_sync_upgrade {
        // Targeted Word-Sync Upgrade Probe:
        // Dedicated search querying word-level providers (qApple, NetEase YRC & Musixmatch)
        // without short race timeouts, ensuring complete syllable timings.
        let qapple_task = search_qapple(client, track, artist, duration_ms);
        let mxm_task = search_musixmatch(
            client,
            &clean_t,
            &clean_a,
            options.musixmatch_token.as_deref(),
        );
        let netease_task = search_netease(client, &clean_t, &clean_a, true);

        let (qapple_res, mxm_res, netease_res) = tokio::join!(qapple_task, mxm_task, netease_task);

        if let Some(q_cand) = qapple_res {
            if q_cand.sync_type == SyncType::WordSynced {
                tier1_candidates.push(q_cand);
            }
        }
        if let Some(mxm_cand) = mxm_res {
            if mxm_cand.sync_type == SyncType::WordSynced {
                tier1_candidates.push(mxm_cand);
            }
        }
        for n_cand in netease_res {
            if n_cand.sync_type == SyncType::WordSynced {
                tier1_candidates.push(n_cand);
            }
        }

        sort_lyrics_candidates(&mut tier1_candidates, &options.preferred_providers);
        label_candidates(&mut tier1_candidates);
        return tier1_candidates;
    }

    if options.candidate_index == 0 {
        // Fast-path priority race: qApple (Word-by-word) + LRCLIB (sub-250ms)
        let fast_race = async {
            let (q, l) = tokio::join!(
                tokio::time::timeout(
                    std::time::Duration::from_millis(2200),
                    search_qapple(client, track, artist, duration_ms)
                ),
                search_lrclib(client, &clean_t, &clean_a, duration_sec)
            );
            (q.ok().flatten(), l)
        };

        let slow_queries = async {
            let (m, n) = tokio::join!(
                search_musixmatch(
                    client,
                    &clean_t,
                    &clean_a,
                    options.musixmatch_token.as_deref(),
                ),
                search_netease(client, &clean_t, &clean_a, options.netease_word_by_word)
            );
            (m, n)
        };

        let slow_timeout_ms = if options.netease_word_by_word
            || options
                .preferred_providers
                .iter()
                .any(|p| p.to_lowercase().contains("netease"))
        {
            2000
        } else {
            650
        };

        // Run fast race, capping slow queries (650ms baseline, 2000ms for NetEase YRC syllable timing)
        let (fast_res, slow_res) = tokio::join!(
            fast_race,
            tokio::time::timeout(
                std::time::Duration::from_millis(slow_timeout_ms),
                slow_queries
            )
        );

        let (qapple_res, lrclib_res) = fast_res;
        if let Some(q_cand) = qapple_res {
            tier1_candidates.push(q_cand);
        }
        tier1_candidates.extend(lrclib_res);

        if let Ok((mxm_res, netease_res)) = slow_res {
            if let Some(mxm_cand) = mxm_res {
                tier1_candidates.push(mxm_cand);
            }
            tier1_candidates.extend(netease_res);
        }
    } else {
        let qapple_task = search_qapple(client, track, artist, duration_ms);
        let mxm_task = search_musixmatch(
            client,
            &clean_t,
            &clean_a,
            options.musixmatch_token.as_deref(),
        );
        let lrclib_task = search_lrclib(client, &clean_t, &clean_a, duration_sec);
        let netease_task = search_netease(client, &clean_t, &clean_a, options.netease_word_by_word);

        let (qapple_res, mxm_res, lrclib_res, netease_res) =
            tokio::join!(qapple_task, mxm_task, lrclib_task, netease_task);

        if let Some(q_cand) = qapple_res {
            tier1_candidates.push(q_cand);
        }
        if let Some(mxm_cand) = mxm_res {
            tier1_candidates.push(mxm_cand);
        }
        tier1_candidates.extend(lrclib_res);
        tier1_candidates.extend(netease_res);
    }

    let has_tier1_synced = tier1_candidates
        .iter()
        .any(|c| c.sync_type != SyncType::PlainText);

    let has_tier1_word_synced = tier1_candidates
        .iter()
        .any(|c| c.sync_type == SyncType::WordSynced);

    // A line-synced fast response must not end the default lookup while a
    // word-synced provider may still be available in the secondary tier.
    if options.candidate_index == 0 && has_tier1_word_synced {
        sort_lyrics_candidates(&mut tier1_candidates, &options.preferred_providers);
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

    // 2. Genius plaintext fallback if still no synced candidates across Tier 1 + Tier 2
    let has_any_synced = has_tier1_synced
        || tier2_candidates
            .iter()
            .any(|c| c.sync_type != SyncType::PlainText);

    if !has_any_synced {
        if let Some(genius_cand) = search_genius(client, &clean_t, &clean_a).await {
            tier2_candidates.push(genius_cand);
        }
    }

    let mut all_candidates = tier1_candidates;
    all_candidates.extend(tier2_candidates);

    sort_lyrics_candidates(&mut all_candidates, &options.preferred_providers);
    label_candidates(&mut all_candidates);

    all_candidates
}

fn sort_lyrics_candidates(candidates: &mut [LyricsCandidate], preferred_providers: &[String]) {
    candidates.sort_by_cached_key(|c| {
        let pref_idx = if !preferred_providers.is_empty() {
            let p_lower = c.provider.to_lowercase();
            preferred_providers
                .iter()
                .position(|p| {
                    let p_clean = p.to_lowercase();
                    p_lower.contains(&p_clean) || p_clean.contains(&p_lower)
                })
                .unwrap_or(99)
        } else {
            99
        };

        let type_rank = match (c.sync_type, c.provider.as_str()) {
            (SyncType::WordSynced, "LyricsPlus (qApple)")
            | (SyncType::WordSynced, "qApple")
            | (SyncType::WordSynced, "Apple Music") => 0,
            (SyncType::WordSynced, "Musixmatch") => 0,
            (SyncType::WordSynced, "NetEase") | (SyncType::WordSynced, "NetEase (YRC)") => 1,
            (SyncType::WordSynced, _) => 1,
            (SyncType::LineSynced, "Spotify") => 2,
            (SyncType::LineSynced, "LRCLIB") => 3,
            (SyncType::LineSynced, "Musixmatch") => 4,
            (SyncType::LineSynced, "NetEase") => 5,
            (SyncType::LineSynced, _) => 6,
            (SyncType::PlainText, _) => 7,
        };
        let score_val = if c.score.is_nan() {
            0.0
        } else {
            c.score.clamp(0.0, 1.0)
        };
        let score_rank = 10_000i32 - (score_val * 10_000.0) as i32;

        // Sync quality is the top-level preference: a configured line-synced
        // provider must never outrank a word-synced candidate. Within each
        // sync tier, honor the user's provider ordering, then use the default
        // provider hierarchy (Musixmatch, NetEase, Spotify, LRCLIB).
        let sync_rank = match c.sync_type {
            SyncType::WordSynced => 0,
            SyncType::LineSynced => 1,
            SyncType::PlainText => 2,
        };

        let pref_group = if pref_idx < 99 && c.sync_type != SyncType::PlainText {
            pref_idx
        } else {
            99
        };

        (sync_rank, pref_group, type_rank, score_rank)
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
    select_candidate(candidates, options.candidate_index)
}

fn select_candidate(
    candidates: Vec<LyricsCandidate>,
    candidate_index: usize,
) -> Option<LyricsCandidate> {
    if candidates.is_empty() {
        return None;
    }

    let preferred_sync = if candidates
        .iter()
        .any(|c| c.sync_type == SyncType::WordSynced)
    {
        SyncType::WordSynced
    } else if candidates
        .iter()
        .any(|c| c.sync_type == SyncType::LineSynced)
    {
        SyncType::LineSynced
    } else {
        SyncType::PlainText
    };
    let preferred_candidates: Vec<_> = candidates
        .into_iter()
        .filter(|candidate| candidate.sync_type == preferred_sync)
        .collect();
    if preferred_candidates.is_empty() {
        return None;
    }
    let chosen_idx = candidate_index % preferred_candidates.len();
    preferred_candidates.into_iter().nth(chosen_idx)
}

fn parse_spotify_color_lyrics(json: &Value, track_id: &str) -> Option<LyricsCandidate> {
    let lyrics_obj = &json["lyrics"];
    let lines = lyrics_obj["lines"].as_array()?;
    if lines.is_empty() {
        return None;
    }

    let sync_type_str = lyrics_obj["syncType"].as_str().unwrap_or("");
    let is_word_synced =
        sync_type_str == "LINE_SYNCED" && lines.iter().any(|l| l["syllables"].is_array());
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
        let start_ms = line["startTimeMs"]
            .as_str()
            .and_then(|s| s.parse::<u32>().ok())
            .unwrap_or(0);
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
                let syl_offset = syl["offsetMs"]
                    .as_str()
                    .and_then(|s| s.parse::<u32>().ok())
                    .unwrap_or(0);
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
            singer: None,
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

#[allow(dead_code)]
fn strip_accents(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            'á' | 'à' | 'ä' | 'â' | 'ã' | 'å' => 'a',
            'é' | 'è' | 'ë' | 'ê' => 'e',
            'í' | 'ì' | 'ï' | 'î' => 'i',
            'ó' | 'ò' | 'ö' | 'ô' | 'õ' => 'o',
            'ú' | 'ù' | 'ü' | 'û' => 'u',
            'ñ' => 'n',
            'Á' | 'À' | 'Ä' | 'Â' | 'Ã' | 'Å' => 'A',
            'É' | 'È' | 'Ë' | 'Ê' => 'E',
            'Í' | 'Ì' | 'Ï' | 'Î' => 'I',
            'Ó' | 'Ò' | 'Ö' | 'Ô' | 'Õ' => 'O',
            'Ú' | 'Ù' | 'Ü' | 'Û' => 'U',
            'Ñ' => 'N',
            other => other,
        })
        .collect()
}

fn parse_enhanced_lrc_lines(raw: &str) -> Vec<LyricLineParsed> {
    let mut parsed_lines = Vec::new();

    for line in raw.lines() {
        let trimmed = line.trim();
        if !trimmed.starts_with('[') {
            continue;
        }

        let close_bracket = match trimmed.find(']') {
            Some(idx) => idx,
            None => continue,
        };

        let tag = &trimmed[1..close_bracket];
        let mut parts = tag.split(':');
        let min: u32 = match parts.next().and_then(|s| s.parse().ok()) {
            Some(m) => m,
            None => continue,
        };
        let sec_str = match parts.next() {
            Some(s) => s,
            None => continue,
        };
        let (sec, ms) = if let Some(dot_idx) = sec_str.find('.') {
            let s: u32 = sec_str[..dot_idx].parse().unwrap_or(0);
            let ms_part = &sec_str[dot_idx + 1..];
            let ms_val: u32 = ms_part.parse().unwrap_or(0);
            let ms_scale = if ms_part.len() == 2 { ms_val * 10 } else { ms_val };
            (s, ms_scale)
        } else {
            (sec_str.parse().unwrap_or(0), 0)
        };
        let line_time_ms = min * 60000 + sec * 1000 + ms;

        let content = trimmed[close_bracket + 1..].trim();
        if content.is_empty() {
            continue;
        }

        let mut words = Vec::new();
        let mut line_text_accum = String::new();

        if content.contains('<') && content.contains('>') {
            let mut tag_starts = Vec::new();
            let mut tag_ends = Vec::new();
            let mut tag_times = Vec::new();

            let bytes = content.as_bytes();
            let mut i = 0;
            while i < bytes.len() {
                if bytes[i] == b'<' {
                    if let Some(close_rel) = content[i..].find('>') {
                        let end_pos = i + close_rel;
                        let tag_str = &content[i + 1..end_pos];
                        let mut t_parts = tag_str.split(':');
                        if let (Some(t_min_s), Some(t_sec_s)) = (t_parts.next(), t_parts.next()) {
                            if let (Ok(t_m), Ok(t_s_raw)) = (t_min_s.parse::<u32>(), t_sec_s.parse::<f64>()) {
                                let t_ms = (t_m * 60000) + (t_s_raw * 1000.0).round() as u32;
                                tag_starts.push(i);
                                tag_ends.push(end_pos + 1);
                                tag_times.push(t_ms);
                            }
                        }
                        i = end_pos + 1;
                        continue;
                    }
                }
                i += 1;
            }

            for idx in 0..tag_ends.len() {
                let start_content = tag_ends[idx];
                let end_content = if idx + 1 < tag_starts.len() {
                    tag_starts[idx + 1]
                } else {
                    content.len()
                };

                if start_content < end_content {
                    let w_str = &content[start_content..end_content];
                    let trimmed_w = w_str.trim();
                    if !trimmed_w.is_empty() {
                        let w_start = tag_times[idx];
                        let w_dur = if idx + 1 < tag_times.len() {
                            Some(tag_times[idx + 1].saturating_sub(w_start))
                        } else {
                            Some(500)
                        };
                        words.push(WordTiming {
                            text: trimmed_w.to_string(),
                            time_ms: w_start,
                            duration_ms: w_dur,
                        });
                        if !line_text_accum.is_empty() {
                            line_text_accum.push(' ');
                        }
                        line_text_accum.push_str(trimmed_w);
                    }
                }
            }
        }

        let plain_text = if !line_text_accum.is_empty() {
            line_text_accum
        } else {
            content
                .chars()
                .filter(|c| *c != '<' && *c != '>')
                .collect::<String>()
                .trim()
                .to_string()
        };

        if !plain_text.is_empty() {
            parsed_lines.push(LyricLineParsed {
                time_ms: line_time_ms,
                text: plain_text,
                words,
                sub_text: None,
                singer: None,
            });
        }
    }

    parsed_lines
}

fn featured_credit(title: &str) -> Option<String> {
    let lower = title.to_ascii_lowercase();
    let (marker_at, marker_len) = ["featuring", "feat.", "feat", "ft.", "ft"]
        .iter()
        .find_map(|marker| {
            lower.match_indices(marker).find_map(|(at, _)| {
                let before_is_boundary = at == 0 || !lower[..at].chars().last().map_or(false, |c| c.is_alphanumeric());
                let after = lower[at + marker.len()..].chars().next();
                let after_is_boundary = after.map_or(true, |c| c.is_whitespace() || c == '.');
                (before_is_boundary && after_is_boundary).then_some((at, marker.len()))
            })
        })?;
    let credit = title.get(marker_at + marker_len..)?.trim_start_matches(|c: char| c.is_whitespace() || c == '.');
    let credit_end = credit.find(|c| c == ')' || c == ']' || c == '}' || c == '—' || c == '–').unwrap_or(credit.len());
    let credit = credit[..credit_end].trim();
    (!credit.is_empty()).then(|| credit.to_lowercase())
}

fn feature_version_matches(
    request_title: &str,
    request_artist: &str,
    candidate_title: &str,
    candidate_artist: &str,
) -> bool {
    let requested = featured_credit(request_title);
    let selected = featured_credit(candidate_title);
    let candidate_artist = candidate_artist.to_lowercase();
    let request_artist = request_artist.to_lowercase();
    match (requested, selected) {
        (Some(wanted), Some(found)) => {
            super::fuzzy::compute_similarity_score(&wanted, &found) >= 0.8
                || candidate_artist.contains(wanted.as_str())
        }
        // A featured request must resolve to a candidate that carries that
        // credit in its title or artist metadata.
        (Some(wanted), None) => candidate_artist.contains(wanted.as_str()),
        (None, Some(found)) => request_artist.contains(found.as_str()),
        (None, None) => true,
    }
}

fn lrc_red_duration_ms(hit: &Value) -> Option<u32> {
    for key in ["durationMs", "duration_ms", "trackDurationMs"] {
        if let Some(value) = hit[key].as_f64().filter(|value| *value > 0.0) {
            return Some(value.round().clamp(0.0, u32::MAX as f64) as u32);
        }
    }
    hit["duration"].as_f64().filter(|value| *value > 0.0).map(|value| {
        let millis = if value > 10_000.0 { value } else { value * 1000.0 };
        millis.round().clamp(0.0, u32::MAX as f64) as u32
    })
}

fn qapple_metadata_matches(
    data: &Value,
    expected_title: &str,
    expected_artist: &str,
    duration_ms: u32,
) -> bool {
    let selected = if data["selectedSongMetadata"].is_object() {
        &data["selectedSongMetadata"]
    } else if data["metadata"].is_object() {
        &data["metadata"]
    } else if data["song"].is_object() {
        &data["song"]
    } else {
        return true;
    };
    let title = selected["title"]
        .as_str()
        .or_else(|| selected["trackName"].as_str())
        .or_else(|| selected["track_name"].as_str())
        .or_else(|| selected["name"].as_str())
        .unwrap_or("");
    let artist = selected["artist"]
        .as_str()
        .or_else(|| selected["artistName"].as_str())
        .or_else(|| selected["artist_name"].as_str())
        .unwrap_or("");

    if !title.is_empty() && !artist.is_empty()
        && !super::fuzzy::is_track_metadata_match(expected_title, expected_artist, title, artist)
    {
        return false;
    }
    if !title.is_empty() && !feature_version_matches(expected_title, expected_artist, title, artist) {
        return false;
    }
    if duration_ms > 0 {
        if let Some(candidate_duration) = lrc_red_duration_ms(selected) {
            if candidate_duration.abs_diff(duration_ms) > 12_000 {
                return false;
            }
        }
    }
    true
}

async fn search_lrc_red(
    client: &Client,
    clean_t: &str,
    clean_a: &str,
    duration_ms: u32,
) -> Option<LyricsCandidate> {
    let primary_a = crate::commands::integrations::extract_primary_artist(clean_a);
    let query_artist = if primary_a.is_empty() { clean_a } else { &primary_a };
    let base_title = super::fuzzy::clean_title(clean_t);
    let requested_feature = featured_credit(clean_t);

    let mut queries: Vec<String> = Vec::new();
    if let Some(ref feat) = requested_feature {
        queries.push(format!("{} {} {}", base_title, query_artist, feat));
    }
    queries.push(format!("{} {}", base_title, query_artist));

    let mut hits: Vec<Value> = Vec::new();
    for query_str in queries {
        let search_url = format!("https://lrc.red/search.json?q={}", urlencoding::encode(&query_str));
        if let Ok(res) = client
            .get(&search_url)
            .header("User-Agent", "LyricFlow/1.44 (https://github.com/badghost/lyricflow-tauri; contact@lyricflow.app)")
            .timeout(std::time::Duration::from_millis(1500))
            .send()
            .await
        {
            if res.status().is_success() {
                if let Ok(json) = res.json::<Value>().await {
                    if let Some(arr) = json["hits"].as_array() {
                        if !arr.is_empty() {
                            hits = arr.clone();
                            break;
                        }
                    }
                }
            }
        }
    }
    if hits.is_empty() {
        return None;
    }

    let mut matching_hits: Vec<(String, Option<u32>, bool)> = Vec::new();
    for hit in hits {
        let hit_title = hit["title"].as_str().unwrap_or("");
        let hit_artist = hit["artist"].as_str().unwrap_or("");
        let hit_isrc = hit["isrc"].as_str().unwrap_or("");
        if hit_isrc.is_empty() || hit_title.is_empty() || hit_artist.is_empty() {
            continue;
        }

        if (!super::fuzzy::is_track_metadata_match(clean_t, clean_a, hit_title, hit_artist)
            && !super::fuzzy::is_track_metadata_match(clean_t, query_artist, hit_title, hit_artist))
            || !feature_version_matches(clean_t, clean_a, hit_title, hit_artist)
        {
            continue;
        }

        let hit_duration = lrc_red_duration_ms(&hit);
        if duration_ms > 0 && hit_duration.is_some_and(|candidate| candidate.abs_diff(duration_ms) > 12_000) {
            continue;
        }
        let feature_match = requested_feature
            .as_ref()
            .is_some_and(|requested| featured_credit(hit_title).as_ref() == Some(requested));
        matching_hits.push((hit_isrc.to_string(), hit_duration, feature_match));
    }

    matching_hits.sort_by_key(|(_, candidate_duration, feature_match)| {
        let duration_diff = if duration_ms > 0 {
            candidate_duration.map(|candidate| candidate.abs_diff(duration_ms)).unwrap_or(u32::MAX)
        } else {
            u32::MAX
        };
        (!*feature_match, duration_diff)
    });
    let mut seen_isrcs = std::collections::HashSet::new();
    matching_hits.retain(|(isrc, _, _)| seen_isrcs.insert(isrc.clone()));
    let (isrc, matched_duration, _) = matching_hits.first()?.clone();

    let lrc_url = format!("https://lrc.red/s/{}.lrc", isrc);
    let lrc_res = client
        .get(&lrc_url)
        .header("User-Agent", "LyricFlow/1.44 (https://github.com/badghost/lyricflow-tauri; contact@lyricflow.app)")
        .timeout(std::time::Duration::from_millis(3000))
        .send()
        .await
        .ok()?;

    if !lrc_res.status().is_success() {
        return None;
    }

    let raw_lrc = lrc_res.text().await.ok()?;
    if raw_lrc.trim().is_empty() {
        return None;
    }

    let ttml_url = format!("https://lrc.red/s/{}.ttml", isrc);
    let ttml_text = if let Ok(t_res) = client
        .get(&ttml_url)
        .header("User-Agent", "LyricFlow/1.44 (https://github.com/badghost/lyricflow-tauri; contact@lyricflow.app)")
        .timeout(std::time::Duration::from_millis(2000))
        .send()
        .await
    {
        t_res.text().await.unwrap_or_default()
    } else {
        String::new()
    };

    let mut parsed_lines = parse_enhanced_lrc_lines(&raw_lrc);
    if duration_ms > 0 && parsed_lines.iter().map(|line| line.time_ms).max().unwrap_or(0) > duration_ms.saturating_add(15_000) {
        return None;
    }

    if !ttml_text.is_empty() {
        let mut p_agents = Vec::new();
        let mut curr = ttml_text.as_str();
        while let Some(pos) = curr.find("<p ") {
            let after = &curr[pos..];
            if let Some(close_p) = after.find('>') {
                let p_tag = &after[..close_p];
                if let Some(ag_idx) = p_tag.find("ttm:agent=\"") {
                    let val_start = ag_idx + "ttm:agent=\"".len();
                    if let Some(quote_end) = p_tag[val_start..].find('"') {
                        p_agents.push(p_tag[val_start..val_start + quote_end].to_string());
                    }
                }
            }
            if let Some(next_pos) = after[1..].find("<p ") {
                curr = &after[1 + next_pos..];
            } else {
                break;
            }
        }

        let clean_artist_str = clean_a.to_string();
        let split_artists: Vec<String> = clean_artist_str
            .replace(" feat. ", ", ")
            .replace(" feat ", ", ")
            .replace(" ft. ", ", ")
            .replace(" ft ", ", ")
            .replace(" with ", ", ")
            .replace(" & ", ", ")
            .replace(" / ", ", ")
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        for (i, line) in parsed_lines.iter_mut().enumerate() {
            if i < p_agents.len() {
                let ag = &p_agents[i];
                if ag == "v1" {
                    line.singer = split_artists.first().cloned().or_else(|| Some("Vocal 1".to_string()));
                } else if ag == "v2" {
                    line.singer = split_artists.get(1).cloned().or_else(|| Some("Vocal 2".to_string()));
                } else if ag == "v1000" || ag == "v2000" {
                    line.singer = Some("Both".to_string());
                }
            }
        }
    }

    let has_words = parsed_lines.iter().any(|l| !l.words.is_empty());
    let sync_type = if has_words {
        SyncType::WordSynced
    } else {
        SyncType::LineSynced
    };

    Some(LyricsCandidate {
        provider: "LyricsPlus (qApple)".to_string(),
        sync_type,
        raw_lrc,
        translation_lrc: None,
        parsed_lines: Some(parsed_lines),
        candidate_id: format!("lrc_red_{}_{}", clean_a, clean_t),
        score: 1.0,
        candidate_info: Some("qApple (Word)".to_string()),
        duration_diff_sec: Some(if duration_ms > 0 {
            matched_duration.map(|duration| duration.abs_diff(duration_ms) as i32 / 1000).unwrap_or(0)
        } else {
            0
        }),
    })
}

async fn search_qapple(
    client: &Client,
    track: &str,
    artist: &str,
    duration_ms: u32,
) -> Option<LyricsCandidate> {
    let clean_t = clean_title(track);
    let clean_a = clean_artist(artist);
    let qapple_title = track.trim();

    // Query both exact-title Apple sources concurrently. The old serial order
    // spent up to eight seconds probing lrc.red before ever reaching qApple;
    // the caller's 2.5-second cap then cancelled the qApple request entirely.
    let lrc_red = search_lrc_red(client, qapple_title, &clean_a, duration_ms);
    let lyricsplus = search_lyricsplus_qapple(client, qapple_title, &clean_a, &clean_t, duration_ms);
    tokio::pin!(lrc_red);
    tokio::pin!(lyricsplus);
    tokio::select! {
        biased;
        candidate = &mut lrc_red => {
            if candidate.is_some() { candidate } else { lyricsplus.await }
        }
        candidate = &mut lyricsplus => {
            if candidate.is_some() { candidate } else { lrc_red.await }
        }
    }
}

async fn search_lyricsplus_qapple(
    client: &Client,
    qapple_title: &str,
    clean_a: &str,
    clean_t: &str,
    duration_ms: u32,
) -> Option<LyricsCandidate> {
    // LyricsPlus (binimum) v2 endpoint. Keep its stable query shape: title,
    // lead artist, and Apple source only.
    let primary_a = crate::commands::integrations::extract_primary_artist(clean_a);
    let query_artist = if !primary_a.is_empty() {
        primary_a.as_str()
    } else {
        clean_a
    };
    let url = format!(
        "https://lyricsplus.binimum.org/v2/lyrics/get?title={}&artist={}&source=apple",
        urlencoding::encode(qapple_title),
        urlencoding::encode(query_artist)
    );

    let res = match client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .timeout(std::time::Duration::from_millis(2500))
        .send()
        .await
    {
        Ok(r) if r.status().is_success() => r,
        _ => return None,
    };

    let data = match res.json::<Value>().await {
        Ok(d) => d,
        Err(_) => return None,
    };

    let reported_src = data["processingTime"]["winnerSource"]
        .as_str()
        .or_else(|| data["selectedSongMetadata"]["source"].as_str())
        .or_else(|| data["metadata"]["source"].as_str())
        .or_else(|| data["source"].as_str())
        .unwrap_or("")
        .to_lowercase();
    if !reported_src.is_empty()
        && !reported_src.contains("apple")
        && !reported_src.contains("qapple")
        && reported_src != "am"
        && !reported_src.contains("itunes")
        && reported_src != "lyricsplus"
    {
        return None;
    }
    if !qapple_metadata_matches(&data, qapple_title, &clean_a, duration_ms) {
        return None;
    }
    let lyrics_arr = match data["lyrics"].as_array() {
        Some(arr) if !arr.is_empty() => arr,
        _ => return None,
    };

    let time_unit = data["startTimeUnit"]
        .as_str()
        .or_else(|| data["timeUnit"].as_str())
        .or_else(|| data["metadata"]["timeUnit"].as_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    let explicit_ms_context = !data["KpoeTools"].is_null()
        || matches!(time_unit.as_str(), "ms" | "millisecond" | "milliseconds");
    let max_unmarked_timestamp = lyrics_arr
        .iter()
        .flat_map(|line| {
            let line_times = ["time", "start", "timestamp", "offset"]
                .into_iter()
                .filter_map(|key| line[key].as_f64());
            let word_times = line["syllabus"]
                .as_array()
                .into_iter()
                .flatten()
                .flat_map(|word| {
                    ["time", "start", "timestamp", "offset"]
                        .into_iter()
                        .filter_map(|key| word[key].as_f64())
                });
            line_times.chain(word_times)
        })
        .fold(0.0_f64, f64::max);
    // qApple timestamps can be seconds. A 206-second timestamp is still a
    // valid point in a long song, so only infer milliseconds above 500 when
    // the provider did not declare its unit.
    let is_ms_context = explicit_ms_context || max_unmarked_timestamp > 500.0;

    let mut parsed_lines = Vec::new();
    let mut raw_lrc = String::new();

    for item in lyrics_arr {
        let time_ms = qapple_timestamp_ms(item, is_ms_context);
        let text = item["text"].as_str().unwrap_or("").trim().to_string();
        let singer = item["element"]["singer"]
            .as_str()
            .or_else(|| item["singer"].as_str())
            .map(|s| s.to_string());

        let mut words = Vec::new();
        if let Some(syllabus) = item["syllabus"].as_array() {
            for w in syllabus {
                let w_time = qapple_timestamp_ms(w, is_ms_context);
                let w_dur = qapple_duration_ms(w, is_ms_context);
                let w_text = w["text"].as_str().unwrap_or("").to_string();
                words.push(WordTiming {
                    text: w_text,
                    time_ms: w_time,
                    duration_ms: w_dur,
                });
            }
        }

        let min = time_ms / 60000;
        let sec = (time_ms % 60000) / 1000;
        let cs = (time_ms % 1000) / 10;
        raw_lrc.push_str(&format!("[{:02}:{:02}.{:02}] {}\n", min, sec, cs, text));

        parsed_lines.push(LyricLineParsed {
            time_ms,
            text,
            words,
            sub_text: None,
            singer,
        });
    }

    let has_words = parsed_lines.iter().any(|l| !l.words.is_empty());
    // The request itself is pinned to source=apple, and v2 often reports only
    // the generic "LyricsPlus" winner (especially for line-synced records).
    let is_qapple = reported_src.contains("apple")
        || reported_src.contains("qapple")
        || reported_src == "am"
        || reported_src.contains("itunes")
        || reported_src.is_empty()
        || reported_src == "lyricsplus"
        || has_words;
    if !is_qapple {
        return None;
    }

    let sync_type = if has_words {
        SyncType::WordSynced
    } else {
        SyncType::LineSynced
    };

    Some(LyricsCandidate {
        provider: "LyricsPlus (qApple)".to_string(),
        sync_type,
        raw_lrc,
        translation_lrc: None,
        parsed_lines: Some(parsed_lines),
        candidate_id: format!("qapple_{}_{}", clean_a, clean_t),
        score: 1.0,
        candidate_info: Some("qApple (Word)".to_string()),
        duration_diff_sec: Some(0),
    })
}

fn qapple_timestamp_ms(item: &Value, fallback_is_ms: bool) -> u32 {
    for key in ["timeMs", "startTimeMs", "offsetMs"] {
        if let Some(value) = item[key].as_f64() {
            return numeric_time_to_ms(value, true).unwrap_or(0);
        }
    }
    for key in ["time", "start", "timestamp", "offset"] {
        if let Some(value) = item[key].as_f64() {
            return numeric_time_to_ms(value, fallback_is_ms).unwrap_or(0);
        }
    }
    0
}

fn qapple_duration_ms(item: &Value, fallback_is_ms: bool) -> Option<u32> {
    if let Some(value) = item["durationMs"].as_f64() {
        return numeric_time_to_ms(value, true);
    }
    item["duration"].as_f64().and_then(|value| {
        let is_ms = fallback_is_ms || value >= 10.0;
        numeric_time_to_ms(value, is_ms)
    })
}

fn numeric_time_to_ms(value: f64, is_ms: bool) -> Option<u32> {
    if !value.is_finite() || value < 0.0 {
        return None;
    }
    let millis = if is_ms { value } else { value * 1000.0 };
    Some(millis.round().clamp(0.0, u32::MAX as f64) as u32)
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
        sort_lyrics_candidates(&mut candidates, &[]);
        assert_eq!(candidates[0].provider, "Musixmatch");
        assert_eq!(candidates[0].sync_type, SyncType::WordSynced);
        assert_eq!(candidates[1].provider, "LRCLIB");
        assert_eq!(candidates[2].provider, "NetEase");
    }

    #[test]
    fn test_netease_wordsync_priority_over_lrclib_linesync() {
        let mut candidates = vec![
            make_dummy_cand("LRCLIB", SyncType::LineSynced, 0.95),
            make_dummy_cand("NetEase", SyncType::WordSynced, 0.90),
        ];
        sort_lyrics_candidates(&mut candidates, &[]);
        assert_eq!(candidates[0].provider, "NetEase");
        assert_eq!(candidates[0].sync_type, SyncType::WordSynced);
        assert_eq!(candidates[1].provider, "LRCLIB");
    }

    #[test]
    fn test_lrclib_linesync_priority_over_musixmatch_linesync() {
        let mut candidates = vec![
            make_dummy_cand("Musixmatch", SyncType::LineSynced, 0.95),
            make_dummy_cand("LRCLIB", SyncType::LineSynced, 0.90),
            make_dummy_cand("NetEase", SyncType::LineSynced, 0.99),
        ];
        sort_lyrics_candidates(&mut candidates, &[]);
        assert_eq!(candidates[0].provider, "LRCLIB");
        assert_eq!(candidates[1].provider, "Musixmatch");
        assert_eq!(candidates[2].provider, "NetEase");
    }

    #[test]
    fn test_preferred_provider_priority() {
        let mut candidates = vec![
            make_dummy_cand("LRCLIB", SyncType::LineSynced, 0.95),
            make_dummy_cand("NetEase", SyncType::LineSynced, 0.90),
        ];
        let prefs = vec!["netease".to_string(), "lrclib".to_string()];
        sort_lyrics_candidates(&mut candidates, &prefs);
        assert_eq!(candidates[0].provider, "NetEase");
        assert_eq!(candidates[1].provider, "LRCLIB");
    }

    #[test]
    fn test_preferred_line_sync_provider_does_not_outrank_word_sync() {
        let mut candidates = vec![
            make_dummy_cand("LRCLIB", SyncType::LineSynced, 1.0),
            make_dummy_cand("Musixmatch", SyncType::WordSynced, 0.80),
            make_dummy_cand("NetEase", SyncType::WordSynced, 0.75),
        ];
        let prefs = vec!["lrclib".to_string(), "netease".to_string()];

        sort_lyrics_candidates(&mut candidates, &prefs);

        assert_eq!(candidates[0].provider, "NetEase");
        assert_eq!(candidates[0].sync_type, SyncType::WordSynced);
        assert_eq!(candidates[1].provider, "Musixmatch");
        assert_eq!(candidates[2].provider, "LRCLIB");
        assert_eq!(candidates[2].sync_type, SyncType::LineSynced);
    }

    #[test]
    fn test_linesync_over_plaintext() {
        let mut candidates = vec![
            make_dummy_cand("LRCLIB", SyncType::PlainText, 0.99),
            make_dummy_cand("Musixmatch", SyncType::PlainText, 0.99),
            make_dummy_cand("NetEase", SyncType::LineSynced, 0.80),
        ];
        sort_lyrics_candidates(&mut candidates, &[]);
        assert_eq!(candidates[0].provider, "NetEase");
        assert_eq!(candidates[0].sync_type, SyncType::LineSynced);
    }

    #[test]
    fn test_word_sync_and_line_sync_provider_hierarchy() {
        let mut candidates = vec![
            make_dummy_cand("NetEase", SyncType::LineSynced, 0.99),
            make_dummy_cand("LRCLIB", SyncType::LineSynced, 0.95),
            make_dummy_cand("Spotify", SyncType::LineSynced, 0.95),
            make_dummy_cand("NetEase", SyncType::WordSynced, 0.90),
            make_dummy_cand("Musixmatch", SyncType::WordSynced, 0.85),
        ];
        sort_lyrics_candidates(&mut candidates, &[]);
        assert_eq!(candidates[0].provider, "Musixmatch");
        assert_eq!(candidates[0].sync_type, SyncType::WordSynced);
        assert_eq!(candidates[1].provider, "NetEase");
        assert_eq!(candidates[1].sync_type, SyncType::WordSynced);
        assert_eq!(candidates[2].provider, "Spotify");
        assert_eq!(candidates[2].sync_type, SyncType::LineSynced);
        assert_eq!(candidates[3].provider, "LRCLIB");
        assert_eq!(candidates[3].sync_type, SyncType::LineSynced);
        assert_eq!(candidates[4].provider, "NetEase");
        assert_eq!(candidates[4].sync_type, SyncType::LineSynced);
    }

    #[test]
    fn test_netease_yrc_label_wordsync_priority() {
        let mut candidates = vec![
            make_dummy_cand("Spotify", SyncType::LineSynced, 0.95),
            make_dummy_cand("NetEase (YRC)", SyncType::WordSynced, 0.90),
        ];
        sort_lyrics_candidates(&mut candidates, &[]);
        assert_eq!(candidates[0].provider, "NetEase (YRC)");
        assert_eq!(candidates[0].sync_type, SyncType::WordSynced);
        assert_eq!(candidates[1].provider, "Spotify");
    }

    #[test]
    fn test_candidate_selection_returns_highest_ranked_wordsync_candidate() {
        let mut candidates = vec![
            make_dummy_cand("LRCLIB", SyncType::LineSynced, 1.0),
            make_dummy_cand("NetEase (YRC)", SyncType::WordSynced, 0.80),
            make_dummy_cand("Musixmatch", SyncType::WordSynced, 0.75),
        ];
        sort_lyrics_candidates(&mut candidates, &[]);

        let selected = select_candidate(candidates, 0).expect("a candidate should be selected");
        assert_eq!(selected.provider, "Musixmatch");
        assert_eq!(selected.sync_type, SyncType::WordSynced);
    }

    #[test]
    fn test_candidate_cycle_keeps_word_sync_ahead_of_line_sync() {
        let mut candidates = vec![
            make_dummy_cand("LRCLIB", SyncType::LineSynced, 1.0),
            make_dummy_cand("NetEase", SyncType::WordSynced, 0.80),
        ];
        sort_lyrics_candidates(&mut candidates, &[]);

        let selected =
            select_candidate(candidates, 1).expect("word-synced candidate should remain preferred");
        assert_eq!(selected.sync_type, SyncType::WordSynced);
        assert_eq!(selected.provider, "NetEase");
    }

    #[test]
    fn qapple_timestamp_units_handle_long_song_seconds_and_explicit_milliseconds() {
        let seconds = serde_json::json!({"time": 206.25});
        let explicit_ms = serde_json::json!({"timeMs": 206.25});

        assert_eq!(qapple_timestamp_ms(&seconds, false), 206_250);
        assert_eq!(qapple_timestamp_ms(&explicit_ms, false), 206);
        assert_eq!(qapple_duration_ms(&serde_json::json!({"duration": 0.25}), false), Some(250));
        assert_eq!(qapple_duration_ms(&serde_json::json!({"duration": 300}), false), Some(300));
    }
}
