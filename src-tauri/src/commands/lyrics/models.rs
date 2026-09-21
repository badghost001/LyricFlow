use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum SyncType {
    #[serde(rename = "WORD_SYNCED")]
    WordSynced, // Level 3: RichSync / syllable timestamps
    #[serde(rename = "LINE_SYNCED")]
    LineSynced, // Level 2: [mm:ss.xx] standard LRC
    #[serde(rename = "UNSYNCED")]
    PlainText,  // Level 1: Unsynced lines
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WordTiming {
    pub text: String,
    #[serde(rename = "timeMs")]
    pub time_ms: u32,
    #[serde(rename = "durationMs", skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LyricLineParsed {
    #[serde(rename = "timeMs")]
    pub time_ms: u32,
    pub text: String,
    #[serde(skip_serializing_if = "Vec::is_empty", default)]
    pub words: Vec<WordTiming>,
    #[serde(rename = "subText", skip_serializing_if = "Option::is_none")]
    pub sub_text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LyricsCandidate {
    pub provider: String,
    #[serde(rename = "syncType")]
    pub sync_type: SyncType,
    #[serde(rename = "rawLRC")]
    pub raw_lrc: String,
    #[serde(rename = "translationLRC", skip_serializing_if = "Option::is_none")]
    pub translation_lrc: Option<String>,
    #[serde(rename = "parsedLines", skip_serializing_if = "Option::is_none")]
    pub parsed_lines: Option<Vec<LyricLineParsed>>,
    #[serde(rename = "candidateId")]
    pub candidate_id: String,
    pub score: f32, // Match score 0.0 - 1.0
    #[serde(rename = "candidateInfo", skip_serializing_if = "Option::is_none")]
    pub candidate_info: Option<String>,
    #[serde(rename = "durationDiffSec", skip_serializing_if = "Option::is_none")]
    pub duration_diff_sec: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LyricsSearchOptions {
    #[serde(rename = "preferredProviders", default)]
    pub preferred_providers: Vec<String>,
    #[serde(rename = "musixmatchToken", default)]
    pub musixmatch_token: Option<String>,
    #[serde(rename = "spotifyToken", default)]
    pub spotify_token: Option<String>,
    #[serde(rename = "spotifyTrackId", default)]
    pub spotify_track_id: Option<String>,
    #[serde(rename = "forceRefresh", default)]
    pub force_refresh: bool,
    #[serde(rename = "candidateIndex", default)]
    pub candidate_index: usize,
}
