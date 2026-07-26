/// iOS-specific functionality

use tauri::Emitter;

/// iOS screenshot capture (not supported)
pub async fn capture_screenshot(_monitor_index: Option<usize>) -> Result<crate::common::ScreenshotResult, String> {
    Err("Native screenshot not supported on iOS. Use Photos app or UIImage APIs instead.".to_string())
}

/// iOS region capture (not supported)
pub async fn capture_region(
    _x: i32,
    _y: i32,
    _width: u32,
    _height: u32,
    _monitor_index: Option<usize>,
) -> Result<crate::common::ScreenshotResult, String> {
    Err("Region capture not supported on iOS.".to_string())
}

/// Check if running with necessary iOS permissions
pub fn has_required_permissions() -> bool {
    // This would integrate with iOS permission system
    // For now, return false to indicate permissions need to be requested
    false
}

/// Request necessary iOS permissions
pub fn request_permissions(window: &tauri::WebviewWindow) {
    let _ = window.emit(
        "ios_permissions_required",
        serde_json::json!({
            "permissions": ["NSPhotoLibraryUsageDescription"],
            "message": "This app needs Photo Library access"
        }),
    );
}
