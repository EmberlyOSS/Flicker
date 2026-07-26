/// Upload history management
/// 
/// Handles loading and saving upload history

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadHistoryItem {
    pub url: String,
    pub name: String,
    pub timestamp: u64,
    #[serde(default)]
    pub file_type: String,
    #[serde(default)]
    pub size: Option<u64>,
    #[serde(default)]
    pub thumbnail_url: Option<String>,
}

/// Get the config directory path
fn get_config_dir() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir()
        .ok_or("Could not find config directory")?
        .join("Emberly")
        .join("Flicker");
    
    if !config_dir.exists() {
        std::fs::create_dir_all(&config_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }
    
    Ok(config_dir)
}

/// Load upload history from disk (max 100 items)
pub fn load_history() -> Result<Vec<UploadHistoryItem>, String> {
    let config_dir = get_config_dir()?;
    let history_path = config_dir.join("history.json");
    
    if !history_path.exists() {
        return Ok(vec![]);
    }
    
    let content = std::fs::read_to_string(&history_path)
        .map_err(|e| format!("Failed to read history file: {}", e))?;
    
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse history file: {}", e))
}

/// Save upload history to disk (keeps only last 100 items)
pub fn save_history(history: &[UploadHistoryItem]) -> Result<(), String> {
    let config_dir = get_config_dir()?;
    let history_path = config_dir.join("history.json");
    
    // Keep only last 100 items
    let truncated = if history.len() > 100 {
        &history[..100]
    } else {
        history
    };
    
    let json = serde_json::to_string_pretty(truncated)
        .map_err(|e| format!("Failed to serialize history: {}", e))?;
    
    std::fs::write(&history_path, json)
        .map_err(|e| format!("Failed to write history file: {}", e))?;
    
    Ok(())
}

/// Add an item to the upload history (newest first)
pub fn add_to_history(item: UploadHistoryItem) -> Result<(), String> {
    let mut history = load_history()?;
    history.insert(0, item);
    save_history(&history)
}

/// Clear upload history
pub fn clear_history() -> Result<(), String> {
    save_history(&[])
}
