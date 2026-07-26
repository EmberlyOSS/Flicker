/// Shared types and data structures for the Flicker application

use serde::{Deserialize, Serialize};

/// Response from the Emberly file upload API
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UploadResponse {
    pub url: String,
    pub name: String,
    pub size: u64,
    #[serde(rename = "type")]
    pub file_type: String,
}

/// Screenshot result with file path and dimensions
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScreenshotResult {
    pub path: String,
    pub width: u32,
    pub height: u32,
}

/// Upload result with URL for clipboard
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UploadCompleteEvent {
    pub url: String,
    pub name: String,
    pub size: u64,
    pub file_type: String,
    pub screenshot_path: Option<String>,
}

/// Emitted repeatedly while a file is being streamed to the server
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UploadProgressEvent {
    pub file_path: String,
    pub uploaded: u64,
    pub total: u64,
    pub percentage: f64,
}

/// Monitor information
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MonitorInfo {
    pub index: usize,
    pub id: u32,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub is_primary: bool,
    pub scale_factor: f64,
}

/// System information
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemInfo {
    pub platform: String,
    pub arch: String,
    pub temp_dir: String,
    pub screenshots_dir: Option<String>,
}

/// Platform capabilities - what the app can do on this system
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PlatformCapabilities {
    pub platform: String,
    pub native_screenshot: bool,
    pub region_capture: bool,
    pub multi_monitor: bool,
    pub system_tray: bool,
    pub clipboard_access: bool,
    pub file_access: String,  // "full" or "restricted"
    pub elevation_support: bool,
}

/// Visibility levels for uploads
#[derive(Debug, Clone, PartialEq)]
pub enum UploadVisibility {
    Public,
    Private,
    Unlisted,
}

impl From<String> for UploadVisibility {
    fn from(s: String) -> Self {
        match s.to_lowercase().as_str() {
            "private" => UploadVisibility::Private,
            "unlisted" => UploadVisibility::Unlisted,
            _ => UploadVisibility::Public,
        }
    }
}

impl ToString for UploadVisibility {
    fn to_string(&self) -> String {
        match self {
            UploadVisibility::Public => "public".to_string(),
            UploadVisibility::Private => "private".to_string(),
            UploadVisibility::Unlisted => "unlisted".to_string(),
        }
    }
}
