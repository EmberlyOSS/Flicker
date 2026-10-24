use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UploadResponse {
    pub id: Option<String>,
    pub url: String,
    pub name: String,
    pub size: u64,
    #[serde(rename = "type")]
    pub file_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScreenshotResult {
    pub path: String,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UploadCompleteEvent {
    pub id: Option<String>,
    pub url: String,
    pub name: String,
    pub size: u64,
    pub file_type: String,
    pub screenshot_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UploadProgressEvent {
    pub file_path: String,
    pub uploaded: u64,
    pub total: u64,
    pub percentage: f64,
}

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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemInfo {
    pub platform: String,
    pub arch: String,
    pub temp_dir: String,
    pub screenshots_dir: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PlatformCapabilities {
    pub platform: String,
    pub native_screenshot: bool,
    pub region_capture: bool,
    pub multi_monitor: bool,
    pub system_tray: bool,
    pub clipboard_access: bool,
    pub file_access: String,
    pub elevation_support: bool,
}

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
