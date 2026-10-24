use std::path::PathBuf;
use uuid::Uuid;

pub fn get_app_data_dir() -> Result<PathBuf, String> {
    let base_dir = dirs::data_dir()
        .or_else(dirs::config_dir)
        .or_else(dirs::home_dir)
        .ok_or("Could not find app data directory")?;

    let app_dir = base_dir.join("Flicker");

    if !app_dir.exists() {
        std::fs::create_dir_all(&app_dir)
            .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    }

    Ok(app_dir)
}

pub fn get_screenshots_dir() -> Result<PathBuf, String> {
    let base_dir = dirs::picture_dir()
        .or_else(dirs::home_dir)
        .ok_or("Could not find pictures directory")?;

    let screenshots_dir = base_dir.join("Flicker Screenshots");

    if !screenshots_dir.exists() {
        std::fs::create_dir_all(&screenshots_dir)
            .map_err(|e| format!("Failed to create screenshots directory: {}", e))?;
    }

    Ok(screenshots_dir)
}

pub fn generate_screenshot_filename(prefix: &str) -> String {
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let uuid_short = &Uuid::new_v4().to_string()[..8];
    format!("{}_{}{}.png", prefix, timestamp, uuid_short)
}

pub fn get_recordings_dir() -> Result<PathBuf, String> {
    let base_dir = dirs::video_dir()
        .or_else(dirs::picture_dir)
        .or_else(dirs::home_dir)
        .ok_or("Could not find video directory")?;
    let recordings_dir = base_dir.join("Flicker Recordings");
    if !recordings_dir.exists() {
        std::fs::create_dir_all(&recordings_dir)
            .map_err(|e| format!("Failed to create recordings directory: {}", e))?;
    }
    Ok(recordings_dir)
}

pub fn generate_recording_filename() -> String {
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let uuid_short = &Uuid::new_v4().to_string()[..8];
    format!("Recording_{}{}.mp4", timestamp, uuid_short)
}

pub fn save_screenshot(filename: &str, data: &[u8]) -> Result<PathBuf, String> {
    let screenshots_dir = get_screenshots_dir()?;
    let file_path = screenshots_dir.join(filename);

    std::fs::write(&file_path, data)
        .map_err(|e| format!("Failed to save screenshot: {}", e))?;

    Ok(file_path)
}

pub fn read_file(path: &str) -> Result<Vec<u8>, String> {
    std::fs::read(path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

pub fn get_file_name(path: &str) -> Result<String, String> {
    PathBuf::from(path)
        .file_name()
        .ok_or("Invalid file path")?
        .to_string_lossy()
        .to_string()
        .try_into()
        .map_err(|_| "Invalid file name".to_string())
}

pub fn get_mime_type(path: &str) -> String {
    mime_guess::from_path(path)
        .first_raw()
        .unwrap_or("application/octet-stream")
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_screenshot_filename() {
        let filename = generate_screenshot_filename("screenshot");
        assert!(filename.starts_with("screenshot_"));
        assert!(filename.ends_with(".png"));
    }

    #[test]
    fn test_get_mime_type() {
        assert_eq!(get_mime_type("test.png"), "image/png");
        assert_eq!(get_mime_type("test.txt"), "text/plain");
    }
}

pub fn discard_capture(path: &str) {
    if crate::common::load_config().map(|c| c.capture.save_locally).unwrap_or(true) {
        return;
    }
    let dir = match get_screenshots_dir().and_then(|d| d.canonicalize().map_err(|e| e.to_string())) {
        Ok(dir) => dir,
        Err(_) => return,
    };
    if let Ok(file) = std::path::Path::new(path).canonicalize() {
        if file.starts_with(&dir) {
            let _ = std::fs::remove_file(file);
        }
    }
}
