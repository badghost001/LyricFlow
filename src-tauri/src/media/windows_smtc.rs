use crate::models::TrackMetadata;
use super::MediaSessionBackend;
use std::sync::Mutex;
use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSession,
    GlobalSystemMediaTransportControlsSessionManager,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus,
};

static CACHED_MANAGER: Mutex<Option<GlobalSystemMediaTransportControlsSessionManager>> = Mutex::new(None);
static CACHED_TRACK: Mutex<Option<TrackMetadata>> = Mutex::new(None);

pub struct WindowsSmtcBackend;

impl WindowsSmtcBackend {
    pub fn new() -> Self {
        Self
    }

    fn get_manager() -> Option<GlobalSystemMediaTransportControlsSessionManager> {
        let mut lock = CACHED_MANAGER.lock().unwrap();
        if let Some(ref manager) = *lock {
            return Some(manager.clone());
        }
        if let Ok(async_op) = GlobalSystemMediaTransportControlsSessionManager::RequestAsync() {
            if let Ok(manager) = async_op.get() {
                *lock = Some(manager.clone());
                return Some(manager);
            }
        }
        None
    }

    fn get_current_session() -> Option<GlobalSystemMediaTransportControlsSession> {
        let manager = Self::get_manager()?;
        manager.GetCurrentSession().ok()
    }
}

impl MediaSessionBackend for WindowsSmtcBackend {
    fn poll_playback(&self) -> Option<TrackMetadata> {
        let session = match Self::get_current_session() {
            Some(s) => s,
            None => {
                // If session is temporarily lost (e.g. Spotify pause/idle), maintain cached track with is_playing = false
                let mut lock = CACHED_TRACK.lock().unwrap();
                if let Some(ref mut track) = *lock {
                    track.is_playing = false;
                    return Some(track.clone());
                }
                return None;
            }
        };

        let info = session.GetPlaybackInfo().ok();
        let timeline = session.GetTimelineProperties().ok();

        let is_playing = info.as_ref()
            .and_then(|i| i.PlaybackStatus().ok())
            .map(|s| s == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing)
            .unwrap_or(false);

        let playback_rate = info.as_ref()
            .and_then(|i| i.PlaybackRate().ok())
            .and_then(|r| r.Value().ok())
            .unwrap_or(1.0);

        let (position_ms, duration_ms) = if let Some(t) = timeline {
            let pos = t.Position().map(|p| (p.Duration / 10_000).max(0) as u64).unwrap_or(0);
            let dur = t.EndTime().map(|e| (e.Duration / 10_000).max(0) as u64).unwrap_or(0);
            (pos, dur)
        } else {
            (0, 0)
        };

        // Fetch track properties from SMTC session
        let (title, artist, album) = if let Ok(async_op) = session.TryGetMediaPropertiesAsync() {
            if let Ok(props) = async_op.get() {
                let t = props.Title().ok().map(|s| s.to_string()).unwrap_or_default();
                let a = props.Artist().ok().map(|s| s.to_string()).unwrap_or_default();
                let alb = props.AlbumTitle().ok().map(|s| s.to_string()).unwrap_or_default();
                (t, a, alb)
            } else {
                (String::new(), String::new(), String::new())
            }
        } else {
            (String::new(), String::new(), String::new())
        };

        if title.is_empty() {
            // If title is empty or transiently unavailable, return cached track
            let mut lock = CACHED_TRACK.lock().unwrap();
            if let Some(ref mut track) = *lock {
                track.is_playing = is_playing;
                if position_ms > 0 {
                    track.position_ms = position_ms;
                }
                return Some(track.clone());
            }
            return None;
        }

        let metadata = TrackMetadata {
            title,
            artist,
            album,
            duration_ms,
            position_ms,
            is_playing,
            playback_rate,
            art_url: None,
            source: "windows-smtc".to_string(),
            taskbar_hidden: false,
        };

        let mut lock = CACHED_TRACK.lock().unwrap();
        *lock = Some(metadata.clone());

        Some(metadata)
    }

    fn trigger_control(&self, action: &str, position_ms: u64) {
        if let Some(session) = Self::get_current_session() {
            match action {
                "play" => { let _ = session.TryPlayAsync().map(|a| a.get()); },
                "pause" => { let _ = session.TryPauseAsync().map(|a| a.get()); },
                "toggle" | "toggle-play-pause" | "play-pause" => { let _ = session.TryTogglePlayPauseAsync().map(|a| a.get()); },
                "next" => { let _ = session.TrySkipNextAsync().map(|a| a.get()); },
                "previous" => { let _ = session.TrySkipPreviousAsync().map(|a| a.get()); },
                "seek" => {
                    let requested_pos = (position_ms as i64) * 10_000;
                    let _ = session.TryChangePlaybackPositionAsync(requested_pos).map(|a| a.get());
                },
                _ => {}
            }
        }
    }
}
