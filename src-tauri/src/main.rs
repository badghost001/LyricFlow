// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "windows")]
    std::env::set_var(
        "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
        "--disable-font-subpixel-positioning --disable-lcd-text --enable-gpu-rasterization --enable-zero-copy --canvas-msaa-sample-count=0 --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows",
    );
    lyricflow_lib::log_to_file("[LyricFlow Main] Process starting...");
    std::panic::set_hook(Box::new(|info| {
        lyricflow_lib::log_to_file(&format!("[LyricFlow PANIC] {:?}", info));
        eprintln!("[LyricFlow PANIC] {:?}", info);
    }));
    lyricflow_lib::run();
    lyricflow_lib::log_to_file("[LyricFlow Main] Process finished.");
}
