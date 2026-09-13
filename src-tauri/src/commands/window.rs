use tauri::{AppHandle, Manager, WebviewWindow};

#[tauri::command]
pub fn set_click_through(window: WebviewWindow, ignore: bool) -> Result<(), String> {
    window.set_ignore_cursor_events(ignore).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_always_on_top(window: WebviewWindow, always_on_top: bool) -> Result<(), String> {
    window.set_always_on_top(always_on_top).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn minimize_app(window: WebviewWindow) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn copy_to_clipboard(text: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let mut child = Command::new("powershell")
            .args(["-NoProfile", "-Command", "$input | Set-Clipboard"])
            .stdin(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| e.to_string())?;
        if let Some(mut stdin) = child.stdin.take() {
            use std::io::Write;
            let _ = stdin.write_all(text.as_bytes());
        }
        let _ = child.wait();
        return Ok(());
    }
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let mut child = Command::new("pbcopy")
            .stdin(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| e.to_string())?;
        if let Some(mut stdin) = child.stdin.take() {
            use std::io::Write;
            let _ = stdin.write_all(text.as_bytes());
        }
        let _ = child.wait();
        return Ok(());
    }
    #[allow(unreachable_code)]
    Ok(())
}

#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_updater::UpdaterExt;
    if let Ok(updater) = app.updater() {
        if let Ok(Some(update)) = updater.check().await {
            return Ok(Some(update.version));
        }
    }
    Ok(None)
}

#[tauri::command]
pub fn close_app(app: AppHandle) -> Result<(), String> {

    if let Some(w) = app.get_webview_window("main") {
        let _ = w.hide();
    }
    Ok(())
}

#[tauri::command]
pub fn set_taskbar_mode(app: AppHandle, enabled: bool, _from_tray: Option<bool>) -> Result<(), String> {
    use tauri::Emitter;
    if enabled {
        if let Some(main_win) = app.get_webview_window("main") {
            let _ = main_win.hide();
        }
        if let Some(tb_win) = app.get_webview_window("taskbar") {
            #[cfg(target_os = "windows")]
            {
                if let Ok(Some(monitor)) = tb_win.primary_monitor() {
                    let size = monitor.size();
                    let scale = monitor.scale_factor();
                    let h = (44.0 * scale) as u32;
                    let _ = tb_win.set_size(tauri::PhysicalSize::new(size.width, h));
                    let _ = tb_win.set_position(tauri::PhysicalPosition::new(0, size.height as i32 - h as i32));
                }
            }
            #[cfg(target_os = "macos")]
            {
                if let Ok(Some(monitor)) = tb_win.primary_monitor() {
                    let size = monitor.size();
                    let scale = monitor.scale_factor();
                    let h = (38.0 * scale) as u32;
                    // On macOS: Dock directly beneath the Menu Bar (y = 30px) or above the dock
                    let _ = tb_win.set_size(tauri::PhysicalSize::new(size.width, h));
                    let _ = tb_win.set_position(tauri::PhysicalPosition::new(0, (28.0 * scale) as i32));
                }
            }
            let _ = tb_win.show();
            let _ = tb_win.set_always_on_top(true);
            let _ = app.emit("taskbar-mode-ready", ());
        }
    } else {
        if let Some(tb_win) = app.get_webview_window("taskbar") {
            let _ = tb_win.hide();
        }
        if let Some(main_win) = app.get_webview_window("main") {
            let _ = main_win.show();
            let _ = main_win.set_focus();
        }
    }
    Ok(())
}

#[tauri::command]
pub fn set_edge_glow(app: AppHandle, enabled: bool, color: Option<String>) -> Result<(), String> {
    use tauri::Emitter;
    if let Some(eg_win) = app.get_webview_window("edge-glow") {
        if enabled {
            let _ = eg_win.show();
            let _ = eg_win.set_ignore_cursor_events(true);
            if let Some(c) = color {
                let _ = eg_win.emit("update-edge-glow-color", c);
            }
        } else {
            let _ = eg_win.hide();
        }
    }
    Ok(())
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct MonitorInfo {
    pub id: usize,
    pub name: String,
    pub is_primary: bool,
    pub width: u32,
    pub height: u32,
    pub scale_factor: f64,
    pub x: i32,
    pub y: i32,
}

#[tauri::command]
pub fn get_available_monitors(app: AppHandle) -> Result<Vec<MonitorInfo>, String> {
    let main_win = app.get_webview_window("main");
    let primary = main_win.as_ref().and_then(|w| w.primary_monitor().ok().flatten());
    let monitors = if let Some(w) = main_win.as_ref() {
        w.available_monitors().map_err(|e| e.to_string())?
    } else {
        vec![]
    };

    let mut result = Vec::new();
    for (idx, mon) in monitors.into_iter().enumerate() {
        let is_primary = if let Some(ref p) = primary {
            p.name() == mon.name() && p.position() == mon.position()
        } else {
            idx == 0
        };
        let size = mon.size();
        let pos = mon.position();
        let name = mon.name().cloned().unwrap_or_else(|| {
            if is_primary {
                format!("Display {} (Primary)", idx + 1)
            } else {
                format!("Display {} (External)", idx + 1)
            }
        });
        result.push(MonitorInfo {
            id: idx,
            name,
            is_primary,
            width: size.width,
            height: size.height,
            scale_factor: mon.scale_factor(),
            x: pos.x,
            y: pos.y,
        });
    }
    Ok(result)
}

#[tauri::command]
pub fn set_wallpaper_mode(app: AppHandle, enabled: bool, monitor_target: Option<String>) -> Result<(), String> {
    use tauri::Emitter;
    if let Some(main_win) = app.get_webview_window("main") {
        if enabled {
            let _ = main_win.set_always_on_top(false);

            let monitors = main_win.available_monitors().unwrap_or_default();
            let target = monitor_target.unwrap_or_else(|| "0".to_string());

            if (target == "all" || target == "all_screens") && !monitors.is_empty() {
                // Span window across all available monitors
                let mut min_x = i32::MAX;
                let mut min_y = i32::MAX;
                let mut max_x = i32::MIN;
                let mut max_y = i32::MIN;

                for m in &monitors {
                    let pos = m.position();
                    let size = m.size();
                    min_x = min_x.min(pos.x);
                    min_y = min_y.min(pos.y);
                    max_x = max_x.max(pos.x + size.width as i32);
                    max_y = max_y.max(pos.y + size.height as i32);
                }

                let _ = main_win.unmaximize();
                let _ = main_win.set_position(tauri::PhysicalPosition::new(min_x, min_y));
                let _ = main_win.set_size(tauri::PhysicalSize::new((max_x - min_x) as u32, (max_y - min_y) as u32));
            } else if let Ok(idx) = target.parse::<usize>() {
                if let Some(m) = monitors.get(idx) {
                    let pos = m.position();
                    let size = m.size();
                    let _ = main_win.unmaximize();
                    let _ = main_win.set_position(pos.clone());
                    let _ = main_win.set_size(size.clone());
                } else {
                    let _ = main_win.maximize();
                }
            } else {
                let _ = main_win.maximize();
            }
        } else {
            let _ = main_win.unmaximize();
            let _ = main_win.set_always_on_top(false);
        }
    }
    let _ = app.emit("set-wallpaper-mode-state", enabled);
    Ok(())
}

#[tauri::command]
pub fn set_fullscreen_lyrics(_app: AppHandle, _enabled: bool) -> Result<(), String> {
    Ok(())
}


