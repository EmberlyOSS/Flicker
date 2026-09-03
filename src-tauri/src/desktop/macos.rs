/// macOS-specific functionality

use tauri::Emitter;

#[cfg(target_os = "macos")]
#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    fn CGPreflightScreenCaptureAccess() -> bool;
    fn CGRequestScreenCaptureAccess() -> bool;
}

#[cfg(target_os = "macos")]
#[link(name = "ApplicationServices", kind = "framework")]
extern "C" {
    fn AXIsProcessTrusted() -> bool;
}

/// Check if running with elevated privileges on macOS (root)
pub fn is_admin() -> bool {
    #[cfg(unix)]
    {
        unsafe { libc::geteuid() == 0 }
    }
    #[cfg(not(unix))]
    false
}

/// Request elevation on macOS
pub fn request_elevation(window: &tauri::WebviewWindow) {
    if !is_admin() {
        let _ = window.emit(
            "admin_warning",
            serde_json::json!({
                "message": "This application works best with elevated privileges.",
                "required": false
            }),
        );
    }
}

/// Get macOS-specific system info
pub fn get_os_version() -> String {
    "macOS".to_string()
}

/// Check if the app has Screen Recording permission (macOS 10.15+)
/// Uses CGPreflightScreenCaptureAccess - returns true if granted
#[cfg(target_os = "macos")]
pub fn has_screen_recording_permission() -> bool {
    unsafe { CGPreflightScreenCaptureAccess() }
}

#[cfg(not(target_os = "macos"))]
pub fn has_screen_recording_permission() -> bool {
    true
}

/// Request Screen Recording permission (macOS 10.15+)
/// This will show the system prompt if not yet decided, or return current status
#[cfg(target_os = "macos")]
pub fn request_screen_recording_permission() -> bool {
    unsafe { CGRequestScreenCaptureAccess() }
}

#[cfg(not(target_os = "macos"))]
pub fn request_screen_recording_permission() -> bool {
    true
}

/// Open System Settings to the Screen Recording privacy pane
pub fn open_screen_recording_settings() {
    #[cfg(target_os = "macos")]
    {
        let urls = [
            "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture",
            "x-apple.systempreferences:com.apple.preference.security?Privacy",
        ];
        for url in urls {
            if std::process::Command::new("open")
                .arg(url)
                .spawn()
                .is_ok()
            {
                break;
            }
        }
    }
}

/// Check if the app has Accessibility permission (macOS) — needed for global shortcuts in background
#[cfg(target_os = "macos")]
pub fn has_accessibility_permission() -> bool {
    unsafe { AXIsProcessTrusted() }
}

#[cfg(not(target_os = "macos"))]
pub fn has_accessibility_permission() -> bool {
    true
}

/// Open System Settings to the Accessibility privacy pane
pub fn open_accessibility_settings() {
    #[cfg(target_os = "macos")]
    {
        let urls = [
            "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
            "x-apple.systempreferences:com.apple.preference.security?Privacy",
        ];
        for url in urls {
            if std::process::Command::new("open").arg(url).spawn().is_ok() {
                break;
            }
        }
    }
}

/// Check if the app is allowed to run in background (Login Item / Background Item on macOS 13+)
/// Uses tauri-plugin-autostart's is_enabled check
pub fn is_background_enabled(app: &tauri::AppHandle) -> bool {
    #[cfg(target_os = "macos")]
    {
        use tauri_plugin_autostart::ManagerExt;
        app.autolaunch().is_enabled().unwrap_or(false)
    }
    #[cfg(not(target_os = "macos"))]
    {
        // On Windows/Linux, autostart check — still considered "background"
        use tauri_plugin_autostart::ManagerExt;
        app.autolaunch().is_enabled().unwrap_or(true)
    }
}

/// Enable background execution (adds app to Login Items / Background Items)
pub fn enable_background(app: &tauri::AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch()
        .enable()
        .map_err(|e| e.to_string())?;
    Ok(app.autolaunch().is_enabled().unwrap_or(false))
}

/// Disable background execution
pub fn disable_background(app: &tauri::AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch()
        .disable()
        .map_err(|e| e.to_string())?;
    Ok(!app.autolaunch().is_enabled().unwrap_or(true))
}

/// Open System Settings to Login Items / Background Items
pub fn open_background_settings() {
    #[cfg(target_os = "macos")]
    {
        // macOS 13+ Ventura: General → Login Items
        let urls = [
            "x-apple.systempreferences:com.apple.LoginItems-Settings.extension",
            "x-apple.systempreferences:com.apple.preference.general?LoginItems",
            "x-apple.systempreferences:com.apple.preference.security?Privacy",
        ];
        for url in urls {
            if std::process::Command::new("open").arg(url).spawn().is_ok() {
                break;
            }
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        // On other platforms, autostart is managed differently — just log
    }
}
