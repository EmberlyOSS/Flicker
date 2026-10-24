use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::Mutex;
use once_cell::sync::Lazy;
use super::get_app_data_dir;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum NotificationPriority {

    System,

    Important,

    Default,

    Transient,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum NotificationCategory {
    Admin,
    Security,
    Account,
    Update,
    Upload,
    Error,
    Info,
    Success,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {

    pub id: String,

    pub priority: NotificationPriority,

    pub category: NotificationCategory,

    pub title: String,

    pub message: String,

    pub timestamp: u64,

    pub read: bool,

    pub dismissed: bool,

    pub persistent: bool,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub action_label: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub action_id: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct NotificationStore {
    pub notifications: Vec<Notification>,

    pub version: u32,
}

static NOTIFICATION_STORE: Lazy<Mutex<NotificationStore>> = Lazy::new(|| {
    Mutex::new(load_notifications_from_disk().unwrap_or_default())
});

fn get_notifications_path() -> Result<std::path::PathBuf, String> {
    let dir = get_app_data_dir()?;
    Ok(dir.join("notifications.json"))
}

fn load_notifications_from_disk() -> Result<NotificationStore, String> {
    let path = get_notifications_path()?;

    if !path.exists() {
        return Ok(NotificationStore::default());
    }

    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read notifications: {}", e))?;

    let store: NotificationStore = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse notifications: {}", e))?;

    Ok(store)
}

fn save_notifications_to_disk(store: &NotificationStore) -> Result<(), String> {
    let path = get_notifications_path()?;

    let persistent_store = NotificationStore {
        notifications: store.notifications.iter()
            .filter(|n| n.persistent && n.priority != NotificationPriority::Transient)
            .cloned()
            .collect(),
        version: store.version,
    };

    let content = serde_json::to_string_pretty(&persistent_store)
        .map_err(|e| format!("Failed to serialize notifications: {}", e))?;

    fs::write(&path, content)
        .map_err(|e| format!("Failed to write notifications: {}", e))?;

    Ok(())
}

fn generate_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();
    format!("notif_{}", timestamp)
}

fn current_timestamp() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}

pub fn add_notification(
    priority: NotificationPriority,
    category: NotificationCategory,
    title: String,
    message: String,
    persistent: bool,
    action_label: Option<String>,
    action_id: Option<String>,
    metadata: Option<serde_json::Value>,
) -> Result<Notification, String> {
    let notification = Notification {
        id: generate_id(),
        priority,
        category,
        title,
        message,
        timestamp: current_timestamp(),
        read: false,
        dismissed: false,
        persistent,
        action_label,
        action_id,
        metadata,
    };

    let mut store = NOTIFICATION_STORE.lock()
        .map_err(|e| format!("Failed to lock notification store: {}", e))?;

    store.notifications.push(notification.clone());

    if notification.persistent {
        save_notifications_to_disk(&store)?;
    }

    Ok(notification)
}

pub fn get_notifications(
    priority_filter: Option<NotificationPriority>,
    include_dismissed: bool,
) -> Result<Vec<Notification>, String> {
    let store = NOTIFICATION_STORE.lock()
        .map_err(|e| format!("Failed to lock notification store: {}", e))?;

    let notifications: Vec<Notification> = store.notifications.iter()
        .filter(|n| {
            let priority_match = priority_filter.as_ref()
                .map(|p| &n.priority == p)
                .unwrap_or(true);
            let dismissed_match = include_dismissed || !n.dismissed;
            priority_match && dismissed_match
        })
        .cloned()
        .collect();

    Ok(notifications)
}

pub fn get_unread_count() -> Result<usize, String> {
    let store = NOTIFICATION_STORE.lock()
        .map_err(|e| format!("Failed to lock notification store: {}", e))?;

    let count = store.notifications.iter()
        .filter(|n| !n.read && !n.dismissed)
        .count();

    Ok(count)
}

pub fn mark_as_read(id: &str) -> Result<(), String> {
    let mut store = NOTIFICATION_STORE.lock()
        .map_err(|e| format!("Failed to lock notification store: {}", e))?;

    if let Some(notification) = store.notifications.iter_mut().find(|n| n.id == id) {
        notification.read = true;

        if notification.persistent {
            save_notifications_to_disk(&store)?;
        }
    }

    Ok(())
}

pub fn mark_all_as_read() -> Result<(), String> {
    let mut store = NOTIFICATION_STORE.lock()
        .map_err(|e| format!("Failed to lock notification store: {}", e))?;

    for notification in store.notifications.iter_mut() {
        notification.read = true;
    }

    save_notifications_to_disk(&store)?;

    Ok(())
}

pub fn dismiss_notification(id: &str) -> Result<(), String> {
    let mut store = NOTIFICATION_STORE.lock()
        .map_err(|e| format!("Failed to lock notification store: {}", e))?;

    if let Some(notification) = store.notifications.iter_mut().find(|n| n.id == id) {
        notification.dismissed = true;
        notification.read = true;

        if notification.persistent {
            save_notifications_to_disk(&store)?;
        }
    }

    Ok(())
}

pub fn delete_notification(id: &str) -> Result<(), String> {
    let mut store = NOTIFICATION_STORE.lock()
        .map_err(|e| format!("Failed to lock notification store: {}", e))?;

    store.notifications.retain(|n| n.id != id);
    save_notifications_to_disk(&store)?;

    Ok(())
}

pub fn clear_notifications(include_system: bool) -> Result<(), String> {
    let mut store = NOTIFICATION_STORE.lock()
        .map_err(|e| format!("Failed to lock notification store: {}", e))?;

    if include_system {
        store.notifications.clear();
    } else {
        store.notifications.retain(|n| n.priority == NotificationPriority::System);
    }

    save_notifications_to_disk(&store)?;

    Ok(())
}

pub fn check_system_notifications() -> Vec<Notification> {

    Vec::new()
}

impl Notification {

    pub fn admin(title: impl Into<String>, message: impl Into<String>) -> Self {
        Notification {
            id: generate_id(),
            priority: NotificationPriority::System,
            category: NotificationCategory::Admin,
            title: title.into(),
            message: message.into(),
            timestamp: current_timestamp(),
            read: false,
            dismissed: false,
            persistent: true,
            action_label: None,
            action_id: None,
            metadata: None,
        }
    }

    pub fn security(title: impl Into<String>, message: impl Into<String>) -> Self {
        Notification {
            id: generate_id(),
            priority: NotificationPriority::System,
            category: NotificationCategory::Security,
            title: title.into(),
            message: message.into(),
            timestamp: current_timestamp(),
            read: false,
            dismissed: false,
            persistent: true,
            action_label: None,
            action_id: None,
            metadata: None,
        }
    }

    pub fn account_warning(title: impl Into<String>, message: impl Into<String>) -> Self {
        Notification {
            id: generate_id(),
            priority: NotificationPriority::Important,
            category: NotificationCategory::Account,
            title: title.into(),
            message: message.into(),
            timestamp: current_timestamp(),
            read: false,
            dismissed: false,
            persistent: true,
            action_label: None,
            action_id: None,
            metadata: None,
        }
    }

    pub fn update(title: impl Into<String>, message: impl Into<String>, version: Option<String>) -> Self {
        Notification {
            id: generate_id(),
            priority: NotificationPriority::Important,
            category: NotificationCategory::Update,
            title: title.into(),
            message: message.into(),
            timestamp: current_timestamp(),
            read: false,
            dismissed: false,
            persistent: true,
            action_label: Some("Update Now".to_string()),
            action_id: Some("update-now".to_string()),
            metadata: version.map(|v| serde_json::json!({ "version": v })),
        }
    }

    pub fn toast(message: impl Into<String>, category: NotificationCategory) -> Self {
        Notification {
            id: generate_id(),
            priority: NotificationPriority::Transient,
            category,
            title: String::new(),
            message: message.into(),
            timestamp: current_timestamp(),
            read: false,
            dismissed: false,
            persistent: false,
            action_label: None,
            action_id: None,
            metadata: None,
        }
    }

    pub fn with_action(mut self, label: impl Into<String>, action_id: impl Into<String>) -> Self {
        self.action_label = Some(label.into());
        self.action_id = Some(action_id.into());
        self
    }

    pub fn with_metadata(mut self, metadata: serde_json::Value) -> Self {
        self.metadata = Some(metadata);
        self
    }
}
