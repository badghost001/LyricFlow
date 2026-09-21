#[cfg(target_os = "windows")]
pub mod windows_smtc;

#[cfg(target_os = "macos")]
pub mod macos;

use std::sync::{OnceLock, RwLock};
use crate::models::{SpotifyPlaybackState, TrackMetadata};

pub static CURRENT_PLAYBACK_STATE: OnceLock<RwLock<Option<SpotifyPlaybackState>>> = OnceLock::new();

pub fn get_cached_playback_state() -> Option<SpotifyPlaybackState> {
    if let Some(lock) = CURRENT_PLAYBACK_STATE.get() {
        if let Ok(guard) = lock.read() {
            return guard.clone();
        }
    }
    None
}

pub fn set_cached_playback_state(state: SpotifyPlaybackState) {
    let lock = CURRENT_PLAYBACK_STATE.get_or_init(|| RwLock::new(None));
    if let Ok(mut guard) = lock.write() {
        *guard = Some(state);
    }
}

pub trait MediaSessionBackend: Send + Sync {
    fn poll_playback(&self) -> Option<TrackMetadata>;
    fn trigger_control(&self, action: &str, position_ms: u64);
}

pub fn get_platform_backend() -> Box<dyn MediaSessionBackend> {
    #[cfg(target_os = "windows")]
    {
        Box::new(windows_smtc::WindowsSmtcBackend::new())
    }

    #[cfg(target_os = "macos")]
    {
        Box::new(macos::MacOSMediaBackend::new())
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        Box::new(FallbackBackend)
    }
}

pub struct FallbackBackend;

impl MediaSessionBackend for FallbackBackend {
    fn poll_playback(&self) -> Option<TrackMetadata> {
        None
    }
    fn trigger_control(&self, _action: &str, _position_ms: u64) {}
}
