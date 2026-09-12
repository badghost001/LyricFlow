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
pub fn close_app(app: AppHandle) -> Result<(), String> {
    app.exit(0);
    Ok(())
}

#[tauri::command]
pub fn set_taskbar_mode(app: AppHandle, enabled: bool, _from_tray: Option<bool>) -> Result<(), String> {
    if enabled {
        if let Some(main_win) = app.get_webview_window("main") {
            let _ = main_win.hide();
        }
        if let Some(tb_win) = app.get_webview_window("taskbar") {
            let _ = tb_win.show();
            let _ = tb_win.set_always_on_top(true);
        }
    } else {
        if let Some(tb_win) = app.get_webview_window("taskbar") {
            let _ = tb_win.hide();
        }
        if let Some(main_win) = app.get_webview_window("main") {
            let _ = main_win.show();
        }
    }
    Ok(())
}

#[tauri::command]
pub fn set_edge_glow(app: AppHandle, enabled: bool, _color: Option<String>) -> Result<(), String> {
    if let Some(eg_win) = app.get_webview_window("edge-glow") {
        if enabled {
            let _ = eg_win.show();
            let _ = eg_win.set_ignore_cursor_events(true);
        } else {
            let _ = eg_win.hide();
        }
    }
    Ok(())
}

#[tauri::command]
pub fn set_wallpaper_mode(app: AppHandle, enabled: bool) -> Result<(), String> {
    if let Some(main_win) = app.get_webview_window("main") {
        if enabled {
            // Position as background or maximize without borders
            let _ = main_win.set_always_on_top(false);
            let _ = main_win.maximize();
        } else {
            let _ = main_win.unmaximize();
            let _ = main_win.set_always_on_top(true);
        }
    }
    Ok(())
}
