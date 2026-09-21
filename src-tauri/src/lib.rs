pub mod models;
pub mod media;
pub mod commands;

use commands::*;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use std::time::Duration;
use std::fs::OpenOptions;
use std::io::Write;

pub fn log_to_file(msg: &str) {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    if let Some(config_dir) = dirs::config_dir() {
        let app_dir = config_dir.join("LyricFlow");
        let _ = std::fs::create_dir_all(&app_dir);
        let log_file = app_dir.join("lyricflow.log");
        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_file)
        {
            if let Ok(meta) = file.metadata() {
                if meta.len() > 5 * 1024 * 1024 {
                    let _ = file.set_len(0);
                }
            }
            let _ = writeln!(file, "[{}] {}", now, msg);
            let _ = file.flush();
        }
    }
    println!("{}", msg);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
use tauri_plugin_global_shortcut::GlobalShortcutExt;

pub fn run() {
    log_to_file("[LyricFlow] run() started");
    log_to_file("[LyricFlow] Initializing tauri::Builder::default()...");
    let b = tauri::Builder::default();
    log_to_file("[LyricFlow] Adding single_instance plugin...");
    let b = b.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        log_to_file("[LyricFlow] Second instance launched! Bringing existing main window to front...");
        if let Some(w) = app.get_webview_window("main") {
            let _ = w.unminimize();
            let _ = w.show();
            let _ = w.set_focus();
        }
    }));
    log_to_file("[LyricFlow] Adding notification plugin...");
    let b = b.plugin(tauri_plugin_notification::init());
    log_to_file("[LyricFlow] Adding updater plugin...");
    let b = b.plugin(tauri_plugin_updater::Builder::new().build());
    log_to_file("[LyricFlow] Adding global_shortcut plugin...");
    let b = b.plugin(
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
        .on_window_event(|window, event| {
            log_to_file(&format!("[LyricFlow Window Event] {:?} on '{}'", event, window.label()));
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Prevent destroying the window — hide it instead so the tray stays alive.
                // Actual exit only happens via the tray "Quit" menu item calling app.exit(0).
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                    log_to_file("[LyricFlow] CloseRequested intercepted on 'main' — hiding instead of closing");
                }
            }
            if let tauri::WindowEvent::Destroyed = event {
                log_to_file(&format!("[LyricFlow] Window '{}' DESTROYED", window.label()));
            }
        })

        .setup(|app| {
            log_to_file("[LyricFlow] setup() entered");
            let app_handle = app.handle().clone();

            log_to_file("[LyricFlow] Registering shortcuts...");
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
            log_to_file("[LyricFlow] Shortcuts registered successfully");

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

            log_to_file("[LyricFlow] Building system tray...");
            // Build System Tray (Matches Electron menu-builder.js layout exactly)
            let title_item = MenuItem::with_id(app, "title", "LyricFlow", false, None::<&str>)?;
            let sep1 = PredefinedMenuItem::separator(app)?;
            let show_item = MenuItem::with_id(app, "show_main", "Open App", true, None::<&str>)?;
            let taskbar_item = MenuItem::with_id(app, "taskbar", "Toggle Taskbar Mode", true, None::<&str>)?;
            let sep2 = PredefinedMenuItem::separator(app)?;
            let play_item = MenuItem::with_id(app, "play", "Play / Pause", true, None::<&str>)?;
            let next_item = MenuItem::with_id(app, "next", "Next Song", true, None::<&str>)?;
            let prev_item = MenuItem::with_id(app, "prev", "Previous Song", true, None::<&str>)?;
            let sep3 = PredefinedMenuItem::separator(app)?;
            let settings_item = MenuItem::with_id(app, "settings", "Show Settings", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

            let menu = Menu::with_items(
                app,
                &[
                    &title_item,
                    &sep1,
                    &show_item,
                    &taskbar_item,
                    &sep2,
                    &play_item,
                    &next_item,
                    &prev_item,
                    &sep3,
                    &settings_item,
                    &quit_item,
                ],
            )?;

            let icon_bytes = include_bytes!("../icons/icon.png");
            let icon = tauri::image::Image::from_bytes(icon_bytes).ok();

            let mut tray_builder = TrayIconBuilder::with_id("main_tray")
                .tooltip("LyricFlow")
                .menu(&menu);

            if let Some(ref i) = icon {
                tray_builder = tray_builder.icon(i.clone());
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.set_icon(i.clone());
                }
            } else if let Some(i) = app.default_window_icon().cloned() {
                tray_builder = tray_builder.icon(i.clone());
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.set_icon(i);
                }
            }
            log_to_file("[LyricFlow] Calling tray_builder.build(app)...");

            let _tray = tray_builder
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
            log_to_file("[LyricFlow] Tray icon created successfully");

            let is_startup = std::env::args().any(|a| a == "--startup" || a == "--taskbar" || a == "--minimized" || a == "-m");
            commands::window::set_is_startup(is_startup);

            let should_start_in_taskbar = is_startup || {
                if let Ok(Some(cfg)) = commands::config::load_config() {
                    let in_root = cfg["taskbar_mode"].as_bool() == Some(true) || cfg["taskbarMode"].as_bool() == Some(true);
                    let in_settings = cfg["settings"]["taskbarMode"].as_bool() == Some(true) || cfg["settings"]["taskbar_mode"].as_bool() == Some(true);
                    in_root || in_settings
                } else {
                    false
                }
            };

            #[cfg(target_os = "windows")]
            {
                if let Some(main_win) = app.get_webview_window("main") {
                    if !should_start_in_taskbar {
                        log_to_file("[LyricFlow] Normal launch. Centering and showing main_win...");
                        let _ = main_win.center();
                        let _ = main_win.show();
                        let _ = main_win.unminimize();
                        let _ = main_win.set_focus();
                    } else {
                        log_to_file(&format!("[LyricFlow] Silent startup in Taskbar Mode (is_startup={}). Parking main_win off-screen...", is_startup));
                        let _ = main_win.set_skip_taskbar(true);
                        let _ = main_win.set_position(tauri::PhysicalPosition::new(-32000, -32000));
                        let handle_clone = app.handle().clone();
                        tauri::async_runtime::spawn(async move {
                            let _ = commands::window::set_taskbar_mode(handle_clone, true, Some(false)).await;
                        });
                    }

                    if let Ok(pos) = main_win.outer_position() {
                        log_to_file(&format!("[LyricFlow] main_win position: {:?}", pos));
                    }
                    if let Ok(size) = main_win.outer_size() {
                        log_to_file(&format!("[LyricFlow] main_win size: {:?}", size));
                    }
                    if let Ok(is_vis) = main_win.is_visible() {
                        log_to_file(&format!("[LyricFlow] main_win is_visible: {}", is_vis));
                    }
                } else {
                    log_to_file("[LyricFlow HWND Error] 'main' window not found!");
                }

            }
            log_to_file("[LyricFlow] setup() completed successfully");

            // Dedicated Background Media Polling Thread (runs on OS thread with COM MTA apartment, zero Tokio contention)
            let bg_handle = app_handle.clone();
            std::thread::Builder::new()
                .name("smtc-polling-worker".to_string())
                .spawn(move || {
                    #[cfg(target_os = "windows")]
                    unsafe {
                        let _ = windows::Win32::System::Com::CoInitializeEx(None, windows::Win32::System::Com::COINIT_MULTITHREADED);
                    }

                    let backend = media::get_platform_backend();
                    let mut last_track_id = String::new();
                    let mut last_is_playing = false;
                    let mut last_rate = 1.0;

                    loop {
                        std::thread::sleep(Duration::from_millis(250));

                        if let Some(track) = backend.poll_playback() {
                            let current_id = format!("{}_{}", track.artist, track.title);
                            let is_song_changed = current_id != last_track_id && !track.title.is_empty();
                            let status_changed = track.is_playing != last_is_playing || (track.playback_rate - last_rate).abs() > 0.05;

                            if let Some(playback_state) = track.to_spotify_playback_state() {
                                // Keep in-memory cache fresh for instant get_local_playback IPC
                                media::set_cached_playback_state(playback_state.clone());

                                if is_song_changed {
                                    last_track_id = current_id;
                                    let _ = bg_handle.emit("local-playback-change", &playback_state);
                                }
                            }

                            if status_changed {
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
                })
                .expect("Failed to spawn SMTC background thread");

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
            config::select_animated_art_file,
            config::read_file_data_url,
            window::set_click_through,
            window::set_always_on_top,
            window::minimize_app,
            window::copy_to_clipboard,
            window::close_app,
            window::get_is_startup,
            window::check_for_updates,
            window::set_taskbar_mode,
            window::move_taskbar_window,
            window::update_taskbar_lyric_bounds,
            window::set_taskbar_dragging,
            window::set_edge_glow,
            window::set_wallpaper_mode,
            window::start_wallpaper_edit,
            window::end_wallpaper_edit,
            window::get_available_monitors,
            window::set_fullscreen_lyrics,
            window::update_taskbar_lyric,
            window::sync_taskbar_config,
            window::log_debug,
            lyrics::search_synced_lyrics,
            lyrics::get_lyrics_candidates,
            lyrics::fetch_spotify_lyrics,
            lyrics::fetch_netease_lyrics,
            lyrics::get_genius_fact,
            lyrics::get_genius_annotations,
            lyrics::fetch_genius_fact,
            lyrics::fetch_genius_lyrics,
            integrations::get_local_playback,
            integrations::trigger_playback_control,
            integrations::show_now_playing_notification,
            integrations::lastfm_api,
            integrations::translate_text,
            integrations::fetch_music_news,
            integrations::get_access_token,
            integrations::refresh_token,
            integrations::start_oauth_server,
            integrations::login_via_web,
            integrations::fetch_image_data_url,
            integrations::fetch_track_artwork,
            window::show_main_window,
            integrations::open_external,
            integrations::fetch_spotify_canvas,
            integrations::search_music_gif
        ]);
    log_to_file("[LyricFlow] Builder configured, now calling builder.run(tauri::generate_context!())...");
    b.run(tauri::generate_context!())
        .expect("error while running LyricFlow application");
}


