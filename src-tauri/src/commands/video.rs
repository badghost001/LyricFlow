use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(serde::Deserialize)]
pub struct KineticVideoExportPayload {
    pub video_base64: Option<String>,
    pub audio_base64: Option<String>,
    pub audio_path: Option<String>,
    pub start_time_sec: Option<f64>,
    pub duration_sec: Option<f64>,
    pub output_path: String,
}

#[derive(serde::Deserialize)]
pub struct SaveCardImagePayload {
    pub image_base64: String,
    pub filename: String,
}

#[tauri::command]
pub async fn export_kinetic_video(payload: KineticVideoExportPayload) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        let mut output_path = PathBuf::from(&payload.output_path);
        if output_path.is_relative() {
            let base_dir = dirs::video_dir()
                .or_else(dirs::download_dir)
                .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));
            let lyricflow_dir = base_dir.join("LyricFlow");
            let _ = fs::create_dir_all(&lyricflow_dir);
            output_path = lyricflow_dir.join(output_path);
        }

        if let Some(parent) = output_path.parent() {
            let _ = fs::create_dir_all(parent);
        }

        // Temp directory for muxing
        let temp_dir = std::env::temp_dir().join(format!(
            "lyricflow_kinetic_{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis()
        ));
        let _ = fs::create_dir_all(&temp_dir);

        let temp_video = temp_dir.join("input_video.webm");
        if let Some(ref v_b64) = payload.video_base64 {
            let bytes = crate::models::base64_decode(v_b64)?;
            fs::write(&temp_video, &bytes).map_err(|e| format!("Failed to write temp video: {}", e))?;
        } else {
            return Err("Missing video data".to_string());
        }

        let mut has_audio = false;
        let mut audio_src_arg = String::new();
        let temp_audio = temp_dir.join("input_audio.wav");

        if let Some(ref a_b64) = payload.audio_base64 {
            if let Ok(bytes) = crate::models::base64_decode(a_b64) {
                if !bytes.is_empty() && fs::write(&temp_audio, &bytes).is_ok() {
                    has_audio = true;
                    audio_src_arg = temp_audio.to_string_lossy().to_string();
                }
            }
        } else if let Some(ref a_path) = payload.audio_path {
            if Path::new(a_path).exists() {
                has_audio = true;
                audio_src_arg = a_path.clone();
            }
        }

        // Check if ffmpeg is available
        let ffmpeg_exists = Command::new("ffmpeg")
            .arg("-version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);

        if !ffmpeg_exists {
            // Fallback: Copy raw video file to output path as webm
            output_path.set_extension("webm");
            let _ = fs::copy(&temp_video, &output_path);
            let _ = fs::remove_dir_all(&temp_dir);

            #[cfg(target_os = "windows")]
            {
                let _ = Command::new("explorer")
                    .arg(format!("/select,{}", output_path.to_string_lossy()))
                    .spawn();
            }
            #[cfg(not(target_os = "windows"))]
            {
                let _ = open::that_detached(&output_path);
            }

            return Ok(output_path.to_string_lossy().to_string());
        }

        let mut cmd = Command::new("ffmpeg");
        cmd.arg("-y"); // overwrite
        cmd.arg("-i").arg(&temp_video);

        let start_sec = payload.start_time_sec.unwrap_or(0.0);
        let duration_sec = payload.duration_sec.unwrap_or(15.0);

        if has_audio {
            cmd.arg("-ss").arg(format!("{:.3}", start_sec));
            cmd.arg("-t").arg(format!("{:.3}", duration_sec));
            cmd.arg("-i").arg(&audio_src_arg);

            cmd.arg("-c:v").arg("libx264");
            cmd.arg("-preset").arg("fast");
            cmd.arg("-crf").arg("18");
            cmd.arg("-pix_fmt").arg("yuv420p");
            cmd.arg("-c:a").arg("aac");
            cmd.arg("-b:a").arg("192k");
            cmd.arg("-shortest");
        } else {
            cmd.arg("-c:v").arg("libx264");
            cmd.arg("-preset").arg("fast");
            cmd.arg("-crf").arg("18");
            cmd.arg("-pix_fmt").arg("yuv420p");
        }

        cmd.arg(&output_path);

        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }

        let output = cmd.output().map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;

        // Cleanup temp dir
        let _ = fs::remove_dir_all(&temp_dir);

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg encoding failed: {}", stderr));
        }

        #[cfg(target_os = "windows")]
        {
            let _ = Command::new("explorer")
                .arg(format!("/select,{}", output_path.to_string_lossy()))
                .spawn();
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = open::that_detached(&output_path);
        }

        Ok(output_path.to_string_lossy().to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn save_card_image(payload: SaveCardImagePayload) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        let base_dir = dirs::picture_dir()
            .or_else(dirs::download_dir)
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));
        let folder = base_dir.join("LyricFlow");
        let _ = fs::create_dir_all(&folder);

        let final_path = folder.join(&payload.filename);
        let bytes = crate::models::base64_decode(&payload.image_base64)?;
        fs::write(&final_path, &bytes).map_err(|e| format!("Failed to write image file: {}", e))?;

        #[cfg(target_os = "windows")]
        {
            let _ = Command::new("explorer")
                .arg(format!("/select,{}", final_path.to_string_lossy()))
                .spawn();
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = open::that_detached(&final_path);
        }

        Ok(final_path.to_string_lossy().to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}
