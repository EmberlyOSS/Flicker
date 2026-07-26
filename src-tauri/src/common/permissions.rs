//! Permission status - simplified for Tauri v2 capability system

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionStatus {
    pub can_screenshot: bool,
    pub can_access_clipboard: bool,
    pub can_access_files: bool,
}

/// Get current permission status
/// With Tauri v2 capabilities, permissions are granted at build time
pub fn get_permission_status() -> PermissionStatus {
    PermissionStatus {
        can_screenshot: true,      // Granted via desktop screenshot capability
        can_access_clipboard: true, // Granted via clipboard-manager:default
        can_access_files: true,     // Granted via fs:default + scopes
    }
}
