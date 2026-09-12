use std::fs;
use std::path::PathBuf;

fn get_config_path() -> PathBuf {
    if let Some(config_dir) = dirs::config_dir() {
        let app_dir = config_dir.join("LyricFlow");
        let _ = fs::create_dir_all(&app_dir);
        let config_path = app_dir.join("config.json");

        // Seamless migration & sync: if LyricFlow config doesn't exist, check old spotify-lyrics-overlay
        let old_path = config_dir.join("spotify-lyrics-overlay").join("config.json");
        if !config_path.exists() {
            if old_path.exists() {
                let _ = fs::copy(&old_path, &config_path);
            }
        } else if old_path.exists() {
            if let Ok(old_data) = fs::read_to_string(&old_path) {
                if let Ok(old_json) = serde_json::from_str::<serde_json::Value>(&old_data) {
                    if old_json["localMode"].as_bool() == Some(true) {
                        if let Ok(cur_data) = fs::read_to_string(&config_path) {
                            if let Ok(mut cur_json) = serde_json::from_str::<serde_json::Value>(&cur_data) {
                                if cur_json["access_token"].as_str().is_none() && cur_json["localMode"].as_bool() != Some(true) {
                                    cur_json["localMode"] = serde_json::json!(true);
                                    let _ = fs::write(&config_path, serde_json::to_string_pretty(&cur_json).unwrap_or_default());
                                }
                            }
                        }
                    }
                }
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
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let out = Command::new("osascript")
            .args(["-e", "tell application \"System Events\" to get picture of current desktop"])
            .output();
        if let Ok(o) = out {
            let path = String::from_utf8_lossy(&o.stdout).trim().to_string();
            if !path.is_empty() && std::path::Path::new(&path).exists() {
                return Ok(Some(path));
            }
        }
    }

    Ok(None)
}

#[tauri::command]
pub fn get_auto_launch() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let out = Command::new("powershell")
            .args(["-NoProfile", "-Command", "if (Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name 'LyricFlow' -ErrorAction SilentlyContinue) { 'true' } else { 'false' }"])
            .output();
        if let Ok(o) = out {
            let s = String::from_utf8_lossy(&o.stdout).trim().to_string();
            return Ok(s == "true");
        }
    }
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let out = Command::new("osascript")
            .args(["-e", "tell application \"System Events\" to get name of every login item contains \"LyricFlow\""])
            .output();
        if let Ok(o) = out {
            let s = String::from_utf8_lossy(&o.stdout).trim().to_string();
            return Ok(s == "true");
        }
    }
    Ok(false)
}

#[tauri::command]
pub fn set_auto_launch(enabled: bool) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        if enabled {
            if let Ok(exe) = std::env::current_exe() {
                let exe_str = exe.to_string_lossy().to_string();
                let cmd = format!("Set-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name 'LyricFlow' -Value '\"{}\"'", exe_str);
                let _ = Command::new("powershell").args(["-NoProfile", "-Command", &cmd]).output();
            }
        } else {
            let _ = Command::new("powershell").args(["-NoProfile", "-Command", "Remove-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name 'LyricFlow' -ErrorAction SilentlyContinue"]).output();
        }
    }
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        if enabled {
            if let Ok(exe) = std::env::current_exe() {
                let path = exe.to_string_lossy().to_string();
                let script = format!("tell application \"System Events\" to make login item at end with properties {{name:\"LyricFlow\", path:\"{}\", hidden:false}}", path);
                let _ = Command::new("osascript").args(["-e", &script]).output();
            }
        } else {
            let script = "tell application \"System Events\" to delete (every login item whose name is \"LyricFlow\")";
            let _ = Command::new("osascript").args(["-e", script]).output();
        }
    }
    Ok(enabled)
}

#[tauri::command]
pub fn get_taskbar_color() -> Result<serde_json::Value, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let out = Command::new("cmd")
            .args(["/C", "reg query \"HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize\" /v SystemUsesLightTheme && reg query \"HKCU\\Software\\Microsoft\\Windows\\DWM\" /v ColorizationColor && reg query \"HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize\" /v ColorPrevalence"])
            .output();
        if let Ok(o) = out {
            let stdout = String::from_utf8_lossy(&o.stdout);
            let mut is_light = false;
            let mut color_prevalence = 0u32;
            let mut colorization = 0u32;

            for line in stdout.lines() {
                if line.contains("SystemUsesLightTheme") {
                    if let Some(pos) = line.find("0x") {
                        let hex = line[pos..].trim();
                        if let Ok(val) = u32::from_str_radix(hex.trim_start_matches("0x"), 16) {
                            is_light = val == 1;
                        }
                    }
                } else if line.contains("ColorizationColor") {
                    if let Some(pos) = line.find("0x") {
                        let hex = line[pos..].trim();
                        if let Ok(val) = u32::from_str_radix(hex.trim_start_matches("0x"), 16) {
                            colorization = val;
                        }
                    }
                } else if line.contains("ColorPrevalence") {
                    if let Some(pos) = line.find("0x") {
                        let hex = line[pos..].trim();
                        if let Ok(val) = u32::from_str_radix(hex.trim_start_matches("0x"), 16) {
                            color_prevalence = val;
                        }
                    }
                }
            }

            if color_prevalence == 1 && colorization > 0 {
                let r = ((colorization >> 16) & 0xff) as f32;
                let g = ((colorization >> 8) & 0xff) as f32;
                let b = (colorization & 0xff) as f32;
                let luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
                let text_color = if luminance > 0.5 { "#121212" } else { "#ffffff" };
                let theme = if luminance > 0.5 { "light" } else { "dark" };
                return Ok(serde_json::json!({
                    "theme": theme,
                    "color": text_color,
                    "bgColor": format!("rgba({r}, {g}, {b}, 0.85)"),
                    "accentColor": format!("rgb({r}, {g}, {b})")
                }));
            }

            if is_light {
                return Ok(serde_json::json!({
                    "theme": "light",
                    "color": "#121212",
                    "bgColor": "rgba(243, 243, 243, 0.75)",
                    "accentColor": "#1DB954"
                }));
            } else {
                return Ok(serde_json::json!({
                    "theme": "dark",
                    "color": "#ffffff",
                    "bgColor": "rgba(32, 32, 32, 0.75)",
                    "accentColor": "#1DB954"
                }));
            }
        }
    }
    Ok(serde_json::json!({ "theme": "dark", "color": "#ffffff", "accentColor": "#1DB954" }))
}

#[tauri::command]
pub fn select_background_file() -> Result<Option<String>, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let script = r#"[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; $f = New-Object System.Windows.Forms.OpenFileDialog; $f.Filter = 'Media files (*.mp4;*.webm;*.jpg;*.jpeg;*.png;*.gif)|*.mp4;*.webm;*.jpg;*.jpeg;*.png;*.gif|All files (*.*)|*.*'; $f.Title = 'Select Background Media'; if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $f.FileName }"#;
        let out = Command::new("powershell")
            .args(["-NoProfile", "-Command", script])
            .output();
        if let Ok(o) = out {
            let path = String::from_utf8_lossy(&o.stdout).trim().to_string();
            if !path.is_empty() {
                return Ok(Some(path));
            }
        }
    }
    Ok(None)
}

