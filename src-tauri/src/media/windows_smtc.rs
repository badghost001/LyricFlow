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
static CACHED_THUMBNAIL: Mutex<Option<(String, String)>> = Mutex::new(None);

fn extract_thumbnail(props: &windows::Media::Control::GlobalSystemMediaTransportControlsSessionMediaProperties, title: &str, artist: &str) -> Option<String> {
    if title.is_empty() {
        return None;
    }
    let key = format!("{}:::{}", title, artist);
    if let Ok(lock) = CACHED_THUMBNAIL.lock() {
        if let Some((ref cached_key, ref url)) = *lock {
            if cached_key == &key {
                return Some(url.clone());
            }
        }
    }

    let thumb_ref = props.Thumbnail().ok()?;
    let stream_op = thumb_ref.OpenReadAsync().ok()?;
    let stream = stream_op.get().ok()?;
    let size = stream.Size().ok()? as usize;
    if size == 0 || size > 10 * 1024 * 1024 {
        return None;
    }

    let reader = windows::Storage::Streams::DataReader::CreateDataReader(&stream).ok()?;
    let load_op = reader.LoadAsync(size as u32).ok()?;
    load_op.get().ok()?;

    let mut buf = vec![0u8; size];
    reader.ReadBytes(&mut buf).ok()?;

    let mime = if buf.starts_with(&[0x89, 0x50, 0x4E, 0x47]) {
        "image/png"
    } else if buf.starts_with(&[0x47, 0x49, 0x46]) {
        "image/gif"
    } else if buf.starts_with(&[0x52, 0x49, 0x46, 0x46]) {
        "image/webp"
    } else {
        "image/jpeg"
    };

    let b64 = crate::models::base64_encode(&buf);
    let data_url = format!("data:{};base64,{}", mime, b64);

    if let Ok(mut lock) = CACHED_THUMBNAIL.lock() {
        *lock = Some((key, data_url.clone()));
    }

    Some(data_url)
}

fn ensure_com() {
    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
    }
}

fn is_browser_or_non_music(app_id: &str) -> bool {
    let id = app_id.to_lowercase();
    let trimmed = id.trim();

    if trimmed.is_empty() {
        return true;
    }

    // Detect 16-hex character hash AUMIDs (used by Mozilla Firefox e.g. 308046B0AF4A39CB)
    let first_part = trimmed.split(';').next().unwrap_or(trimmed);
    if (first_part.len() == 16 && first_part.chars().all(|c| c.is_ascii_hexdigit()))
        || trimmed.contains("privatebrowsing")
    {
        return true;
    }

    // Major and alternative web browsers & browser engines
    trimmed.contains("chrome")
        || trimmed.contains("msedge")
        || trimmed.contains("edge")
        || trimmed.contains("firefox")
        || trimmed.contains("brave")
        || trimmed.contains("opera")
        || trimmed.contains("vivaldi")
        || trimmed.contains("arc")
        || trimmed.contains("zen")
        || trimmed.contains("tor")
        || trimmed.contains("yandex")
        || trimmed.contains("waterfox")
        || trimmed.contains("librewolf")
        || trimmed.contains("chromium")
        || trimmed.contains("whale")
        || trimmed.contains("browser")
        || trimmed.contains("mozilla")
        || trimmed.contains("safari")
        || trimmed.contains("webkit")
        || trimmed.contains("gecko")
        // Browser PWAs and web wrappers
        || trimmed.contains("_crx_")
        || trimmed.contains("pwa")
        || trimmed.contains("google.chrome")
        || trimmed.contains("microsoft.edge")
        || trimmed.contains("thebrowsercompany")
        // Video streaming and conferencing apps that register SMTC
        || trimmed.contains("netflix")
        || trimmed.contains("primevideo")
        || trimmed.contains("hulu")
        || trimmed.contains("disney")
        || trimmed.contains("twitch")
        // Messaging & VoIP apps that register SMTC
        || trimmed.contains("discord")
        || trimmed.contains("telegram")
        || trimmed.contains("slack")
        || trimmed.contains("teams")
        || trimmed.contains("zoom")
        || trimmed.contains("whatsapp")
        || trimmed.contains("skype")
        || trimmed.contains("viber")
        || trimmed.contains("signal")
}

fn is_dedicated_music_app(app_id: &str) -> bool {
    let id = app_id.to_lowercase();
    let trimmed = id.trim();

    // If classified as a browser or non-music app, reject immediately
    if is_browser_or_non_music(trimmed) {
        return false;
    }

    trimmed.contains("spotify")
        || trimmed.contains("applemusic")
        || trimmed.contains("apple.music")
        || trimmed.contains("itunes")
        || trimmed.contains("tidal")
        || trimmed.contains("deezer")
        || trimmed.contains("amazonmusic")
        || trimmed.contains("amazon.music")
        || trimmed.contains("youtubemusic")
        || trimmed.contains("youtube-music")
        || trimmed.contains("youtube music")
        || trimmed.contains("ytmdesktop")
        || trimmed.contains("th-ch.youtube-music")
        || trimmed.contains("musicbee")
        || trimmed.contains("foobar")
        || trimmed.contains("aimp")
        || trimmed.contains("winamp")
        || trimmed.contains("vlc")
        || trimmed.contains("dopamine")
        || trimmed.contains("qobuz")
        || trimmed.contains("audacious")
        || trimmed.contains("zune")
        || trimmed.contains("zunemusic")
        || trimmed.contains("groove")
        || trimmed.contains("mediaplayer")
        || trimmed.contains("wmplayer")
        || trimmed.contains("windowsmediaplayer")
        || trimmed.contains("cider")
        || trimmed.contains("plexamp")
        || trimmed.contains("strawberry")
        || trimmed.contains("clementine")
        || trimmed.contains("quodlibet")
        || trimmed.contains("audirvana")
        || trimmed.contains("resonic")
        || trimmed.contains("neutron")
        || trimmed.contains("kodi")
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

        // 1. Search all sessions, strictly excluding web browsers and only accepting dedicated music apps
        match manager.GetSessions() {
            Ok(sessions) => {
                let count = sessions.Size().unwrap_or(0);
                let mut playing_music = None;
                let mut paused_music = None;

                for i in 0..count {
                    if let Ok(s) = sessions.GetAt(i) {
                        let app_id = s.SourceAppUserModelId().map(|id| id.to_string().to_lowercase()).unwrap_or_default();

                        // Strictly ignore web browsers, chat apps, and any non-music applications
                        if is_browser_or_non_music(&app_id) || !is_dedicated_music_app(&app_id) {
                            continue;
                        }

                        let status = s.GetPlaybackInfo().ok().and_then(|inf| inf.PlaybackStatus().ok());

                        if let Some(st) = status {
                            if st == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing {
                                if playing_music.is_none() {
                                    playing_music = Some(s.clone());
                                }
                            } else if st == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Paused {
                                if paused_music.is_none() {
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
            }
            Err(_) => {
                // COM session manager faulted or invalidated (e.g. after sleep/resume). Clear cache.
                if let Ok(mut lock) = CACHED_MANAGER.lock() {
                    *lock = None;
                }
                return None;
            }
        }

        // 2. Fallback to default session ONLY if it is verified as a dedicated music app
        if let Ok(session) = manager.GetCurrentSession() {
            let app_id = session.SourceAppUserModelId().map(|id| id.to_string().to_lowercase()).unwrap_or_default();
            if !is_browser_or_non_music(&app_id) && is_dedicated_music_app(&app_id) {
                return Some(session);
            }
        }

        None
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
        let (title, artist, album, art_url) = if let Ok(async_op) = session.TryGetMediaPropertiesAsync() {
            if let Ok(props) = async_op.get() {
                let t = props.Title().ok().map(|s| s.to_string()).unwrap_or_default();
                let a = props.Artist().ok().map(|s| s.to_string()).unwrap_or_default();
                let alb = props.AlbumTitle().ok().map(|s| s.to_string()).unwrap_or_default();
                let art = extract_thumbnail(&props, &t, &a);
                (t, a, alb, art)
            } else {
                (String::new(), String::new(), String::new(), None)
            }
        } else {
            (String::new(), String::new(), String::new(), None)
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
            art_url,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_browser_rejection() {
        // Mozilla Firefox hash-based AUMIDs
        assert!(is_browser_or_non_music("308046B0AF4A39CB"));
        assert!(is_browser_or_non_music("308046B0AF4A39CB;PrivateBrowsingAUMID"));
        assert!(!is_dedicated_music_app("308046B0AF4A39CB"));

        // Major browsers
        assert!(is_browser_or_non_music("Google.Chrome.123"));
        assert!(is_browser_or_non_music("Microsoft.MicrosoftEdge_8wekyb3d8bbwe!App"));
        assert!(is_browser_or_non_music("brave.exe"));
        assert!(is_browser_or_non_music("opera.exe"));
        assert!(is_browser_or_non_music("TheBrowserCompany.Arc"));
        assert!(is_browser_or_non_music("zen.exe"));
        assert!(is_browser_or_non_music(""));

        assert!(!is_dedicated_music_app("Google.Chrome.123"));
        assert!(!is_dedicated_music_app("Microsoft.MicrosoftEdge_8wekyb3d8bbwe!App"));
        assert!(!is_dedicated_music_app("brave.exe"));
    }

    #[test]
    fn test_dedicated_music_app_acceptance() {
        assert!(is_dedicated_music_app("SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify"));
        assert!(is_dedicated_music_app("spotify.exe"));
        assert!(is_dedicated_music_app("AppleInc.AppleMusicWin_nzyj5cxqqttg4!App"));
        assert!(is_dedicated_music_app("iTunes.exe"));
        assert!(is_dedicated_music_app("TIDAL.exe"));
        assert!(is_dedicated_music_app("Deezer.exe"));
        assert!(is_dedicated_music_app("YouTubeMusic.exe"));
        assert!(is_dedicated_music_app("musicbee.exe"));
        assert!(is_dedicated_music_app("foobar2000.exe"));
        assert!(is_dedicated_music_app("cider.exe"));
        assert!(is_dedicated_music_app("vlc.exe"));

        assert!(!is_browser_or_non_music("SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify"));
    }
}
