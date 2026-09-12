#[cfg(target_os = "windows")]
pub mod windows_smtc;

#[cfg(target_os = "macos")]
pub mod macos;

use crate::models::TrackMetadata;

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
