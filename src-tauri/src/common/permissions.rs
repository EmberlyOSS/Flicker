use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionStatus {
    pub can_screenshot: bool,
    pub can_access_clipboard: bool,
    pub can_access_files: bool,
}

pub fn get_permission_status() -> PermissionStatus {
    PermissionStatus {
        can_screenshot: true,
        can_access_clipboard: true,
        can_access_files: true,
    }
}
