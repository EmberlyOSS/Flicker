//! Common functionality shared between desktop and mobile platforms

pub mod types;
pub mod file;
pub mod upload;
pub mod permissions;
pub mod config;
pub mod history;
pub mod emberly_api;
pub mod audit;
pub mod notifications;

// Re-export commonly used types and functions
pub use types::*;
pub use file::*;
pub use upload::*;
pub use permissions::{get_permission_status, PermissionStatus};
pub use config::*;
pub use history::*;
pub use emberly_api::EmberlyCient;

// Re-export audit types and functions
pub use audit::{
    AuditLogEntry, DeviceInfo, get_audit_logs, get_audit_logs_with_device_info,
    export_audit_logs, clear_audit_logs, log_event, get_device_info,
};

// Re-export notification types and functions
pub use notifications::{
    add_notification, clear_notifications, check_system_notifications, delete_notification,
    dismiss_notification, get_notifications, get_unread_count, mark_all_as_read, mark_as_read,
    Notification, NotificationCategory, NotificationPriority, NotificationStore,
};
