/// Configuration file management
/// 
/// Handles loading and saving app configuration to the system config directory

use std::path::PathBuf;
use serde::{Deserialize, Serialize};

fn default_fps() -> u32 { 30 }
fn default_max_duration() -> u32 { 600 }
fn default_record_video() -> String { "Super+Shift+R".to_string() }
fn default_true() -> bool { true }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    #[serde(alias = "uploadToken", default)]
    pub upload_token: String,
    #[serde(alias = "uploadUrl")]
    pub upload_url: Option<String>,
    pub visibility: String,  // "PUBLIC" or "PRIVATE"
    pub password: Option<String>,
    #[serde(alias = "autoUpload", default)]
    pub auto_upload: bool,
    #[serde(alias = "defaultNotification", default)]
    pub default_notification: bool,
    
    #[serde(default, alias = "appearance")]
    pub appearance: AppearanceConfig,
    
    #[serde(default, alias = "behavior")]
    pub behavior: BehaviorConfig,
    
    #[serde(default, alias = "capture")]
    pub capture: CaptureConfig,
    
    #[serde(default, alias = "hotkeys")]
    pub hotkeys: HotkeyConfig,

    #[serde(default, alias = "video")]
    pub video: VideoConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppearanceConfig {
    pub theme: String,
    #[serde(alias = "backgroundOpacity", default)]
    pub background_opacity: f32,
    #[serde(alias = "fontScale", default)]
    pub font_scale: String,  // "small", "medium", "large"
    #[serde(default, alias = "customColors")]
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
    #[serde(alias = "postUploadAction", default)]
    pub post_upload_action: String,  // "copy", "open", "none"
    #[serde(alias = "clipboardFormat", default)]
    pub clipboard_format: String,    // "url", "raw-url", "markdown", "html"
    #[serde(alias = "playSound", default)]
    pub play_sound: bool,
    #[serde(alias = "startAtLogin", default)]
    pub start_at_login: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureConfig {
    pub format: String,  // "png" or "jpg"
    pub quality: u32,    // 1-100 for jpg
    pub delay: u32,      // seconds
    #[serde(alias = "filenamePattern", default)]
    pub filename_pattern: String,
    #[serde(alias = "saveLocally", default)]
    pub save_locally: bool,
    #[serde(alias = "includeCursor", default)]
    pub include_cursor: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HotkeyConfig {
    #[serde(alias = "screenshotFullscreen", default)]
    pub screenshot_fullscreen: String,
    #[serde(alias = "screenshotRegion", default)]
    pub screenshot_region: String,
    #[serde(alias = "screenshotAllMonitors", default)]
    pub screenshot_all_monitors: String,
    #[serde(alias = "uploadClipboard", default)]
    pub upload_clipboard: String,
    #[serde(alias = "openApp", default)]
    pub open_app: String,
    #[serde(alias = "recordVideo", default = "default_record_video")]
    pub record_video: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoConfig {
    #[serde(alias = "includeSystemAudio", default = "default_true")]
    pub include_system_audio: bool,
    #[serde(alias = "includeMic", default)]
    pub include_mic: bool,
    #[serde(alias = "showClicks", default)]
    pub show_clicks: bool,
    #[serde(default = "default_fps", alias = "fps")]
    pub fps: u32,
    #[serde(default = "default_max_duration", alias = "maxDurationSecs")]
    pub max_duration_secs: u32,
    #[serde(alias = "autoUpload", default = "default_true")]
    pub auto_upload: bool,
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

impl Default for VideoConfig {
    fn default() -> Self {
        Self {
            include_system_audio: true,
            include_mic: false,
            show_clicks: false,
            fps: default_fps(),
            max_duration_secs: default_max_duration(),
            auto_upload: true,
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
            record_video: "Super+Shift+R".to_string(),
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
            video: VideoConfig::default(),
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
        println!("[Flicker] load_config: no file at {:?}, using default (token empty)", config_path);
        return Ok(AppConfig::default());
    }
    
    let content = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;
    println!("[Flicker] load_config: read {} bytes from {:?}", content.len(), config_path);
    
    let cfg: AppConfig = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse config file: {}", e))?;
    println!("[Flicker] load_config: token_len={} hotkeys: fullscreen='{}' region='{}' record_video='{}' video: sys_audio={} mic={} fps={}", 
        cfg.upload_token.len(), cfg.hotkeys.screenshot_fullscreen, cfg.hotkeys.screenshot_region, cfg.hotkeys.record_video,
        cfg.video.include_system_audio, cfg.video.include_mic, cfg.video.fps);
    Ok(cfg)
}

/// Save configuration to disk
pub fn save_config(config: &AppConfig) -> Result<(), String> {
    let config_dir = get_config_dir()?;
    let config_path = config_dir.join("config.json");
    
    let json = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    println!("[Flicker] save_config: writing {} bytes token_len={} to {:?}", json.len(), config.upload_token.len(), config_path);
    
    std::fs::write(&config_path, json)
        .map_err(|e| format!("Failed to write config file: {}", e))?;
    
    println!("[Flicker] save_config: done");
    Ok(())
}
