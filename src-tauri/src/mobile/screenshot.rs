/// Mobile screenshot functionality stubs - not supported on Android/iOS

/// Mobile: Capture screenshot (currently unsupported, returns error)
#[cfg(feature = "mobile")]
pub async fn capture_screenshot(_monitor_index: Option<usize>) -> Result<crate::common::ScreenshotResult, String> {
    Err("Native screenshot not supported on this platform. Use photo library instead.".to_string())
}

/// Mobile: Capture region (currently unsupported, returns error)
#[cfg(feature = "mobile")]
pub async fn capture_region(
    _x: i32,
    _y: i32,
    _width: u32,
    _height: u32,
    _monitor_index: Option<usize>,
) -> Result<crate::common::ScreenshotResult, String> {
    Err("Region capture not supported on this platform.".to_string())
}

/// Mobile: Capture all monitors (currently unsupported)
#[cfg(feature = "mobile")]
pub async fn capture_all_monitors() -> Result<crate::common::ScreenshotResult, String> {
    Err("Multi-monitor capture not supported on this platform.".to_string())
}

/// Mobile: Get monitors (returns empty list)
#[cfg(feature = "mobile")]
pub fn get_monitors() -> Result<Vec<crate::common::types::MonitorInfo>, String> {
    Ok(vec![])  // Mobile has no concept of multiple monitors
}

/// Mobile: Get monitor at point (returns None)
#[cfg(feature = "mobile")]
pub fn get_monitor_at_point(_x: i32, _y: i32) -> Result<Option<usize>, String> {
    Ok(None)  // Mobile has no monitors
}
