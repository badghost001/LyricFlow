pub mod models;
pub mod media;
pub mod commands;

use commands::*;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use std::time::Duration;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
use tauri_plugin_global_shortcut::GlobalShortcutExt;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        let text = format!("{:?}", shortcut).to_lowercase();
                        if text.contains("shift") && text.contains("keyl") {
                            let _ = app.emit("toggle-click-through-shortcut", ());
                        } else if text.contains("shift") && text.contains("keyc") {
                            let _ = app.emit("copy-active-lyric", ());
                        } else if text.contains("shift") && text.contains("keys") {
                            let _ = app.emit("share-active-lyric", ());
                        } else if text.contains("shift") && text.contains("arrowleft") {
                            let _ = app.emit("nudge-overlay", serde_json::json!({ "dx": -2, "dy": 0 }));
                        } else if text.contains("shift") && text.contains("arrowright") {
                            let _ = app.emit("nudge-overlay", serde_json::json!({ "dx": 2, "dy": 0 }));
                        } else if text.contains("shift") && text.contains("arrowup") {
                            let _ = app.emit("nudge-overlay", serde_json::json!({ "dx": 0, "dy": -2 }));
                        } else if text.contains("shift") && text.contains("arrowdown") {
                            let _ = app.emit("nudge-overlay", serde_json::json!({ "dx": 0, "dy": 2 }));
                        } else if text.contains("mediaplaypause") || (text.contains("alt") && text.contains("space")) {
                            let _ = app.emit("tray-playback-control", "play-pause");
                            media::get_platform_backend().trigger_control("play-pause", 0);
                        } else if text.contains("mediatracknext") || text.contains("medianexttrack") || (text.contains("alt") && text.contains("arrowright")) {
                            let _ = app.emit("tray-playback-control", "next");
                            media::get_platform_backend().trigger_control("next", 0);
                        } else if text.contains("mediatrackprevious") || text.contains("mediaprevioustrack") || (text.contains("alt") && text.contains("arrowleft")) {
                            let _ = app.emit("tray-playback-control", "previous");
                            media::get_platform_backend().trigger_control("previous", 0);
                        }
                    }
                })
                .build(),
        )
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Register Global Shortcuts
            let shortcuts = [
                "ctrl+shift+l",
                "ctrl+shift+c",
                "ctrl+shift+s",
                "ctrl+shift+left",
                "ctrl+shift+right",
                "ctrl+shift+up",
                "ctrl+shift+down",
                "mediaplaypause",
                "mediatracknext",
                "mediatrackprevious",
                "ctrl+alt+space",
                "ctrl+alt+right",
                "ctrl+alt+left",
            ];
            for sc_str in &shortcuts {
                if let Ok(sc) = sc_str.parse::<tauri_plugin_global_shortcut::Shortcut>() {
                    let _ = app.global_shortcut().register(sc);
                }
            }

            // Background Auto-Updater (checks 15s after startup, identical to Electron behavior)
            let updater_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_updater::UpdaterExt;
                tokio::time::sleep(std::time::Duration::from_secs(15)).await;
                if let Ok(updater) = updater_handle.updater() {
                    if let Ok(Some(update)) = updater.check().await {
                        let _ = updater_handle.emit("show-toast", format!("Downloading LyricFlow update v{}...", update.version));
                        let mut downloaded = 0;
                        if let Ok(_) = update.download_and_install(|chunk_len, _| {
                            downloaded += chunk_len;
                        }, || {}).await {
                            let _ = updater_handle.emit("update-downloaded", ());
                        }
                    }
                }
            });

            // Build System Tray
            let show_item = MenuItem::with_id(app, "show_main", "Show LyricFlow", true, None::<&str>)?;
            let toggle_item = MenuItem::with_id(app, "toggle", "Show / Hide", true, None::<&str>)?;
            let taskbar_item = MenuItem::with_id(app, "taskbar", "Taskbar Mode", true, None::<&str>)?;
            let play_item = MenuItem::with_id(app, "play", "Play / Pause", true, None::<&str>)?;
            let next_item = MenuItem::with_id(app, "next", "Next Track", true, None::<&str>)?;
            let prev_item = MenuItem::with_id(app, "prev", "Previous Track", true, None::<&str>)?;
            let settings_item = MenuItem::with_id(app, "settings", "Show Settings", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit LyricFlow", true, None::<&str>)?;

            let menu = Menu::with_items(
                app,
                &[
                    &show_item,
                    &toggle_item,
                    &taskbar_item,
                    &play_item,
                    &next_item,
                    &prev_item,
                    &settings_item,
                    &quit_item,
                ],
            )?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show_main" => {
                            if let Some(w) = app.get_webview_window("main") {
                                let _ = w.unminimize();
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                        "toggle" => {
                            if let Some(w) = app.get_webview_window("main") {
                                let is_minimized = w.is_minimized().unwrap_or(false);
                                let is_visible = w.is_visible().unwrap_or(false);
                                if is_minimized {
                                    let _ = w.unminimize();
                                    let _ = w.show();
                                    let _ = w.set_focus();
                                } else if is_visible {
                                    let _ = w.hide();
                                } else {
                                    let _ = w.show();
                                    let _ = w.unminimize();
                                    let _ = w.set_focus();
                                }
                            }
                        }
                        "taskbar" => {
                            let _ = app.emit("toggle-taskbar-mode-tray", ());
                        }
                        "play" => {
                            let _ = app.emit("tray-playback-control", "play-pause");
                            media::get_platform_backend().trigger_control("play-pause", 0);
                        }
                        "next" => {
                            let _ = app.emit("tray-playback-control", "next");
                            media::get_platform_backend().trigger_control("next", 0);
                        }
                        "prev" => {
                            let _ = app.emit("tray-playback-control", "previous");
                            media::get_platform_backend().trigger_control("previous", 0);
                        }
                        "settings" => {
                            if let Some(w) = app.get_webview_window("main") {
                                let _ = w.unminimize();
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                            let _ = app.emit("tray-show-settings", ());
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let is_minimized = w.is_minimized().unwrap_or(false);
                            let is_visible = w.is_visible().unwrap_or(false);
                            if is_minimized {
                                let _ = w.unminimize();
                                let _ = w.show();
                                let _ = w.set_focus();
                            } else if is_visible {
                                let _ = w.hide();
                            } else {
                                let _ = w.show();
                                let _ = w.unminimize();
                                let _ = w.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            // Windows: Enable WS_MINIMIZEBOX & WS_SYSMENU so borderless window minimizes and restores cleanly via taskbar
            #[cfg(target_os = "windows")]
            {
                if let Some(main_win) = app.get_webview_window("main") {
                    if let Ok(hwnd) = main_win.hwnd() {
                        use windows::Win32::UI::WindowsAndMessaging::{GetWindowLongW, SetWindowLongW, GWL_STYLE, WS_MINIMIZEBOX, WS_SYSMENU};
                        unsafe {
                            let style = GetWindowLongW(windows::Win32::Foundation::HWND(hwnd.0 as _), GWL_STYLE);
                            SetWindowLongW(windows::Win32::Foundation::HWND(hwnd.0 as _), GWL_STYLE, style | (WS_MINIMIZEBOX.0 as i32) | (WS_SYSMENU.0 as i32));
                        }
                    }
                }
            }

            // Background Media Polling Loop (Throttled to 1000ms to eliminate CPU spikes)
            let bg_handle = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                let mut last_track_id = String::new();
                let mut last_is_playing = false;
                let mut last_rate = 1.0;

                loop {
                    tokio::time::sleep(Duration::from_millis(1000)).await;

                    let backend = media::get_platform_backend();
                    if let Some(track) = backend.poll_playback() {
                        let current_id = format!("{}_{}", track.artist, track.title);

                        // Song changed
                        if current_id != last_track_id && !track.title.is_empty() {
                            last_track_id = current_id;
                            if let Some(playback_state) = track.to_spotify_playback_state() {
                                let _ = bg_handle.emit("local-playback-change", playback_state);
                            }
                        }

                        // Play/pause or playback speed changed (for 1.5x / 2x speed catchup)
                        let rate_changed = (track.playback_rate - last_rate).abs() > 0.05;
                        if track.is_playing != last_is_playing || rate_changed {
                            last_is_playing = track.is_playing;
                            last_rate = track.playback_rate;

                            let _ = bg_handle.emit(
                                "smtc-playback-status",
                                models::SmtcPlaybackStatus {
                                    is_playing: track.is_playing,
                                    position: track.position_ms,
                                    playback_rate: track.playback_rate,
                                },
                            );
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            config::load_config,
            config::save_config,
            config::reset_config,
            config::get_desktop_wallpaper,
            config::get_auto_launch,
            config::set_auto_launch,
            config::get_taskbar_color,
            config::select_background_file,
            window::set_click_through,
            window::set_always_on_top,
            window::minimize_app,
            window::copy_to_clipboard,
            window::close_app,
            window::check_for_updates,
            window::set_taskbar_mode,
            window::move_taskbar_window,
            window::set_edge_glow,
            window::set_wallpaper_mode,
            window::get_available_monitors,
            window::set_fullscreen_lyrics,
            lyrics::fetch_spotify_lyrics,
            lyrics::fetch_netease_lyrics,
            lyrics::get_genius_fact,
            lyrics::get_genius_annotations,
            lyrics::fetch_genius_fact,
            lyrics::fetch_genius_lyrics,
            integrations::get_local_playback,
            integrations::trigger_playback_control,
            integrations::show_now_playing_notification,
            integrations::init_discord_rpc,
            integrations::update_discord_rpc,
            integrations::lastfm_api,
            integrations::translate_text,
            integrations::fetch_music_news,
            integrations::get_access_token,
            integrations::refresh_token,
            integrations::start_oauth_server,
            integrations::login_via_web
        ])
        .run(tauri::generate_context!())
        .expect("error while running LyricFlow application");
}


