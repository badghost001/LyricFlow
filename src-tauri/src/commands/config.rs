use std::fs;
use std::path::PathBuf;

fn get_config_path() -> PathBuf {
    if let Some(config_dir) = dirs::config_dir() {
        let app_dir = config_dir.join("LyricFlow");
        let _ = fs::create_dir_all(&app_dir);
        let config_path = app_dir.join("config.json");

        // Seamless migration: if LyricFlow config doesn't exist, check old spotify-lyrics-overlay
        if !config_path.exists() {
            let old_path = config_dir.join("spotify-lyrics-overlay").join("config.json");
            if old_path.exists() {
                let _ = fs::copy(&old_path, &config_path);
            }
        }
        config_path
    } else {
        PathBuf::from("config.json")
    }
}

#[tauri::command]
pub fn load_config() -> Result<Option<serde_json::Value>, String> {
    let path = get_config_path();
    if !path.exists() {
        return Ok(None);
    }
    let data = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let json: serde_json::Value = serde_json::from_str(&data).unwrap_or_else(|_| serde_json::json!({}));
    if json.as_object().map_or(true, |o| o.is_empty()) {
        return Ok(None);
    }
    Ok(Some(json))
}

#[tauri::command]
pub fn save_config(config: serde_json::Value) -> Result<(), String> {
    let path = get_config_path();
    let data = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(&path, data).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn reset_config() -> Result<Option<serde_json::Value>, String> {
    let path = get_config_path();
    if path.exists() {
        let _ = fs::remove_file(&path);
    }
    Ok(None)
}

#[tauri::command]
pub fn get_desktop_wallpaper() -> Result<Option<String>, String> {
    #[cfg(target_os = "windows")]
    {
        use std::ffi::OsString;
        use std::os::windows::ffi::OsStringExt;
        use windows::Win32::UI::WindowsAndMessaging::{SystemParametersInfoW, SPI_GETDESKWALLPAPER, SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS};

        let mut buf = [0u16; 260];
        unsafe {
            let success = SystemParametersInfoW(
                SPI_GETDESKWALLPAPER,
                buf.len() as u32,
                Some(buf.as_mut_ptr() as *mut _),
                SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS(0),
            );
            if success.is_ok() {
                let len = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
                let os_str = OsString::from_wide(&buf[..len]);
                return Ok(Some(os_str.to_string_lossy().to_string()));
            }
        }
    }

    Ok(None)
}
