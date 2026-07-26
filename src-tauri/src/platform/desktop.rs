/**
 * Desktop platform-specific capabilities and functions
 *
 * This module provides functions and structures to determine the capabilities of the desktop platform
 * on which the application is running. It includes information about native screenshot support, region capture,
 * and other platform-specific features.
 */

use super::detection::PlatformType;

pub struct DesktopCapabilities {
    pub native_screenshot: bool,
    pub region_capture: bool,
    pub multi_monitor: bool,
    pub system_tray: bool,
    pub clipboard_access: bool,
    pub elevation_support: bool,
}

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

pub fn supports_elevation(platform: PlatformType) -> bool {
    matches!(platform, PlatformType::Windows | PlatformType::MacOs | PlatformType::Linux)
}

pub fn get_file_access() -> String {
    "full".to_string()
}
