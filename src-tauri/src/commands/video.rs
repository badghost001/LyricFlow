use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(serde::Deserialize)]
pub struct KineticVideoExportPayload {
    pub video_base64: Option<String>,
    pub audio_base64: Option<String>,
    pub audio_extension: Option<String>,
    pub audio_path: Option<String>,
    pub start_time_sec: Option<f64>,
    pub duration_sec: Option<f64>,
    pub frame_rate: Option<u32>,
    pub quality: Option<String>,
    pub output_path: String,
}

#[derive(serde::Deserialize)]
pub struct SaveCardImagePayload {
    pub image_base64: String,
    pub filename: String,
}

fn validate_image_filename(filename: &str) -> Result<&str, String> {
    let filename = filename.trim();
    if filename.is_empty()
        || filename == "."
        || filename == ".."
        || filename
            .chars()
            .any(|c| matches!(c, '/' | '\\' | ':' | '\0'))
    {
        return Err("Image filename must be a single file name".to_string());
    }
    Ok(filename)
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
        let is_gif = output_path.extension()
            .and_then(|ext| ext.to_str())
            .is_some_and(|ext| ext.eq_ignore_ascii_case("gif"));

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
        let audio_extension = payload.audio_extension.as_deref().unwrap_or("wav").to_ascii_lowercase();
        let safe_audio_extension = match audio_extension.as_str() {
            "mp3" | "m4a" | "wav" | "flac" | "aac" | "ogg" | "opus" | "mp4" => audio_extension.as_str(),
            _ => "wav",
        };
        let temp_audio = temp_dir.join(format!("input_audio.{}", safe_audio_extension));

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
            if is_gif {
                let _ = fs::remove_dir_all(&temp_dir);
                return Err("GIF export requires FFmpeg. Install FFmpeg or choose MP4.".to_string());
            }
            if has_audio {
                let _ = fs::remove_dir_all(&temp_dir);
                return Err("MP4 export with song audio requires FFmpeg. Install FFmpeg and try again.".to_string());
            }
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

        let frame_rate = payload.frame_rate.unwrap_or(30).clamp(10, 60);
        let quality = payload.quality.as_deref().unwrap_or("high");

        let start_sec = payload.start_time_sec.unwrap_or(0.0);
        let duration_sec = payload.duration_sec.unwrap_or(15.0);

        if is_gif {
            let gif_fps = frame_rate.min(30);
            cmd.arg("-filter_complex").arg(format!(
                "[0:v]fps={},scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer[out]",
                gif_fps
            ));
            cmd.arg("-map").arg("[out]");
            cmd.arg("-loop").arg("0");
        } else if has_audio {
            cmd.arg("-ss").arg(format!("{:.3}", start_sec));
            cmd.arg("-t").arg(format!("{:.3}", duration_sec));
            cmd.arg("-i").arg(&audio_src_arg);

            cmd.arg("-c:v").arg("libx264");
            cmd.arg("-preset").arg("fast");
            cmd.arg("-crf").arg(match quality { "standard" => "23", "maximum" => "15", _ => "18" });
            cmd.arg("-pix_fmt").arg("yuv420p");
            cmd.arg("-c:a").arg("aac");
            cmd.arg("-b:a").arg("192k");
            cmd.arg("-shortest");
        } else {
            cmd.arg("-c:v").arg("libx264");
            cmd.arg("-preset").arg("fast");
            cmd.arg("-crf").arg(match quality { "standard" => "23", "maximum" => "15", _ => "18" });
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
        let filename = validate_image_filename(&payload.filename)?;
        let base_dir = dirs::picture_dir()
            .or_else(dirs::download_dir)
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));
        let folder = base_dir.join("LyricFlow");
        let _ = fs::create_dir_all(&folder);

        let final_path = folder.join(filename);
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

#[cfg(test)]
mod tests {
    use super::validate_image_filename;

    #[test]
    fn image_export_filename_must_not_escape_target_folder() {
        for filename in [
            "../outside.png",
            "..\\outside.png",
            "C:\\outside.png",
            "\\\\server\\share.png",
            "folder/image.png",
            "stream.png:ads",
        ] {
            assert!(
                validate_image_filename(filename).is_err(),
                "accepted unsafe filename: {filename}"
            );
        }
        assert_eq!(
            validate_image_filename("cover art.png").unwrap(),
            "cover art.png"
        );
    }
}
