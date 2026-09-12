use crate::media::MediaSessionBackend;
use crate::models::TrackMetadata;
use std::process::Command;

pub struct MacOSMediaBackend;

impl MacOSMediaBackend {
    pub fn new() -> Self {
        Self
    }
}

impl MediaSessionBackend for MacOSMediaBackend {
    fn poll_playback(&self) -> Option<TrackMetadata> {
        let script = r#"
            if application "Spotify" is running then
                tell application "Spotify"
                    set pState to player state as string
                    set tName to name of current track
                    set tArtist to artist of current track
                    set tAlbum to album of current track
                    set tId to id of current track
                    set tDur to (duration of current track) / 1000
                    set tPos to player position
                    return pState & "|||" & tName & "|||" & tArtist & "|||" & tAlbum & "|||" & tId & "|||" & (tDur as string) & "|||" & (tPos as string)
                end tell
            else if application "Music" is running then
                tell application "Music"
                    set pState to player state as string
                    set tName to name of current track
                    set tArtist to artist of current track
                    set tAlbum to album of current track
                    set tId to id of current track
                    set tDur to duration of current track
                    set tPos to player position
                    return pState & "|||" & tName & "|||" & tArtist & "|||" & tAlbum & "|||" & (tId as string) & "|||" & (tDur as string) & "|||" & (tPos as string)
                end tell
            else
                return ""
            end if
        "#;

        let output = Command::new("osascript")
            .args(["-e", script])
            .output()
            .ok()?;

        let result = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if result.is_empty() {
            return None;
        }

        let parts: Vec<&str> = result.split("|||").collect();
        if parts.len() < 7 {
            return None;
        }

        let state = parts[0];
        let is_playing = state.eq_ignore_ascii_case("playing");
        let title = parts[1].to_string();
        let artist = parts[2].to_string();
        let album = parts[3].to_string();
        let duration_secs: f64 = parts[5].parse().unwrap_or(0.0);
        let pos_secs: f64 = parts[6].parse().unwrap_or(0.0);

        let duration_ms = (duration_secs * 1000.0) as u64;
        let position_ms = (pos_secs * 1000.0) as u64;

        Some(TrackMetadata {
            title,
            artist,
            album,
            duration_ms,
            position_ms,
            is_playing,
            playback_rate: 1.0,
        })
    }

    fn trigger_control(&self, action: &str, position_ms: u64) {
        let script = match action {
            "play-pause" => r#"
                if application "Spotify" is running then
                    tell application "Spotify" to playpause
                else if application "Music" is running then
                    tell application "Music" to playpause
                end if
            "#,
            "next" => r#"
                if application "Spotify" is running then
                    tell application "Spotify" to next track
                else if application "Music" is running then
                    tell application "Music" to next track
                end if
            "#,
            "previous" => r#"
                if application "Spotify" is running then
                    tell application "Spotify" to previous track
                else if application "Music" is running then
                    tell application "Music" to previous track
                end if
            "#,
            "seek" => {
                let secs = position_ms as f64 / 1000.0;
                let s = format!(r#"
                    if application "Spotify" is running then
                        tell application "Spotify" to set player position to {secs}
                    else if application "Music" is running then
                        tell application "Music" to set player position to {secs}
                    end if
                "#);
                let _ = Command::new("osascript").args(["-e", &s]).output();
                return;
            }
            _ => return,
        };

        let _ = Command::new("osascript").args(["-e", script]).output();
    }
}
