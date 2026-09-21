use std::collections::BTreeSet;

/// Cleans track title by removing tags like "[Official Video]", "(feat. ...)", etc.
pub fn clean_title(title: &str) -> String {
    let mut s = title.to_string();

    // Remove text inside brackets: [...]
    while let Some(start) = s.find('[') {
        if let Some(end) = s[start..].find(']') {
            s.replace_range(start..=start + end, " ");
        } else {
            break;
        }
    }

    // Remove common parenthetical noise: (Official Video), (feat. ...), (Audio), etc.
    let patterns = [
        "(official audio)",
        "(official video)",
        "(official music video)",
        "(official lyric video)",
        "(official visualizer)",
        "(audio)",
        "(video)",
        "(lyrics)",
        "(lyric video)",
        "(visualizer)",
        "(live)",
        "(acoustic)",
        "(remastered)",
        "(remaster)",
        "(bonus track)",
        "(radio edit)",
    ];

    let lower = s.to_lowercase();
    for pat in patterns {
        if let Some(pos) = lower.find(pat) {
            s.replace_range(pos..pos + pat.len(), " ");
            break;
        }
    }

    // Strip "feat." or "ft." clauses inside parentheses e.g. "(feat. Drake)"
    if let Some(start) = s.find('(') {
        if let Some(end) = s[start..].find(')') {
            let inner = s[start + 1..start + end].to_lowercase();
            if inner.starts_with("feat.") || inner.starts_with("feat ") || inner.starts_with("ft.") || inner.starts_with("ft ") || inner.starts_with("with ") {
                s.replace_range(start..=start + end, " ");
            }
        }
    }

    // Strip trailing " - Remastered", " - Radio Edit", etc.
    if let Some(dash_idx) = s.find(" - ") {
        let after_dash = s[dash_idx + 3..].to_lowercase();
        if after_dash.contains("remaster")
            || after_dash.contains("radio edit")
            || after_dash.contains("live")
            || after_dash.contains("acoustic")
            || after_dash.contains("single version")
            || after_dash.contains("instrumental")
        {
            s.truncate(dash_idx);
        }
    }

    // Normalize multiple spaces and trim
    s.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Cleans artist name by removing common channel/label suffixes
pub fn clean_artist(artist: &str) -> String {
    let mut a = artist.trim().to_string();
    if a.ends_with("VEVO") {
        a.truncate(a.len() - 4);
    } else if a.ends_with("- Topic") {
        a.truncate(a.len() - 7);
    } else if a.ends_with("Official") {
        a.truncate(a.len() - 8);
    }
    a.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Tokenizes text into a sorted alphanumeric word set for token-set ratio scoring
fn tokenize_to_set(s: &str) -> String {
    let mut words: BTreeSet<String> = BTreeSet::new();
    for word in s.split_whitespace() {
        let cleaned: String = word
            .chars()
            .filter(|c| c.is_alphanumeric())
            .flat_map(|c| c.to_lowercase())
            .collect();
        if !cleaned.is_empty() {
            words.insert(cleaned);
        }
    }
    words.into_iter().collect::<Vec<_>>().join(" ")
}

/// Computes similarity score (0.0 to 1.0) between search query and candidate
pub fn compute_similarity_score(search_term: &str, candidate_term: &str) -> f32 {
    let s_norm = clean_title(&search_term.to_lowercase());
    let c_norm = clean_title(&candidate_term.to_lowercase());

    // Exact match
    if s_norm == c_norm {
        return 1.0;
    }

    // Substring match
    if !s_norm.is_empty() && !c_norm.is_empty() && (s_norm.contains(&c_norm) || c_norm.contains(&s_norm)) {
        let max_len = c_norm.len().max(s_norm.len()) as f32;
        if max_len > 0.0 {
            let ratio = (c_norm.len().min(s_norm.len()) as f32) / max_len;
            return (0.75 + (ratio * 0.25)).clamp(0.0, 1.0);
        }
    }

    // Token set ratio
    let s_tokens = tokenize_to_set(&s_norm);
    let c_tokens = tokenize_to_set(&c_norm);

    if s_tokens == c_tokens && !s_tokens.is_empty() {
        return 0.95;
    }

    // Normalized Levenshtein distance via strsim (0.0 to 1.0)
    let nl = strsim::normalized_levenshtein(&s_norm, &c_norm) as f32;
    let nl_tokens = strsim::normalized_levenshtein(&s_tokens, &c_tokens) as f32;
    let final_score = nl.max(nl_tokens);
    if final_score.is_nan() {
        0.0
    } else {
        final_score.clamp(0.0, 1.0)
    }
}

/// Checks whether an LRC string contains valid timestamps like [01:23.45]
pub fn has_lrc_timestamps(lrc: &str) -> bool {
    let bytes = lrc.as_bytes();
    let len = bytes.len();
    if len < 8 {
        return false;
    }

    // Scan for '[' followed by digits, ':', digits, '.', digits, ']'
    for i in 0..len - 7 {
        if bytes[i] == b'['
            && bytes[i + 1].is_ascii_digit()
            && (bytes[i + 2].is_ascii_digit() || bytes[i + 2] == b':')
        {
            // Simple fast detection for "[00:" or "[0:"
            return true;
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clean_title() {
        assert_eq!(clean_title("Shape of You (Official Music Video)"), "Shape of You");
        assert_eq!(clean_title("God's Plan (feat. Drake)"), "God's Plan");
        assert_eq!(clean_title("In the End [Remastered 2021]"), "In the End");
        assert_eq!(clean_title("Blinding Lights - Radio Edit"), "Blinding Lights");
    }

    #[test]
    fn test_clean_artist() {
        assert_eq!(clean_artist("TheWeekndVEVO"), "TheWeeknd");
        assert_eq!(clean_artist("Ed Sheeran - Topic"), "Ed Sheeran");
        assert_eq!(clean_artist("Coldplay Official"), "Coldplay");
    }

    #[test]
    fn test_similarity_score() {
        let exact = compute_similarity_score("Someone Like You Adele", "Someone Like You Adele");
        assert_eq!(exact, 1.0);

        let close = compute_similarity_score("Shape of You Ed Sheeran", "Shape of You (Official Video) Ed Sheeran");
        assert!(close >= 0.75);

        let mismatch = compute_similarity_score("Bohemian Rhapsody Queen", "Despacito Luis Fonsi");
        assert!(mismatch < 0.5);
    }

    #[test]
    fn test_has_lrc_timestamps() {
        assert!(has_lrc_timestamps("[00:14.02] Line text"));
        assert!(has_lrc_timestamps("[01:23] Another line"));
        assert!(!has_lrc_timestamps("Just plain text with no timestamps"));
    }
}
