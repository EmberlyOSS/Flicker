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

pub fn is_admin() -> bool {
    #[cfg(unix)]
    {
        unsafe { libc::geteuid() == 0 }
    }
    #[cfg(not(unix))]
    false
}

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

pub fn get_os_version() -> String {
    "macOS".to_string()
}

#[cfg(target_os = "macos")]
pub fn has_screen_recording_permission() -> bool {
    unsafe { CGPreflightScreenCaptureAccess() }
}

#[cfg(not(target_os = "macos"))]
pub fn has_screen_recording_permission() -> bool {
    true
}

#[cfg(target_os = "macos")]
pub fn request_screen_recording_permission() -> bool {
    unsafe { CGRequestScreenCaptureAccess() }
}

#[cfg(not(target_os = "macos"))]
pub fn request_screen_recording_permission() -> bool {
    true
}

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

#[cfg(target_os = "macos")]
pub fn has_accessibility_permission() -> bool {
    unsafe { AXIsProcessTrusted() }
}

#[cfg(not(target_os = "macos"))]
pub fn has_accessibility_permission() -> bool {
    true
}

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

pub fn is_background_enabled(app: &tauri::AppHandle) -> bool {
    #[cfg(target_os = "macos")]
    {
        use tauri_plugin_autostart::ManagerExt;
        app.autolaunch().is_enabled().unwrap_or(false)
    }
    #[cfg(not(target_os = "macos"))]
    {

        use tauri_plugin_autostart::ManagerExt;
        app.autolaunch().is_enabled().unwrap_or(true)
    }
}

pub fn enable_background(app: &tauri::AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch()
        .enable()
        .map_err(|e| e.to_string())?;
    Ok(app.autolaunch().is_enabled().unwrap_or(false))
}

pub fn disable_background(app: &tauri::AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch()
        .disable()
        .map_err(|e| e.to_string())?;
    Ok(!app.autolaunch().is_enabled().unwrap_or(true))
}

pub fn open_background_settings() {
    #[cfg(target_os = "macos")]
    {

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

    }
}
