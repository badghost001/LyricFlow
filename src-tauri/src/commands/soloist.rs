use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SoloistDaemonStatus {
    pub is_running: bool,
    pub pid: Option<u32>,
    pub port: u16,
    pub device_name: String,
    pub binary_path: Option<String>,
    pub binary_found: bool,
}

static SOLOIST_CHILD: Mutex<Option<Child>> = Mutex::new(None);
static CURRENT_CONFIG: Mutex<Option<(u16, String)>> = Mutex::new(None);

pub fn find_soloist_binary() -> Option<PathBuf> {
    // 1. Current working directory / workspace
    if let Ok(cwd) = std::env::current_dir() {
        let p = cwd.join("bin").join("soloist").join("soloist.exe");
        if p.exists() {
            return Some(p);
        }
        let p2 = cwd.join("bin").join("soloist.exe");
        if p2.exists() {
            return Some(p2);
        }
        if let Some(parent) = cwd.parent() {
            let p = parent.join("bin").join("soloist").join("soloist.exe");
            if p.exists() {
                return Some(p);
            }
            let p2 = parent.join("bin").join("soloist.exe");
            if p2.exists() {
                return Some(p2);
            }
        }
    }

    // 2. Relative to current running executable
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(parent) = exe_path.parent() {
            let p = parent.join("bin").join("soloist").join("soloist.exe");
            if p.exists() {
                return Some(p);
            }
            let p2 = parent.join("bin").join("soloist.exe");
            if p2.exists() {
                return Some(p2);
            }
            let p3 = parent.join("soloist.exe");
            if p3.exists() {
                return Some(p3);
            }
        }
    }

    // 3. User profile / home directory
    if let Some(home) = dirs::home_dir() {
        let p = home
            .join("lyricflow-tauri")
            .join("bin")
            .join("soloist")
            .join("soloist.exe");
        if p.exists() {
            return Some(p);
        }
        let p2 = home.join("lyricflow-tauri").join("bin").join("soloist.exe");
        if p2.exists() {
            return Some(p2);
        }
    }

    // 4. Local AppData directory
    if let Some(local_app_data) = dirs::data_local_dir() {
        let p = local_app_data
            .join("LyricFlow")
            .join("bin")
            .join("soloist")
            .join("soloist.exe");
        if p.exists() {
            return Some(p);
        }
        let p2 = local_app_data
            .join("LyricFlow")
            .join("bin")
            .join("soloist.exe");
        if p2.exists() {
            return Some(p2);
        }
        let p3 = local_app_data.join("soloist").join("soloist.exe");
        if p3.exists() {
            return Some(p3);
        }
    }

    // 4. System PATH
    if let Ok(path_var) = std::env::var("PATH") {
        for path_entry in std::env::split_paths(&path_var) {
            let candidate = path_entry.join("soloist.exe");
            if candidate.exists() {
                return Some(candidate);
            }
        }
    }

    None
}

#[tauri::command]
pub fn get_soloist_daemon_status() -> Result<SoloistDaemonStatus, String> {
    let binary = find_soloist_binary();
    let binary_found = binary.is_some();
    let binary_path = binary.map(|p| p.to_string_lossy().to_string());

    let mut guard = SOLOIST_CHILD
        .lock()
        .map_err(|_| "Failed to lock daemon guard".to_string())?;
    let mut is_running = false;
    let mut pid = None;

    if let Some(child) = guard.as_mut() {
        match child.try_wait() {
            Ok(Some(_exit_status)) => {
                // Process exited
                *guard = None;
            }
            Ok(None) => {
                // Still running
                is_running = true;
                pid = Some(child.id());
            }
            Err(_) => {
                *guard = None;
            }
        }
    }

    let config_guard = CURRENT_CONFIG
        .lock()
        .map_err(|_| "Failed to lock config guard".to_string())?;
    let (port, device_name) = config_guard
        .clone()
        .unwrap_or_else(|| (4488, "LyricFlow".to_string()));

    Ok(SoloistDaemonStatus {
        is_running,
        pid,
        port,
        device_name,
        binary_path,
        binary_found,
    })
}

#[tauri::command]
pub fn start_soloist_daemon(
    api_key: String,
    port: Option<u16>,
    device_name: Option<String>,
) -> Result<SoloistDaemonStatus, String> {
    let port = port.unwrap_or(4488);
    let dev_name = device_name.unwrap_or_else(|| "LyricFlow".to_string());

    if api_key.trim().is_empty() {
        return Err("API key cannot be empty".to_string());
    }

    let binary_path = find_soloist_binary().ok_or_else(|| {
        "soloist.exe binary not found. Please install it or download the package.".to_string()
    })?;

    let mut guard = SOLOIST_CHILD
        .lock()
        .map_err(|_| "Failed to lock daemon guard".to_string())?;

    // Check if already running
    if let Some(child) = guard.as_mut() {
        if let Ok(None) = child.try_wait() {
            let pid = child.id();
            return Ok(SoloistDaemonStatus {
                is_running: true,
                pid: Some(pid),
                port,
                device_name: dev_name,
                binary_path: Some(binary_path.to_string_lossy().to_string()),
                binary_found: true,
            });
        }
    }

    let mut cmd = Command::new(&binary_path);
    cmd.arg("-n").arg(&dev_name);
    cmd.arg("-k").arg(api_key.trim());
    cmd.arg("-w").arg(format!("127.0.0.1:{}", port));

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        // CREATE_NO_WINDOW prevents opening a console window
        cmd.creation_flags(0x08000000);
    }

    cmd.stdout(Stdio::null());
    cmd.stderr(Stdio::null());

    let child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn soloist daemon: {}", e))?;

    let pid = child.id();
    *guard = Some(child);

    if let Ok(mut config_guard) = CURRENT_CONFIG.lock() {
        *config_guard = Some((port, dev_name.clone()));
    }

    Ok(SoloistDaemonStatus {
        is_running: true,
        pid: Some(pid),
        port,
        device_name: dev_name,
        binary_path: Some(binary_path.to_string_lossy().to_string()),
        binary_found: true,
    })
}

#[tauri::command]
pub fn stop_soloist_daemon() -> Result<(), String> {
    let mut guard = SOLOIST_CHILD
        .lock()
        .map_err(|_| "Failed to lock daemon guard".to_string())?;
    if let Some(mut child) = guard.take() {
        let _ = child.kill();
        let _ = child.wait();
    }
    Ok(())
}

#[tauri::command]
pub fn activate_soloist_device(port: Option<u16>) -> Result<String, String> {
    let port = port.unwrap_or(4488);
    let binary_path =
        find_soloist_binary().ok_or_else(|| "soloist.exe binary not found".to_string())?;

    let mut cmd = Command::new(&binary_path);
    cmd.arg("ctl")
        .arg("activate")
        .arg("-w")
        .arg(format!("127.0.0.1:{}", port));

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000);
    }

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to run soloist ctl activate: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}
