#[cfg(target_os = "windows")]
pub mod windows_smtc;

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

    #[cfg(not(target_os = "windows"))]
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
