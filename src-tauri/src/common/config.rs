/// Configuration file management
/// 
/// Handles loading and saving app configuration to the system config directory

use std::path::PathBuf;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub upload_token: String,
    pub upload_url: Option<String>,
    pub visibility: String,  // "PUBLIC" or "PRIVATE"
    pub password: Option<String>,
    pub auto_upload: bool,
    pub default_notification: bool,
    
    #[serde(default)]
    pub appearance: AppearanceConfig,
    
    #[serde(default)]
    pub behavior: BehaviorConfig,
    
    #[serde(default)]
    pub capture: CaptureConfig,
    
    #[serde(default)]
    pub hotkeys: HotkeyConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppearanceConfig {
    pub theme: String,
    pub background_opacity: f32,
    pub font_scale: String,  // "small", "medium", "large"
    #[serde(default)]
    pub custom_colors: Option<CustomColors>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomColors {
    pub primary: String,
    pub secondary: String,
    pub background: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BehaviorConfig {
    pub post_upload_action: String,  // "copy", "open", "none"
    pub clipboard_format: String,    // "url", "raw-url", "markdown", "html"
    pub play_sound: bool,
    pub start_at_login: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureConfig {
    pub format: String,  // "png" or "jpg"
    pub quality: u32,    // 1-100 for jpg
    pub delay: u32,      // seconds
    pub filename_pattern: String,
    pub save_locally: bool,
    pub include_cursor: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HotkeyConfig {
    pub screenshot_fullscreen: String,
    pub screenshot_region: String,
    pub screenshot_all_monitors: String,
    pub upload_clipboard: String,
    pub open_app: String,
}

impl Default for AppearanceConfig {
    fn default() -> Self {
        Self {
            theme: "dark".to_string(),
            background_opacity: 0.95,
            font_scale: "medium".to_string(),
            custom_colors: None,
        }
    }
}

impl Default for BehaviorConfig {
    fn default() -> Self {
        Self {
            post_upload_action: "copy".to_string(),
            clipboard_format: "url".to_string(),
            play_sound: true,
            start_at_login: false,
        }
    }
}

impl Default for CaptureConfig {
    fn default() -> Self {
        Self {
            format: "png".to_string(),
            quality: 100,
            delay: 0,
            filename_pattern: "Screenshot_%Y-%m-%d_%H-%M-%S".to_string(),
            save_locally: false,
            include_cursor: true,
        }
    }
}

impl Default for HotkeyConfig {
    fn default() -> Self {
        Self {
            screenshot_fullscreen: "Control+Shift+S".to_string(),
            screenshot_region: String::new(),
            screenshot_all_monitors: "Control+Shift+A".to_string(),
            upload_clipboard: String::new(),
            open_app: String::new(),
        }
    }
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            upload_token: String::new(),
            upload_url: Some("https://embrly.ca".to_string()),
            visibility: "PUBLIC".to_string(),
            password: None,
            auto_upload: true,
            default_notification: true,
            appearance: AppearanceConfig::default(),
            behavior: BehaviorConfig::default(),
            capture: CaptureConfig::default(),
            hotkeys: HotkeyConfig::default(),
        }
    }
}

/// Get the config directory path (~/.config/flicker on Linux/macOS, %APPDATA%\Emberly\Flicker on Windows)
pub fn get_config_dir() -> Result<PathBuf, String> {
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

/// Load configuration from disk
pub fn load_config() -> Result<AppConfig, String> {
    let config_dir = get_config_dir()?;
    let config_path = config_dir.join("config.json");
    
    if !config_path.exists() {
        return Ok(AppConfig::default());
    }
    
    let content = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;
    
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse config file: {}", e))
}

/// Save configuration to disk
pub fn save_config(config: &AppConfig) -> Result<(), String> {
    let config_dir = get_config_dir()?;
    let config_path = config_dir.join("config.json");
    
    let json = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    
    std::fs::write(&config_path, json)
        .map_err(|e| format!("Failed to write config file: {}", e))?;
    
    Ok(())
}
