use crate::models::TrackMetadata;
use super::MediaSessionBackend;
use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSession,
    GlobalSystemMediaTransportControlsSessionManager,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus,
};
use windows::Foundation::TimeSpan;

pub struct WindowsSmtcBackend;

impl WindowsSmtcBackend {
    pub fn new() -> Self {
        Self
    }

    fn get_manager() -> Option<GlobalSystemMediaTransportControlsSessionManager> {
        GlobalSystemMediaTransportControlsSessionManager::RequestAsync().ok()?.get().ok()
    }

    fn get_current_session() -> Option<GlobalSystemMediaTransportControlsSession> {
        let manager = Self::get_manager()?;
        manager.GetCurrentSession().ok()
    }
}

impl MediaSessionBackend for WindowsSmtcBackend {
    fn poll_playback(&self) -> Option<TrackMetadata> {
        let session = Self::get_current_session()?;
        let props = session.TryGetMediaPropertiesAsync().ok()?.get().ok()?;
        let info = session.GetPlaybackInfo().ok()?;
        let timeline = session.GetTimelineProperties().ok();

        let title = props.Title().ok()?.to_string();
        if title.is_empty() {
            return None;
        }

        let artist = props.Artist().ok().map(|s| s.to_string()).unwrap_or_default();
        let album = props.AlbumTitle().ok().map(|s| s.to_string()).unwrap_or_default();

        let status = info.PlaybackStatus().ok()?;
        let is_playing = status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing;

        let playback_rate = info.PlaybackRate().ok()
            .and_then(|r| r.Value().ok())
            .unwrap_or(1.0);

        let (position_ms, duration_ms) = if let Some(t) = timeline {
            let pos = t.Position().map(|p| (p.Duration / 10_000).max(0) as u64).unwrap_or(0);
            let dur = t.EndTime().map(|e| (e.Duration / 10_000).max(0) as u64).unwrap_or(0);
            (pos, dur)
        } else {
            (0, 0)
        };

        Some(TrackMetadata {
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
        })
    }

    fn trigger_control(&self, action: &str, position_ms: u64) {
        if let Some(session) = Self::get_current_session() {
            match action {
                "play" => { let _ = session.TryPlayAsync().map(|a| a.get()); },
                "pause" => { let _ = session.TryPauseAsync().map(|a| a.get()); },
                "toggle" | "toggle-play-pause" => { let _ = session.TryTogglePlayPauseAsync().map(|a| a.get()); },
                "next" => { let _ = session.TrySkipNextAsync().map(|a| a.get()); },
                "previous" => { let _ = session.TrySkipPreviousAsync().map(|a| a.get()); },
                "seek" => {
                    let ts = TimeSpan { Duration: (position_ms as i64) * 10_000 };
                    let _ = session.TryChangePlaybackPositionAsync(ts).map(|a| a.get());
                },
                _ => {}
            }
        }
    }
}
