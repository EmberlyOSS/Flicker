/// File system operations and directory management

use std::path::PathBuf;
use uuid::Uuid;

/// Get the app data directory for config/state storage
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

/// Get the screenshots directory, creating it if it doesn't exist
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

/// Generate a unique filename for a screenshot with timestamp and UUID
pub fn generate_screenshot_filename(prefix: &str) -> String {
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let uuid_short = &Uuid::new_v4().to_string()[..8];
    format!("{}_{}{}.png", prefix, timestamp, uuid_short)
}

/// Get the recordings directory, creating it if it doesn't exist
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

/// Generate a unique filename for a recording with timestamp and UUID
pub fn generate_recording_filename() -> String {
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let uuid_short = &Uuid::new_v4().to_string()[..8];
    format!("Recording_{}{}.mp4", timestamp, uuid_short)
}

/// Save bytes to a file in the screenshots directory
pub fn save_screenshot(filename: &str, data: &[u8]) -> Result<PathBuf, String> {
    let screenshots_dir = get_screenshots_dir()?;
    let file_path = screenshots_dir.join(filename);
    
    std::fs::write(&file_path, data)
        .map_err(|e| format!("Failed to save screenshot: {}", e))?;
    
    Ok(file_path)
}

/// Read a file and return its contents as bytes
pub fn read_file(path: &str) -> Result<Vec<u8>, String> {
    std::fs::read(path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

/// Get file name from a path
pub fn get_file_name(path: &str) -> Result<String, String> {
    PathBuf::from(path)
        .file_name()
        .ok_or("Invalid file path")?
        .to_string_lossy()
        .to_string()
        .try_into()
        .map_err(|_| "Invalid file name".to_string())
}

/// Get the MIME type for a file
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
