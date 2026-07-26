/// Mobile platform abstraction - shared capabilities for Android, iOS

/// Mobile-specific platform capabilities
pub struct MobileCapabilities {
    pub native_screenshot: bool,
    pub region_capture: bool,
    pub multi_monitor: bool,
    pub system_tray: bool,
    pub clipboard_access: bool,
    pub file_access: String,
}

/// Get mobile platform capabilities
pub fn get_mobile_capabilities() -> MobileCapabilities {
    MobileCapabilities {
        native_screenshot: false,
        region_capture: false,
        multi_monitor: false,
        system_tray: false,
        clipboard_access: true,
        file_access: "restricted".to_string(),
    }
}
