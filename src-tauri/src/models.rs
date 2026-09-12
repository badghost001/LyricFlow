use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyImage {
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub height: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub width: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SpotifyAlbum {
    #[serde(default)]
    pub images: Vec<SpotifyImage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyArtist {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyItem {
    pub id: String,
    pub name: String,
    pub duration_ms: u64,
    pub artists: Vec<SpotifyArtist>,
    pub album: SpotifyAlbum,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyPlaybackState {
    pub is_playing: bool,
    pub progress_ms: u64,
    pub playback_rate: f64,
    pub item: SpotifyItem,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SmtcPlaybackStatus {
    pub is_playing: bool,
    pub position: u64,
    pub playback_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TrackMetadata {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration_ms: u64,
    pub position_ms: u64,
    pub is_playing: bool,
    pub playback_rate: f64,
    pub art_url: Option<String>,
    pub source: String,
    pub taskbar_hidden: bool,
}

impl TrackMetadata {
    pub fn to_spotify_playback_state(&self) -> Option<SpotifyPlaybackState> {
        if self.title.is_empty() {
            return None;
        }

        // Generate stable track ID
        let raw_id = format!("{}_{}", self.artist, self.title);
        let track_id = format!("local_{}", base64_encode(raw_id.as_bytes()));

        let mut images = Vec::new();
        if let Some(ref url) = self.art_url {
            images.push(SpotifyImage {
                url: url.clone(),
                height: None,
                width: None,
            });
        }

        Some(SpotifyPlaybackState {
            is_playing: self.is_playing,
            progress_ms: self.position_ms,
            playback_rate: if self.playback_rate > 0.0 { self.playback_rate } else { 1.0 },
            item: SpotifyItem {
                id: track_id,
                name: self.title.clone(),
                duration_ms: self.duration_ms,
                artists: vec![SpotifyArtist {
                    name: if self.artist.is_empty() { "Unknown Artist".to_string() } else { self.artist.clone() },
                }],
                album: SpotifyAlbum { images },
            },
        })
    }
}

fn base64_encode(input: &[u8]) -> String {
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::new();
    let mut i = 0;
    while i < input.len() {
        let b0 = input[i] as usize;
        let b1 = if i + 1 < input.len() { input[i + 1] as usize } else { 0 };
        let b2 = if i + 2 < input.len() { input[i + 2] as usize } else { 0 };

        let triple = (b0 << 16) | (b1 << 8) | b2;
        out.push(CHARSET[(triple >> 18) & 63] as char);
        out.push(CHARSET[(triple >> 12) & 63] as char);
        if i + 1 < input.len() {
            out.push(CHARSET[(triple >> 6) & 63] as char);
        }
        if i + 2 < input.len() {
            out.push(CHARSET[triple & 63] as char);
        }
        i += 3;
    }
    out
}
