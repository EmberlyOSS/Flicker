/// Desktop platform abstraction - shared capabilities for Windows, macOS, Linux

use super::detection::PlatformType;

/// Desktop-specific platform capabilities
pub struct DesktopCapabilities {
    pub native_screenshot: bool,
    pub region_capture: bool,
    pub multi_monitor: bool,
    pub system_tray: bool,
    pub clipboard_access: bool,
    pub elevation_support: bool,
}

/// Get desktop platform capabilities
pub fn get_desktop_capabilities() -> DesktopCapabilities {
    DesktopCapabilities {
        native_screenshot: true,
        region_capture: true,
        multi_monitor: true,
        system_tray: true,
        clipboard_access: true,
        elevation_support: true,
    }
}

/// Check if elevation is available on this desktop platform
pub fn supports_elevation(platform: PlatformType) -> bool {
    matches!(platform, PlatformType::Windows | PlatformType::MacOs | PlatformType::Linux)
}

/// Get desktop file access level
pub fn get_file_access() -> String {
    "full".to_string()
}
