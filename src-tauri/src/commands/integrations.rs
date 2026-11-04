use crate::models::SpotifyPlaybackState;
use std::sync::OnceLock;
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

static SHARED_HTTP_CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

fn get_shared_client() -> &'static reqwest::Client {
    SHARED_HTTP_CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(6))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new())
    })
}

#[tauri::command]
pub fn get_local_playback() -> Result<Option<SpotifyPlaybackState>, String> {
    // Fast-path: read instantaneous atomic in-memory cache populated by dedicated SMTC background thread
    // This eliminates blocking WinRT COM calls on Tauri IPC worker threads and guarantees <1µs latency with zero thread deadlock.
    if let Some(state) = crate::media::get_cached_playback_state() {
        return Ok(Some(state));
    }
    // Startup fast-path: if background thread has not yet completed its initial poll cycle,
    // query platform backend immediately to avoid race conditions during application boot.
    let backend = crate::media::get_platform_backend();
    if let Some(track) = backend.poll_playback() {
        if let Some(playback_state) = track.to_spotify_playback_state() {
            crate::media::set_cached_playback_state(playback_state.clone());
            return Ok(Some(playback_state));
        }
    }
    Ok(None)
}

#[tauri::command]
pub fn trigger_playback_control(action: String, position_ms: Option<u64>) -> Result<(), String> {
    let backend = crate::media::get_platform_backend();
    let pos = position_ms.unwrap_or(0);
    if action == "seek" {
        if let Some(mut state) = crate::media::get_cached_playback_state() {
            state.progress_ms = pos;
            state.timestamp_ms = Some(
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_millis() as u64)
                    .unwrap_or(0),
            );
            crate::media::set_cached_playback_state(state);
        }
    }
    backend.trigger_control(&action, pos);
    Ok(())
}

#[tauri::command]
pub fn get_music_app_volume() -> Result<Option<crate::models::MusicAppVolumeInfo>, String> {
    #[cfg(target_os = "windows")]
    {
        crate::media::windows_smtc::get_music_app_volume_info()
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(None)
    }
}

#[tauri::command]
pub fn adjust_music_app_volume(
    delta: Option<f32>,
    target: Option<f32>,
) -> Result<Option<crate::models::MusicAppVolumeInfo>, String> {
    #[cfg(target_os = "windows")]
    {
        if let Some(target_val) = target {
            crate::media::windows_smtc::set_music_app_volume(target_val)
        } else if let Some(delta_val) = delta {
            crate::media::windows_smtc::step_music_app_volume(delta_val)
        } else {
            crate::media::windows_smtc::get_music_app_volume_info()
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (delta, target);
        Ok(None)
    }
}

#[tauri::command]
pub fn toggle_music_app_mute() -> Result<Option<crate::models::MusicAppVolumeInfo>, String> {
    #[cfg(target_os = "windows")]
    {
        crate::media::windows_smtc::toggle_music_app_mute()
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(None)
    }
}

#[tauri::command]
pub fn show_now_playing_notification(
    app: AppHandle,
    track: serde_json::Value,
) -> Result<(), String> {
    tauri::async_runtime::spawn(async move {
        let title = track["name"]
            .as_str()
            .or_else(|| track["title"].as_str())
            .unwrap_or("Now Playing")
            .to_string();
        let artist = track["artists"][0]["name"]
            .as_str()
            .or_else(|| track["artist"].as_str())
            .unwrap_or("Unknown Artist")
            .to_string();

        let _ = app
            .notification()
            .builder()
            .title(&title)
            .body(format!("Playing - {artist}"))
            .show();
    });

    Ok(())
}

#[tauri::command]
pub async fn open_external(url: String) -> Result<(), String> {
    let trimmed = url.trim();
    if trimmed.is_empty()
        || trimmed.contains('\0')
        || trimmed.contains('\r')
        || trimmed.contains('\n')
    {
        return Err("Invalid URL".to_string());
    }

    if trimmed.starts_with("spotify:") {
        // Spotify URIs only allow safe identifier characters
        if trimmed.chars().all(|c| {
            c.is_alphanumeric()
                || c == ':'
                || c == '/'
                || c == '?'
                || c == '='
                || c == '&'
                || c == '_'
                || c == '-'
        }) {
            open::that(trimmed).map_err(|e| e.to_string())?;
            return Ok(());
        } else {
            return Err("Invalid characters in Spotify URI".to_string());
        }
    }

    let parsed = reqwest::Url::parse(trimmed).map_err(|e| format!("Invalid URL: {e}"))?;
    let scheme = parsed.scheme();
    if scheme != "https" && scheme != "http" {
        return Err("Only HTTP, HTTPS, and Spotify schemes are allowed".to_string());
    }

    open::that(parsed.as_str()).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn lastfm_api(data: serde_json::Value) -> Result<serde_json::Value, String> {
    let method = data["method"].as_str().unwrap_or("");
    let api_key = data["apiKey"].as_str().unwrap_or("");
    let api_secret = data["apiSecret"].as_str().unwrap_or("");
    let session_key = data["sessionKey"].as_str().unwrap_or("");

    crate::log_to_file(&format!("[Last.fm API] Calling method='{}'", method));

    if api_key.is_empty() {
        return Err("Missing Last.fm API key".to_string());
    }

    let auth_required = matches!(
        method,
        "auth.getSession"
            | "track.updateNowPlaying"
            | "track.scrobble"
            | "track.love"
            | "track.unlove"
    );

    let mut params: Vec<(String, String)> = vec![
        ("method".to_string(), method.to_string()),
        ("api_key".to_string(), api_key.to_string()),
    ];

    if !session_key.is_empty() {
        params.push(("sk".to_string(), session_key.to_string()));
    }

    if let Some(obj) = data["params"].as_object() {
        for (k, v) in obj {
            if let Some(s) = v.as_str() {
                params.push((k.clone(), s.to_string()));
            } else if let Some(n) = v.as_i64() {
                params.push((k.clone(), n.to_string()));
            } else if let Some(n) = v.as_u64() {
                params.push((k.clone(), n.to_string()));
            } else if let Some(b) = v.as_bool() {
                params.push((k.clone(), b.to_string()));
            }
        }
    }

    if auth_required && !api_secret.is_empty() {
        // Sort params alphabetically for Last.fm MD5 signature (excluding format and api_sig)
        params.sort_by(|a, b| a.0.cmp(&b.0));

        let mut sig_base = String::new();
        for (k, v) in &params {
            sig_base.push_str(k);
            sig_base.push_str(v);
        }
        sig_base.push_str(api_secret);

        let api_sig = format!("{:x}", md5::compute(sig_base.as_bytes()));
        params.push(("api_sig".to_string(), api_sig));
    }

    params.push(("format".to_string(), "json".to_string()));

    let client = get_shared_client();

    let res = if auth_required {
        client
            .post("https://ws.audioscrobbler.com/2.0/")
            .form(&params)
            .send()
            .await
            .map_err(|e| e.to_string())?
    } else {
        client
            .get("https://ws.audioscrobbler.com/2.0/")
            .query(&params)
            .send()
            .await
            .map_err(|e| e.to_string())?
    };

    let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    crate::log_to_file(&format!(
        "[Last.fm API] Result for method='{}': status=ok",
        method
    ));
    Ok(json)
}

fn contains_hinglish_or_punjabi_tokens(text: &str) -> (bool, &'static str, &'static str) {
    let lower = text.to_lowercase();
    let words: Vec<&str> = lower
        .split(|c: char| !c.is_alphanumeric())
        .filter(|w| !w.is_empty())
        .collect();
    if words.is_empty() {
        return (false, "none", "none");
    }

    let punjabi_markers = [
        "kade",
        "milke",
        "betho",
        "kariye",
        "vaaj",
        "mardi",
        "fado",
        "taareyan",
        "mainu",
        "tenu",
        "assi",
        "tussi",
        "sanhu",
        "sohni",
        "sohna",
        "kudi",
        "munda",
        "jatt",
        "jatti",
        "gabru",
        "billo",
        "chhad",
        "chhadke",
        "pind",
        "naal",
        "nachdi",
        "karda",
        "kardi",
        "karde",
        "kiven",
        "hor",
        "gallan",
        "yaari",
        "boliyan",
        "bhangra",
        "gediyan",
        "patiala",
        "amritsar",
        "punjab",
        "punjabi",
        "chandigarh",
        "jhanjhar",
        "surma",
        "kolo",
        "tere",
        "meri",
        "pyar",
        "pyaar",
        "veere",
        "sohneya",
        "mutiyar",
        "jind",
        "jindri",
        "ni",
        "oye",
        "sardar",
        "sajjna",
        "maahi",
        "mahi",
        "channa",
        "chann",
        "akhiyan",
        "akh",
        "dilbar",
        "dildar",
        "veh",
        "vich",
        "tethon",
        "methon",
        "rehnda",
        "rehndi",
        "rehnde",
        "kudiye",
        "mundeya",
        "nachna",
        "nach",
        "giddha",
        "jattwaad",
        "gabruu",
        "salwar",
        "jhanjran",
        "jhanjar",
    ];

    let hindi_markers = [
        "mein", "mai", "mai", "hai", "hain", "hoon", "ho", "tha", "thi", "thay", "hoga", "hogi",
        "hoge", "tum", "tumhe", "tumko", "tera", "teri", "tere", "tujhe", "tujhko", "aap", "aapko",
        "hum", "humein", "hume", "hamara", "hamari", "mera", "meri", "mere", "kya", "kyun",
        "kaise", "kahan", "yahan", "wahan", "yeh", "woh", "nahi", "nahin", "mat", "kyunki", "jab",
        "tab", "bhi", "toh", "agar", "lekin", "saath", "zindagi", "pyar", "pyaar", "ishq",
        "mohabbat", "deewana", "dil", "dhadkan", "aankhon", "raat", "subah", "shaam", "duniya",
        "khushi", "dard", "chahiye", "mujhe", "mujhko", "raha", "rahi", "rahe", "karo", "karna",
        "karke", "mujhse", "kuch", "koi", "kahan", "yaha", "yahan", "waha", "wahan", "tera",
        "teri", "chahiye", "kyunki", "jab", "tab", "bhi", "toh", "nahi", "ni", "ve", "sajna",
        "yaara", "rab", "rabb", "tu", "tune", "tera", "teri", "tere", "tumhara", "tumhari",
        "tumhare", "apna", "apni", "apne", "humara", "humari", "humare", "unka", "unki", "unke",
        "iska", "iski", "iske", "uska", "uski", "uske", "inse", "usse", "unse", "kaun", "kisko",
        "kisne", "kiske", "kidhar", "kidar", "kab", "kaisa", "kaisi", "kaise", "kitna", "kitni",
        "kitne", "kyu", "kyun", "kyunki", "isliye", "phir", "fir", "abhi", "ab", "kabhi",
        "hamesha", "har", "sab", "sabka", "sabki", "koi", "kuch", "bahut", "bohot", "zyada", "kam",
        "sirf", "bas", "bilkul", "accha", "acha", "achha", "acchi", "achhi", "bura", "buri",
        "sahi", "galat", "chal", "chalo", "chale", "chali", "chalta", "chalti", "chalte", "ja",
        "jaa", "jao", "jaana", "jaane", "aaja", "aajao", "aana", "aaye", "gaya", "gayi", "gaye",
        "kar", "karo", "karu", "karoon", "kare", "karen", "karta", "karti", "karte", "kiya",
        "kiye", "karna", "karne", "hota", "hoti", "hote", "hua", "hui", "hue", "raha", "rahi",
        "rahe", "rakh", "rakhna", "dono", "diya", "diye", "le", "lo", "lena", "mile", "milta",
        "milti", "milna", "bol", "bolo", "bola", "boli", "suno", "suna", "suna", "dekho", "dekh",
        "dekha", "dekhi", "samajh", "samjha", "pata", "maloom", "waqt", "lamha", "lamhe", "pal",
        "sapna", "sapne", "khwab", "khwaab", "yaad", "yaadein", "dil", "jaan", "jaana", "zara",
        "ishq", "mohabbat", "aashiq", "sajna", "sajni", "maahi", "mahi", "sanam", "piya", "piya",
        "saajan", "saiyaan", "saiyan", "tere", "mere", "haye", "haaye", "oye", "uff", "jiya",
        "jiyara", "naina", "akhiyan", "roop", "rang", "chand", "chaand", "taare", "mausam",
        "baarish", "badal", "hawa", "dhadkan", "saans", "saanson", "aankhein", "aankhen",
        "aankhon", "honth", "labon", "rasta", "raaste", "manzil", "zindagi", "duniya", "khushi",
        "dard", "tanha", "tanhai", "intezaar", "intezar", "wafa", "bewafa", "dilruba", "kismat",
        "naseeb", "khuda",
    ];

    let english_markers = [
        "the", "this", "that", "with", "from", "they", "them", "their", "there", "what", "when",
        "where", "which", "would", "could", "should", "about", "into", "because", "through",
        "people", "around", "just", "like", "know",
    ];
    let english_count = words.iter().filter(|w| english_markers.contains(w)).count();

    let mut punjabi_hits = Vec::new();
    let mut hindi_hits = Vec::new();

    for w in &words {
        if punjabi_markers.contains(w) {
            punjabi_hits.push(*w);
        }
        if hindi_markers.contains(w) {
            hindi_hits.push(*w);
        }
    }

    // Short lyric fragments often contain only two Hindi/Punjabi words
    // ("tere naina", "dil mera"). Requiring three hits made these lines
    // bypass transliteration entirely. Keep the stricter threshold for longer
    // text, where occasional loanwords are more likely to be false positives.
    let required_hits = if words.len() <= 6 {
        2
    } else {
        3usize.max((words.len() + 19) / 20)
    };
    let distinct_count = |hits: &[&str]| {
        hits.iter()
            .copied()
            .collect::<std::collections::HashSet<_>>()
            .len()
    };
    let punjabi_count = punjabi_hits.len();
    let hindi_count = hindi_hits.len();

    if english_count >= 3 && english_count > hindi_count && english_count > punjabi_count {
        return (false, "none", "none");
    }

    // Require multiple distinct language markers and a minimum density. This
    // prevents English lyrics containing a stray loanword from being routed
    // through transliteration, while short Hinglish phrases still qualify.
    let punjabi_detected = punjabi_count >= required_hits
        && distinct_count(&punjabi_hits) >= 2
        && punjabi_count * 20 >= words.len();
    let hindi_detected = hindi_count >= required_hits
        && distinct_count(&hindi_hits) >= 2
        && hindi_count * 20 >= words.len();

    if punjabi_detected {
        (true, "pa-t-i0-und", "pa")
    } else if hindi_detected {
        (true, "hi-t-i0-und", "hi")
    } else {
        (false, "none", "none")
    }
}

fn push_translation_segment(
    output: &mut String,
    source: &str,
    cursor: &mut usize,
    source_segment: &str,
    translated: &str,
) {
    if translated.is_empty() {
        return;
    }
    if !source_segment.is_empty() && *cursor <= source.len() {
        if let Some(relative) = source[*cursor..].find(source_segment) {
            let start = *cursor + relative;
            output.push_str(&source[*cursor..start]);
            output.push_str(translated);
            *cursor = start + source_segment.len();
            return;
        }
    }

    // Google sometimes returns a segment whose source spelling differs from
    // the request. Keep a word boundary in that case instead of fusing tokens.
    let starts_with_punctuation = translated
        .chars()
        .next()
        .is_some_and(|c| c.is_ascii_punctuation() && !matches!(c, '\'' | '"'));
    if !output.is_empty()
        && !output.chars().last().is_some_and(char::is_whitespace)
        && !starts_with_punctuation
    {
        output.push(' ');
    }
    output.push_str(translated);
}

async fn try_hinglish_translation(
    client: &reqwest::Client,
    text: &str,
    target_lang: &str,
) -> Option<String> {
    let (is_hinglish, itc, sl) = contains_hinglish_or_punjabi_tokens(text);
    if !is_hinglish {
        return None;
    }

    crate::log_to_file(&format!("[Translate API] Detected Hinglish/Punjabi text with itc='{}', sl='{}'. Attempting transliteration...", itc, sl));

    // 1. Google Input Tools transliteration request
    let input_tools_url = format!(
        "https://inputtools.google.com/request?text={}&itc={}&num=1",
        urlencoding::encode(text),
        itc
    );
    let user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    let res = client
        .get(&input_tools_url)
        .header("User-Agent", user_agent)
        .send()
        .await
        .ok()?;

    let json: serde_json::Value = res.json().await.ok()?;
    if json[0].as_str() != Some("SUCCESS") {
        return None;
    }

    let mut transliterated = String::new();
    let mut transliteration_cursor = 0usize;
    if let Some(items) = json[1].as_array() {
        for item in items {
            let source_segment = item[0].as_str().unwrap_or("");
            if let Some(candidates) = item[1].as_array() {
                if let Some(cand) = candidates.get(0).and_then(|c| c.as_str()) {
                    push_translation_segment(
                        &mut transliterated,
                        text,
                        &mut transliteration_cursor,
                        source_segment,
                        cand,
                    );
                }
            }
        }
    }

    if transliterated.trim().is_empty() {
        return None;
    }

    crate::log_to_file(&format!("[Translate API] Transliterated Hinglish to native script (chars={}). Translating to target='{}'...", transliterated.len(), target_lang));

    // 2. Translate native Gurmukhi or Devanagari text to target_lang
    let clients = ["dict-chrome-ex", "gtx"];
    for google_client in clients {
        let tr_url = format!("https://translate.googleapis.com/translate_a/single?client={google_client}&sl={sl}&tl={target_lang}&dt=t");
        let tr_res = client
            .post(&tr_url)
            .header("Content-Type", "application/x-www-form-urlencoded")
            .header("User-Agent", user_agent)
            .form(&[("q", &transliterated)])
            .send()
            .await;

        if let Ok(resp) = tr_res {
            if resp.status().is_success() {
                if let Ok(data) = resp.json::<serde_json::Value>().await {
                    let mut result_text = String::new();
                    let mut translation_cursor = 0usize;
                    if let Some(arr) = data[0].as_array() {
                        for item in arr {
                            if let Some(s) = item[0].as_str() {
                                let source_segment = item[1].as_str().unwrap_or("");
                                push_translation_segment(
                                    &mut result_text,
                                    &transliterated,
                                    &mut translation_cursor,
                                    source_segment,
                                    s,
                                );
                            }
                        }
                    }
                    if !result_text.trim().is_empty() {
                        crate::log_to_file(&format!("[Translate API] Hinglish translation successful via client='{}' (chars={})", google_client, result_text.len()));
                        return Some(result_text);
                    }
                }
            }
        }
    }

    None
}

#[tauri::command]
pub async fn translate_text(
    text: String,
    target_lang: String,
    skip_lang: Option<String>,
) -> Result<serde_json::Value, String> {
    if text.trim().is_empty() {
        return Ok(serde_json::json!({ "text": null, "src": "empty" }));
    }

    let client = get_shared_client();

    // Check if target language is English and input contains Hinglish or Punjabi Romanized vocabulary
    if target_lang.eq_ignore_ascii_case("en") {
        if let Some(hinglish_res) = try_hinglish_translation(&client, &text, &target_lang).await {
            return Ok(serde_json::json!({ "text": hinglish_res, "src": "hinglish" }));
        }
    }

    let user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    let clients = ["dict-chrome-ex", "gtx"];
    let mut last_err = String::new();

    for google_client in clients {
        let url = format!("https://translate.googleapis.com/translate_a/single?client={google_client}&sl=auto&tl={target_lang}&dt=t");
        let res = client
            .post(&url)
            .header("Content-Type", "application/x-www-form-urlencoded")
            .header("User-Agent", user_agent)
            .form(&[("q", &text)])
            .send()
            .await;

        match res {
            Ok(resp) if resp.status().is_success() => {
                if let Ok(data) = resp.json::<serde_json::Value>().await {
                    let mut full_translation = String::new();
                    let mut translation_cursor = 0usize;
                    if let Some(arr) = data[0].as_array() {
                        for item in arr {
                            if let Some(s) = item[0].as_str() {
                                let source_segment = item[1].as_str().unwrap_or("");
                                push_translation_segment(
                                    &mut full_translation,
                                    &text,
                                    &mut translation_cursor,
                                    source_segment,
                                    s,
                                );
                            }
                        }
                    }
                    let src_lang = data[2].as_str().unwrap_or("unknown");

                    crate::log_to_file(&format!(
                        "[Translate API] Success via client='{}': src='{}', target='{}', chars={}",
                        google_client,
                        src_lang,
                        target_lang,
                        full_translation.len()
                    ));

                    // Normalize language tags for comparison (e.g., 'en-US' matches 'en')
                    let src_base = src_lang
                        .split('-')
                        .next()
                        .unwrap_or(src_lang)
                        .to_lowercase();
                    let target_base = target_lang
                        .split('-')
                        .next()
                        .unwrap_or(&target_lang)
                        .to_lowercase();
                    let source_matches_target = src_base == target_base;

                    let is_explicit_skip = skip_lang.as_deref().map_or(false, |sl| {
                        if sl == "none" || sl.is_empty() {
                            return false;
                        }
                        let sl_base = sl.split('-').next().unwrap_or(sl).to_lowercase();
                        src_lang.eq_ignore_ascii_case(sl) || src_base == sl_base
                    });

                    // If translation returned verbatim identical text or was marked skipped, attempt Hinglish fallback
                    if !source_matches_target
                        && (is_explicit_skip
                            || full_translation.trim().eq_ignore_ascii_case(text.trim()))
                        && target_base == "en"
                    {
                        if let Some(hinglish_res) =
                            try_hinglish_translation(&client, &text, &target_lang).await
                        {
                            return Ok(
                                serde_json::json!({ "text": hinglish_res, "src": "hinglish" }),
                            );
                        }
                    }

                    if is_explicit_skip || source_matches_target {
                        crate::log_to_file(&format!(
                            "[Translate API] Skipping translation: source matches skip/target (src='{}', target='{}')",
                            src_lang, target_lang,
                        ));
                        return Ok(
                            serde_json::json!({ "text": null, "src": src_lang, "skipped": true }),
                        );
                    }

                    if full_translation.trim().is_empty() {
                        return Ok(serde_json::json!({ "text": null, "src": src_lang }));
                    }

                    return Ok(serde_json::json!({ "text": full_translation, "src": src_lang }));
                }
            }
            Ok(resp) => {
                let status = resp.status();
                last_err = format!("HTTP {}", status);
                crate::log_to_file(&format!(
                    "[Translate API] Client '{}' returned non-success status: {}",
                    google_client, status
                ));
            }
            Err(e) => {
                last_err = e.to_string();
                crate::log_to_file(&format!(
                    "[Translate API] Client '{}' request error: {}",
                    google_client, e
                ));
            }
        }
    }

    crate::log_to_file(&format!(
        "[Translate API] All translation endpoints failed. Last error: {}",
        last_err
    ));
    Ok(serde_json::json!({ "text": null, "src": "error", "error": last_err }))
}

#[tauri::command]
pub async fn fetch_music_news(query: String) -> Result<String, String> {
    let client = get_shared_client();
    let encoded_query = query.replace(' ', "+");
    let url = format!("https://news.google.com/rss/search?q={encoded_query}");
    let res = client.get(&url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .header("Accept", "application/rss+xml, application/xml, text/xml, */*")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let text = res.text().await.map_err(|e| e.to_string())?;
    Ok(text)
}

struct TotpSecret {
    secret: &'static str,
    version: u32,
}

const KNOWN_TOTP_SECRETS: &[TotpSecret] = &[
    TotpSecret {
        secret: ",7/*F(\"rLJ2oxaKL^f+E1xvP@N",
        version: 61,
    },
    TotpSecret {
        secret: "OmE{ZA.J^\":0FG\\Uz?[@WW",
        version: 60,
    },
    TotpSecret {
        secret: "{iOFn;4}<1PFYKPV?5{%u14]M>/V0hDH",
        version: 59,
    },
];

pub fn generate_spotify_totp(secret: &str, timestamp_ms: u64) -> String {
    let mut key_str = String::with_capacity(secret.len() * 3);
    for (idx, ch) in secret.chars().enumerate() {
        let transformed = (ch as u32) ^ ((idx as u32 % 33) + 9);
        key_str.push_str(&transformed.to_string());
    }

    let counter = timestamp_ms / 1000 / 30;
    let counter_bytes = counter.to_be_bytes();

    let key = ring::hmac::Key::new(
        ring::hmac::HMAC_SHA1_FOR_LEGACY_USE_ONLY,
        key_str.as_bytes(),
    );
    let tag = ring::hmac::sign(&key, &counter_bytes);
    let bytes = tag.as_ref();

    let offset = (bytes[bytes.len() - 1] & 0x0f) as usize;
    let binary = (((bytes[offset] & 0x7f) as u32) << 24)
        | ((bytes[offset + 1] as u32) << 16)
        | ((bytes[offset + 2] as u32) << 8)
        | (bytes[offset + 3] as u32);

    let code = binary % 1_000_000;
    format!("{:06}", code)
}

async fn fetch_spotify_server_time(client: &reqwest::Client, sp_dc: &str) -> Option<u64> {
    let res = client.get("https://open.spotify.com/api/server-time")
        .header("Cookie", format!("sp_dc={sp_dc}"))
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36")
        .header("Accept", "application/json")
        .header("Referer", "https://open.spotify.com/")
        .send()
        .await
        .ok()?;

    if res.status().is_success() {
        let json: serde_json::Value = res.json().await.ok()?;
        json.get("serverTime").and_then(|v| v.as_u64())
    } else {
        None
    }
}

async fn fetch_dynamic_totp_secrets(client: &reqwest::Client) -> Vec<(String, u32)> {
    let index_res = match client.get("https://open.spotify.com/")
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36")
        .send()
        .await {
            Ok(r) => r,
            Err(_) => return Vec::new(),
        };

    let html = match index_res.text().await {
        Ok(t) => t,
        Err(_) => return Vec::new(),
    };

    let script_url = if let Some(start) =
        html.find("https://open.spotifycdn.com/cdn/build/web-player/web-player.")
    {
        if let Some(end) = html[start..].find(".js") {
            &html[start..start + end + 3]
        } else {
            return Vec::new();
        }
    } else {
        return Vec::new();
    };

    let script_res = match client.get(script_url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36")
        .send()
        .await {
            Ok(r) => r,
            Err(_) => return Vec::new(),
        };

    let js = match script_res.text().await {
        Ok(t) => t,
        Err(_) => return Vec::new(),
    };

    let mut results = Vec::new();
    if let Some(pos) = js.find("let ej=[") {
        let slice = &js[pos + 8..];
        if let Some(end_bracket) = slice.find(']') {
            let ej_content = &slice[..end_bracket];
            for part in ej_content.split('{') {
                if part.is_empty() {
                    continue;
                }
                let secret = if let Some(s_idx) = part.find("secret:") {
                    let after = &part[s_idx + 7..];
                    let quote = after.chars().next().unwrap_or('\'');
                    if quote == '\'' || quote == '"' {
                        let inner = &after[1..];
                        if let Some(q_end) = inner.find(quote) {
                            &inner[..q_end]
                        } else {
                            ""
                        }
                    } else {
                        ""
                    }
                } else {
                    ""
                };

                let version: Option<u32> = if let Some(v_idx) = part.find("version:") {
                    let after = &part[v_idx + 8..];
                    let digits: String = after.chars().take_while(|c| c.is_ascii_digit()).collect();
                    digits.parse().ok()
                } else {
                    None
                };

                if !secret.is_empty() && version.is_some() {
                    results.push((secret.to_string(), version.unwrap()));
                }
            }
        }
    }

    results
}

async fn try_request_spotify_token(
    client: &reqwest::Client,
    sp_dc: &str,
    secret: &str,
    version: u32,
    server_time: Option<u64>,
) -> Result<Option<String>, String> {
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    let totp = generate_spotify_totp(secret, now_ms);
    let totp_server = if let Some(st) = server_time {
        generate_spotify_totp(secret, st * 1000)
    } else {
        "unavailable".to_string()
    };

    let url = format!(
        "https://open.spotify.com/api/token?reason=transport&productType=web_player&totp={}&totpServer={}&totpVer={}",
        totp, totp_server, version
    );

    let res = client.get(&url)
        .header("Cookie", format!("sp_dc={sp_dc}"))
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36")
        .header("Accept", "application/json")
        .header("Referer", "https://open.spotify.com/")
        .header("app-platform", "WebPlayer")
        .header("sec-ch-ua", "\"Not(A:Brand\";v=\"99\", \"Google Chrome\";v=\"133\", \"Chromium\";v=\"133\"")
        .header("sec-ch-ua-mobile", "?0")
        .header("sec-ch-ua-platform", "\"Windows\"")
        .header("sec-fetch-dest", "empty")
        .header("sec-fetch-mode", "cors")
        .header("sec-fetch-site", "same-origin")
        .send()
        .await
        .map_err(|e| {
            crate::log_to_file(&format!("[Spotify Auth] /api/token request error: {e}"));
            e.to_string()
        })?;

    let status = res.status();
    crate::log_to_file(&format!(
        "[Spotify Auth] /api/token (ver {version}) HTTP status: {status}"
    ));

    if status.is_success() {
        let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
        if let Some(tok) = json
            .get("accessToken")
            .and_then(|v| v.as_str())
            .or_else(|| json.get("access_token").and_then(|v| v.as_str()))
        {
            crate::log_to_file("[Spotify Auth] Successfully extracted accessToken via /api/token!");
            return Ok(Some(tok.to_string()));
        } else {
            crate::log_to_file(&format!(
                "[Spotify Auth] 'accessToken' not found in /api/token response: {json:?}"
            ));
        }
    } else {
        let err_body = res.text().await.unwrap_or_default();
        crate::log_to_file(&format!("[Spotify Auth] /api/token error body: {err_body}"));
    }

    Ok(None)
}

#[tauri::command]
pub async fn get_access_token(sp_dc: String) -> Result<Option<String>, String> {
    crate::log_to_file(&format!(
        "[Spotify Auth] Fetching access token with sp_dc length={}",
        sp_dc.len()
    ));
    let client = get_shared_client();

    let server_time = fetch_spotify_server_time(&client, &sp_dc).await;

    // 1. Try known TOTP secrets (starting from latest version)
    for s in KNOWN_TOTP_SECRETS {
        if let Ok(Some(token)) =
            try_request_spotify_token(&client, &sp_dc, s.secret, s.version, server_time).await
        {
            // Update stored config access_token if config exists
            if let Ok(Some(mut cfg)) = crate::commands::config::load_config() {
                cfg["access_token"] = serde_json::json!(token);
                let _ = crate::commands::config::save_config(cfg);
            }
            return Ok(Some(token));
        }
    }

    // 2. Try dynamically extracted secrets from live web-player bundle
    crate::log_to_file("[Spotify Auth] Known TOTP secrets failed, attempting dynamic extraction from web-player bundle...");
    let dynamic_secrets = fetch_dynamic_totp_secrets(&client).await;
    for (sec, ver) in dynamic_secrets {
        if let Ok(Some(token)) =
            try_request_spotify_token(&client, &sp_dc, &sec, ver, server_time).await
        {
            if let Ok(Some(mut cfg)) = crate::commands::config::load_config() {
                cfg["access_token"] = serde_json::json!(token);
                let _ = crate::commands::config::save_config(cfg);
            }
            return Ok(Some(token));
        }
    }

    crate::log_to_file("[Spotify Auth] All TOTP /api/token attempts exhausted; returning None");
    Ok(None)
}

#[tauri::command]
pub async fn refresh_token() -> Result<Option<String>, String> {
    let config = crate::commands::config::load_config().map_err(|e| e.to_string())?;
    let Some(mut cfg) = config else {
        return Ok(None);
    };

    let refresh_token = cfg["refresh_token"]
        .as_str()
        .or_else(|| cfg["refreshToken"].as_str())
        .unwrap_or("")
        .to_string();
    let client_id = cfg["client_id"]
        .as_str()
        .or_else(|| cfg["clientId"].as_str())
        .unwrap_or("")
        .to_string();

    if refresh_token.is_empty() || client_id.is_empty() {
        return Ok(None);
    }

    let client = get_shared_client();
    let res = client
        .post("https://accounts.spotify.com/api/token")
        .form(&[
            ("grant_type", "refresh_token"),
            ("refresh_token", refresh_token.as_str()),
            ("client_id", client_id.as_str()),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if res.status().is_success() {
        let token_data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
        if let Some(access_token) = token_data["access_token"].as_str() {
            cfg["access_token"] = serde_json::json!(access_token);
            if let Some(new_refresh) = token_data["refresh_token"].as_str() {
                cfg["refresh_token"] = serde_json::json!(new_refresh);
            }
            if let Some(expires_in) = token_data["expires_in"].as_i64() {
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_secs() as i64)
                    .unwrap_or(0);
                cfg["expires_at"] = serde_json::json!(now + expires_in);
            }
            let _ = crate::commands::config::save_config(cfg);
            return Ok(Some(access_token.to_string()));
        }
    }
    Ok(None)
}

#[tauri::command]
pub async fn start_oauth_server(
    client_id: String,
    code_verifier: String,
    _code_challenge: Option<String>,
) -> Result<serde_json::Value, String> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;

    let listener = TcpListener::bind("127.0.0.1:4882")
        .await
        .map_err(|e| e.to_string())?;
    let (mut stream, _) =
        match tokio::time::timeout(std::time::Duration::from_secs(180), listener.accept()).await {
            Ok(res) => res.map_err(|e| e.to_string())?,
            Err(_) => {
                return Err("OAuth server timed out waiting for browser callback (180s)".to_string())
            }
        };

    let mut buf = [0u8; 4096];
    let n = stream.read(&mut buf).await.map_err(|e| e.to_string())?;
    let req = String::from_utf8_lossy(&buf[..n]);

    let first_line = req.lines().next().unwrap_or("");
    let code = if let Some(idx) = first_line.find("code=") {
        let after = &first_line[idx + 5..];
        let end = after
            .find('&')
            .or_else(|| after.find(' '))
            .unwrap_or(after.len());
        after[..end].to_string()
    } else {
        let err_response = "HTTP/1.1 400 Bad Request\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\nMissing authorization code";
        let _ = stream.write_all(err_response.as_bytes()).await;
        return Err("Missing authorization code".to_string());
    };

    let client = get_shared_client();
    let res = client
        .post("https://accounts.spotify.com/api/token")
        .form(&[
            ("client_id", client_id.as_str()),
            ("grant_type", "authorization_code"),
            ("code", code.as_str()),
            ("redirect_uri", "http://127.0.0.1:4882/callback"),
            ("code_verifier", code_verifier.as_str()),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let err_txt = res.text().await.unwrap_or_default();
        let safe_err = err_txt
            .replace('&', "&amp;")
            .replace('<', "&lt;")
            .replace('>', "&gt;")
            .replace('"', "&quot;");
        let html_err = format!("HTTP/1.1 500 Internal Server Error\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\n\r\n<html><body style=\"font-family: sans-serif; background: #121212; color: #ff5555; text-align: center; padding-top: 50px;\"><h1>Connection Failed</h1><p>{safe_err}</p></body></html>");
        let _ = stream.write_all(html_err.as_bytes()).await;
        return Err(err_txt);
    }

    let token_data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let access_token = token_data["access_token"]
        .as_str()
        .unwrap_or("")
        .to_string();
    let refresh_token = token_data["refresh_token"]
        .as_str()
        .unwrap_or("")
        .to_string();
    let expires_in = token_data["expires_in"].as_i64().unwrap_or(3600);
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    let config = serde_json::json!({
        "client_id": client_id,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_at": now + expires_in
    });

    let _ = crate::commands::config::save_config(config.clone());

    let success_html = "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\n\r\n<html><body style=\"font-family: sans-serif; background: #121212; color: #1db954; text-align: center; padding-top: 50px;\"><h1>Connection Successful!</h1><p style=\"color: #b3b3b3;\">You can now close this tab and return to LyricFlow.</p></body></html>";
    let _ = stream.write_all(success_html.as_bytes()).await;

    Ok(config)
}

#[tauri::command]
pub async fn login_via_web(app: AppHandle) -> Result<serde_json::Value, String> {
    use tauri::Manager;

    crate::log_to_file("[Spotify Login] login_via_web called");

    if let Some(existing) = app.get_webview_window("spotify-login") {
        crate::log_to_file("[Spotify Login] Closing existing spotify-login window");
        let _ = existing.close();
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
    }

    let login_url =
        "https://accounts.spotify.com/en/login?continue=https%3A%2F%2Fopen.spotify.com%2F";
    let chrome_ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";

    // Temporarily demote main window if it's currently topmost so the login window is guaranteed unobstructed
    let was_main_topmost = {
        if let Some(main_win) = app.get_webview_window("main") {
            let is_top = if let Ok(Some(cfg)) = crate::commands::config::load_config() {
                cfg["dynamic_island"].as_bool() == Some(true)
                    || cfg["dynamicIsland"].as_bool() == Some(true)
                    || cfg["settings"]["dynamicIsland"].as_bool() == Some(true)
                    || cfg["always_on_top"].as_bool() == Some(true)
                    || cfg["alwaysOnTop"].as_bool() == Some(true)
                    || cfg["settings"]["alwaysOnTop"].as_bool() == Some(true)
            } else {
                false
            };
            if is_top {
                let _ = main_win.set_always_on_top(false);
            }
            is_top
        } else {
            false
        }
    };

    struct TopmostGuard {
        app: AppHandle,
        was_topmost: bool,
    }
    impl Drop for TopmostGuard {
        fn drop(&mut self) {
            if self.was_topmost {
                if let Some(main_win) = self.app.get_webview_window("main") {
                    let _ = main_win.set_always_on_top(true);
                }
            }
        }
    }
    let _guard = TopmostGuard {
        app: app.clone(),
        was_topmost: was_main_topmost,
    };

    let login_win = tauri::WebviewWindowBuilder::new(
        &app,
        "spotify-login",
        tauri::WebviewUrl::External(login_url.parse().map_err(|e| format!("{e}"))?),
    )
    .title("Login to Spotify")
    .inner_size(520.0, 740.0)
    .center()
    .always_on_top(true)
    .decorations(true)
    .resizable(true)
    .focused(true)
    .user_agent(chrome_ua)
    .build()
    .map_err(|e| {
        crate::log_to_file(&format!("[Spotify Login] Failed to create window: {e}"));
        e.to_string()
    })?;

    let _ = login_win.show();
    let _ = login_win.unminimize();
    let _ = login_win.set_always_on_top(true);
    let _ = login_win.set_focus();

    #[cfg(target_os = "windows")]
    {
        use windows::Win32::UI::WindowsAndMessaging::{
            BringWindowToTop, SetForegroundWindow, SetWindowPos, HWND_TOPMOST, SWP_NOMOVE,
            SWP_NOSIZE, SWP_SHOWWINDOW,
        };
        if let Ok(hwnd) = login_win.hwnd() {
            let hwnd_val = windows::Win32::Foundation::HWND(hwnd.0 as _);
            unsafe {
                let _ = SetWindowPos(
                    hwnd_val,
                    Some(HWND_TOPMOST),
                    0,
                    0,
                    0,
                    0,
                    SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW,
                );
                let _ = BringWindowToTop(hwnd_val);
                let _ = SetForegroundWindow(hwnd_val);
            }
        }
    }

    crate::log_to_file("[Spotify Login] Login window created and shown successfully");

    let found_sp_dc = std::sync::Arc::new(std::sync::Mutex::new(None::<String>));

    #[cfg(target_os = "windows")]
    {
        use webview2_com::GetCookiesCompletedHandler;
        use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2_2;
        use windows::core::Interface;

        for step in 0..500 {
            tokio::time::sleep(std::time::Duration::from_millis(600)).await;

            let Some(win) = app.get_webview_window("spotify-login") else {
                crate::log_to_file(&format!(
                    "[Spotify Login] Window closed at poll step {step}"
                ));
                break;
            };

            if found_sp_dc.lock().unwrap().is_some() {
                crate::log_to_file("[Spotify Login] sp_dc already acquired, exiting poll loop");
                break;
            }

            let sp_dc_clone = found_sp_dc.clone();
            let _ = win.with_webview(move |webview| {
                unsafe {
                    if let Ok(core) = webview.controller().CoreWebView2() {
                        if let Ok(core2) = core.cast::<ICoreWebView2_2>() {
                            if let Ok(cookie_mgr) = core2.CookieManager() {
                                // 1. Global: empty string matches ALL cookies across ALL sites/domains in WebView2
                                let sp_dc_1 = sp_dc_clone.clone();
                                let handler_all = GetCookiesCompletedHandler::create(Box::new(move |_hr, list| {
                                    if let Some(cookie_list) = list {
                                        let mut count = 0u32;
                                        if cookie_list.Count(&mut count).is_ok() && count > 0 {
                                            for i in 0..count {
                                                if let Ok(cookie) = cookie_list.GetValueAtIndex(i) {
                                                    let mut name_ptr = windows::core::PWSTR::null();
                                                    let mut val_ptr = windows::core::PWSTR::null();
                                                    if cookie.Name(&mut name_ptr).is_ok() && cookie.Value(&mut val_ptr).is_ok() {
                                                        let name = name_ptr.to_string().unwrap_or_default();
                                                        let val = val_ptr.to_string().unwrap_or_default();
                                                        windows::Win32::System::Com::CoTaskMemFree(Some(name_ptr.0 as *const _));
                                                        windows::Win32::System::Com::CoTaskMemFree(Some(val_ptr.0 as *const _));

                                                        if name == "sp_dc" && !val.is_empty() {
                                                            let mut lock = sp_dc_1.lock().unwrap();
                                                            if lock.is_none() {
                                                                crate::log_to_file("[Spotify Login] Captured sp_dc from global cookie manager!");
                                                                *lock = Some(val);
                                                            }
                                                            break;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    Ok(())
                                }));
                                let _ = cookie_mgr.GetCookies(windows::core::w!(""), &handler_all);

                                // 2. open.spotify.com specifically
                                let sp_dc_2 = sp_dc_clone.clone();
                                let handler_open = GetCookiesCompletedHandler::create(Box::new(move |_hr, list| {
                                    if let Some(cookie_list) = list {
                                        let mut count = 0u32;
                                        if cookie_list.Count(&mut count).is_ok() && count > 0 {
                                            for i in 0..count {
                                                if let Ok(cookie) = cookie_list.GetValueAtIndex(i) {
                                                    let mut name_ptr = windows::core::PWSTR::null();
                                                    let mut val_ptr = windows::core::PWSTR::null();
                                                    if cookie.Name(&mut name_ptr).is_ok() && cookie.Value(&mut val_ptr).is_ok() {
                                                        let name = name_ptr.to_string().unwrap_or_default();
                                                        let val = val_ptr.to_string().unwrap_or_default();
                                                        windows::Win32::System::Com::CoTaskMemFree(Some(name_ptr.0 as *const _));
                                                        windows::Win32::System::Com::CoTaskMemFree(Some(val_ptr.0 as *const _));

                                                        if name == "sp_dc" && !val.is_empty() {
                                                            let mut lock = sp_dc_2.lock().unwrap();
                                                            if lock.is_none() {
                                                                crate::log_to_file("[Spotify Login] Captured sp_dc from open.spotify.com!");
                                                                *lock = Some(val);
                                                            }
                                                            break;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    Ok(())
                                }));
                                let _ = cookie_mgr.GetCookies(windows::core::w!("https://open.spotify.com"), &handler_open);

                                // 3. accounts.spotify.com specifically
                                let sp_dc_3 = sp_dc_clone.clone();
                                let handler_acc = GetCookiesCompletedHandler::create(Box::new(move |_hr, list| {
                                    if let Some(cookie_list) = list {
                                        let mut count = 0u32;
                                        if cookie_list.Count(&mut count).is_ok() && count > 0 {
                                            for i in 0..count {
                                                if let Ok(cookie) = cookie_list.GetValueAtIndex(i) {
                                                    let mut name_ptr = windows::core::PWSTR::null();
                                                    let mut val_ptr = windows::core::PWSTR::null();
                                                    if cookie.Name(&mut name_ptr).is_ok() && cookie.Value(&mut val_ptr).is_ok() {
                                                        let name = name_ptr.to_string().unwrap_or_default();
                                                        let val = val_ptr.to_string().unwrap_or_default();
                                                        windows::Win32::System::Com::CoTaskMemFree(Some(name_ptr.0 as *const _));
                                                        windows::Win32::System::Com::CoTaskMemFree(Some(val_ptr.0 as *const _));

                                                        if name == "sp_dc" && !val.is_empty() {
                                                            let mut lock = sp_dc_3.lock().unwrap();
                                                            if lock.is_none() {
                                                                crate::log_to_file("[Spotify Login] Captured sp_dc from accounts.spotify.com!");
                                                                *lock = Some(val);
                                                            }
                                                            break;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    Ok(())
                                }));
                                let _ = cookie_mgr.GetCookies(windows::core::w!("https://accounts.spotify.com"), &handler_acc);
                            }
                        }
                    }
                }
            });
        }
    }

    let captured = found_sp_dc.lock().unwrap().clone();
    if let Some(sp_dc_val) = captured {
        crate::log_to_file(&format!(
            "[Spotify Login] Successfully acquired sp_dc (len={}), closing login window",
            sp_dc_val.len()
        ));
        if let Some(win) = app.get_webview_window("spotify-login") {
            let _ = win.close();
        }

        let config = serde_json::json!({
            "sp_dc": sp_dc_val,
            "localMode": false,
            "success": true
        });

        let _ = crate::commands::config::save_config(config.clone());
        return Ok(config);
    }

    crate::log_to_file("[Spotify Login] No sp_dc captured; returning null");
    Ok(serde_json::Value::Null)
}

#[tauri::command]
pub async fn fetch_image_data_url(url: String) -> Result<String, String> {
    if url.starts_with("data:image/") {
        return Ok(url);
    }

    // SSRF & protocol validation
    let parsed = reqwest::Url::parse(&url).map_err(|e| format!("Invalid URL: {e}"))?;
    let scheme = parsed.scheme();
    if scheme != "https" && scheme != "http" {
        return Err("Only HTTP and HTTPS URLs are allowed".to_string());
    }

    if let Some(host_str) = parsed.host_str() {
        let host_lower = host_str.to_lowercase();
        // Prohibit localhost and common link-local / loopback hostnames
        if host_lower == "localhost"
            || host_lower == "127.0.0.1"
            || host_lower == "0.0.0.0"
            || host_lower == "::1"
            || host_lower == "[::1]"
            || host_lower.ends_with(".localhost")
            || host_lower.ends_with(".local")
        {
            return Err("Access to loopback/local address is forbidden".to_string());
        }
        // Check IP address restrictions
        if let Ok(ip) = host_str.parse::<std::net::IpAddr>() {
            if ip.is_loopback() || ip.is_unspecified() {
                return Err("Access to loopback or unspecified IP is forbidden".to_string());
            }
            if let std::net::IpAddr::V4(ipv4) = ip {
                let octets = ipv4.octets();
                // 169.254.0.0/16 link-local (cloud metadata)
                if octets[0] == 169 && octets[1] == 254 {
                    return Err("Access to link-local metadata address is forbidden".to_string());
                }
                // 127.0.0.0/8 loopback
                if octets[0] == 127 {
                    return Err("Access to loopback address is forbidden".to_string());
                }
            }
        }
    } else {
        return Err("URL missing host".to_string());
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| e.to_string())?;

    let res = client.get(parsed).send().await.map_err(|e| e.to_string())?;

    // Reject non-image content-type to avoid leaking non-image data
    let content_type = res
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/jpeg")
        .to_string();

    if !content_type.to_lowercase().starts_with("image/")
        && !content_type.to_lowercase().contains("octet-stream")
    {
        return Err("Target URL did not return an image content-type".to_string());
    }

    // Limit maximum image download size to 10 MB to prevent memory exhaustion DoS
    if let Some(len) = res.content_length() {
        if len > 10 * 1024 * 1024 {
            return Err("Image exceeds maximum allowed size (10 MB)".to_string());
        }
    }

    let bytes = res.bytes().await.map_err(|e| e.to_string())?;
    if bytes.len() > 10 * 1024 * 1024 {
        return Err("Image exceeds maximum allowed size (10 MB)".to_string());
    }

    let b64 = crate::models::base64_encode(&bytes);
    Ok(format!("data:{};base64,{}", content_type, b64))
}

struct CachedSpotifyToken {
    token: String,
    expires_at: std::time::Instant,
}

static SPOTIFY_TOKEN_CACHE: OnceLock<tokio::sync::RwLock<Option<CachedSpotifyToken>>> =
    OnceLock::new();

fn get_spotify_token_cache() -> &'static tokio::sync::RwLock<Option<CachedSpotifyToken>> {
    SPOTIFY_TOKEN_CACHE.get_or_init(|| tokio::sync::RwLock::new(None))
}

pub fn extract_primary_artist(artist: &str) -> String {
    let mut s = artist.to_string();
    let lower = s.to_lowercase();
    for sep in &[
        " feat. ", " feat ", " ft. ", " ft ", " with ", " / ", " vs. ", " vs ",
    ] {
        if let Some(pos) = lower.find(sep) {
            s.truncate(pos);
            break;
        }
    }
    let primary = s
        .split(&[';', ',', '&'][..])
        .next()
        .unwrap_or(artist)
        .trim();
    if primary.is_empty() {
        artist.trim().to_string()
    } else {
        primary.to_string()
    }
}

pub fn is_disqualified_cover(query: &str, candidate_text: &str) -> bool {
    let q_lower = query.to_lowercase();
    let c_lower = candidate_text.to_lowercase();
    let blacklisted = [
        "karaoke",
        "tribute",
        "originally performed by",
        "in the style of",
        "backing track",
        "piano version",
        "2 pianos version",
        "piano cover",
        "acoustic cover",
        "instrumental",
        "cover version",
        " cover",
        "(cover",
        "[cover",
        "dj mix",
        "apple music",
        "rap life",
        "[mixed]",
        "(mixed)",
        "continuous mix",
        "remix collection",
        "megamix",
    ];
    for term in blacklisted {
        if c_lower.contains(term) && !q_lower.contains(term) {
            return true;
        }
    }
    false
}

pub fn evaluate_candidate_match(
    req_title: &str,
    req_artist: &str,
    cand_title: &str,
    cand_artists: &[String],
) -> (bool, f32) {
    let combined_cand = format!("{} {}", cand_title, cand_artists.join(" "));
    let combined_req = format!("{} {}", req_title, req_artist);
    if is_disqualified_cover(&combined_req, &combined_cand) {
        return (false, 0.0);
    }

    let title_score =
        crate::commands::lyrics::fuzzy::compute_similarity_score(req_title, cand_title);

    let mut max_artist_score: f32 = 0.0;
    for a in cand_artists {
        let score = crate::commands::lyrics::fuzzy::compute_similarity_score(req_artist, a);
        if score > max_artist_score {
            max_artist_score = score;
        }
    }

    let combined = (title_score * 0.5) + (max_artist_score * 0.5);
    let passes = (combined >= 0.70 && max_artist_score >= 0.60)
        || (title_score >= 0.90 && max_artist_score >= 0.55);
    (passes, combined)
}

async fn get_or_fetch_spotify_token(client: &reqwest::Client) -> Option<String> {
    let cache = get_spotify_token_cache();
    {
        let read = cache.read().await;
        if let Some(cached) = &*read {
            if std::time::Instant::now() < cached.expires_at {
                return Some(cached.token.clone());
            }
        }
    }

    let mut write = cache.write().await;
    if let Some(cached) = &*write {
        if std::time::Instant::now() < cached.expires_at {
            return Some(cached.token.clone());
        }
    }

    let (client_id, client_secret) = if let Ok(Some(cfg)) = crate::commands::config::load_config() {
        let cid = cfg
            .get("spotify_client_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        let csec = cfg
            .get("spotify_client_secret")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if !cid.is_empty() && !csec.is_empty() {
            (cid, csec)
        } else {
            (
                "3f974573800a4ff5b325de9795b8e603".to_string(),
                "ff188d2860ff44baa57acc79c121a3b9".to_string(),
            )
        }
    } else {
        (
            "3f974573800a4ff5b325de9795b8e603".to_string(),
            "ff188d2860ff44baa57acc79c121a3b9".to_string(),
        )
    };

    let auth_str = format!("{}:{}", client_id, client_secret);
    let b64_auth = crate::models::base64_encode(auth_str.as_bytes());

    let res = client
        .post("https://accounts.spotify.com/api/token")
        .header("Authorization", format!("Basic {}", b64_auth))
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body("grant_type=client_credentials")
        .send()
        .await
        .ok()?;

    if res.status().is_success() {
        let json: serde_json::Value = res.json().await.ok()?;
        if let Some(token) = json["access_token"].as_str() {
            let expires_in_secs = json["expires_in"].as_u64().unwrap_or(3600);
            let safe_duration =
                std::time::Duration::from_secs(expires_in_secs.saturating_sub(60).max(60));
            let expires_at = std::time::Instant::now() + safe_duration;
            *write = Some(CachedSpotifyToken {
                token: token.to_string(),
                expires_at,
            });
            return Some(token.to_string());
        }
    }
    None
}

async fn search_spotify_art(
    client: &reqwest::Client,
    token: &str,
    clean_t: &str,
    primary_a: &str,
    album_opt: Option<&str>,
) -> Option<String> {
    // 1. Search by track and artist
    let track_query = format!("track:{} artist:{}", clean_t, primary_a);
    let track_url = format!(
        "https://api.spotify.com/v1/search?q={}&type=track&limit=5",
        urlencoding::encode(&track_query)
    );

    if let Ok(res) = client
        .get(&track_url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
    {
        if res.status().is_success() {
            if let Ok(json) = res.json::<serde_json::Value>().await {
                if let Some(items) = json["tracks"]["items"].as_array() {
                    let mut best_art: Option<(f32, String)> = None;
                    for item in items {
                        let cand_title = item["name"].as_str().unwrap_or("");
                        let cand_artists: Vec<String> = item["artists"]
                            .as_array()
                            .map(|arr| {
                                arr.iter()
                                    .filter_map(|a| a["name"].as_str().map(|s| s.to_string()))
                                    .collect()
                            })
                            .unwrap_or_default();

                        let (passes, score) =
                            evaluate_candidate_match(clean_t, primary_a, cand_title, &cand_artists);
                        if passes {
                            if let Some(images) = item["album"]["images"].as_array() {
                                if let Some(target_img) = images.get(1).or_else(|| images.first()) {
                                    if let Some(url) = target_img["url"].as_str() {
                                        if best_art
                                            .as_ref()
                                            .map_or(true, |(best_score, _)| score > *best_score)
                                        {
                                            best_art = Some((score, url.to_string()));
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if let Some((_, url)) = best_art {
                        return Some(url);
                    }
                }
            }
        }
    }

    // 2. Search by album if available
    if let Some(album) = album_opt {
        let clean_alb = crate::commands::lyrics::fuzzy::clean_title(album);
        if !clean_alb.is_empty() {
            let album_query = format!("album:{} artist:{}", clean_alb, primary_a);
            let album_url = format!(
                "https://api.spotify.com/v1/search?q={}&type=album&limit=5",
                urlencoding::encode(&album_query)
            );
            if let Ok(res) = client
                .get(&album_url)
                .header("Authorization", format!("Bearer {}", token))
                .send()
                .await
            {
                if res.status().is_success() {
                    if let Ok(json) = res.json::<serde_json::Value>().await {
                        if let Some(items) = json["albums"]["items"].as_array() {
                            let mut best_art: Option<(f32, String)> = None;
                            for item in items {
                                let cand_title = item["name"].as_str().unwrap_or("");
                                let cand_artists: Vec<String> = item["artists"]
                                    .as_array()
                                    .map(|arr| {
                                        arr.iter()
                                            .filter_map(|a| {
                                                a["name"].as_str().map(|s| s.to_string())
                                            })
                                            .collect()
                                    })
                                    .unwrap_or_default();

                                let (passes, score) = evaluate_candidate_match(
                                    &clean_alb,
                                    primary_a,
                                    cand_title,
                                    &cand_artists,
                                );
                                if passes {
                                    if let Some(images) = item["images"].as_array() {
                                        if let Some(first_img) = images.first() {
                                            if let Some(url) = first_img["url"].as_str() {
                                                if best_art
                                                    .as_ref()
                                                    .map_or(true, |(best_score, _)| {
                                                        score > *best_score
                                                    })
                                                {
                                                    best_art = Some((score, url.to_string()));
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            if let Some((_, url)) = best_art {
                                return Some(url);
                            }
                        }
                    }
                }
            }
        }
    }

    // 3. Loose query with track + artist
    let loose_query = format!("{} {}", clean_t, primary_a);
    let loose_url = format!(
        "https://api.spotify.com/v1/search?q={}&type=track&limit=5",
        urlencoding::encode(&loose_query)
    );
    if let Ok(res) = client
        .get(&loose_url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
    {
        if res.status().is_success() {
            if let Ok(json) = res.json::<serde_json::Value>().await {
                if let Some(items) = json["tracks"]["items"].as_array() {
                    let mut best_art: Option<(f32, String)> = None;
                    for item in items {
                        let cand_title = item["name"].as_str().unwrap_or("");
                        let cand_artists: Vec<String> = item["artists"]
                            .as_array()
                            .map(|arr| {
                                arr.iter()
                                    .filter_map(|a| a["name"].as_str().map(|s| s.to_string()))
                                    .collect()
                            })
                            .unwrap_or_default();

                        let (passes, score) =
                            evaluate_candidate_match(clean_t, primary_a, cand_title, &cand_artists);
                        if passes {
                            if let Some(images) = item["album"]["images"].as_array() {
                                if let Some(target_img) = images.get(1).or_else(|| images.first()) {
                                    if let Some(url) = target_img["url"].as_str() {
                                        if best_art
                                            .as_ref()
                                            .map_or(true, |(best_score, _)| score > *best_score)
                                        {
                                            best_art = Some((score, url.to_string()));
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if let Some((_, url)) = best_art {
                        return Some(url);
                    }
                }
            }
        }
    }

    None
}

async fn search_itunes_art(
    client: &reqwest::Client,
    clean_t: &str,
    primary_a: &str,
) -> Option<String> {
    let term = format!("{} {}", clean_t, primary_a);
    let url = format!(
        "https://itunes.apple.com/search?term={}&limit=5&entity=song",
        urlencoding::encode(&term)
    );
    if let Ok(res) = client.get(&url).send().await {
        if res.status().is_success() {
            if let Ok(json) = res.json::<serde_json::Value>().await {
                if let Some(results) = json["results"].as_array() {
                    let mut best_art: Option<(f32, String)> = None;
                    for item in results {
                        let cand_title = item["trackName"].as_str().unwrap_or("");
                        let cand_artist = item["artistName"].as_str().unwrap_or("");
                        let cand_artists = vec![cand_artist.to_string()];

                        let (passes, score) =
                            evaluate_candidate_match(clean_t, primary_a, cand_title, &cand_artists);
                        if passes {
                            if let Some(raw_art) = item["artworkUrl100"]
                                .as_str()
                                .or_else(|| item["artworkUrl60"].as_str())
                            {
                                let mid_res = raw_art
                                    .replace("100x100bb.jpg", "300x300bb.jpg")
                                    .replace("60x60bb.jpg", "300x300bb.jpg");
                                if best_art
                                    .as_ref()
                                    .map_or(true, |(best_score, _)| score > *best_score)
                                {
                                    best_art = Some((score, mid_res));
                                }
                            }
                        }
                    }
                    if let Some((_, url)) = best_art {
                        return Some(url);
                    }
                }
            }
        }
    }
    None
}

async fn search_deezer_art(
    client: &reqwest::Client,
    clean_t: &str,
    primary_a: &str,
) -> Option<String> {
    let term = format!("{} {}", clean_t, primary_a);
    let url = format!(
        "https://api.deezer.com/search?q={}&limit=5",
        urlencoding::encode(&term)
    );
    if let Ok(res) = client.get(&url).send().await {
        if res.status().is_success() {
            if let Ok(json) = res.json::<serde_json::Value>().await {
                if let Some(data) = json["data"].as_array() {
                    let mut best_art: Option<(f32, String)> = None;
                    for item in data {
                        let cand_title = item["title"].as_str().unwrap_or("");
                        let cand_artist = item["artist"]["name"].as_str().unwrap_or("");
                        let cand_artists = vec![cand_artist.to_string()];

                        let (passes, score) =
                            evaluate_candidate_match(clean_t, primary_a, cand_title, &cand_artists);
                        if passes {
                            let album = &item["album"];
                            if let Some(cover) = album["cover_medium"]
                                .as_str()
                                .or_else(|| album["cover_big"].as_str())
                                .or_else(|| album["cover_xl"].as_str())
                            {
                                if best_art
                                    .as_ref()
                                    .map_or(true, |(best_score, _)| score > *best_score)
                                {
                                    best_art = Some((score, cover.to_string()));
                                }
                            }
                        }
                    }
                    if let Some((_, url)) = best_art {
                        return Some(url);
                    }
                }
            }
        }
    }
    None
}

async fn search_netease_art(
    client: &reqwest::Client,
    clean_t: &str,
    primary_a: &str,
) -> Option<String> {
    let query = format!("{} {}", clean_t, primary_a);
    let url = format!(
        "https://interface.music.163.com/api/search/get/web?csrf_token=&hlpretag=&hlposttag=&s={}&type=1&offset=0&total=true&limit=3",
        urlencoding::encode(&query)
    );
    if let Ok(res) = client
        .get(&url)
        .header(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        )
        .header("Referer", "https://music.163.com")
        .header("X-Real-IP", "118.88.88.88")
        .send()
        .await
    {
        if res.status().is_success() {
            if let Ok(json) = res.json::<serde_json::Value>().await {
                if let Some(songs) = json["result"]["songs"].as_array() {
                    let mut best_art: Option<(f32, String)> = None;
                    for song in songs {
                        let cand_title = song["name"].as_str().unwrap_or("");
                        let cand_artists: Vec<String> = song["artists"]
                            .as_array()
                            .map(|arr| {
                                arr.iter()
                                    .filter_map(|a| a["name"].as_str().map(|s| s.to_string()))
                                    .collect()
                            })
                            .unwrap_or_default();

                        let (passes, score) =
                            evaluate_candidate_match(clean_t, primary_a, cand_title, &cand_artists);
                        if passes {
                            if let Some(pic_url) = song["album"]["picUrl"].as_str() {
                                if !pic_url.is_empty() {
                                    if best_art
                                        .as_ref()
                                        .map_or(true, |(best_score, _)| score > *best_score)
                                    {
                                        best_art = Some((score, pic_url.to_string()));
                                    }
                                }
                            }
                        }
                    }
                    if let Some((_, url)) = best_art {
                        return Some(url);
                    }
                }
            }
        }
    }
    None
}

#[tauri::command]
pub async fn fetch_track_artwork(
    track: String,
    artist: String,
    album: Option<String>,
) -> Result<Option<String>, String> {
    let clean_t = crate::commands::lyrics::fuzzy::clean_title(&track);
    let clean_a = crate::commands::lyrics::fuzzy::clean_artist(&artist);
    let primary_a = extract_primary_artist(&clean_a);

    if clean_t.is_empty() {
        return Ok(None);
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(2500))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());

    // Tier 1: Spotify Web API (via client credentials, album-art flow)
    if let Some(token) = get_or_fetch_spotify_token(&client).await {
        if let Some(art) =
            search_spotify_art(&client, &token, &clean_t, &primary_a, album.as_deref()).await
        {
            return Ok(Some(art));
        }
    }

    // Tier 2: iTunes API (limit=5, scored candidates)
    if let Some(art) = search_itunes_art(&client, &clean_t, &primary_a).await {
        return Ok(Some(art));
    }

    // Tier 3: Deezer API (limit=5, scored candidates)
    if let Some(art) = search_deezer_art(&client, &clean_t, &primary_a).await {
        return Ok(Some(art));
    }

    // Tier 4: NetEase Cloud Music (limit=3, scored candidates)
    if let Some(art) = search_netease_art(&client, &clean_t, &primary_a).await {
        return Ok(Some(art));
    }

    // If no candidate achieved >= 0.70 similarity across all tiers,
    // return Ok(None) to preserve clean placeholder rather than showing the wrong artist!
    Ok(None)
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct AppleMotionArtResult {
    pub url: String,
    pub tall_url: Option<String>,
    pub m3u8_url: Option<String>,
    pub aspect_ratio: String,
    pub album: Option<String>,
    pub artist: Option<String>,
    pub static_art: Option<String>,
}

const APPLE_MUSIC_DEV_TOKEN: &str = "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiIsImtpZCI6IldlYlBsYXlLaWQifQ.eyJpc3MiOiJBTVBXZWJQbGF5IiwiaWF0IjoxNzkyNTM1Njc2LCJleHAiOjE3OTg1ODM2NzYsInJvb3RfaHR0cHNfb3JpZ2luIjpbImFwcGxlLmNvbSJdfQ.YpBDqePdK0r_5lxtByqto20zc60FhO1eLoYJ5mrayZ73IYsW4yguaJAFMzud_5FSZ7cjTCdM5ST_MecdbHDA2Q";

fn clean_apple_search_string(s: &str) -> String {
    let mut res = s.to_string();
    res = res.replace(['\u{2018}', '\u{2019}', '\u{02bc}', '`'], "'");
    res = res.replace(['\u{201c}', '\u{201d}'], "\"");
    res = res.replace(['\u{2013}', '\u{2014}'], "-");

    for sub in &[" - Topic", "- Topic", "feat.", "ft."] {
        res = res.replace(sub, "");
    }
    let base = res.split('(').next().unwrap_or(&res);
    let base = base.split('[').next().unwrap_or(base);
    let base = base.split('-').next().unwrap_or(base);
    base.trim().to_string()
}

pub fn is_disqualified_apple_collection(
    name: &str,
    is_compilation: bool,
    curator: Option<&str>,
    query: &str,
) -> bool {
    let n = name.to_lowercase();
    let q = query.to_lowercase();
    if q.contains("dj mix") || q.contains("remix") {
        return false;
    }
    let blacklist = [
        "dj mix",
        "apple music",
        "rap life",
        "[mixed]",
        "(mixed)",
        "megamix",
        "continuous mix",
        "remix collection",
    ];
    for term in blacklist {
        if n.contains(term) {
            return true;
        }
    }
    if is_compilation && !q.contains("compilation") {
        return true;
    }
    if let Some(c) = curator {
        if c.to_lowercase().contains("apple music") {
            return true;
        }
    }
    false
}

fn is_title_match(target: &str, candidate: &str) -> bool {
    let t = clean_apple_search_string(target).to_lowercase();
    let c = clean_apple_search_string(candidate).to_lowercase();
    if t.is_empty() || c.is_empty() {
        return false;
    }
    t == c || c.starts_with(&t) || t.starts_with(&c)
}

fn is_artist_match(target_artist: &str, candidate_artist: &str) -> bool {
    let t = clean_apple_search_string(target_artist).to_lowercase();
    let c = clean_apple_search_string(candidate_artist).to_lowercase();
    if t.is_empty() || c.is_empty() {
        return false;
    }
    let first_t = t
        .split(|c: char| c.is_whitespace() || c == ',' || c == '&' || c == '/')
        .next()
        .unwrap_or(&t);
    let first_c = c
        .split(|c: char| c.is_whitespace() || c == ',' || c == '&' || c == '/')
        .next()
        .unwrap_or(&c);
    t.contains(first_c) || c.contains(first_t)
}

async fn resolve_progressive_mp4(client: &reqwest::Client, m3u8_url: &str) -> Option<String> {
    let resolve_uri = |reference: &str, base: &str| -> Option<String> {
        reqwest::Url::parse(base)
            .ok()?
            .join(reference)
            .ok()
            .map(|url| url.to_string())
    };
    let res = client.get(m3u8_url).send().await.ok()?;
    if !res.status().is_success() {
        return None;
    }
    let text = res.text().await.ok()?;

    // If already a variant/child playlist with #EXT-X-MAP:URI="...mp4"
    if let Some(start) = text.find("#EXT-X-MAP:URI=\"") {
        let after = &text[start + 16..];
        if let Some(end) = after.find('"') {
            return resolve_uri(&after[..end], m3u8_url);
        }
    }

    // Master playlist: pick AVC1 (H.264) stream with resolution 360..=768 for silky-smooth 60fps
    let lines: Vec<&str> = text.lines().collect();
    let mut chosen_child_url: Option<String> = None;
    let mut best_diff: i32 = i32::MAX;

    for i in 0..lines.len() {
        let line = lines[i];
        if line.contains("#EXT-X-STREAM-INF")
            && i + 1 < lines.len()
            && !lines[i + 1].trim().starts_with('#')
        {
            let Some(next_url) = resolve_uri(lines[i + 1].trim(), m3u8_url) else {
                continue;
            };
            if !line.contains("CODECS=\"avc1") {
                if chosen_child_url.is_none() {
                    chosen_child_url = Some(next_url);
                }
                continue;
            }
            let mut width: u32 = 0;
            if let Some(res_pos) = line.find("RESOLUTION=") {
                let res_str = &line[res_pos + 11..];
                if let Some(x_pos) = res_str.find('x') {
                    if let Ok(w) = res_str[..x_pos].parse::<u32>() {
                        width = w;
                    }
                }
            }
            if (400..=540).contains(&width) {
                chosen_child_url = Some(next_url);
                break;
            } else if (360..=768).contains(&width) {
                let diff = (width as i32 - 486).abs();
                if diff < best_diff {
                    best_diff = diff;
                    chosen_child_url = Some(next_url);
                }
            } else if chosen_child_url.is_none() {
                chosen_child_url = Some(next_url);
            }
        }
    }

    if chosen_child_url.is_none() {
        for line in &lines {
            let trimmed = line.trim();
            if !trimmed.is_empty() && !trimmed.starts_with('#') && trimmed.contains(".m3u8") {
                chosen_child_url = resolve_uri(trimmed, m3u8_url);
                if chosen_child_url.is_none() {
                    continue;
                }
                break;
            }
        }
    }

    let variant_url = chosen_child_url?;
    let child_res = client.get(&variant_url).send().await.ok()?;
    if !child_res.status().is_success() {
        return Some(variant_url);
    }
    let child_text = child_res.text().await.ok()?;
    if let Some(start) = child_text.find("#EXT-X-MAP:URI=\"") {
        let after = &child_text[start + 16..];
        if let Some(end) = after.find('"') {
            return resolve_uri(&after[..end], &variant_url);
        }
    }

    Some(variant_url)
}

#[tauri::command]
pub async fn fetch_apple_motion_art(
    artist: String,
    title: String,
    album: Option<String>,
) -> Result<Option<AppleMotionArtResult>, String> {
    let clean_a = clean_apple_search_string(&artist);
    let clean_t = clean_apple_search_string(&title);
    let clean_album = album
        .as_deref()
        .map(clean_apple_search_string)
        .filter(|s| !s.is_empty());

    if clean_a.is_empty() && clean_t.is_empty() && clean_album.is_none() {
        return Ok(None);
    }

    let client = get_shared_client();

    // 1. Primary engine: Apple Music Catalog API with modern developer token
    let mut queries: Vec<(String, &'static str, String)> = Vec::new();
    if let Some(ref alb) = clean_album {
        queries.push((format!("{} {}", clean_a, alb), "albums", alb.clone()));
    }
    if !clean_t.is_empty() {
        queries.push((format!("{} {}", clean_a, clean_t), "songs", clean_t.clone()));
    }

    for (search_term, search_type, target_label) in queries {
        let catalog_url = format!(
            "https://amp-api.music.apple.com/v1/catalog/us/search?term={}&types={}&limit=6",
            urlencoding::encode(&search_term),
            search_type
        );

        let req = client
            .get(&catalog_url)
            .header("Authorization", format!("Bearer {}", APPLE_MUSIC_DEV_TOKEN))
            .header("Origin", "https://music.apple.com");

        if let Ok(res) = req.send().await {
            if res.status().is_success() {
                if let Ok(json) = res.json::<serde_json::Value>().await {
                    let items = json["results"][search_type]["data"]
                        .as_array()
                        .cloned()
                        .unwrap_or_default();
                    for item in items {
                        let mut album_id: Option<String> = None;
                        let cand_artist = item["attributes"]["artistName"].as_str().unwrap_or("");
                        let cand_name = item["attributes"]["name"].as_str().unwrap_or("");
                        let is_compilation = item["attributes"]["isCompilation"]
                            .as_bool()
                            .unwrap_or(false);
                        let curator = item["attributes"]["curatorName"].as_str();

                        if is_disqualified_apple_collection(
                            cand_name,
                            is_compilation,
                            curator,
                            &search_term,
                        ) {
                            continue;
                        }
                        if cand_artist.to_lowercase().contains("various artists")
                            && !clean_a.to_lowercase().contains("various artists")
                        {
                            continue;
                        }

                        if search_type == "albums" {
                            if !is_artist_match(&clean_a, cand_artist) {
                                continue;
                            }
                            if !is_title_match(&target_label, cand_name) {
                                continue;
                            }
                            album_id = item["id"].as_str().map(|s| s.to_string());
                        } else if search_type == "songs" {
                            if !is_artist_match(&clean_a, cand_artist) {
                                continue;
                            }
                            if !is_title_match(&target_label, cand_name) {
                                continue;
                            }
                            let cand_album_name =
                                item["attributes"]["albumName"].as_str().unwrap_or("");
                            if is_disqualified_apple_collection(
                                cand_album_name,
                                is_compilation,
                                curator,
                                &search_term,
                            ) {
                                continue;
                            }
                            if let Some(ref alb) = clean_album {
                                if !is_title_match(alb, cand_album_name) {
                                    continue;
                                }
                            }
                            if let Some(song_url) = item["attributes"]["url"].as_str() {
                                if let Some(album_pos) = song_url.find("/album/") {
                                    let after = &song_url[album_pos + 7..];
                                    if let Some(next_slash) = after.find('/') {
                                        let id_part = &after[next_slash + 1..];
                                        let clean_id = id_part.split('?').next().unwrap_or(id_part);
                                        album_id = Some(clean_id.to_string());
                                    }
                                }
                            }
                        }

                        let Some(target_id) = album_id else {
                            continue;
                        };

                        let detail_url = format!(
                            "https://amp-api.music.apple.com/v1/catalog/us/albums/{}?extend=editorialVideo",
                            target_id
                        );
                        let detail_req = client
                            .get(&detail_url)
                            .header("Authorization", format!("Bearer {}", APPLE_MUSIC_DEV_TOKEN))
                            .header("Origin", "https://music.apple.com");

                        if let Ok(detail_res) = detail_req.send().await {
                            if detail_res.status().is_success() {
                                if let Ok(detail_json) =
                                    detail_res.json::<serde_json::Value>().await
                                {
                                    if let Some(first_data) =
                                        detail_json["data"].as_array().and_then(|a| a.first())
                                    {
                                        let alb_name =
                                            first_data["attributes"]["name"].as_str().unwrap_or("");
                                        let alb_is_comp = first_data["attributes"]["isCompilation"]
                                            .as_bool()
                                            .unwrap_or(false);
                                        let alb_curator =
                                            first_data["attributes"]["curatorName"].as_str();
                                        if is_disqualified_apple_collection(
                                            alb_name,
                                            alb_is_comp,
                                            alb_curator,
                                            &search_term,
                                        ) {
                                            continue;
                                        }

                                        let ed = &first_data["attributes"]["editorialVideo"];
                                        let square_m3u8 =
                                            ed["motionDetailSquare"]["video"].as_str().or_else(
                                                || ed["motionSquareVideo1x1"]["video"].as_str(),
                                            );

                                        let tall_m3u8 = ed["motionDetailTall"]["video"]
                                            .as_str()
                                            .or_else(|| ed["motionTallVideo3x4"]["video"].as_str())
                                            .or(square_m3u8);

                                        if let Some(any_m3u8) = square_m3u8.or(tall_m3u8) {
                                            let square_source = square_m3u8.unwrap_or(any_m3u8);
                                            let tall_source = tall_m3u8.unwrap_or(any_m3u8);
                                            let direct_mp4 =
                                                resolve_progressive_mp4(client, square_source).await;
                                            let direct_tall_mp4 =
                                                resolve_progressive_mp4(client, tall_source).await;

                                            let primary_url =
                                                direct_mp4.unwrap_or_else(|| square_source.to_string());
                                            let tall_url = direct_tall_mp4
                                                .or_else(|| Some(tall_source.to_string()));

                                            let album_title = first_data["attributes"]["name"]
                                                .as_str()
                                                .map(|s| s.to_string());
                                            let album_artist = first_data["attributes"]
                                                ["artistName"]
                                                .as_str()
                                                .map(|s| s.to_string());

                                            crate::log_to_file(&format!(
                                                "[AppleMotion] Successfully resolved catalog motion art for '{}': {}",
                                                search_term, primary_url
                                            ));

                                            return Ok(Some(AppleMotionArtResult {
                                                url: primary_url,
                                                tall_url,
                                                m3u8_url: Some(square_source.to_string()),
                                                aspect_ratio: if square_m3u8.is_some() {
                                                    "square".to_string()
                                                } else {
                                                    "tall".to_string()
                                                },
                                                album: album_title,
                                                artist: album_artist,
                                                static_art: None,
                                            }));
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(None)
}

#[tauri::command]
pub async fn search_music_gif(
    track_name: String,
    artist_name: String,
) -> Result<Option<String>, String> {
    let clean_artist = artist_name
        .replace(" - Topic", "")
        .replace("- Topic", "")
        .replace("feat.", "")
        .replace("ft.", "")
        .trim()
        .to_string();

    let clean_track = track_name
        .split('(')
        .next()
        .unwrap_or(&track_name)
        .split('[')
        .next()
        .unwrap_or(&track_name)
        .split('-')
        .next()
        .unwrap_or(&track_name)
        .trim()
        .to_string();

    if clean_artist.is_empty() && clean_track.is_empty() {
        return Ok(None);
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    // Strategy 1: Artist + Track + "aesthetic"
    let q1 = format!("{} {} aesthetic", clean_artist, clean_track);
    let url1 = format!(
        "https://api.giphy.com/v1/gifs/search?api_key=Gc7131jiJuvI7IdN0HZ1D7nh0ow5BU6g&q={}&limit=3&rating=pg",
        urlencoding::encode(&q1)
    );

    if let Ok(res) = client.get(&url1).send().await {
        if res.status().is_success() {
            if let Ok(json) = res.json::<serde_json::Value>().await {
                if let Some(data) = json["data"].as_array() {
                    if let Some(first) = data.first() {
                        if let Some(gif_url) = first["images"]["original"]["url"].as_str() {
                            crate::log_to_file(&format!(
                                "[GIF Search] Found GIF for q='{}': {}",
                                q1, gif_url
                            ));
                            return Ok(Some(gif_url.to_string()));
                        }
                    }
                }
            }
        }
    }

    // Strategy 2: Artist only
    if !clean_artist.is_empty() {
        let q2 = clean_artist.clone();
        let url2 = format!(
            "https://api.giphy.com/v1/gifs/search?api_key=Gc7131jiJuvI7IdN0HZ1D7nh0ow5BU6g&q={}&limit=3&rating=pg",
            urlencoding::encode(&q2)
        );
        if let Ok(res) = client.get(&url2).send().await {
            if res.status().is_success() {
                if let Ok(json) = res.json::<serde_json::Value>().await {
                    if let Some(data) = json["data"].as_array() {
                        if let Some(first) = data.first() {
                            if let Some(gif_url) = first["images"]["original"]["url"].as_str() {
                                crate::log_to_file(&format!(
                                    "[GIF Search] Found artist GIF for q='{}': {}",
                                    q2, gif_url
                                ));
                                return Ok(Some(gif_url.to_string()));
                            }
                        }
                    }
                }
            }
        }
    }

    // Strategy 3: Lo-fi music aesthetic loop fallback
    let q3 = "lofi anime aesthetic music loop";
    let url3 = format!(
        "https://api.giphy.com/v1/gifs/search?api_key=Gc7131jiJuvI7IdN0HZ1D7nh0ow5BU6g&q={}&limit=3&rating=g",
        urlencoding::encode(q3)
    );
    if let Ok(res) = client.get(&url3).send().await {
        if res.status().is_success() {
            if let Ok(json) = res.json::<serde_json::Value>().await {
                if let Some(data) = json["data"].as_array() {
                    if let Some(first) = data.first() {
                        if let Some(gif_url) = first["images"]["original"]["url"].as_str() {
                            return Ok(Some(gif_url.to_string()));
                        }
                    }
                }
            }
        }
    }

    Ok(None)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_primary_artist() {
        assert_eq!(
            extract_primary_artist("The Weeknd, Daft Punk"),
            "The Weeknd"
        );
        assert_eq!(
            extract_primary_artist("Taylor Swift & Post Malone"),
            "Taylor Swift"
        );
        assert_eq!(
            extract_primary_artist("Ed Sheeran feat. Justin Bieber"),
            "Ed Sheeran"
        );
        assert_eq!(
            extract_primary_artist("Billie Eilish with Khalid"),
            "Billie Eilish"
        );
        assert_eq!(extract_primary_artist("YOASOBI"), "YOASOBI");
    }

    #[test]
    fn test_is_disqualified_cover() {
        // Query has no cover/tribute tag, candidate does -> disqualified
        assert!(is_disqualified_cover(
            "夜に駆ける YOASOBI",
            "YOASOBI - 夜に駆ける [2 pianos version] KayThePianist"
        ));
        assert!(is_disqualified_cover(
            "Idol YOASOBI",
            "IDOL KARAOKE Original by YOASOBI"
        ));
        assert!(is_disqualified_cover(
            "Shape of You Ed Sheeran",
            "Shape of You (Tribute Version)"
        ));
        assert!(is_disqualified_cover(
            "Cruel Summer Taylor Swift",
            "Cruel Summer - Acoustic Piano Cover"
        ));

        // Query explicitly requests cover -> not disqualified
        assert!(!is_disqualified_cover(
            "Shape of You Piano Version",
            "Shape of You Piano Version"
        ));
    }

    #[test]
    fn test_evaluate_candidate_match() {
        // Authentic match
        let (passes, score) = evaluate_candidate_match(
            "Blinding Lights",
            "The Weeknd",
            "Blinding Lights",
            &["The Weeknd".to_string()],
        );
        assert!(passes);
        assert!(score >= 0.95);

        // Disqualified piano tribute
        let (passes, _) = evaluate_candidate_match(
            "夜に駆ける",
            "YOASOBI",
            "YOASOBI - 夜に駆ける [2 pianos version]",
            &["KayThePianist".to_string()],
        );
        assert!(!passes);

        // Completely wrong artist (same song name "Home")
        let (passes, _) = evaluate_candidate_match(
            "Home",
            "Edward Sharpe & The Magnetic Zeros",
            "Home",
            &["Justin Bieber".to_string()],
        );
        assert!(!passes);
    }

    #[test]
    fn test_generate_spotify_totp() {
        let secret = ",7/*F(\"rLJ2oxaKL^f+E1xvP@N";
        let timestamp_ms = 1791468347000u64;
        let totp = generate_spotify_totp(secret, timestamp_ms);
        assert_eq!(totp, "253733");
    }

    #[test]
    fn test_clean_apple_search_string_quotes_and_dashes() {
        assert_eq!(
            clean_apple_search_string("B’s On The Table (feat. 21 Savage)"),
            "B's On The Table"
        );
        assert_eq!(clean_apple_search_string("Don‘t Stop"), "Don't Stop");
        assert_eq!(
            clean_apple_search_string("Canʼt Tell Me Nothing"),
            "Can't Tell Me Nothing"
        );
        assert_eq!(clean_apple_search_string("`All Day`"), "'All Day'");
        assert_eq!(clean_apple_search_string("“Heroes”"), "\"Heroes\"");
        assert_eq!(clean_apple_search_string("Take Care – Single"), "Take Care");
        assert_eq!(clean_apple_search_string("One Dance — Remix"), "One Dance");
    }

    #[test]
    fn test_is_disqualified_apple_collection() {
        assert!(is_disqualified_apple_collection(
            "Today’s Hits 2020 (DJ Mix)",
            true,
            Some("Apple Music"),
            "Drake"
        ));
        assert!(is_disqualified_apple_collection(
            "Party In The Jungle: Deejay Massive (DJ Mix)",
            false,
            None,
            "Drake"
        ));
        assert!(is_disqualified_apple_collection(
            "Rap Life: Drake",
            false,
            Some("Apple Music"),
            "Drake"
        ));
        assert!(is_disqualified_apple_collection(
            "Continuous Mix: Vol 1",
            false,
            None,
            "Drake"
        ));
        assert!(is_disqualified_apple_collection(
            "Drake Megamix",
            false,
            None,
            "Drake"
        ));
        assert!(is_disqualified_apple_collection(
            "Controlla [Mixed]",
            false,
            None,
            "Drake"
        ));

        // Compilation without compilation query
        assert!(is_disqualified_apple_collection(
            "Greatest Hits",
            true,
            None,
            "Drake B's On The Table"
        ));
        // Compilation with compilation query
        assert!(!is_disqualified_apple_collection(
            "Greatest Hits Compilation",
            true,
            None,
            "Drake Compilation"
        ));

        // Authentic album
        assert!(!is_disqualified_apple_collection(
            "ICEMAN",
            false,
            None,
            "Drake B's On The Table"
        ));

        // Explicit DJ mix query allows mix
        assert!(!is_disqualified_apple_collection(
            "Boiler Room DJ Mix",
            false,
            None,
            "Kaytranada DJ Mix"
        ));
    }
}
