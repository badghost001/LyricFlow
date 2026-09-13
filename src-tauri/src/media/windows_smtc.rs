use crate::models::TrackMetadata;
use super::MediaSessionBackend;
use std::sync::Mutex;
use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSession,
    GlobalSystemMediaTransportControlsSessionManager,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus,
};
use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};

static CACHED_MANAGER: Mutex<Option<GlobalSystemMediaTransportControlsSessionManager>> = Mutex::new(None);
static CACHED_TRACK: Mutex<Option<TrackMetadata>> = Mutex::new(None);

fn ensure_com() {
    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
    }
}

pub struct WindowsSmtcBackend;

impl WindowsSmtcBackend {
    pub fn new() -> Self {
        Self
    }

    fn get_manager() -> Option<GlobalSystemMediaTransportControlsSessionManager> {
        ensure_com();
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
        ensure_com();
        let manager = Self::get_manager()?;

        // 1. Check default current session if currently playing
        if let Ok(session) = manager.GetCurrentSession() {
            if let Ok(info) = session.GetPlaybackInfo() {
                if let Ok(status) = info.PlaybackStatus() {
                    if status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing {
                        return Some(session);
                    }
                }
            }
        }

        // 2. Search all sessions, prioritizing dedicated music apps (Spotify, Apple Music, Tidal, etc.)
        if let Ok(sessions) = manager.GetSessions() {
            let count = sessions.Size().unwrap_or(0);
            let mut playing_music = None;
            let mut paused_music = None;
            let mut any_playing = None;

            for i in 0..count {
                if let Ok(s) = sessions.GetAt(i) {
                    let app_id = s.SourceAppUserModelId().map(|id| id.to_string().to_lowercase()).unwrap_or_default();
                    let is_music = app_id.contains("spotify")
                        || app_id.contains("applemusic")
                        || app_id.contains("itunes")
                        || app_id.contains("tidal")
                        || app_id.contains("deezer")
                        || app_id.contains("music");

                    let status = s.GetPlaybackInfo().ok().and_then(|inf| inf.PlaybackStatus().ok());

                    if let Some(st) = status {
                        if st == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing {
                            if is_music && playing_music.is_none() {
                                playing_music = Some(s.clone());
                            } else if any_playing.is_none() {
                                any_playing = Some(s.clone());
                            }
                        } else if st == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Paused {
                            if is_music && paused_music.is_none() {
                                paused_music = Some(s.clone());
                            }
                        }
                    }
                }
            }

            if let Some(s) = playing_music {
                return Some(s);
            }
            if let Some(s) = paused_music {
                return Some(s);
            }
            if let Some(s) = any_playing {
                return Some(s);
            }
        }

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
            let base_pos = t.Position().map(|p| (p.Duration / 10_000).max(0) as u64).unwrap_or(0);
            let dur = t.EndTime().map(|e| (e.Duration / 10_000).max(0) as u64).unwrap_or(0);

            let pos = if is_playing && playback_rate > 0.0 {
                if let Ok(last_updated) = t.LastUpdatedTime() {
                    let now = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default();
                    // Windows epoch (1601-01-01) is 11,644,473,600 seconds before Unix epoch (1970-01-01)
                    let now_100ns = (now.as_secs() as i64 + 11_644_473_600) * 10_000_000
                        + (now.subsec_nanos() as i64 / 100);
                    let elapsed_100ns = (now_100ns - last_updated.UniversalTime).max(0);
                    let elapsed_ms = (elapsed_100ns / 10_000) as u64;
                    let interpolated = base_pos + (elapsed_ms as f64 * playback_rate) as u64;
                    if dur > 0 { interpolated.min(dur) } else { interpolated }
                } else {
                    base_pos
                }
            } else {
                base_pos
            };

            (pos, dur)
        } else {
            (0, 0)
        };

        // Fetch fresh track properties directly from SMTC session on every poll
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
            // If title is empty or transiently unavailable (e.g. during track transition), return cached track
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
