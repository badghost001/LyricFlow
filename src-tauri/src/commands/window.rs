use tauri::{AppHandle, Manager, WebviewWindow};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};

#[derive(serde::Serialize, serde::Deserialize, Clone, Copy, Debug)]
pub struct LyricBounds {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

static TASKBAR_MODE_ACTIVE: AtomicBool = AtomicBool::new(false);
static TASKBAR_DRAGGING: AtomicBool = AtomicBool::new(false);
static TASKBAR_IS_CLICKTHROUGH: AtomicBool = AtomicBool::new(true);

fn get_lyric_bounds() -> &'static Mutex<Option<LyricBounds>> {
    static CELL: OnceLock<Mutex<Option<LyricBounds>>> = OnceLock::new();
    CELL.get_or_init(|| Mutex::new(None))
}

fn get_win_pos() -> &'static Mutex<(i32, i32)> {
    static CELL: OnceLock<Mutex<(i32, i32)>> = OnceLock::new();
    CELL.get_or_init(|| Mutex::new((0, 0)))
}

fn get_saved_main_pos() -> &'static Mutex<Option<(i32, i32)>> {
    static CELL: OnceLock<Mutex<Option<(i32, i32)>>> = OnceLock::new();
    CELL.get_or_init(|| Mutex::new(None))
}

fn get_saved_main_size() -> &'static Mutex<Option<(u32, u32)>> {
    static CELL: OnceLock<Mutex<Option<(u32, u32)>>> = OnceLock::new();
    CELL.get_or_init(|| Mutex::new(None))
}

#[tauri::command]
pub fn update_taskbar_lyric_bounds(rect: LyricBounds) -> Result<(), String> {
    if let Ok(mut lock) = get_lyric_bounds().lock() {
        *lock = Some(rect);
    }
    Ok(())
}

#[tauri::command]
pub fn set_taskbar_dragging(dragging: bool) -> Result<(), String> {
    TASKBAR_DRAGGING.store(dragging, Ordering::SeqCst);
    if dragging {
        TASKBAR_IS_CLICKTHROUGH.store(false, Ordering::SeqCst);
    }
    Ok(())
}

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
pub async fn copy_to_clipboard(text: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        #[cfg(target_os = "windows")]
        {
            use std::process::Command;
            use std::os::windows::process::CommandExt;
            let mut child = Command::new("powershell")
                .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", "$input | Set-Clipboard"])
                .creation_flags(0x08000000)
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
    }).await.map_err(|e| e.to_string())?
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
    println!("[LyricFlow Command] close_app called!");
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.hide();
    }
    Ok(())
}

#[tauri::command]
pub fn show_main_window(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
    Ok(())
}

static IS_STARTUP_LAUNCH: AtomicBool = AtomicBool::new(false);

pub fn set_is_startup(val: bool) {
    IS_STARTUP_LAUNCH.store(val, Ordering::SeqCst);
}

pub fn is_startup() -> bool {
    IS_STARTUP_LAUNCH.load(Ordering::SeqCst)
}

#[tauri::command]
pub fn get_is_startup() -> bool {
    is_startup()
}

pub fn is_taskbar_mode_active() -> bool {
    TASKBAR_MODE_ACTIVE.load(Ordering::SeqCst)
}

#[tauri::command]
pub async fn set_taskbar_mode(app: AppHandle, enabled: bool, _from_tray: Option<bool>) -> Result<(), String> {
    crate::log_to_file(&format!("[LyricFlow Command] set_taskbar_mode(enabled={}) called!", enabled));
    use tauri::Emitter;
    if enabled {
        if TASKBAR_MODE_ACTIVE.load(Ordering::SeqCst) {
            crate::log_to_file("[LyricFlow Command] Taskbar mode is already active, ignoring duplicate enable request");
            return Ok(());
        }
        let tb_win = match app.get_webview_window("taskbar") {
            Some(w) => {
                crate::log_to_file("[LyricFlow Command] Found taskbar window");
                w
            }
            None => {
                crate::log_to_file("[LyricFlow Command] Building taskbar window dynamically...");
                match tauri::WebviewWindowBuilder::new(
                    &app,
                    "taskbar",
                    tauri::WebviewUrl::App("taskbar.html".into()),
                )
                .title("LyricFlow Taskbar")
                .inner_size(1920.0, 48.0)
                .decorations(false)
                .transparent(true)
                .always_on_top(true)
                .shadow(false)
                .skip_taskbar(true)
                .resizable(false)
                .build()
                {
                    Ok(w) => w,
                    Err(e) => {
                        let msg = format!("[LyricFlow Command] ERROR: Failed to create 'taskbar' window: {}", e);
                        crate::log_to_file(&msg);
                        return Err(msg);
                    }
                }
            }
        };

        let (mut win_x, mut win_y);

        #[cfg(target_os = "windows")]
        {
            use windows::Win32::UI::WindowsAndMessaging::{
                GetSystemMetrics, SystemParametersInfoW, SetWindowPos,
                HWND_TOPMOST, SM_CXSCREEN, SM_CYSCREEN, SPI_GETWORKAREA,
                SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS, SWP_SHOWWINDOW, SWP_NOACTIVATE,
                GetWindowLongPtrW, SetWindowLongPtrW, GWL_EXSTYLE, WS_EX_TOOLWINDOW, WS_EX_TOPMOST, WS_EX_NOACTIVATE,
            };
            use windows::Win32::Foundation::RECT;

            let screen_w = unsafe { GetSystemMetrics(SM_CXSCREEN) };
            let screen_h = unsafe { GetSystemMetrics(SM_CYSCREEN) };
            let mut work_area = RECT::default();
            let _ = unsafe {
                SystemParametersInfoW(
                    SPI_GETWORKAREA,
                    0,
                    Some(&mut work_area as *mut _ as *mut _),
                    SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS(0),
                )
            };

            win_x = 0;
            win_y = work_area.bottom;
            let mut win_w = screen_w;
            let mut win_h = screen_h - work_area.bottom;
            let mut position = "bottom";

            if work_area.top > 0 {
                // Taskbar on top
                win_x = 0;
                win_y = 0;
                win_w = screen_w;
                win_h = work_area.top;
                position = "top";
            } else if work_area.left > 0 {
                // Taskbar on left
                win_x = 0;
                win_y = 0;
                win_w = work_area.left;
                win_h = screen_h;
                position = "left";
            } else if work_area.right < screen_w {
                // Taskbar on right
                win_x = work_area.right;
                win_y = 0;
                win_w = screen_w - work_area.right;
                win_h = screen_h;
                position = "right";
            }

            if win_h <= 0 || win_w <= 0 {
                win_h = 48;
                win_w = screen_w;
                win_y = screen_h - 48;
                win_x = 0;
                position = "bottom";
            }

            crate::log_to_file(&format!(
                "[LyricFlow Command] Taskbar strip bounds (Win32): pos={}, rect=({},{} - {}x{}), work_area=({},{},{},{})",
                position, win_x, win_y, win_w, win_h, work_area.left, work_area.top, work_area.right, work_area.bottom
            ));

            let _ = tb_win.set_size(tauri::PhysicalSize::new(win_w as u32, win_h as u32));
            let _ = tb_win.set_position(tauri::PhysicalPosition::new(win_x, win_y));
            let _ = tb_win.set_ignore_cursor_events(true);
            let _ = tb_win.show();
            let _ = tb_win.set_always_on_top(true);

            if let Ok(hwnd) = tb_win.hwnd() {
                unsafe {
                    let hwnd_val = windows::Win32::Foundation::HWND(hwnd.0 as _);
                    let cur_ex = GetWindowLongPtrW(hwnd_val, GWL_EXSTYLE);
                    let new_ex = cur_ex | (WS_EX_TOOLWINDOW.0 as isize) | (WS_EX_TOPMOST.0 as isize) | (WS_EX_NOACTIVATE.0 as isize);
                    let _ = SetWindowLongPtrW(hwnd_val, GWL_EXSTYLE, new_ex);

                    let _ = SetWindowPos(
                        hwnd_val,
                        Some(HWND_TOPMOST),
                        win_x,
                        win_y,
                        win_w,
                        win_h,
                        SWP_SHOWWINDOW | SWP_NOACTIVATE,
                    );
                }
            }

            #[derive(serde::Serialize, Clone)]
            struct TaskbarConfigPayload {
                position: &'static str,
            }
            let _ = app.emit("sync-taskbar-config", TaskbarConfigPayload { position });
        }
        #[cfg(not(target_os = "windows"))]
        {
            win_x = 0;
            win_y = 0;
            let _ = tb_win.show();
            let _ = tb_win.set_always_on_top(true);
        }

        TASKBAR_MODE_ACTIVE.store(true, Ordering::SeqCst);
        TASKBAR_DRAGGING.store(false, Ordering::SeqCst);
        TASKBAR_IS_CLICKTHROUGH.store(true, Ordering::SeqCst);
        if let Ok(mut pos_lock) = get_win_pos().lock() {
            *pos_lock = (win_x, win_y);
        }

        // Spawn background cursor hit-testing and Z-order keeper monitor thread
        let app_handle = app.clone();
        std::thread::spawn(move || {
            #[cfg(target_os = "windows")]
            {
                use windows::Win32::UI::WindowsAndMessaging::{
                    GetCursorPos, SetWindowPos, HWND_TOPMOST,
                    SWP_NOMOVE, SWP_NOSIZE, SWP_NOACTIVATE, SWP_SHOWWINDOW,
                };
                use windows::Win32::Foundation::POINT;

                let mut current_clickthrough = true;
                let mut tick_counter: u32 = 0;

                // Cache HWND once so we don't query Tauri window methods every tick
                let tb_hwnd = app_handle
                    .get_webview_window("taskbar")
                    .and_then(|w| w.hwnd().ok())
                    .map(|h| windows::Win32::Foundation::HWND(h.0 as _));

                while TASKBAR_MODE_ACTIVE.load(Ordering::SeqCst) {
                    std::thread::sleep(std::time::Duration::from_millis(30));

                    if !TASKBAR_MODE_ACTIVE.load(Ordering::SeqCst) {
                        break;
                    }

                    tick_counter = tick_counter.wrapping_add(1);

                    // Every 600ms (20 ticks of 30ms), ensure HWND_TOPMOST over Shell_TrayWnd
                    if tick_counter % 20 == 0 {
                        if let Some(hwnd_val) = tb_hwnd {
                            unsafe {
                                let _ = SetWindowPos(
                                    hwnd_val,
                                    Some(HWND_TOPMOST),
                                    0,
                                    0,
                                    0,
                                    0,
                                    SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW,
                                );
                            }
                        }
                    }

                    if TASKBAR_DRAGGING.load(Ordering::SeqCst) {
                        if current_clickthrough {
                            current_clickthrough = false;
                            TASKBAR_IS_CLICKTHROUGH.store(false, Ordering::SeqCst);
                            if let Some(tb) = app_handle.get_webview_window("taskbar") {
                                let _ = tb.set_ignore_cursor_events(false);
                            }
                        }
                        continue;
                    }

                    let mut pt = POINT::default();
                    if unsafe { GetCursorPos(&mut pt) }.is_ok() {
                        let bounds_opt = get_lyric_bounds().lock().ok().and_then(|g| *g);
                        let (wx, wy) = get_win_pos().lock().ok().map(|g| *g).unwrap_or((0, 0));

                        let is_over_lyrics = if let Some(b) = bounds_opt {
                            if b.width > 0 && b.height > 0 {
                                let scale = app_handle
                                    .get_webview_window("taskbar")
                                    .and_then(|w| w.scale_factor().ok())
                                    .unwrap_or(1.0);

                                let pad = (14.0 * scale) as i32;
                                let left = wx + (b.x as f64 * scale) as i32 - pad;
                                let top = wy + (b.y as f64 * scale) as i32 - pad;
                                let right = wx + ((b.x + b.width) as f64 * scale) as i32 + pad;
                                let bottom = wy + ((b.y + b.height) as f64 * scale) as i32 + pad;

                                pt.x >= left && pt.x <= right && pt.y >= top && pt.y <= bottom
                            } else {
                                false
                            }
                        } else {
                            false
                        };

                        let should_clickthrough = !is_over_lyrics;

                        if should_clickthrough != current_clickthrough {
                            current_clickthrough = should_clickthrough;
                            TASKBAR_IS_CLICKTHROUGH.store(should_clickthrough, Ordering::SeqCst);
                            if let Some(tb) = app_handle.get_webview_window("taskbar") {
                                let _ = tb.set_ignore_cursor_events(should_clickthrough);
                            }
                        }
                    }
                }
            }
        });

        let vis = tb_win.is_visible().unwrap_or(false);
        let pos = tb_win.outer_position().ok();
        let sz = tb_win.outer_size().ok();
        crate::log_to_file(&format!("[LyricFlow Command] tb_win final state: is_visible={}, outer_pos={:?}, outer_sz={:?}", vis, pos, sz));

        // Instead of hiding the main window (which causes WebView2 to aggressively throttle
        // and suspend background JS timers / polling), park it off-screen and skip taskbar.
        if let Some(main_win) = app.get_webview_window("main") {
            if let Ok(pos) = main_win.outer_position() {
                if pos.x > -10000 && pos.y > -10000 {
                    if let Ok(mut lock) = get_saved_main_pos().lock() {
                        *lock = Some((pos.x, pos.y));
                    }
                }
            }
            crate::log_to_file("[LyricFlow Command] Parking main window off-screen to keep JS engine alive");
            let _ = main_win.set_skip_taskbar(true);
            let _ = main_win.set_position(tauri::PhysicalPosition::new(-32000, -32000));
        }

        let _ = app.emit("taskbar-mode-ready", ());
    } else {
        crate::log_to_file("[LyricFlow Command] Disabling taskbar mode");
        TASKBAR_MODE_ACTIVE.store(false, Ordering::SeqCst);
        TASKBAR_DRAGGING.store(false, Ordering::SeqCst);
        if let Some(tb_win) = app.get_webview_window("taskbar") {
            let _ = tb_win.hide();
            let _ = tb_win.set_ignore_cursor_events(false);
        }
        if let Some(main_win) = app.get_webview_window("main") {
            let _ = main_win.set_skip_taskbar(false);
            let saved_pos = get_saved_main_pos().lock().ok().and_then(|g| *g);
            if let Some((sx, sy)) = saved_pos {
                let _ = main_win.set_position(tauri::PhysicalPosition::new(sx, sy));
            } else {
                let _ = main_win.center();
            }
            let _ = main_win.show();
            let _ = main_win.unminimize();
            let _ = main_win.set_focus();
        }
        let _ = app.emit("force-normal-mode", ());
    }
    Ok(())
}

#[tauri::command]
pub fn move_taskbar_window(app: AppHandle, delta_x: i32) -> Result<(), String> {
    if let Some(tb_win) = app.get_webview_window("taskbar") {
        if let Ok(pos) = tb_win.outer_position() {
            let _ = tb_win.set_position(tauri::PhysicalPosition::new(pos.x + delta_x, pos.y));
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn set_edge_glow(app: AppHandle, enabled: bool, color: Option<String>) -> Result<(), String> {
    use tauri::Emitter;
    if enabled {
        let eg_win = match app.get_webview_window("edge-glow") {
            Some(w) => w,
            None => {
                crate::log_to_file("[LyricFlow Command] Building edge-glow window dynamically...");
                tauri::WebviewWindowBuilder::new(
                    &app,
                    "edge-glow",
                    tauri::WebviewUrl::App("edge_glow.html".into()),
                )
                .title("LyricFlow Edge Glow")
                .inner_size(800.0, 600.0)
                .center()
                .decorations(false)
                .transparent(true)
                .always_on_top(true)
                .shadow(false)
                .skip_taskbar(true)
                .build()
                .map_err(|e| format!("[LyricFlow Command] Failed to create 'edge-glow' window: {}", e))?
            }
        };
        let _ = eg_win.show();
        let _ = eg_win.set_always_on_top(true);
        let _ = eg_win.set_ignore_cursor_events(true);
        if let Some(c) = color {
            let _ = eg_win.emit("update-edge-glow-color", c);
        }
    } else if let Some(eg_win) = app.get_webview_window("edge-glow") {
        let _ = eg_win.hide();
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

#[cfg(target_os = "windows")]
mod workerw {
    use windows::core::{w, BOOL};
    use windows::Win32::Foundation::{HWND, LPARAM, WPARAM};
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, FindWindowExW, FindWindowW, GetWindowLongPtrW,
        SendMessageTimeoutW, SetParent, SetWindowLongPtrW, SetWindowPos, ShowWindow,
        GWL_EXSTYLE, GWL_STYLE, SMTO_NORMAL, SWP_FRAMECHANGED, SWP_NOMOVE, SWP_NOSIZE,
        SWP_NOZORDER, SWP_SHOWWINDOW, SW_SHOW, WS_CHILD, WS_EX_APPWINDOW, WS_EX_TOOLWINDOW,
        WS_POPUP, WS_VISIBLE,
    };

    struct WorkerWState {
        shell_view: HWND,
        worker_w: HWND,
    }

    unsafe extern "system" fn enum_windows_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let state = &mut *(lparam.0 as *mut WorkerWState);
        if let Ok(shell_view) = FindWindowExW(Some(hwnd), None, w!("SHELLDLL_DefView"), None) {
            if !shell_view.is_invalid() {
                state.shell_view = shell_view;
                if let Ok(worker_w) = FindWindowExW(None, Some(hwnd), w!("WorkerW"), None) {
                    if !worker_w.is_invalid() {
                        state.worker_w = worker_w;
                    }
                }
            }
        }
        BOOL(1)
    }

    pub fn attach_to_workerw(hwnd: HWND) -> bool {
        unsafe {
            let progman = match FindWindowW(w!("Progman"), None) {
                Ok(h) if !h.is_invalid() => h,
                _ => {
                    crate::log_to_file("[Wallpaper] Progman window not found");
                    return false;
                }
            };

            let mut dummy = 0;
            let _ = SendMessageTimeoutW(
                progman,
                0x052C,
                WPARAM(0),
                LPARAM(0),
                SMTO_NORMAL,
                1000,
                Some(&mut dummy),
            );

            let mut state = WorkerWState {
                shell_view: HWND::default(),
                worker_w: HWND::default(),
            };

            let _ = EnumWindows(
                Some(enum_windows_callback),
                LPARAM(&mut state as *mut _ as isize),
            );

            if state.worker_w.is_invalid() {
                if let Ok(w) = FindWindowExW(Some(progman), None, w!("WorkerW"), None) {
                    if !w.is_invalid() {
                        state.worker_w = w;
                    }
                }
            }

            let target = if !state.worker_w.is_invalid() {
                state.worker_w
            } else {
                progman
            };

            let cur_style = GetWindowLongPtrW(hwnd, GWL_STYLE);
            let new_style = (cur_style & !(WS_POPUP.0 as isize)) | (WS_CHILD.0 as isize) | (WS_VISIBLE.0 as isize);
            let _ = SetWindowLongPtrW(hwnd, GWL_STYLE, new_style);

            let cur_ex = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
            let new_ex = (cur_ex & !(WS_EX_APPWINDOW.0 as isize)) | (WS_EX_TOOLWINDOW.0 as isize);
            let _ = SetWindowLongPtrW(hwnd, GWL_EXSTYLE, new_ex);

            let _ = SetParent(hwnd, Some(target));

            if !state.shell_view.is_invalid() {
                let _ = SetWindowPos(
                    hwnd,
                    Some(state.shell_view),
                    0,
                    0,
                    0,
                    0,
                    SWP_NOMOVE | SWP_NOSIZE | SWP_FRAMECHANGED | SWP_SHOWWINDOW,
                );
            } else {
                let _ = SetWindowPos(
                    hwnd,
                    Some(HWND(1 as _)),
                    0,
                    0,
                    0,
                    0,
                    SWP_NOMOVE | SWP_NOSIZE | SWP_FRAMECHANGED | SWP_SHOWWINDOW,
                );
            }

            let _ = ShowWindow(hwnd, SW_SHOW);
            crate::log_to_file(&format!("[Wallpaper] Successfully attached hwnd={:?} to WorkerW target={:?}", hwnd, target));
            true
        }
    }

    pub fn detach_from_workerw(hwnd: HWND) -> bool {
        unsafe {
            let _ = SetParent(hwnd, None);

            let cur_style = GetWindowLongPtrW(hwnd, GWL_STYLE);
            let new_style = (cur_style & !(WS_CHILD.0 as isize)) | (WS_POPUP.0 as isize) | (WS_VISIBLE.0 as isize);
            let _ = SetWindowLongPtrW(hwnd, GWL_STYLE, new_style);

            let cur_ex = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
            let new_ex = (cur_ex & !(WS_EX_TOOLWINDOW.0 as isize)) | (WS_EX_APPWINDOW.0 as isize);
            let _ = SetWindowLongPtrW(hwnd, GWL_EXSTYLE, new_ex);

            let _ = ShowWindow(hwnd, SW_SHOW);
            let _ = SetWindowPos(
                hwnd,
                None,
                0,
                0,
                0,
                0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED | SWP_SHOWWINDOW,
            );
            crate::log_to_file(&format!("[Wallpaper] Detached hwnd={:?} from WorkerW", hwnd));
            true
        }
    }
}

#[tauri::command]
pub async fn set_wallpaper_mode(app: AppHandle, enabled: bool, monitor_target: Option<String>) -> Result<(), String> {
    use tauri::Emitter;
    crate::log_to_file(&format!("[Wallpaper Command] set_wallpaper_mode(enabled={}) called", enabled));

    if let Some(main_win) = app.get_webview_window("main") {
        #[cfg(target_os = "windows")]
        {
            let hwnd_raw = main_win.hwnd().map_err(|e| e.to_string())?;
            let hwnd = windows::Win32::Foundation::HWND(hwnd_raw.0 as _);

            if enabled {
                // 1. Save current bounds if in normal mode
                if let Ok(pos) = main_win.outer_position() {
                    if let Ok(size) = main_win.outer_size() {
                        if pos.x > -10000 && pos.y > -10000 {
                            if let Ok(mut lock) = get_saved_main_pos().lock() {
                                *lock = Some((pos.x, pos.y));
                            }
                            if let Ok(mut lock) = get_saved_main_size().lock() {
                                *lock = Some((size.width, size.height));
                            }
                        }
                    }
                }

                // 2. Unmaximize, set always on top false, skip taskbar
                let _ = main_win.unminimize();
                let _ = main_win.set_always_on_top(false);
                let _ = main_win.set_skip_taskbar(true);

                // 3. Size window to target monitor bounds
                let monitors = main_win.available_monitors().unwrap_or_default();
                let target = monitor_target.unwrap_or_else(|| "0".to_string());

                let (x, y, w, h) = if (target == "all" || target == "all_screens") && !monitors.is_empty() {
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
                    (min_x, min_y, (max_x - min_x) as u32, (max_y - min_y) as u32)
                } else if let Ok(idx) = target.parse::<usize>() {
                    if let Some(m) = monitors.get(idx) {
                        let pos = m.position();
                        let size = m.size();
                        (pos.x, pos.y, size.width, size.height)
                    } else if let Some(m) = monitors.first() {
                        let pos = m.position();
                        let size = m.size();
                        (pos.x, pos.y, size.width, size.height)
                    } else {
                        (0, 0, 1920, 1080)
                    }
                } else if let Some(m) = monitors.first() {
                    let pos = m.position();
                    let size = m.size();
                    (pos.x, pos.y, size.width, size.height)
                } else {
                    (0, 0, 1920, 1080)
                };

                let _ = main_win.set_position(tauri::PhysicalPosition::new(x, y));
                let _ = main_win.set_size(tauri::PhysicalSize::new(w, h));

                // 4. Attach to WorkerW behind desktop icons
                workerw::attach_to_workerw(hwnd);
                let _ = main_win.set_ignore_cursor_events(true);
                let _ = main_win.show();
            } else {
                // 1. Detach from WorkerW
                workerw::detach_from_workerw(hwnd);

                // 2. Restore normal window mode and position
                let _ = main_win.set_ignore_cursor_events(false);
                let _ = main_win.set_skip_taskbar(false);
                let _ = main_win.set_always_on_top(false);

                let saved_pos = get_saved_main_pos().lock().ok().and_then(|g| *g);
                let saved_size = get_saved_main_size().lock().ok().and_then(|g| *g);

                if let (Some((px, py)), Some((sw, sh))) = (saved_pos, saved_size) {
                    let _ = main_win.set_size(tauri::PhysicalSize::new(sw, sh));
                    let _ = main_win.set_position(tauri::PhysicalPosition::new(px, py));
                } else {
                    let _ = main_win.set_size(tauri::PhysicalSize::new(780, 560));
                    let _ = main_win.center();
                }

                let _ = main_win.unminimize();
                let _ = main_win.show();
                let _ = main_win.set_focus();
            }
        }
    }
    let _ = app.emit("set-wallpaper-mode-state", enabled);
    Ok(())
}

#[tauri::command]
pub async fn start_wallpaper_edit(app: AppHandle) -> Result<(), String> {
    use tauri::Emitter;
    crate::log_to_file("[Wallpaper Command] start_wallpaper_edit called");
    if let Some(main_win) = app.get_webview_window("main") {
        #[cfg(target_os = "windows")]
        {
            if let Ok(hwnd_raw) = main_win.hwnd() {
                let hwnd = windows::Win32::Foundation::HWND(hwnd_raw.0 as _);
                workerw::detach_from_workerw(hwnd);
            }
        }
        let _ = main_win.set_always_on_top(true);
        let _ = main_win.set_ignore_cursor_events(false);
        let _ = main_win.set_focus();
    }
    let _ = app.emit("wallpaper-edit-started", ());
    Ok(())
}

#[tauri::command]
pub async fn end_wallpaper_edit(app: AppHandle) -> Result<(), String> {
    use tauri::Emitter;
    crate::log_to_file("[Wallpaper Command] end_wallpaper_edit called");
    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.set_always_on_top(false);
        #[cfg(target_os = "windows")]
        {
            if let Ok(hwnd_raw) = main_win.hwnd() {
                let hwnd = windows::Win32::Foundation::HWND(hwnd_raw.0 as _);
                workerw::attach_to_workerw(hwnd);
            }
        }
        let _ = main_win.set_ignore_cursor_events(true);
    }
    let _ = app.emit("wallpaper-edit-ended", ());
    Ok(())
}

#[tauri::command]
pub fn set_fullscreen_lyrics(_app: AppHandle, _enabled: bool) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub fn log_debug(msg: String) -> Result<(), String> {
    crate::log_to_file(&msg);
    Ok(())
}

#[tauri::command]
pub fn update_taskbar_lyric(app: AppHandle, data: serde_json::Value) -> Result<(), String> {
    use tauri::Emitter;
    if let Some(tb) = app.get_webview_window("taskbar") {
        let _ = tb.emit("update-taskbar-lyric", &data);
        let js = format!("if (window.__onTaskbarLyric) {{ window.__onTaskbarLyric({}); }}", data);
        let _ = tb.eval(&js);
    }
    Ok(())
}

#[tauri::command]
pub fn sync_taskbar_config(app: AppHandle, config: serde_json::Value) -> Result<(), String> {
    use tauri::Emitter;
    if let Some(tb) = app.get_webview_window("taskbar") {
        let _ = tb.emit("sync-taskbar-config", &config);
        let js = format!("if (window.__onTaskbarConfig) {{ window.__onTaskbarConfig({}); }}", config);
        let _ = tb.eval(&js);
    }
    Ok(())
}


