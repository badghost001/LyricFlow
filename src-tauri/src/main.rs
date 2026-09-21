// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  lyricflow_lib::log_to_file("[LyricFlow Main] Process starting...");
  std::panic::set_hook(Box::new(|info| {
    lyricflow_lib::log_to_file(&format!("[LyricFlow PANIC] {:?}", info));
    eprintln!("[LyricFlow PANIC] {:?}", info);
  }));
  lyricflow_lib::run();
  lyricflow_lib::log_to_file("[LyricFlow Main] Process finished.");
}

