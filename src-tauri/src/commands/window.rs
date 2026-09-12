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

#[tauri::command]
pub fn set_wallpaper_mode(app: AppHandle, enabled: bool) -> Result<(), String> {
    use tauri::Emitter;
    if let Some(main_win) = app.get_webview_window("main") {
        if enabled {
            // Position as background or maximize without borders
            let _ = main_win.set_always_on_top(false);
            let _ = main_win.maximize();
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

