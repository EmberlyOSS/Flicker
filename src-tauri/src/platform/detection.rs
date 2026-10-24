use crate::common::types::SystemInfo;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PlatformType {
    Windows,
    MacOs,
    Linux,
    Android,
    IOs,
    Unknown,
}

pub fn get_platform() -> PlatformType {
    #[cfg(target_os = "windows")]
    {
        PlatformType::Windows
    }
    #[cfg(target_os = "macos")]
    {
        PlatformType::MacOs
    }
    #[cfg(target_os = "linux")]
    {
        PlatformType::Linux
    }
    #[cfg(target_os = "android")]
    {
        PlatformType::Android
    }
    #[cfg(target_os = "ios")]
    {
        PlatformType::IOs
    }
    #[cfg(not(any(
        target_os = "windows",
        target_os = "macos",
        target_os = "linux",
        target_os = "android",
        target_os = "ios"
    )))]
    {
        PlatformType::Unknown
    }
}

pub fn get_os_version() -> String {
    #[cfg(target_os = "windows")]
    {
        crate::desktop::windows::get_os_version()
    }
    #[cfg(target_os = "macos")]
    {
        crate::desktop::macos::get_os_version()
    }
    #[cfg(target_os = "linux")]
    {
        crate::desktop::linux::get_os_version()
    }
    #[cfg(target_os = "android")]
    {
        format!("Android {}", std::env::var("ANDROID_VERSION").unwrap_or_default())
    }
    #[cfg(target_os = "ios")]
    {
        "iOS".to_string()
    }
    #[cfg(not(any(
        target_os = "windows",
        target_os = "macos",
        target_os = "linux",
        target_os = "android",
        target_os = "ios"
    )))]
    {
        "Unknown".to_string()
    }
}

pub fn get_system_info() -> SystemInfo {
    SystemInfo {
        platform: get_platform_name(),
        arch: std::env::consts::ARCH.to_string(),
        temp_dir: std::env::temp_dir().to_string_lossy().to_string(),
        screenshots_dir: crate::common::file::get_screenshots_dir().ok()
            .map(|p| p.to_string_lossy().to_string()),
    }
}

pub fn get_platform_name() -> String {
    match get_platform() {
        PlatformType::Windows => "Windows".to_string(),
        PlatformType::MacOs => "macOS".to_string(),
        PlatformType::Linux => "Linux".to_string(),
        PlatformType::Android => "Android".to_string(),
        PlatformType::IOs => "iOS".to_string(),
        PlatformType::Unknown => "Unknown".to_string(),
    }
}

pub fn is_desktop() -> bool {
    matches!(
        get_platform(),
        PlatformType::Windows | PlatformType::MacOs | PlatformType::Linux
    )
}

pub fn is_mobile() -> bool {
    matches!(get_platform(), PlatformType::Android | PlatformType::IOs)
}

pub fn supports_screenshots() -> bool {
    #[cfg(feature = "desktop")]
    {
        is_desktop()
    }
    #[cfg(not(feature = "desktop"))]
    {
        false
    }
}

pub fn supports_system_tray() -> bool {
    is_desktop()
}

pub fn supports_multiple_monitors() -> bool {
    is_desktop()
}

pub fn requires_elevation() -> bool {
    #[cfg(target_os = "windows")]
    {
        true
    }
    #[cfg(target_os = "macos")]
    {
        true
    }
    #[cfg(target_os = "linux")]
    {
        true
    }
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        false
    }
    #[cfg(not(any(
        target_os = "windows",
        target_os = "macos",
        target_os = "linux",
        target_os = "android",
        target_os = "ios"
    )))]
    {
        false
    }
}

#[derive(Debug, Clone)]
pub struct Capabilities {
    pub native_screenshot: bool,
    pub region_capture: bool,
    pub multi_monitor: bool,
    pub system_tray: bool,
    pub clipboard_access: bool,
    pub file_access: String,
    pub elevation_support: bool,
}

pub fn get_capabilities() -> Capabilities {
    let is_desk = is_desktop();

    Capabilities {
        native_screenshot: is_desk && supports_screenshots(),
        region_capture: is_desk,
        multi_monitor: is_desk,
        system_tray: is_desk,
        clipboard_access: true,
        file_access: if is_desk { "full".to_string() } else { "restricted".to_string() },
        elevation_support: requires_elevation(),
    }
}

pub fn get_capabilities_vector() -> Vec<String> {
    let mut caps = vec![
        "upload".to_string(),
        "system_info".to_string(),
        "clipboard".to_string(),
    ];

    if supports_screenshots() {
        caps.push("screenshot".to_string());
        caps.push("region_capture".to_string());
    }

    if supports_multiple_monitors() {
        caps.push("multiple_monitors".to_string());
    }

    if supports_system_tray() {
        caps.push("system_tray".to_string());
    }

    caps
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_platform() {
        let platform = get_platform();
        assert_ne!(platform, PlatformType::Unknown);
    }

    #[test]
    fn test_supports_screenshots() {

        #[cfg(not(mobile))]
        assert!(supports_screenshots());
    }
}
