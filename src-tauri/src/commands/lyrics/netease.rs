use super::fuzzy::{clean_artist, clean_title, compute_similarity_score, has_lrc_timestamps};
use super::models::{LyricLineParsed, LyricsCandidate, SyncType, WordTiming};
use reqwest::Client;
use serde_json::Value;

/// Detects whether a lyric line represents contributor credits, production metadata,
/// or non-lyric structural information (e.g. Composer, Lyricist, Producer, OP, SP).
pub fn is_credit_metadata_line(text: &str) -> bool {
    let t = text.trim();
    if t.is_empty() {
        return false;
    }

    // 1. Standard LRC ID / metadata bracket tags
    let lower = t.to_lowercase();
    if lower.starts_with('[')
        && (lower.starts_with("[ti:")
            || lower.starts_with("[ar:")
            || lower.starts_with("[al:")
            || lower.starts_with("[by:")
            || lower.starts_with("[offset:")
            || lower.starts_with("[length:")
            || lower.starts_with("[re:")
            || lower.starts_with("[ve:"))
    {
        return true;
    }

    // 2. NetEase instrumental / notice tags
    if t.contains("纯音乐，请欣赏") || t.contains("此歌曲为没有填词的纯音乐") {
        return true;
    }

    // Normalize spacing for prefix matching
    let normalized = t.replace('\u{3000}', " ").replace('\u{00A0}', " ");
    let norm_lower = normalized.to_lowercase();

    // 3. Multi-character Chinese credit prefixes
    let chinese_prefixes = [
        "作词", "作曲", "填词", "谱曲", "制作人", "制作", "编曲", "混音", "母带", "监制",
        "录音", "和声", "和音", "弦乐", "吉他", "贝斯", "鼓手", "打击乐", "键盘", "钢琴",
        "企划", "统筹", "文案", "发行", "出品", "版权", "鸣谢", "提供", "词曲", "词/曲",
        "原唱", "翻唱", "策划", "伴奏", "音频", "后期", "剪辑", "设计", "封面", "发行人",
        "录音室", "混音室", "母带室", "录音师", "混音师", "母带师",
        "作 词", "作 曲", "填 词", "谱 曲", "制 作 人", "制 作", "编 曲", "混 音", "母 带",
        "监 制", "录 音", "和 声", "和 音", "弦 乐", "吉 他", "贝 斯", "鼓 手", "键 盘",
        "钢 琴", "企 划", "统 筹", "文 案", "发 行", "出 品", "版 权", "鸣 谢", "提 供",
        "词 曲", "原 唱", "翻 唱", "策 划", "后 期",
    ];

    for prefix in &chinese_prefixes {
        if let Some(rest) = normalized.strip_prefix(prefix) {
            let rest_trimmed = rest.trim_start();
            if rest_trimmed.starts_with(':') || rest_trimmed.starts_with('：') || rest_trimmed.starts_with('-') {
                return true;
            }
        }
    }

    // 4. Single-character Chinese credit tags: "词" or "曲" followed by colon
    if let Some(rest) = normalized.strip_prefix('词').or_else(|| normalized.strip_prefix('曲')) {
        let rest_trimmed = rest.trim_start();
        if rest_trimmed.starts_with(':') || rest_trimmed.starts_with('：') || rest_trimmed.starts_with('-') {
            return true;
        }
    }

    // 5. English contributor credit phrases
    let english_prefixes = [
        "written by", "lyrics by", "composed by", "produced by", "arranged by",
        "mixed by", "mastered by", "recorded by", "engineered by", "published by",
        "released by", "remixed by", "performed by", "songwriters:", "songwriter:",
        "lyricist:", "composer:", "producer:", "arranger:", "audio engineer:",
        "mixing engineer:", "mastering engineer:", "vocal producer:",
    ];

    for prefix in &english_prefixes {
        if norm_lower.starts_with(prefix) {
            return true;
        }
    }

    // 6. English role words followed by colon (e.g., "Producer :", "Composer :", "OP :")
    let english_roles = [
        "producer", "producers", "composer", "composers", "lyricist", "lyricists",
        "arranger", "arrangers", "mixer", "mastering", "engineer", "vocals",
        "backing vocals", "guitar", "guitars", "bass", "drums", "keyboard",
        "keyboards", "piano", "strings", "lyrics", "music", "op", "sp",
    ];

    for role in &english_roles {
        if let Some(rest) = norm_lower.strip_prefix(role) {
            let rest_trimmed = rest.trim_start();
            if rest_trimmed.starts_with(':') || rest_trimmed.starts_with('：') || rest_trimmed.starts_with('-') {
                return true;
            }
        }
    }

    false
}

/// Filters out credit/metadata lines from raw LRC text while preserving legitimate lyrics.
pub fn filter_lrc_credit_lines(raw_lrc: &str) -> String {
    let mut out = Vec::new();
    for line in raw_lrc.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        if let Some(close_idx) = trimmed.find(']') {
            if trimmed.starts_with('[') {
                let after_bracket = trimmed[close_idx + 1..].trim();
                if is_credit_metadata_line(trimmed)
                    || (!after_bracket.is_empty() && is_credit_metadata_line(after_bracket))
                {
                    continue;
                }
            }
        } else if is_credit_metadata_line(trimmed) {
            continue;
        }
        out.push(line);
    }
    out.join("\n")
}

struct LrcLineRef {
    time_ms: u32,
    text: String,
}
fn parse_lrc_ref_lines(lrc: &str) -> Vec<LrcLineRef> {
    let mut lines = Vec::new();
    for raw in lrc.lines() {
        let trimmed = raw.trim();
        if !trimmed.starts_with('[') {
            continue;
        }
        if let Some(close_idx) = trimmed.find(']') {
            let tag = &trimmed[1..close_idx];
            let mut tag_parts = tag.split(':');
            let min: u32 = match tag_parts.next().and_then(|s| s.parse().ok()) {
                Some(m) => m,
                None => continue,
            };
            let sec_str = match tag_parts.next() {
                Some(s) => s,
                None => continue,
            };
            let (sec, ms) = if let Some(dot_idx) = sec_str.find('.') {
                let sec_part: u32 = sec_str[..dot_idx].parse().unwrap_or(0);
                let ms_part: u32 = sec_str[dot_idx + 1..].parse().unwrap_or(0);
                let normalized_ms = match sec_str[dot_idx + 1..].len() {
                    1 => ms_part * 100,
                    2 => ms_part * 10,
                    _ => ms_part,
                };
                (sec_part, normalized_ms)
            } else {
                (sec_str.parse().unwrap_or(0), 0)
            };
            let time_ms = min * 60000 + sec * 1000 + ms;
            let text = trimmed[close_idx + 1..]
                .replace('\u{2005}', " ")
                .replace('\u{00A0}', " ")
                .trim()
                .to_string();
            if !text.is_empty() && !is_credit_metadata_line(&text) {
                lines.push(LrcLineRef { time_ms, text });
            }
        }
    }
    lines
}

/// Parses NetEase YRC word-level synced format into standard A2 Enhanced LRC string
/// and structured `LyricLineParsed` lines with ground-truth whitespace alignment.
///
/// NetEase YRC Format:
/// `[line_start_ms,line_duration_ms](word_start_ms,word_duration_ms,flag)word_text...`
pub fn parse_yrc_to_enhanced_lrc_and_lines(yrc: &str, lrc_ref: Option<&str>) -> Option<(String, Vec<LyricLineParsed>)> {
    if yrc.is_empty() {
        return None;
    }

    let ref_lines = lrc_ref.map(parse_lrc_ref_lines);
    let mut parsed_lines = Vec::new();
    let mut enhanced_lrc = String::new();

    for raw_line in yrc.lines() {
        let line = raw_line.trim();
        if !line.starts_with('[') {
            continue;
        }

        // 1. Extract line header: [line_start, line_duration]
        let close_bracket_idx = match line.find(']') {
            Some(idx) => idx,
            None => continue,
        };

        let header_content = &line[1..close_bracket_idx];
        let mut header_parts = header_content.split(',');
        let line_start_ms: u32 = match header_parts.next().and_then(|s| s.trim().parse().ok()) {
            Some(ms) => ms,
            None => continue,
        };
        let _line_dur_ms: u32 = header_parts.next().and_then(|s| s.trim().parse().ok()).unwrap_or(0);

        let remainder = &line[close_bracket_idx + 1..];

        // 2. Parse syllable tokens: (word_start, word_duration, flag)word_text
        let mut words = Vec::new();
        let mut line_text = String::new();
        let mut curr = remainder;

        while let Some(open_paren_idx) = curr.find('(') {
            let after_open = &curr[open_paren_idx + 1..];
            let close_paren_idx = match after_open.find(')') {
                Some(idx) => idx,
                None => break,
            };

            let syl_tag = &after_open[..close_paren_idx];
            let mut syl_parts = syl_tag.split(',');
            let w_start_ms: u32 = match syl_parts.next().and_then(|s| s.trim().parse().ok()) {
                Some(ms) => ms,
                None => {
                    curr = &after_open[close_paren_idx + 1..];
                    continue;
                }
            };
            let w_dur_ms: u32 = syl_parts.next().and_then(|s| s.trim().parse().ok()).unwrap_or(0);

            let after_close = &after_open[close_paren_idx + 1..];
            // Word text ends at the next '(' or end of string
            let next_open_idx = after_close.find('(').unwrap_or(after_close.len());
            let word_str = &after_close[..next_open_idx];

            if !word_str.is_empty() {
                words.push(WordTiming {
                    text: word_str.to_string(),
                    time_ms: w_start_ms,
                    duration_ms: Some(w_dur_ms),
                });
                line_text.push_str(word_str);
            }

            curr = &after_close[next_open_idx..];
        }

        let mut clean_text = if line_text.trim().is_empty() {
            remainder.trim().to_string()
        } else {
            line_text.trim().to_string()
        };
        if clean_text.is_empty() && words.is_empty() {
            // Instrumental or empty line
            continue;
        }

        if is_credit_metadata_line(&clean_text) {
            continue;
        }

        // Align word tokens with ground-truth line text if available to restore missing whitespace
        let matched_lrc = ref_lines.as_ref().and_then(|refs| {
            refs.iter()
                .filter(|r| (r.time_ms as i64 - line_start_ms as i64).abs() <= 3000)
                .min_by_key(|r| (r.time_ms as i64 - line_start_ms as i64).abs())
        });

        if let Some(truth_line) = matched_lrc {
            let truth = &truth_line.text;
            if is_credit_metadata_line(truth) {
                continue;
            }
            let mut search_idx = 0;
            for w in &mut words {
                let w_trim = w.text.trim();
                if w_trim.is_empty() {
                    continue;
                }
                if let Some(pos) = truth[search_idx..].find(w_trim) {
                    let actual_idx = search_idx + pos;
                    search_idx = actual_idx + w_trim.len();
                    if truth[search_idx..].starts_with(' ') {
                        if !w.text.ends_with(' ') {
                            w.text.push(' ');
                        }
                    }
                }
            }
            if !truth.is_empty() {
                clean_text = truth.clone();
            }
        } else {
            // Universal Latin word boundary & punctuation spacing fallback:
            // Only needed if the line has no spaces at all between tokens
            let already_has_spaces = words.iter().any(|w| w.text.ends_with(' ') || w.text.starts_with(' '));
            if !already_has_spaces {
                for i in 0..words.len().saturating_sub(1) {
                let cur_trim = words[i].text.trim();
                let next_trim = words[i + 1].text.trim();
                if cur_trim.is_empty() || next_trim.is_empty() {
                    continue;
                }

                let cur_ends_alpha = cur_trim.chars().last().map(|c| c.is_alphanumeric()).unwrap_or(false);
                let cur_ends_punct = cur_trim.ends_with(',') || cur_trim.ends_with('.') || cur_trim.ends_with('!')
                    || cur_trim.ends_with('?') || cur_trim.ends_with(';') || cur_trim.ends_with(':');

                let next_starts_alpha = next_trim.chars().next().map(|c| c.is_alphanumeric()).unwrap_or(false);
                let next_is_contraction = next_trim.starts_with("'t") || next_trim.starts_with("'s")
                    || next_trim.starts_with("'m") || next_trim.starts_with("'re")
                    || next_trim.starts_with("'ve") || next_trim.starts_with("'ll")
                    || next_trim.starts_with("'d") || next_trim.starts_with("’t")
                    || next_trim.starts_with("’s") || next_trim.starts_with("’m")
                    || next_trim.starts_with("’re") || next_trim.starts_with("’ve")
                    || next_trim.starts_with("’ll") || next_trim.starts_with("’d");

                if !words[i].text.ends_with(' ') && !words[i + 1].text.starts_with(' ') {
                    if cur_ends_punct {
                        words[i].text.push(' ');
                    } else if cur_ends_alpha && next_starts_alpha && !next_is_contraction {
                        words[i].text.push(' ');
                    }
                }
            }
            }
            clean_text = words.iter().map(|word| word.text.as_str()).collect::<String>().trim().to_string();
        }

        // 3. Format as standard A2 Enhanced LRC line: [mm:ss.xx] <mm:ss.xx>word <mm:ss.xx>word
        let min = line_start_ms / 60000;
        let sec = (line_start_ms % 60000) / 1000;
        let cs = (line_start_ms % 1000) / 10;
        enhanced_lrc.push_str(&format!("[{:02}:{:02}.{:02}] ", min, sec, cs));

        if words.is_empty() {
            enhanced_lrc.push_str(&clean_text);
        } else {
            for w in &words {
                let w_min = w.time_ms / 60000;
                let w_sec = (w.time_ms % 60000) / 1000;
                let w_cs = (w.time_ms % 1000) / 10;
                enhanced_lrc.push_str(&format!("<{:02}:{:02}.{:02}>{}", w_min, w_sec, w_cs, w.text));
            }
        }
        enhanced_lrc.push('\n');

        parsed_lines.push(LyricLineParsed {
            time_ms: line_start_ms,
            text: clean_text,
            words,
            sub_text: None,
        });
    }

    if parsed_lines.is_empty() {
        None
    } else {
        Some((enhanced_lrc, parsed_lines))
    }
}

use std::net::SocketAddr;
use std::sync::OnceLock;

static NETEASE_CLIENT: OnceLock<Client> = OnceLock::new();

fn get_netease_client() -> &'static Client {
    NETEASE_CLIENT.get_or_init(|| {
        let overseas_addr: SocketAddr = "103.135.240.77:443".parse().unwrap();
        Client::builder()
            .timeout(std::time::Duration::from_secs(5))
            .resolve("interface.music.163.com", overseas_addr)
            .resolve("music.163.com", overseas_addr)
            .build()
            .unwrap_or_else(|_| Client::new())
    })
}

pub async fn search_netease(
    _client: &Client,
    track: &str,
    artist: &str,
    enable_yrc: bool,
) -> Vec<LyricsCandidate> {
    let ne_client = get_netease_client();
    let clean_t = clean_title(track);
    let clean_a = clean_artist(artist);
    let query = format!("{} {}", clean_t, clean_a);

    let search_url = format!(
        "https://interface.music.163.com/api/search/get/web?csrf_token=&hlpretag=&hlposttag=&s={}&type=1&offset=0&total=true&limit=3",
        urlencoding::encode(&query)
    );

    let search_res = match ne_client
        .get(&search_url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .header("Referer", "https://music.163.com")
        .header("X-Real-IP", "118.88.88.88")
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

        // Query NetEase lyric endpoint with lv, kv, tv, rv (romalrc), and yv (yrc word-by-word)
        let lyric_url = format!(
            "https://interface.music.163.com/api/song/lyric?os=pc&id={}&lv=-1&kv=-1&tv=-1&rv=-1&yv=-1",
            song_id
        );

        let lyric_res = match ne_client
            .get(&lyric_url)
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            .header("Referer", "https://music.163.com")
            .header("X-Real-IP", "118.88.88.88")
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
            let yrc_body = lyric_json["yrc"]["lyric"].as_str().unwrap_or("").trim();

            let translation_lrc = if !tlrc_body.is_empty() && has_lrc_timestamps(tlrc_body) {
                Some(tlrc_body.to_string())
            } else {
                None
            };

            // Strict reversible fallback hierarchy:
            // 1. If enable_yrc is true and yrc_body is present: parse YRC into WordSynced candidate
            // 2. If YRC is absent/disabled/fails: fall back to standard line-synced LRC
            // 3. If line-synced LRC has no timestamps: fall back to PlainText
            let candidate_opt = if enable_yrc && !yrc_body.is_empty() {
                let lrc_ref_opt = if lrc_body.is_empty() { None } else { Some(lrc_body) };
                if let Some((enhanced_lrc, lines)) = parse_yrc_to_enhanced_lrc_and_lines(yrc_body, lrc_ref_opt) {
                    Some(LyricsCandidate {
                        provider: "NetEase".to_string(),
                        sync_type: SyncType::WordSynced,
                        raw_lrc: enhanced_lrc,
                        translation_lrc,
                        parsed_lines: Some(lines),
                        candidate_id: song_id.to_string(),
                        score,
                        candidate_info: Some("NetEase (YRC)".to_string()),
                        duration_diff_sec: None,
                    })
                } else if !lrc_body.is_empty() {
                    let filtered_lrc = filter_lrc_credit_lines(lrc_body);
                    let sync_type = if has_lrc_timestamps(&filtered_lrc) {
                        SyncType::LineSynced
                    } else {
                        SyncType::PlainText
                    };
                    Some(LyricsCandidate {
                        provider: "NetEase".to_string(),
                        sync_type,
                        raw_lrc: filtered_lrc,
                        translation_lrc,
                        parsed_lines: None,
                        candidate_id: song_id.to_string(),
                        score,
                        candidate_info: Some("NetEase".to_string()),
                        duration_diff_sec: None,
                    })
                } else {
                    None
                }
            } else if !lrc_body.is_empty() {
                let filtered_lrc = filter_lrc_credit_lines(lrc_body);
                let sync_type = if has_lrc_timestamps(&filtered_lrc) {
                    SyncType::LineSynced
                } else {
                    SyncType::PlainText
                };
                Some(LyricsCandidate {
                    provider: "NetEase".to_string(),
                    sync_type,
                    raw_lrc: filtered_lrc,
                    translation_lrc,
                    parsed_lines: None,
                    candidate_id: song_id.to_string(),
                    score,
                    candidate_info: Some("NetEase".to_string()),
                    duration_diff_sec: None,
                })
            } else {
                None
            };

            if let Some(cand) = candidate_opt {
                candidates.push(cand);
            }
        }
    }

    candidates
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_yrc_basic() {
        let sample = "[12000,3200](12000,500,0)Ne(12500,400,0)ver (12900,600,0)gon(13500,700,0)na\n[16000,2000](16000,1000,0)give (17000,1000,0)up";
        let res = parse_yrc_to_enhanced_lrc_and_lines(sample, None);
        assert!(res.is_some());
        let (enhanced_lrc, lines) = res.unwrap();

        assert_eq!(lines.len(), 2);
        assert_eq!(lines[0].time_ms, 12000);
        assert_eq!(lines[0].text, "Never gonna");
        assert_eq!(lines[0].words.len(), 4);
        assert_eq!(lines[0].words[0].text, "Ne");
        assert_eq!(lines[0].words[0].time_ms, 12000);
        assert_eq!(lines[0].words[0].duration_ms, Some(500));
        assert_eq!(lines[0].words[1].text, "ver ");
        assert_eq!(lines[0].words[1].time_ms, 12500);

        assert_eq!(lines[1].time_ms, 16000);
        assert_eq!(lines[1].text, "give up");
        assert_eq!(lines[1].words.len(), 2);

        assert!(enhanced_lrc.contains("[00:12.00]"));
        assert!(enhanced_lrc.contains("<00:12.00>Ne"));
        assert!(enhanced_lrc.contains("<00:12.50>ver "));
    }

    #[test]
    fn test_parse_yrc_empty_or_invalid() {
        assert!(parse_yrc_to_enhanced_lrc_and_lines("", None).is_none());
        assert!(parse_yrc_to_enhanced_lrc_and_lines("no brackets here", None).is_none());
    }

    #[test]
    fn test_parse_yrc_restores_ground_truth_word_spacing() {
        let yrc = "[1000,1800](1000,300,0)I'm(1300,500,0)going(1800,600,0)through";
        let lrc = "[00:01.00]I'm going through";
        let (_, lines) = parse_yrc_to_enhanced_lrc_and_lines(yrc, Some(lrc)).unwrap();

        assert_eq!(lines[0].text, "I'm going through");
        assert_eq!(lines[0].words[0].text, "I'm ");
        assert_eq!(lines[0].words[1].text, "going ");
        assert_eq!(lines[0].words[2].text, "through");
    }

    #[test]
    fn test_parse_yrc_restores_common_english_boundaries_without_lrc() {
        let yrc = "[1000,1000](1000,300,0)how(1300,400,0)to";
        let (_, lines) = parse_yrc_to_enhanced_lrc_and_lines(yrc, None).unwrap();

        assert_eq!(lines[0].words[0].text, "how ");
        assert_eq!(lines[0].text, "how to");
    }

    #[test]
    fn test_parse_yrc_screenshot_spacing() {
        let yrc1 = "[1000,2000](1000,200,0)It(1200,300,0)feels(1500,200,0)like(1700,200,0)you(1900,300,0)don't(2200,400,0)care";
        let (_, lines1) = parse_yrc_to_enhanced_lrc_and_lines(yrc1, None).unwrap();
        assert_eq!(lines1[0].text, "It feels like you don't care");

        let yrc2 = "[3000,3000](3000,200,0)No,(3200,200,0)I(3400,300,0)can't(3700,300,0)sleep(4000,300,0)until(4300,200,0)I(4500,300,0)feel(4800,200,0)your(5000,500,0)touch";
        let (_, lines2) = parse_yrc_to_enhanced_lrc_and_lines(yrc2, None).unwrap();
        assert_eq!(lines2[0].text, "No, I can't sleep until I feel your touch");
    }

    #[test]
    fn test_is_credit_metadata_line() {
        // Screenshot samples
        assert!(is_credit_metadata_line("制作人 : Michael Jackson/Teddy Riley"));
        assert!(is_credit_metadata_line("词 : Michael Jackson/Teddy Riley/Nate Smith/Teron Beal/Eritza Laues/Kenny Quiller/Andreao Heard"));
        assert!(is_credit_metadata_line("作曲 : Teron Beal/Andreao Heard/Michael Jackson/Eritza Laues/Kenny Quiller/Teddy Riley/Nate Smith"));
        assert!(is_credit_metadata_line("作词 : David Burke"));
        assert!(is_credit_metadata_line("作曲 : David Burke"));
        assert!(is_credit_metadata_line("编曲 : Teddy Riley"));
        assert!(is_credit_metadata_line("混音 : Serban Ghenea"));
        assert!(is_credit_metadata_line("监制 : Quiller"));
        assert!(is_credit_metadata_line("OP : Sony/ATV Music"));
        assert!(is_credit_metadata_line("SP : Sony/ATV Music"));
        assert!(is_credit_metadata_line("词曲 : 周杰伦"));
        assert!(is_credit_metadata_line("词/曲 : 周杰伦"));
        assert!(is_credit_metadata_line("Written by David Burke"));
        assert!(is_credit_metadata_line("Lyrics by Michael Jackson"));
        assert!(is_credit_metadata_line("Produced by Teddy Riley"));
        assert!(is_credit_metadata_line("Composer: Teron Beal"));
        assert!(is_credit_metadata_line("Lyricist: David Burke"));
        assert!(is_credit_metadata_line("Producer : Teddy Riley"));
        assert!(is_credit_metadata_line("纯音乐，请欣赏"));
        assert!(is_credit_metadata_line("[ti:Remember the Time]"));
        assert!(is_credit_metadata_line("[ar:Michael Jackson]"));

        // Genuine lyrics should NOT be filtered
        assert!(!is_credit_metadata_line("Never gonna give you up"));
        assert!(!is_credit_metadata_line("I said, ooh, I'm blinded by the lights"));
        assert!(!is_credit_metadata_line("词不达意"));
        assert!(!is_credit_metadata_line("曲终人散"));
        assert!(!is_credit_metadata_line("Produced like a champion"));
        assert!(!is_credit_metadata_line("Written across the sky"));
    }

    #[test]
    fn test_parse_yrc_filters_credit_blocks() {
        let sample = "\
[0,2000](0,500,0)制作人(500,500,0) : (1000,1000,0)Michael Jackson\n\
[2000,2000](2000,500,0)词(2500,500,0) : (3000,1000,0)Teddy Riley\n\
[4000,2000](4000,500,0)作曲(4500,500,0) : (5000,1000,0)Teddy Riley\n\
[12000,3200](12000,500,0)Do (12500,500,0)you (13000,1000,0)remember\n\
[16000,2000](16000,1000,0)the (17000,1000,0)time";

        let res = parse_yrc_to_enhanced_lrc_and_lines(sample, None);
        assert!(res.is_some());
        let (enhanced_lrc, lines) = res.unwrap();

        // 3 credit lines stripped; only 2 real singing lines remain
        assert_eq!(lines.len(), 2);
        assert_eq!(lines[0].text, "Do you remember");
        assert_eq!(lines[0].time_ms, 12000);
        assert_eq!(lines[1].text, "the time");
        assert_eq!(lines[1].time_ms, 16000);

        assert!(!enhanced_lrc.contains("制作人"));
        assert!(!enhanced_lrc.contains("Teddy Riley"));
        assert!(enhanced_lrc.contains("[00:12.00]"));
        assert!(enhanced_lrc.contains("remember"));
    }

    #[test]
    fn test_filter_lrc_credit_lines() {
        let raw = "\
[ti:Dangerous]
[ar:Michael Jackson]
[00:00.00]制作人 : Teddy Riley
[00:01.50]作词 : David Burke
[00:03.00]作曲 : David Burke
[00:15.20]The way she came into the place
[00:18.50]I knew right then and there";

        let filtered = filter_lrc_credit_lines(raw);
        assert!(!filtered.contains("制作人"));
        assert!(!filtered.contains("David Burke"));
        assert!(!filtered.contains("[ti:Dangerous]"));
        assert!(filtered.contains("[00:15.20]The way she came into the place"));
        assert!(filtered.contains("[00:18.50]I knew right then and there"));
    }
}

