/// macOS-specific functionality

use tauri::Emitter;

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
