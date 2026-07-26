/// Flicker Tauri Backend - Screenshot and upload tool
/// 
/// This module provides a modular architecture for screenshot capture,
/// file operations, and upload functionality with desktop and mobile support.

pub mod common;
pub mod platform;
pub mod desktop;
pub mod mobile;

use tauri::Manager;
use common::{
    ScreenshotResult, UploadCompleteEvent, UploadResponse,
    get_screenshots_dir,
};

// Platform-specific screenshot module
#[cfg(feature = "desktop")]
use desktop::screenshot;
#[cfg(feature = "mobile")]
use mobile::screenshot;

/// Capture a screenshot of the entire screen or primary monitor
#[tauri::command]
async fn capture_screenshot(monitor_index: Option<usize>) -> Result<ScreenshotResult, String> {
    screenshot::capture_screenshot(monitor_index).await
}

/// Capture a specific region of the screen
#[tauri::command]
async fn capture_region(
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    monitor_index: Option<usize>,
) -> Result<ScreenshotResult, String> {
    screenshot::capture_region(x, y, width, height, monitor_index).await
}

/// Get list of available monitors
#[tauri::command]
fn get_monitors() -> Result<Vec<serde_json::Value>, String> {
    let monitors = screenshot::get_monitors()?;
    Ok(monitors.into_iter().map(|m| {
        serde_json::json!({
            "index": m.index,
            "id": m.id,
            "x": m.x,
            "y": m.y,
            "width": m.width,
            "height": m.height,
            "is_primary": m.is_primary,
            "scale_factor": m.scale_factor,
        })
    }).collect())
}

/// Get the monitor index at a specific screen coordinate
#[tauri::command]
fn get_monitor_at_point(x: i32, y: i32) -> Result<Option<usize>, String> {
    screenshot::get_monitor_at_point(x, y)
}

/// Capture all monitors combined into a single image
#[tauri::command]
async fn capture_all_monitors() -> Result<ScreenshotResult, String> {
    screenshot::capture_all_monitors().await
}

/// Uploads a file to the Emberly instance
#[tauri::command]
async fn upload_file(
    window: tauri::Window,
    file_path: String,
    api_url: String,
    upload_token: String,
    visibility: String,
    password: Option<String>,
) -> Result<UploadResponse, String> {
    let progress_path = file_path.clone();
    let progress_window = window.clone();
    let on_progress = move |uploaded: u64, total: u64| {
        let percentage = if total > 0 { (uploaded as f64 / total as f64) * 100.0 } else { 0.0 };
        desktop::app::emit_event(
            &progress_window,
            "upload_progress",
            &common::UploadProgressEvent {
                file_path: progress_path.clone(),
                uploaded,
                total,
                percentage,
            },
        );
    };

    let response = common::upload_file(
        file_path.clone(),
        api_url,
        upload_token,
        visibility,
        password,
        Some(Box::new(on_progress)),
    )
    .await?;

    // Emit success event with file path for preview
    let event = common::create_upload_event(response.clone(), Some(file_path));
    desktop::app::emit_event(&window, "upload_complete", &event);

    Ok(response)
}

/// Uploads whatever image is currently on the OS clipboard.
/// Saves it to the screenshots directory first so it has a real file path,
/// then reuses the standard upload flow.
#[tauri::command]
async fn upload_clipboard_image(
    app: tauri::AppHandle,
    window: tauri::Window,
    api_url: String,
    upload_token: String,
    visibility: String,
    password: Option<String>,
) -> Result<UploadResponse, String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;

    let clipboard_image = app
        .clipboard()
        .read_image()
        .map_err(|_| "No image found on the clipboard".to_string())?;

    let width = clipboard_image.width();
    let height = clipboard_image.height();
    let buffer: image::RgbaImage =
        image::ImageBuffer::from_raw(width, height, clipboard_image.rgba().to_vec())
            .ok_or("Failed to decode clipboard image")?;

    let dir = get_screenshots_dir()?;
    let file_name = format!("clipboard_{}.png", chrono::Local::now().format("%Y%m%d_%H%M%S"));
    let file_path = dir.join(&file_name);
    buffer
        .save(&file_path)
        .map_err(|e| format!("Failed to save clipboard image: {}", e))?;
    let file_path = file_path.to_string_lossy().to_string();

    let response = common::upload_file(
        file_path.clone(),
        api_url,
        upload_token,
        visibility,
        password,
        None,
    )
    .await?;

    let event = common::create_upload_event(response.clone(), Some(file_path));
    desktop::app::emit_event(&window, "upload_complete", &event);

    Ok(response)
}

/// Take screenshot, upload it, and return the URL
#[tauri::command]
async fn screenshot_and_upload(
    window: tauri::Window,
    api_url: String,
    upload_token: String,
    visibility: String,
    monitor_index: Option<usize>,
    capture_all: Option<bool>,
) -> Result<UploadCompleteEvent, String> {
    // Emit that we're starting
    desktop::app::emit_event(&window, "screenshot_started", serde_json::json!({}));
    
    // Capture screenshot based on mode
    let screenshot_result = if capture_all.unwrap_or(false) {
        screenshot::capture_all_monitors().await?
    } else {
        screenshot::capture_screenshot(monitor_index).await?
    };
    
    desktop::app::emit_event(&window, "screenshot_captured", &screenshot_result);
    
    // Upload it
    let upload_result = common::upload_file(
        screenshot_result.path.clone(),
        api_url,
        upload_token,
        visibility,
        None,
        None,
    ).await?;
    
    let event = common::create_upload_event(upload_result, Some(screenshot_result.path));
    
    // Emit final event
    desktop::app::emit_event(&window, "screenshot_uploaded", &event);
    
    Ok(event)
}

/// Gets system information
#[tauri::command]
fn get_system_info() -> common::SystemInfo {
    platform::get_system_info()
}

/// Get screenshots directory path
#[tauri::command]
fn get_screenshots_path() -> Result<String, String> {
    let dir = get_screenshots_dir()?;
    Ok(dir.to_string_lossy().to_string())
}

/// Get test image path (icon.png)
#[tauri::command]
fn get_test_image_path(app_handle: tauri::AppHandle) -> Result<String, String> {
    // 1. Try resource directory (Production)
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        let resource_path = resource_dir.join("icons").join("icon.png");
        if resource_path.exists() {
            return Ok(resource_path.to_string_lossy().to_string());
        }
    }

    // 2. Try development icons directory (Relative to current dir)
    if let Ok(current_dir) = std::env::current_dir() {
        let dev_path = current_dir.join("src-tauri").join("icons").join("icon.png");
        if dev_path.exists() {
            return Ok(dev_path.to_string_lossy().to_string());
        }

        // Try public dir fallback
        let public_path = current_dir.join("public").join("icon.png");
        if public_path.exists() {
            return Ok(public_path.to_string_lossy().to_string());
        }
    }

    // 3. Try to find it in the project root if we're in src-tauri
    if let Ok(current_dir) = std::env::current_dir() {
        if current_dir.ends_with("src-tauri") {
            let root_path = current_dir
                .parent()
                .unwrap()
                .join("src-tauri")
                .join("icons")
                .join("icon.png");
            if root_path.exists() {
                return Ok(root_path.to_string_lossy().to_string());
            }
        }
    }

    Err("Could not find test image (icon.png) in any expected location".to_string())
}

/// Get current permission status
#[tauri::command]
fn get_permission_status() -> serde_json::Value {
    let status = common::get_permission_status();
    serde_json::json!({
        "can_screenshot": status.can_screenshot,
        "can_access_clipboard": status.can_access_clipboard,
        "can_access_files": status.can_access_files,
    })
}

/// Get platform capabilities (what features are available)
#[tauri::command]
fn get_platform_capabilities() -> serde_json::Value {
    let caps = platform::get_capabilities();
    serde_json::json!({
        "platform": platform::get_platform_name(),
        "is_desktop": platform::is_desktop(),
        "is_mobile": platform::is_mobile(),
        "native_screenshot": caps.native_screenshot,
        "region_capture": caps.region_capture,
        "multi_monitor": caps.multi_monitor,
        "system_tray": caps.system_tray,
        "clipboard_access": caps.clipboard_access,
        "file_access": caps.file_access,
        "elevation_support": caps.elevation_support,
    })
}

/// Load app configuration from disk
#[tauri::command]
fn load_config() -> Result<serde_json::Value, String> {
    let config = common::load_config()?;
    Ok(serde_json::to_value(config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?)
}

/// Save app configuration to disk
#[tauri::command]
fn save_config(config: serde_json::Value) -> Result<(), String> {
    let app_config: common::AppConfig = serde_json::from_value(config)
        .map_err(|e| format!("Failed to parse config: {}", e))?;
    common::save_config(&app_config)
}

/// Load upload history from disk
#[tauri::command]
fn load_history() -> Result<Vec<serde_json::Value>, String> {
    let history = common::load_history()?;
    Ok(history.into_iter()
        .map(|item| serde_json::to_value(item).unwrap_or_default())
        .collect())
}

/// Add item to upload history
#[tauri::command]
fn add_to_history(item: serde_json::Value) -> Result<(), String> {
    let history_item: common::UploadHistoryItem = serde_json::from_value(item)
        .map_err(|e| format!("Failed to parse history item: {}", e))?;
    common::add_to_history(history_item)
}

/// Clear all upload history
#[tauri::command]
fn clear_history() -> Result<(), String> {
    common::clear_history()
}

/// Login to Emberly with email/username and password
#[tauri::command]
async fn emberly_login(
    api_url: String,
    email_or_username: String,
    password: String,
    two_factor_code: Option<String>,
) -> Result<serde_json::Value, String> {
    let client = common::EmberlyCient::new(api_url);
    let response = client
        .login(email_or_username, password, two_factor_code)
        .await?;
    
    Ok(serde_json::to_value(response)
        .map_err(|e| format!("Failed to serialize login response: {}", e))?)
}

/// Get user profile from Emberly
#[tauri::command]
async fn emberly_get_profile(
    api_url: String,
    token: String,
) -> Result<serde_json::Value, String> {
    let client = common::EmberlyCient::new(api_url);
    let profile = client.get_profile(&token).await?;
    
    Ok(serde_json::to_value(profile)
        .map_err(|e| format!("Failed to serialize profile: {}", e))?)
}

/// Validate an Emberly upload token
#[tauri::command]
async fn emberly_validate_token(
    api_url: String,
    token: String,
) -> Result<bool, String> {
    let client = common::EmberlyCient::new(api_url);
    client.validate_token(&token).await
}

/// Upload a file to Emberly
#[tauri::command]
async fn emberly_upload_file(
    api_url: String,
    token: String,
    file_path: String,
    visibility: String,
    password: Option<String>,
) -> Result<serde_json::Value, String> {
    let client = common::EmberlyCient::new(api_url);
    let response = client
        .upload_file(&token, &file_path, &visibility, password, None)
        .await?;
    
    Ok(serde_json::to_value(response)
        .map_err(|e| format!("Failed to serialize upload response: {}", e))?)
}

/// Get user statistics from Emberly
#[tauri::command]
async fn emberly_get_stats(
    api_url: String,
    token: String,
) -> Result<serde_json::Value, String> {
    let client = common::EmberlyCient::new(api_url);
    client.get_stats(&token).await
}

/// Get device information for support/diagnostics
#[tauri::command]
fn get_device_info() -> Result<common::DeviceInfo, String> {
    Ok(common::get_device_info())
}

/// Get audit logs (optionally limited to last N entries)
#[tauri::command]
fn get_audit_logs(limit: Option<usize>) -> Result<Vec<common::AuditLogEntry>, String> {
    common::get_audit_logs(limit)
}

/// Get audit logs with device info appended for support export
#[tauri::command]
fn get_audit_logs_with_device() -> Result<Vec<common::AuditLogEntry>, String> {
    common::get_audit_logs_with_device_info(None)
}

/// Export audit logs as JSON string for user sharing
#[tauri::command]
fn export_audit_logs() -> Result<String, String> {
    common::export_audit_logs()
}

/// Clear all audit logs
#[tauri::command]
fn clear_audit_logs() -> Result<(), String> {
    common::clear_audit_logs()
}

/// Log an event to the audit system (for frontend-initiated events)
#[tauri::command]
fn log_event(
    event_type: String,
    message: String,
    level: String,
    metadata: Option<serde_json::Value>,
) -> Result<(), String> {
    common::log_event(&event_type, &message, &level, metadata)
}

// ============================================================================
// Notification Commands
// ============================================================================

/// Add a new notification
#[tauri::command]
fn notification_add(
    priority: String,
    category: String,
    title: String,
    message: String,
    persistent: bool,
    action_label: Option<String>,
    action_id: Option<String>,
    metadata: Option<serde_json::Value>,
) -> Result<common::Notification, String> {
    let priority = match priority.as_str() {
        "system" => common::NotificationPriority::System,
        "important" => common::NotificationPriority::Important,
        "transient" => common::NotificationPriority::Transient,
        _ => common::NotificationPriority::Default,
    };
    let category = match category.as_str() {
        "admin" => common::NotificationCategory::Admin,
        "security" => common::NotificationCategory::Security,
        "account" => common::NotificationCategory::Account,
        "update" => common::NotificationCategory::Update,
        "upload" => common::NotificationCategory::Upload,
        "error" => common::NotificationCategory::Error,
        "success" => common::NotificationCategory::Success,
        _ => common::NotificationCategory::Info,
    };
    common::add_notification(priority, category, title, message, persistent, action_label, action_id, metadata)
}

/// Get all notifications
#[tauri::command]
fn notification_get_all(include_dismissed: bool) -> Result<Vec<common::Notification>, String> {
    common::get_notifications(None, include_dismissed)
}

/// Get unread notification count
#[tauri::command]
fn notification_get_unread_count() -> Result<usize, String> {
    common::get_unread_count()
}

/// Mark a notification as read
#[tauri::command]
fn notification_mark_read(id: String) -> Result<(), String> {
    common::mark_as_read(&id)
}

/// Mark all notifications as read
#[tauri::command]
fn notification_mark_all_read() -> Result<(), String> {
    common::mark_all_as_read()
}

/// Dismiss a notification
#[tauri::command]
fn notification_dismiss(id: String) -> Result<(), String> {
    common::dismiss_notification(&id)
}

/// Delete a notification permanently
#[tauri::command]
fn notification_delete(id: String) -> Result<(), String> {
    common::delete_notification(&id)
}

/// Clear all notifications
#[tauri::command]
fn notification_clear_all(include_system: bool) -> Result<(), String> {
    common::clear_notifications(include_system)
}

/// Check for system notifications on startup
#[tauri::command]
fn notification_check_system() -> Vec<common::Notification> {
    common::check_system_notifications()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();
    
    // Setup plugins
    builder = desktop::app::setup_plugins(builder);
    
    // Setup the app
    builder
        .setup(|tauri_app| {
            // Open devtools in debug builds to help with debugging
            #[cfg(debug_assertions)]
            {
                if let Some(window) = tauri_app.get_webview_window("main") {
                    window.open_devtools();
                }
            }
            
            // Setup system tray and window handlers (non-blocking)
            #[cfg(not(mobile))]
            {
                desktop::app::setup_system_tray(tauri_app)?;
                desktop::app::setup_window_handlers(tauri_app)?;
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            capture_screenshot,
            capture_region,
            capture_all_monitors,
            get_monitors,
            get_monitor_at_point,
            upload_file,
            upload_clipboard_image,
            screenshot_and_upload,
            get_system_info,
            get_screenshots_path,
            get_test_image_path,
            get_permission_status,
            get_platform_capabilities,
            load_config,
            save_config,
            load_history,
            add_to_history,
            clear_history,
            emberly_login,
            emberly_get_profile,
            emberly_validate_token,
            emberly_upload_file,
            emberly_get_stats,
            get_device_info,
            get_audit_logs,
            get_audit_logs_with_device,
            export_audit_logs,
            clear_audit_logs,
            log_event,
            notification_add,
            notification_get_all,
            notification_get_unread_count,
            notification_mark_read,
            notification_mark_all_read,
            notification_dismiss,
            notification_delete,
            notification_clear_all,
            notification_check_system,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
