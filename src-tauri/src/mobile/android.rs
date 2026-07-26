/// Android-specific functionality

use tauri::Emitter;

/// Android screenshot capture (not supported)
pub async fn capture_screenshot(_monitor_index: Option<usize>) -> Result<crate::common::ScreenshotResult, String> {
    Err("Native screenshot not supported on Android. Use photo library or MediaStore instead.".to_string())
}

/// Android region capture (not supported)
pub async fn capture_region(
    _x: i32,
    _y: i32,
    _width: u32,
    _height: u32,
    _monitor_index: Option<usize>,
) -> Result<crate::common::ScreenshotResult, String> {
    Err("Region capture not supported on Android.".to_string())
}

/// Check if running with necessary Android permissions
pub fn has_required_permissions() -> bool {
    // This would integrate with Android permission system
    // For now, return false to indicate permissions need to be requested
    false
}

/// Request necessary Android permissions
pub fn request_permissions(window: &tauri::WebviewWindow) {
    let _ = window.emit(
        "android_permissions_required",
        serde_json::json!({
            "permissions": ["android.permission.READ_EXTERNAL_STORAGE"],
            "message": "This app needs storage permissions to access files"
        }),
    );
}
