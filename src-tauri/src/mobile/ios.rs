use tauri::Emitter;

pub async fn capture_screenshot(_monitor_index: Option<usize>) -> Result<crate::common::ScreenshotResult, String> {
    Err("Native screenshot not supported on iOS. Use Photos app or UIImage APIs instead.".to_string())
}

pub async fn capture_region(
    _x: i32,
    _y: i32,
    _width: u32,
    _height: u32,
    _monitor_index: Option<usize>,
) -> Result<crate::common::ScreenshotResult, String> {
    Err("Region capture not supported on iOS.".to_string())
}

pub fn has_required_permissions() -> bool {

    false
}

pub fn request_permissions(window: &tauri::WebviewWindow) {
    let _ = window.emit(
        "ios_permissions_required",
        serde_json::json!({
            "permissions": ["NSPhotoLibraryUsageDescription"],
            "message": "This app needs Photo Library access"
        }),
    );
}
