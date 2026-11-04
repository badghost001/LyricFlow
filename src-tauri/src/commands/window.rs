use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};
use tauri::{AppHandle, Manager, WebviewWindow};

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
pub static WALLPAPER_MODE_ACTIVE: AtomicBool = AtomicBool::new(false);
static WALLPAPER_FOCUS_MONITOR_ACTIVE: AtomicBool = AtomicBool::new(false);
static WALLPAPER_FOCUS_MONITOR_SPAWNED: AtomicBool = AtomicBool::new(false);

pub fn is_wallpaper_mode_active() -> bool {
    WALLPAPER_MODE_ACTIVE.load(Ordering::SeqCst)
}

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

static ISLAND_BOUNDS: OnceLock<Mutex<Option<LyricBounds>>> = OnceLock::new();
static ISLAND_GEOMETRY: OnceLock<Mutex<(i32, i32, f64)>> = OnceLock::new();
static DYNAMIC_ISLAND_GHOST_ACTIVE: std::sync::atomic::AtomicBool =
    std::sync::atomic::AtomicBool::new(false);
static DYNAMIC_ISLAND_GHOST_ENTERED_AT: std::sync::atomic::AtomicU64 =
    std::sync::atomic::AtomicU64::new(0);
static DYNAMIC_ISLAND_GHOST_LAST_TOGGLE_MS: std::sync::atomic::AtomicU64 =
    std::sync::atomic::AtomicU64::new(0);
static GHOST_LOCKED_BOUNDS: OnceLock<Mutex<Option<LyricBounds>>> = OnceLock::new();
static GHOST_ENTERED_WHILE_HOVERING: std::sync::atomic::AtomicBool =
    std::sync::atomic::AtomicBool::new(false);

pub fn toggle_dynamic_island_ghost() -> bool {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    let last = DYNAMIC_ISLAND_GHOST_LAST_TOGGLE_MS.load(std::sync::atomic::Ordering::SeqCst);
    // 250ms hardware debounce to eliminate duplicate rapid triggers between JS keydown, GetAsyncKeyState, and global shortcuts
    if now.saturating_sub(last) < 250 {
        return DYNAMIC_ISLAND_GHOST_ACTIVE.load(std::sync::atomic::Ordering::SeqCst);
    }
    DYNAMIC_ISLAND_GHOST_LAST_TOGGLE_MS.store(now, std::sync::atomic::Ordering::SeqCst);

    let current = DYNAMIC_ISLAND_GHOST_ACTIVE.load(std::sync::atomic::Ordering::SeqCst);
    let next = !current;
    set_dynamic_island_ghost(next);
    next
}

pub fn set_dynamic_island_ghost(enable: bool) {
    DYNAMIC_ISLAND_GHOST_ACTIVE.store(enable, std::sync::atomic::Ordering::SeqCst);
    if enable {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);
        DYNAMIC_ISLAND_GHOST_ENTERED_AT.store(now, std::sync::atomic::Ordering::SeqCst);
        GHOST_ENTERED_WHILE_HOVERING.store(true, std::sync::atomic::Ordering::SeqCst);

        // Snapshot current bounds so hover loss (which collapses height from 126px to 36px) doesn't cause premature auto-restore
        if let Ok(cur_bounds) = get_island_bounds().lock() {
            if let Some(b) = *cur_bounds {
                if let Ok(mut lock) = GHOST_LOCKED_BOUNDS.get_or_init(|| Mutex::new(None)).lock() {
                    let locked = LyricBounds {
                        x: b.x,
                        y: b.y,
                        width: b.width.max(340),
                        height: b.height.max(36),
                    };
                    *lock = Some(locked);
                }
            }
        }
    } else {
        if let Ok(mut lock) = GHOST_LOCKED_BOUNDS.get_or_init(|| Mutex::new(None)).lock() {
            *lock = None;
        }
        GHOST_ENTERED_WHILE_HOVERING.store(false, std::sync::atomic::Ordering::SeqCst);
    }
}

#[tauri::command]
pub fn cmd_toggle_dynamic_island_ghost(window: tauri::WebviewWindow) -> Result<bool, String> {
    use tauri::Emitter;
    let new_state = toggle_dynamic_island_ghost();
    let _ = window.emit("island-ghost-mode", new_state);
    let _ = window.set_ignore_cursor_events(new_state);
    Ok(new_state)
}

fn get_island_bounds() -> &'static Mutex<Option<LyricBounds>> {
    ISLAND_BOUNDS.get_or_init(|| Mutex::new(None))
}

fn get_island_geometry() -> &'static Mutex<(i32, i32, f64)> {
    ISLAND_GEOMETRY.get_or_init(|| Mutex::new((0, 0, 1.0)))
}

#[tauri::command]
pub fn update_island_bounds(window: WebviewWindow, rect: LyricBounds) -> Result<(), String> {
    if let Ok(mut lock) = get_island_bounds().lock() {
        *lock = Some(rect);
    }
    if DYNAMIC_ISLAND_ACTIVE.load(Ordering::SeqCst) && rect.width > 0 && rect.height > 0 {
        let scale = window.scale_factor().unwrap_or(1.0);
        let pad_w = (32.0 * scale) as u32;
        let pad_h = (24.0 * scale) as u32;
        let target_w =
            (((rect.width as f64) * scale).round() as u32 + pad_w).max((520.0 * scale) as u32);
        let target_h =
            (((rect.height as f64) * scale).round() as u32 + pad_h).max((260.0 * scale) as u32);

        #[cfg(target_os = "windows")]
        {
            use windows::Win32::UI::WindowsAndMessaging::{
                SetWindowPos, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOZORDER,
            };
            if let Ok(hwnd) = window.hwnd() {
                let hwnd_val = windows::Win32::Foundation::HWND(hwnd.0 as _);
                unsafe {
                    let _ = SetWindowPos(
                        hwnd_val,
                        None,
                        0,
                        0,
                        target_w as i32,
                        target_h as i32,
                        SWP_NOMOVE | SWP_NOZORDER | SWP_NOACTIVATE,
                    );
                }
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub fn set_island_position(window: WebviewWindow, x: i32, y: i32) -> Result<(), String> {
    let scale = window.scale_factor().unwrap_or(1.0);
    let _ = window.set_position(tauri::PhysicalPosition::new(x, y));
    if let Ok(mut lock) = get_island_geometry().lock() {
        *lock = (x, y, scale);
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
    window
        .set_ignore_cursor_events(ignore)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_always_on_top(window: WebviewWindow, always_on_top: bool) -> Result<(), String> {
    window
        .set_always_on_top(always_on_top)
        .map_err(|e| e.to_string())
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
            use windows::Win32::Foundation::HANDLE;
            use windows::Win32::System::DataExchange::{
                CloseClipboard, EmptyClipboard, OpenClipboard, SetClipboardData,
            };
            use windows::Win32::System::Memory::{
                GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE,
            };

            let wide: Vec<u16> = text.encode_utf16().chain(std::iter::once(0)).collect();
            let bytes_len = wide.len() * std::mem::size_of::<u16>();

            unsafe {
                if OpenClipboard(None).is_ok() {
                    let _ = EmptyClipboard();
                    if let Ok(h_mem) = GlobalAlloc(GMEM_MOVEABLE, bytes_len) {
                        let ptr = GlobalLock(h_mem);
                        if !ptr.is_null() {
                            std::ptr::copy_nonoverlapping(
                                wide.as_ptr() as *const u8,
                                ptr as *mut u8,
                                bytes_len,
                            );
                            let _ = GlobalUnlock(h_mem);
                            // 13 is CF_UNICODETEXT
                            let _ = SetClipboardData(13, Some(HANDLE(h_mem.0 as *mut _)));
                        }
                    }
                    let _ = CloseClipboard();
                    return Ok(());
                }
            }
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
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_updater::UpdaterExt;
    #[cfg(windows)]
    let updater_res = app.updater_builder().target("windows-x86_64-nsis").build();
    #[cfg(not(windows))]
    let updater_res = app.updater();

    if let Ok(updater) = updater_res {
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

#[tauri::command]
pub fn is_taskbar_mode_active() -> bool {
    TASKBAR_MODE_ACTIVE.load(Ordering::SeqCst)
}

#[tauri::command]
pub async fn set_taskbar_mode(
    app: AppHandle,
    enabled: bool,
    from_tray: Option<bool>,
) -> Result<(), String> {
    crate::log_to_file(&format!(
        "[LyricFlow Command] set_taskbar_mode(enabled={}) called!",
        enabled
    ));
    use tauri::Emitter;
    if enabled {
        if TASKBAR_MODE_ACTIVE.load(Ordering::SeqCst) {
            if let Some(existing) = app.get_webview_window("taskbar") {
                if existing.is_visible().unwrap_or(false) && existing.hwnd().is_ok() {
                    crate::log_to_file("[LyricFlow Command] Taskbar mode is already active and healthy, ignoring duplicate enable request");
                    return Ok(());
                }
            }
            crate::log_to_file("[LyricFlow Command] Taskbar mode active flag was true but window was not visible/healthy. Re-asserting...");
        }
        let tb_win = {
            let existing = app.get_webview_window("taskbar");
            let is_healthy = existing.as_ref().map(|w| w.hwnd().is_ok()).unwrap_or(false);
            if is_healthy {
                crate::log_to_file("[LyricFlow Command] Found healthy taskbar window");
                existing.unwrap()
            } else {
                if let Some(w) = existing {
                    crate::log_to_file("[LyricFlow Command] Existing taskbar window was unhealthy or closed, destroying it...");
                    let _ = w.destroy();
                }
                crate::log_to_file("[LyricFlow Command] Building taskbar window dynamically...");
                let tb_builder = tauri::WebviewWindowBuilder::new(
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
                .resizable(false);

                match tb_builder.build() {
                    Ok(w) => w,
                    Err(e) => {
                        let msg = format!(
                            "[LyricFlow Command] ERROR: Failed to create 'taskbar' window: {}",
                            e
                        );
                        crate::log_to_file(&msg);
                        return Err(msg);
                    }
                }
            }
        };

        let (mut win_x, mut win_y);

        #[cfg(target_os = "windows")]
        {
            use windows::Win32::Foundation::RECT;
            use windows::Win32::UI::WindowsAndMessaging::{
                GetSystemMetrics, GetWindowLongPtrW, SetWindowLongPtrW, SetWindowPos,
                SystemParametersInfoW, GWL_EXSTYLE, HWND_TOPMOST, SM_CXSCREEN,
                SM_CYSCREEN, SPI_GETWORKAREA, SWP_FRAMECHANGED, SWP_NOACTIVATE, SWP_SHOWWINDOW,
                SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS, WS_EX_NOACTIVATE, WS_EX_TOOLWINDOW,
                WS_EX_TOPMOST,
            };

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

            // Wait for HWND if window was dynamically created or asynchronously initialized
            let mut hwnd_raw_opt: Option<isize> = tb_win.hwnd().ok().map(|h| h.0 as isize);
            if hwnd_raw_opt.is_none() {
                for _ in 0..20 {
                    tokio::time::sleep(std::time::Duration::from_millis(50)).await;
                    if let Ok(h) = tb_win.hwnd() {
                        hwnd_raw_opt = Some(h.0 as isize);
                        break;
                    }
                }
            }

            if let Some(hwnd_raw) = hwnd_raw_opt {
                crate::log_to_file(&format!("[LyricFlow Command] Got taskbar HWND: 0x{:x}", hwnd_raw));
                unsafe {
                    let hwnd_val = windows::Win32::Foundation::HWND(hwnd_raw as _);

                    let cur_ex = GetWindowLongPtrW(hwnd_val, GWL_EXSTYLE);
                    let new_ex = cur_ex
                        | (WS_EX_TOOLWINDOW.0 as isize)
                        | (WS_EX_TOPMOST.0 as isize)
                        | (WS_EX_NOACTIVATE.0 as isize);
                    let _ = SetWindowLongPtrW(hwnd_val, GWL_EXSTYLE, new_ex);

                    let _ = SetWindowPos(
                        hwnd_val,
                        Some(HWND_TOPMOST),
                        win_x,
                        win_y,
                        win_w,
                        win_h,
                        SWP_SHOWWINDOW | SWP_NOACTIVATE | SWP_FRAMECHANGED,
                    );
                }
            } else {
                crate::log_to_file("[LyricFlow Command] WARNING: Failed to acquire taskbar HWND!");
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
                use windows::Win32::Foundation::{HWND, POINT};
                use windows::Win32::UI::WindowsAndMessaging::{
                    GetCursorPos, GetForegroundWindow, SetWindowPos, HWND_TOPMOST, SWP_NOACTIVATE,
                    SWP_NOMOVE, SWP_NOSIZE, SWP_SHOWWINDOW,
                };

                let mut current_clickthrough = true;
                let mut tick_counter: u32 = 0;
                let mut last_foreground = HWND::default();

                // Cache HWND; re-query if not yet available
                let mut tb_hwnd = app_handle
                    .get_webview_window("taskbar")
                    .and_then(|w| w.hwnd().ok())
                    .map(|h| windows::Win32::Foundation::HWND(h.0 as _));

                while TASKBAR_MODE_ACTIVE.load(Ordering::SeqCst) {
                    std::thread::sleep(std::time::Duration::from_millis(30));

                    if !TASKBAR_MODE_ACTIVE.load(Ordering::SeqCst) {
                        break;
                    }

                    if tb_hwnd.is_none() {
                        tb_hwnd = app_handle
                            .get_webview_window("taskbar")
                            .and_then(|w| w.hwnd().ok())
                            .map(|h| windows::Win32::Foundation::HWND(h.0 as _));
                    }

                    tick_counter = tick_counter.wrapping_add(1);

                    // Re-assert HWND_TOPMOST immediately whenever foreground changes (focus shift),
                    // or on a 90ms tick cadence (every 3 ticks) to guarantee visibility over Shell_TrayWnd
                    let fg = unsafe { GetForegroundWindow() };
                    let focus_changed = fg != last_foreground;
                    if focus_changed || tick_counter % 3 == 0 {
                        last_foreground = fg;
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
        crate::log_to_file(&format!(
            "[LyricFlow Command] tb_win final state: is_visible={}, outer_pos={:?}, outer_sz={:?}",
            vis, pos, sz
        ));

        let taskbar_succeeded = tb_win.hwnd().is_ok() || vis;
        if taskbar_succeeded {
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
                crate::log_to_file(
                    "[LyricFlow Command] Parking main window off-screen to keep JS engine alive",
                );
                let _ = main_win.set_skip_taskbar(true);
                let _ = main_win.set_position(tauri::PhysicalPosition::new(-32000, -32000));
            }
            let _ = app.emit("taskbar-mode-ready", ());
        } else {
            crate::log_to_file(
                "[LyricFlow Command] ERROR: Taskbar window failed to become ready! Keeping main window on-screen.",
            );
            TASKBAR_MODE_ACTIVE.store(false, Ordering::SeqCst);
            return Err("Failed to initialize taskbar window".into());
        }
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
                if sx > -10000 && sy > -10000 {
                    let _ = main_win.set_position(tauri::PhysicalPosition::new(sx, sy));
                } else {
                    let _ = main_win.center();
                }
            } else {
                let _ = main_win.center();
            }
            let _ = main_win.show();
            let _ = main_win.unminimize();
            let _ = main_win.set_focus();
        }
        if from_tray.unwrap_or(false) {
            let _ = app.emit("force-normal-mode", ());
        }
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
    let primary = main_win
        .as_ref()
        .and_then(|w| w.primary_monitor().ok().flatten());
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
        EnumWindows, FindWindowExW, FindWindowW, GetWindowLongPtrW, SendMessageTimeoutW, SetParent,
        SetWindowLongPtrW, SetWindowPos, ShowWindow, GWL_EXSTYLE, GWL_STYLE, SMTO_NORMAL,
        SWP_FRAMECHANGED, SWP_NOMOVE, SWP_NOSIZE, SWP_NOZORDER, SWP_SHOWWINDOW, SW_SHOW, WS_CHILD,
        WS_EX_APPWINDOW, WS_EX_TOOLWINDOW, WS_POPUP, WS_VISIBLE,
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
            let new_style = (cur_style & !(WS_POPUP.0 as isize))
                | (WS_CHILD.0 as isize)
                | (WS_VISIBLE.0 as isize);
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
            crate::log_to_file(&format!(
                "[Wallpaper] Successfully attached hwnd={:?} to WorkerW target={:?}",
                hwnd, target
            ));
            true
        }
    }

    pub fn detach_from_workerw(hwnd: HWND) -> bool {
        unsafe {
            let _ = SetParent(hwnd, None);

            let cur_style = GetWindowLongPtrW(hwnd, GWL_STYLE);
            let new_style = (cur_style & !(WS_CHILD.0 as isize))
                | (WS_POPUP.0 as isize)
                | (WS_VISIBLE.0 as isize);
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
            crate::log_to_file(&format!(
                "[Wallpaper] Detached hwnd={:?} from WorkerW",
                hwnd
            ));
            true
        }
    }
}

#[tauri::command]
pub async fn set_wallpaper_mode(
    app: AppHandle,
    enabled: bool,
    monitor_target: Option<String>,
) -> Result<(), String> {
    use tauri::Emitter;
    crate::log_to_file(&format!(
        "[Wallpaper Command] set_wallpaper_mode(enabled={}) called",
        enabled
    ));
    WALLPAPER_MODE_ACTIVE.store(enabled, Ordering::SeqCst);

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

                let (x, y, w, h) =
                    if (target == "all" || target == "all_screens") && !monitors.is_empty() {
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

                // 5. Spawn background monitor thread to detect desktop focus shifts
                // When wallpaper is not focused (user is in other apps/games), canvas suspends to drop GPU to 0%
                WALLPAPER_FOCUS_MONITOR_ACTIVE.store(true, Ordering::SeqCst);
                if !WALLPAPER_FOCUS_MONITOR_SPAWNED.swap(true, Ordering::SeqCst) {
                    let app_focus = app.clone();
                    std::thread::Builder::new()
                        .name("wallpaper-focus-monitor".to_string())
                        .spawn(move || {
                            let mut last_focused: Option<bool> = None;
                            while WALLPAPER_FOCUS_MONITOR_ACTIVE.load(Ordering::SeqCst)
                                && WALLPAPER_MODE_ACTIVE.load(Ordering::SeqCst)
                            {
                                std::thread::sleep(std::time::Duration::from_millis(250));
                                if !WALLPAPER_FOCUS_MONITOR_ACTIVE.load(Ordering::SeqCst)
                                    || !WALLPAPER_MODE_ACTIVE.load(Ordering::SeqCst)
                                {
                                    break;
                                }
                                #[cfg(target_os = "windows")]
                                {
                                    use windows::Win32::UI::WindowsAndMessaging::{
                                        GetClassNameW, GetForegroundWindow, IsZoomed,
                                    };
                                    let is_focused = unsafe {
                                        let fg = GetForegroundWindow();
                                        if fg.0.is_null() || fg.is_invalid() {
                                            true
                                        } else {
                                            let mut class_buf = [0u16; 256];
                                            let len = GetClassNameW(fg, &mut class_buf);
                                            if len > 0 {
                                                let class_name = String::from_utf16_lossy(
                                                    &class_buf[..len as usize],
                                                );
                                                let is_desktop_shell = class_name == "Progman"
                                                    || class_name == "WorkerW"
                                                    || class_name == "Shell_TrayWnd"
                                                    || class_name == "Shell_SecondaryTrayWnd"
                                                    || class_name == "SysListView32"
                                                    || class_name == "Windows.UI.Core.CoreWindow";
                                                if is_desktop_shell {
                                                    true
                                                } else {
                                                    // Suspend wallpaper rendering only if the active foreground app is fully maximized
                                                    !IsZoomed(fg).as_bool()
                                                }
                                            } else {
                                                true
                                            }
                                        }
                                    };
                                    if last_focused != Some(is_focused) {
                                        last_focused = Some(is_focused);
                                        let _ =
                                            app_focus.emit("wallpaper-focus-changed", is_focused);
                                    }
                                }
                            }
                            WALLPAPER_FOCUS_MONITOR_SPAWNED.store(false, Ordering::SeqCst);
                            let _ = app_focus.emit("wallpaper-focus-changed", true);
                        })
                        .ok();
                }

                // Global wallpaper exit shortcut is Ctrl+Shift+W
            } else {
                WALLPAPER_FOCUS_MONITOR_ACTIVE.store(false, Ordering::SeqCst);
                let _ = app.emit("wallpaper-focus-changed", true);

                // 1. Detach from WorkerW
                workerw::detach_from_workerw(hwnd);

                // 2. Hide wallpaper-hud escape pill
                if let Some(hud_win) = app.get_webview_window("wallpaper-hud") {
                    let _ = hud_win.hide();
                }

                // 3. Restore normal window mode and position
                let _ = main_win.set_ignore_cursor_events(false);
                let _ = main_win.set_skip_taskbar(false);
                let _ = main_win.set_always_on_top(false);

                let saved_pos = get_saved_main_pos().lock().ok().and_then(|g| *g);
                let saved_size = get_saved_main_size().lock().ok().and_then(|g| *g);

                if let (Some((px, py)), Some((sw, sh))) = (saved_pos, saved_size) {
                    let _ = main_win.set_size(tauri::PhysicalSize::new(sw, sh));
                    let _ = main_win.set_position(tauri::PhysicalPosition::new(px, py));
                } else if let Some(bounds) = crate::commands::config::load_saved_window_bounds() {
                    let _ =
                        main_win.set_size(tauri::PhysicalSize::new(bounds.width, bounds.height));
                    let _ = main_win.set_position(tauri::PhysicalPosition::new(bounds.x, bounds.y));
                } else {
                    let scale = main_win.scale_factor().unwrap_or(1.0);
                    let _ = main_win.set_size(tauri::PhysicalSize::new(
                        (960.0 * scale) as u32,
                        (600.0 * scale) as u32,
                    ));
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
    if let Some(hud_win) = app.get_webview_window("wallpaper-hud") {
        let _ = hud_win.hide();
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
    let _ = app.emit("update-taskbar-lyric", &data);
    if let Some(tb) = app.get_webview_window("taskbar") {
        let _ = tb.emit("update-taskbar-lyric", &data);
        let js = format!(
            "try {{ if (window.__onTaskbarLyric) window.__onTaskbarLyric({}); }} catch (_) {{}}",
            data
        );
        let _ = tb.eval(&js);
    }
    Ok(())
}

#[tauri::command]
pub fn sync_taskbar_config(app: AppHandle, config: serde_json::Value) -> Result<(), String> {
    use tauri::Emitter;
    let _ = app.emit("sync-taskbar-config", &config);
    if let Some(tb) = app.get_webview_window("taskbar") {
        let _ = tb.emit("sync-taskbar-config", &config);
        let js = format!(
            "try {{ if (window.__onTaskbarConfig) window.__onTaskbarConfig({}); }} catch (_) {{}}",
            config
        );
        let _ = tb.eval(&js);
    }
    Ok(())
}

static DYNAMIC_ISLAND_ACTIVE: AtomicBool = AtomicBool::new(false);
static SAVED_ISLAND_MAIN_POS: OnceLock<Mutex<Option<(i32, i32)>>> = OnceLock::new();
static SAVED_ISLAND_MAIN_SIZE: OnceLock<Mutex<Option<(u32, u32)>>> = OnceLock::new();

#[tauri::command]
pub fn is_dynamic_island_mode() -> bool {
    DYNAMIC_ISLAND_ACTIVE.load(Ordering::SeqCst)
}

#[tauri::command]
pub async fn set_dynamic_island_mode(
    window: WebviewWindow,
    enabled: bool,
    dock_pos: Option<String>,
) -> Result<(), String> {
    use tauri::Emitter;
    let app = window.app_handle();

    if enabled {
        cancel_pending_save_window_bounds();
        // Save current window position & size only on first entry from a legitimate main window
        if !DYNAMIC_ISLAND_ACTIVE.load(Ordering::SeqCst) {
            let scale = window.scale_factor().unwrap_or(1.0);
            let min_w = (650.0 * scale) as u32;
            let min_h = (450.0 * scale) as u32;

            if let Ok(size) = window.inner_size() {
                if size.width >= min_w && size.height >= min_h {
                    if let Ok(mut lock) = SAVED_ISLAND_MAIN_SIZE
                        .get_or_init(|| Mutex::new(None))
                        .lock()
                    {
                        *lock = Some((size.width, size.height));
                    }
                    if let Ok(pos) = window.outer_position() {
                        if let Ok(mut lock) = SAVED_ISLAND_MAIN_POS
                            .get_or_init(|| Mutex::new(None))
                            .lock()
                        {
                            *lock = Some((pos.x, pos.y));
                        }
                        let _ = crate::commands::config::save_window_bounds(
                            crate::commands::config::WindowBounds {
                                x: pos.x,
                                y: pos.y,
                                width: size.width,
                                height: size.height,
                            },
                        );
                    }
                }
            }
        }

        DYNAMIC_ISLAND_ACTIVE.store(true, Ordering::SeqCst);

        let scale = window.scale_factor().unwrap_or(1.0);
        let island_w = (520.0 * scale) as u32;
        // Reserve transparent space below the expanded capsule for the scrubber,
        // translation/duet satellites, and their connector without clipping.
        let island_h = (260.0 * scale) as u32;

        let dock = dock_pos.as_deref().unwrap_or("top-center");

        let monitor = window
            .current_monitor()
            .ok()
            .flatten()
            .or_else(|| window.primary_monitor().ok().flatten())
            .or_else(|| {
                window
                    .available_monitors()
                    .ok()
                    .and_then(|m| m.into_iter().next())
            });

        let (target_x, target_y) = if let Some(m) = monitor {
            let m_pos = m.position();
            let m_size = m.size();
            let center_x = m_pos.x + ((m_size.width as i32 - island_w as i32) / 2);
            let top_y = m_pos.y;

            #[cfg(target_os = "windows")]
            let taskbar_top = {
                use windows::Win32::Foundation::RECT;
                use windows::Win32::UI::WindowsAndMessaging::{
                    SystemParametersInfoW, SPI_GETWORKAREA, SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS,
                };
                let mut wa = RECT::default();
                let ok = unsafe {
                    SystemParametersInfoW(
                        SPI_GETWORKAREA,
                        0,
                        Some(&mut wa as *mut _ as *mut _),
                        SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS(0),
                    )
                };
                if ok.is_ok() && wa.bottom > 0 && wa.bottom <= m_pos.y + m_size.height as i32 {
                    wa.bottom
                } else {
                    m_pos.y + m_size.height as i32 - (48.0 * scale) as i32
                }
            };
            #[cfg(not(target_os = "windows"))]
            let taskbar_top = m_pos.y + m_size.height as i32 - (48.0 * scale) as i32;

            match dock {
                "top-left" => {
                    let x = m_pos.x + (16.0 * scale) as i32;
                    (x, top_y)
                }
                "top-right" => {
                    let x = m_pos.x + m_size.width as i32 - island_w as i32 - (16.0 * scale) as i32;
                    (x, top_y)
                }
                "bottom-center" => {
                    let x = center_x;
                    let y = taskbar_top - island_h as i32;
                    (x, y)
                }
                "free" => {
                    let y = top_y + (32.0 * scale) as i32;
                    (center_x, y)
                }
                _ => {
                    // Default: top-center (authentic iOS Dynamic Island)
                    (center_x, top_y)
                }
            }
        } else {
            let center_x = (1920 - island_w as i32) / 2;
            (center_x, 0)
        };

        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_resizable(false);
        let _ = window.set_size(tauri::PhysicalSize::new(island_w, island_h));
        let _ = window.set_position(tauri::PhysicalPosition::new(target_x, target_y));
        let _ = window.set_always_on_top(true);
        let _ = window.set_ignore_cursor_events(false);
        let _ = window.set_skip_taskbar(true);

        #[cfg(target_os = "windows")]
        {
            use windows::Win32::UI::WindowsAndMessaging::{
                GetWindowLongPtrW, SetWindowLongPtrW, SetWindowPos, GWL_EXSTYLE, HWND_TOPMOST,
                SWP_FRAMECHANGED, SWP_NOACTIVATE, SWP_SHOWWINDOW, WS_EX_APPWINDOW,
                WS_EX_TOOLWINDOW, WS_EX_TOPMOST, WS_EX_TRANSPARENT,
            };
            if let Ok(hwnd) = window.hwnd() {
                let hwnd_val = windows::Win32::Foundation::HWND(hwnd.0 as _);
                unsafe {
                    let cur_ex = GetWindowLongPtrW(hwnd_val, GWL_EXSTYLE);
                    let new_ex = (cur_ex
                        & !(WS_EX_APPWINDOW.0 as isize | WS_EX_TRANSPARENT.0 as isize))
                        | (WS_EX_TOOLWINDOW.0 as isize)
                        | (WS_EX_TOPMOST.0 as isize);
                    let _ = SetWindowLongPtrW(hwnd_val, GWL_EXSTYLE, new_ex);
                    let _ = SetWindowPos(
                        hwnd_val,
                        Some(HWND_TOPMOST),
                        target_x,
                        target_y,
                        island_w as i32,
                        island_h as i32,
                        SWP_SHOWWINDOW | SWP_NOACTIVATE | SWP_FRAMECHANGED,
                    );
                }
            }
        }

        crate::log_to_file(&format!(
            "[DynamicIsland] Docked to {}: target=({}, {}), size=({}x{}), scale={}",
            dock, target_x, target_y, island_w, island_h, scale
        ));

        if let Ok(mut lock) = get_island_geometry().lock() {
            *lock = (target_x, target_y, scale);
        }

        if let Ok(mut lock) = get_island_bounds().lock() {
            let initial_rect = match dock {
                "top-left" => LyricBounds {
                    x: 0,
                    y: 0,
                    width: 340,
                    height: 36,
                },
                "top-right" => LyricBounds {
                    x: 180,
                    y: 0,
                    width: 340,
                    height: 36,
                },
                "bottom-center" => LyricBounds {
                    x: 90,
                    y: 174,
                    width: 340,
                    height: 36,
                },
                _ => LyricBounds {
                    x: 90,
                    y: 0,
                    width: 340,
                    height: 36,
                },
            };
            *lock = Some(initial_rect);
        }

        DYNAMIC_ISLAND_ACTIVE.store(true, Ordering::SeqCst);

        // Spawn background cursor hit-testing monitor thread so surrounding transparent area is click-through
        #[cfg(target_os = "windows")]
        {
            let win_clone = window.clone();
            std::thread::Builder::new()
                .name("dynamic-island-hit-test".to_string())
                .spawn(move || {
                    use tauri::Emitter;
                    use windows::Win32::Foundation::POINT;
                    use windows::Win32::UI::Input::KeyboardAndMouse::{
                        GetAsyncKeyState, VK_OEM_3, VK_OEM_5, VK_OEM_8,
                    };
                    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

                    let mut current_clickthrough = false;
                    let mut current_ghost_mode = false;
                    let mut last_tilde_state = false;
                    let mut last_pt = POINT { x: -9999, y: -9999 };
                    let mut last_bounds_id: (i32, i32, i32, i32) = (-1, -1, -1, -1);

                    let mut sleep_ms = 25u64;

                    while DYNAMIC_ISLAND_ACTIVE.load(Ordering::SeqCst) {
                        std::thread::sleep(std::time::Duration::from_millis(sleep_ms));

                        if !DYNAMIC_ISLAND_ACTIVE.load(Ordering::SeqCst) {
                            break;
                        }

                        let mut pt = POINT::default();
                        if unsafe { GetCursorPos(&mut pt) }.is_ok() {
                            let bounds_opt = get_island_bounds().lock().ok().and_then(|g| *g);
                            let cur_bounds_id = bounds_opt
                                .map(|b| (b.x, b.y, b.width, b.height))
                                .unwrap_or((0, 0, 0, 0));

                            let (win_x, win_y, scale) = get_island_geometry()
                                .lock()
                                .ok()
                                .map(|g| *g)
                                .unwrap_or((0, 0, 1.0));

                            // While in ghost mode, prefer the snapshot bounds so CSS :hover unmatch doesn't collapse hit-testing
                            let is_ghost_active =
                                DYNAMIC_ISLAND_GHOST_ACTIVE.load(Ordering::SeqCst);
                            let active_bounds = if is_ghost_active {
                                GHOST_LOCKED_BOUNDS
                                    .get_or_init(|| Mutex::new(None))
                                    .lock()
                                    .ok()
                                    .and_then(|g| *g)
                                    .or(bounds_opt)
                            } else {
                                bounds_opt
                            };

                            let is_over_island = if let Some(b) = active_bounds {
                                if b.width > 0 && b.height > 0 {
                                    let pad = (16.0 * scale) as i32; // Generous 16px buffer for seamless interaction
                                    let left = win_x + (b.x as f64 * scale) as i32 - pad;
                                    let top = win_y + (b.y as f64 * scale) as i32 - pad;
                                    let right =
                                        win_x + ((b.x + b.width) as f64 * scale) as i32 + pad;
                                    let bottom =
                                        win_y + ((b.y + b.height) as f64 * scale) as i32 + pad;

                                    pt.x >= left && pt.x <= right && pt.y >= top && pt.y <= bottom
                                } else {
                                    false
                                }
                            } else {
                                false
                            };

                            // Adaptive sleep: If cursor is far from island bounds (> 160px), poll slower (45ms) to save CPU/battery.
                            // If close (< 100px) or hovering or ghost active, poll at 25ms for instant responsiveness.
                            let is_near_island = if let Some(b) = active_bounds {
                                let pad = (160.0 * scale) as i32;
                                pt.x >= (win_x + (b.x as f64 * scale) as i32 - pad)
                                    && pt.x
                                        <= (win_x + ((b.x + b.width) as f64 * scale) as i32 + pad)
                                    && pt.y >= (win_y + (b.y as f64 * scale) as i32 - pad)
                                    && pt.y
                                        <= (win_y + ((b.y + b.height) as f64 * scale) as i32 + pad)
                            } else {
                                false
                            };

                            sleep_ms = if is_over_island || is_ghost_active || is_near_island {
                                25
                            } else {
                                45
                            };

                            // Real-time tap of ` (Tilde / Backtick):
                            // Support US (VK_OEM_3 / 0xC0), UK (VK_OEM_5 / 0xDC), and International (VK_OEM_8 / 0xDF) keyboards
                            let is_oem3 = (unsafe { GetAsyncKeyState(VK_OEM_3.0 as i32) } as u16
                                & 0x8000)
                                != 0;
                            let is_oem5 = (unsafe { GetAsyncKeyState(VK_OEM_5.0 as i32) } as u16
                                & 0x8000)
                                != 0;
                            let is_oem8 = (unsafe { GetAsyncKeyState(VK_OEM_8.0 as i32) } as u16
                                & 0x8000)
                                != 0;
                            let is_tilde_down = is_oem3 || is_oem5 || is_oem8;

                            if is_tilde_down && !last_tilde_state {
                                if is_over_island || is_ghost_active {
                                    if !is_ghost_active && is_over_island {
                                        GHOST_ENTERED_WHILE_HOVERING.store(true, Ordering::SeqCst);
                                    }
                                    toggle_dynamic_island_ghost();
                                }
                            }
                            last_tilde_state = is_tilde_down;

                            // Auto-restore ghost mode
                            let is_ghost = DYNAMIC_ISLAND_GHOST_ACTIVE.load(Ordering::SeqCst);
                            if is_ghost {
                                let now = std::time::SystemTime::now()
                                    .duration_since(std::time::UNIX_EPOCH)
                                    .map(|d| d.as_millis() as u64)
                                    .unwrap_or(0);
                                let entered_at =
                                    DYNAMIC_ISLAND_GHOST_ENTERED_AT.load(Ordering::SeqCst);
                                let should_auto_restore = now.saturating_sub(entered_at) > 500
                                    && (!is_over_island || now.saturating_sub(entered_at) > 7000);

                                if should_auto_restore {
                                    set_dynamic_island_ghost(false);
                                }
                            }

                            let is_ghost_now = DYNAMIC_ISLAND_GHOST_ACTIVE.load(Ordering::SeqCst);
                            if is_ghost_now != current_ghost_mode {
                                current_ghost_mode = is_ghost_now;
                                let _ = win_clone.emit("island-ghost-mode", is_ghost_now);
                            }

                            // In Ghost Passthrough mode (Tap to Ghost), all cursor events pass through to windows beneath
                            let should_clickthrough = is_ghost_now || !is_over_island;
                            if should_clickthrough != current_clickthrough {
                                current_clickthrough = should_clickthrough;
                                let _ = win_clone.set_ignore_cursor_events(should_clickthrough);
                            }

                            if pt.x == last_pt.x
                                && pt.y == last_pt.y
                                && cur_bounds_id == last_bounds_id
                                && !is_ghost_now
                                && !current_ghost_mode
                            {
                                continue;
                            }
                            last_pt = pt;
                            last_bounds_id = cur_bounds_id;
                        }
                    }

                    set_dynamic_island_ghost(false);
                    let _ = win_clone.set_ignore_cursor_events(false);
                    let _ = win_clone.emit("island-ghost-mode", false);
                })
                .expect("Failed to spawn dynamic island hit test thread");
        }
    } else {
        if !DYNAMIC_ISLAND_ACTIVE.load(Ordering::SeqCst) {
            return Ok(());
        }
        let _ = window.set_ignore_cursor_events(false);
        let _ = window.emit("island-ghost-mode", false);

        let saved_pos = SAVED_ISLAND_MAIN_POS
            .get_or_init(|| Mutex::new(None))
            .lock()
            .ok()
            .and_then(|mut g| g.take());
        let saved_size = SAVED_ISLAND_MAIN_SIZE
            .get_or_init(|| Mutex::new(None))
            .lock()
            .ok()
            .and_then(|mut g| g.take());

        let scale = window.scale_factor().unwrap_or(1.0);
        let default_w = (960.0 * scale) as u32;
        let default_h = (600.0 * scale) as u32;
        let min_w = (680.0 * scale) as u32;
        let min_h = (480.0 * scale) as u32;

        let (rx, ry, rw, rh) = if let (Some((px, py)), Some((sw, sh))) = (saved_pos, saved_size) {
            let w = if sw < min_w { default_w } else { sw };
            let h = if sh < min_h { default_h } else { sh };
            (px, py, w, h)
        } else if let Some(bounds) = crate::commands::config::load_saved_window_bounds() {
            let w = if bounds.width < min_w {
                default_w
            } else {
                bounds.width
            };
            let h = if bounds.height < min_h {
                default_h
            } else {
                bounds.height
            };
            (bounds.x, bounds.y, w, h)
        } else {
            (100, 100, default_w, default_h)
        };

        let monitor = window
            .current_monitor()
            .ok()
            .flatten()
            .or_else(|| window.primary_monitor().ok().flatten());
        let (final_x, final_y) = if let Some(m) = monitor {
            let m_pos = m.position();
            let m_size = m.size();
            let safe_top = m_pos.y + (70.0 * scale) as i32;
            let centered_x = m_pos.x + ((m_size.width as i32 - rw as i32) / 2);
            let centered_y = m_pos.y + ((m_size.height as i32 - rh as i32) / 2);
            if ry < safe_top || rx < m_pos.x - 100 || rx > m_pos.x + m_size.width as i32 - 100 {
                (centered_x, centered_y.max(safe_top))
            } else {
                (rx, ry)
            }
        } else {
            let safe_y = if ry < 70 { 100 } else { ry };
            (rx, safe_y)
        };

        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_resizable(true);
        let _ = window.set_size(tauri::PhysicalSize::new(rw, rh));
        let _ = window.set_position(tauri::PhysicalPosition::new(final_x, final_y));
        let _ = window.set_always_on_top(false);
        let _ = window.set_skip_taskbar(false);

        #[cfg(target_os = "windows")]
        {
            use windows::Win32::UI::WindowsAndMessaging::{
                GetWindowLongPtrW, SetWindowLongPtrW, SetWindowPos, GWL_EXSTYLE, HWND_NOTOPMOST,
                SWP_FRAMECHANGED, SWP_SHOWWINDOW, WS_EX_APPWINDOW, WS_EX_TOOLWINDOW,
            };
            if let Ok(hwnd) = window.hwnd() {
                let hwnd_val = windows::Win32::Foundation::HWND(hwnd.0 as _);
                unsafe {
                    let cur_ex = GetWindowLongPtrW(hwnd_val, GWL_EXSTYLE);
                    let new_ex =
                        (cur_ex & !(WS_EX_TOOLWINDOW.0 as isize)) | (WS_EX_APPWINDOW.0 as isize);
                    let _ = SetWindowLongPtrW(hwnd_val, GWL_EXSTYLE, new_ex);
                    let _ = SetWindowPos(
                        hwnd_val,
                        Some(HWND_NOTOPMOST),
                        final_x,
                        final_y,
                        rw as i32,
                        rh as i32,
                        SWP_SHOWWINDOW | SWP_FRAMECHANGED,
                    );
                }
            }
        }

        crate::log_to_file(&format!(
            "[DynamicIsland] Restored main window: pos=({}, {}), size=({}x{})",
            final_x, final_y, rw, rh
        ));
        DYNAMIC_ISLAND_ACTIVE.store(false, Ordering::SeqCst);
    }

    let _ = app.emit("dynamic-island-mode-changed", enabled);
    Ok(())
}

#[tauri::command]
pub fn reset_window_size(window: WebviewWindow) -> Result<(), String> {
    if WALLPAPER_MODE_ACTIVE.load(Ordering::SeqCst) {
        crate::log_to_file(
            "[Window Command] reset_window_size ignored: WALLPAPER_MODE_ACTIVE is true",
        );
        return Ok(());
    }
    let scale = window.scale_factor().unwrap_or(1.0);
    let sw = (960.0 * scale) as u32;
    let sh = (600.0 * scale) as u32;
    let _ = window.set_resizable(true);
    let _ = window.set_size(tauri::PhysicalSize::new(sw, sh));
    let _ = window.center();
    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();

    if let Ok(pos) = window.outer_position() {
        let _ =
            crate::commands::config::save_window_bounds(crate::commands::config::WindowBounds {
                x: pos.x,
                y: pos.y,
                width: sw,
                height: sh,
            });
        crate::log_to_file(&format!(
            "[Window Bounds] Saved reset bounds: pos=({}, {}), size=({}x{})",
            pos.x, pos.y, sw, sh
        ));
    }
    Ok(())
}

#[tauri::command]
pub async fn set_cinematic_mode(window: WebviewWindow, enabled: bool) -> Result<(), String> {
    if WALLPAPER_MODE_ACTIVE.load(Ordering::SeqCst) {
        crate::log_to_file(
            "[Window Command] set_cinematic_mode ignored: WALLPAPER_MODE_ACTIVE is true",
        );
        return Ok(());
    }
    crate::log_to_file(&format!(
        "[Window Command] set_cinematic_mode(enabled={}) — preserved stable window bounds",
        enabled
    ));
    use tauri::Emitter;
    let _ = window.emit("cinematic-mode-changed", enabled);
    Ok(())
}

static PENDING_WINDOW_BOUNDS: OnceLock<Mutex<Option<(i32, i32, u32, u32)>>> = OnceLock::new();
static SAVE_WINDOW_BOUNDS_DEBOUNCE_TIMER: std::sync::atomic::AtomicU64 =
    std::sync::atomic::AtomicU64::new(0);

pub fn cancel_pending_save_window_bounds() {
    if let Ok(mut lock) = PENDING_WINDOW_BOUNDS
        .get_or_init(|| Mutex::new(None))
        .lock()
    {
        *lock = None;
    }
    SAVE_WINDOW_BOUNDS_DEBOUNCE_TIMER.store(0, Ordering::SeqCst);
}

pub fn queue_save_window_bounds(x: i32, y: i32, width: u32, height: u32) {
    if DYNAMIC_ISLAND_ACTIVE.load(Ordering::SeqCst)
        || WALLPAPER_MODE_ACTIVE.load(Ordering::SeqCst)
        || TASKBAR_MODE_ACTIVE.load(Ordering::SeqCst)
    {
        return;
    }
    if let Ok(mut lock) = PENDING_WINDOW_BOUNDS
        .get_or_init(|| Mutex::new(None))
        .lock()
    {
        *lock = Some((x, y, width, height));
    }
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    SAVE_WINDOW_BOUNDS_DEBOUNCE_TIMER.store(now, Ordering::SeqCst);

    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        let last = SAVE_WINDOW_BOUNDS_DEBOUNCE_TIMER.load(Ordering::SeqCst);
        let cur_now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);
        if cur_now.saturating_sub(last) >= 450 {
            flush_save_window_bounds();
        }
    });
}

pub fn flush_save_window_bounds() {
    if DYNAMIC_ISLAND_ACTIVE.load(Ordering::SeqCst)
        || WALLPAPER_MODE_ACTIVE.load(Ordering::SeqCst)
        || TASKBAR_MODE_ACTIVE.load(Ordering::SeqCst)
    {
        cancel_pending_save_window_bounds();
        return;
    }
    if let Ok(mut lock) = PENDING_WINDOW_BOUNDS
        .get_or_init(|| Mutex::new(None))
        .lock()
    {
        if let Some((x, y, width, height)) = lock.take() {
            if width >= 600 && height >= 420 {
                let _ = crate::commands::config::save_window_bounds(
                    crate::commands::config::WindowBounds {
                        x,
                        y,
                        width,
                        height,
                    },
                );
                crate::log_to_file(&format!(
                    "[Window Bounds] Persisted window: pos=({}, {}), size=({}x{})",
                    x, y, width, height
                ));
            }
        }
    }
}

#[tauri::command]
pub async fn set_memory_target_level(window: WebviewWindow, level: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use webview2_com::Microsoft::Web::WebView2::Win32::{
            ICoreWebView2_19, COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW,
            COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_NORMAL,
        };
        use windows::core::Interface;

        let target_level = if level.eq_ignore_ascii_case("low") {
            COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW
        } else {
            COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_NORMAL
        };

        let _ = window.with_webview(move |webview| {
            unsafe {
                if let Ok(core) = webview.controller().CoreWebView2() {
                    if let Ok(core19) = core.cast::<ICoreWebView2_19>() {
                        let _ = core19.SetMemoryUsageTargetLevel(target_level);
                    }
                }
            }
        });
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (window, level);
    }
    Ok(())
}
