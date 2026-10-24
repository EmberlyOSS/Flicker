use tauri::Emitter;

pub fn is_admin() -> bool {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    let output = Command::new("net")
        .args(&["session"])
        .creation_flags(0x08000000)
        .output();

    matches!(output, Ok(out) if out.status.success())
}

pub fn request_elevation(window: &tauri::WebviewWindow) {
    if !is_admin() {
        let _ = window.emit(
            "admin_required",
            serde_json::json!({
                "message": "This application requires administrator privileges to capture screenshots and access system resources.",
                "required": true
            }),
        );

        eprintln!("Warning: Application is not running with admin privileges. Some features may be limited.");
    }
}

pub fn get_os_version() -> String {
    std::env::var("OS").unwrap_or_else(|_| "Windows".to_string())
}
