/// Flicker Tauri Backend - Screenshot and upload tool
/// 
/// This module provides a modular architecture for screenshot capture,
/// file operations, and upload functionality with desktop and mobile support.

pub mod common;
pub mod platform;
pub mod desktop;
pub mod mobile;

use tauri::{Emitter as _, Manager};
use common::{
    ScreenshotResult, UploadCompleteEvent, UploadResponse,
    get_screenshots_dir,
};
use tauri_plugin_clipboard_manager::ClipboardExt as _;
use std::sync::atomic::{AtomicBool, Ordering};

/// Global guard to prevent concurrent screenshot captures (fixes spam on rapid triggers)
static SCREENSHOT_CAPTURING: AtomicBool = AtomicBool::new(false);

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
    domain: Option<String>,
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
        domain,
        Some(Box::new(on_progress)),
    )
    .await?;

    // Emit success event with file path for preview
    let event = common::create_upload_event(response.clone(), Some(file_path.clone()));
    desktop::app::emit_event(&window, "upload_complete", &event);
    // Also ensure OS notification + history + clipboard even when app hidden (like other upload paths)
    let app_handle = window.app_handle();
    let _ = app_handle.clipboard().write_text(event.url.clone());
    desktop::app::send_os_notification(&app_handle, "Upload Complete", "URL copied to clipboard");
    let _ = common::add_to_history(common::UploadHistoryItem {
        url: event.url.clone(),
        name: event.name.clone(),
        timestamp: chrono::Utc::now().timestamp_millis() as u64,
        file_type: event.file_type.clone(),
        size: Some(event.size),
        thumbnail_url: Some(event.url.clone()),
    });
    let _ = app_handle.emit("upload_complete", &event);

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
    domain: Option<String>,
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
        domain,
        None,
    )
    .await?;

    let event = common::create_upload_event(response.clone(), Some(file_path.clone()));
    desktop::app::emit_event(&window, "upload_complete", &event);
    // Also ensure OS notification + clipboard + disk history (works even when app hidden)
    let app_handle = app.clone();
    let _ = app_handle.clipboard().write_text(event.url.clone());
    desktop::app::send_os_notification(&app_handle, "Upload Complete", "URL copied to clipboard");
    let _ = common::add_to_history(common::UploadHistoryItem {
        url: event.url.clone(),
        name: event.name.clone(),
        timestamp: chrono::Utc::now().timestamp_millis() as u64,
        file_type: event.file_type.clone(),
        size: Some(event.size),
        thumbnail_url: Some(event.url.clone()),
    });
    let _ = app_handle.emit("upload_complete", &event);
    let _ = app_handle.emit("region_upload_complete", &event);

    Ok(response)
}

/// Take screenshot, upload it, and return the URL
/// Now handles clipboard + OS notification + history in Rust so it works even when frontend is hidden/backgrounded
#[tauri::command]
async fn screenshot_and_upload(
    window: tauri::Window,
    api_url: String,
    upload_token: String,
    visibility: String,
    monitor_index: Option<usize>,
    capture_all: Option<bool>,
    domain: Option<String>,
) -> Result<UploadCompleteEvent, String> {
    println!("[Flicker] screenshot_and_upload invoked: capture_all={:?} monitor={:?} token_len={} api_url={}", capture_all, monitor_index, upload_token.len(), api_url);
    eprintln!("[Flicker] screenshot_and_upload: visibility={} domain={:?}", visibility, domain);
    // Guard against concurrent captures
    if SCREENSHOT_CAPTURING.swap(true, Ordering::SeqCst) {
        return Err("Capture already in progress".to_string());
    }

    let result: Result<UploadCompleteEvent, String> = async {
        // Check screen recording permission on macOS (same as region — prevents hang when denied)
        #[cfg(target_os = "macos")]
        {
            if !desktop::macos::has_screen_recording_permission() {
                let _ = desktop::macos::request_screen_recording_permission();
                if !desktop::macos::has_screen_recording_permission() {
                    desktop::macos::open_screen_recording_settings();
                    return Err("Screen Recording permission required. Enable in System Settings → Privacy & Security → Screen Recording and restart Flicker.".to_string());
                }
            }
        }

        // Emit that we're starting
        desktop::app::emit_event(&window, "screenshot_started", serde_json::json!({}));

        // Hide main window so Flicker doesn't appear in its own screenshot (user reported always included)
        let app_handle = window.app_handle().clone();
        desktop::region::hide_main_for_capture(&app_handle);
        tokio::time::sleep(std::time::Duration::from_millis(120)).await;

        // Capture screenshot based on mode — wrap in timeout to avoid hanging “Capturing…” forever
        let capture_res = tokio::time::timeout(
            std::time::Duration::from_secs(8),
            async {
                if capture_all.unwrap_or(false) {
                    screenshot::capture_all_monitors().await
                } else {
                    screenshot::capture_screenshot(monitor_index).await
                }
            },
        )
        .await;
        // Restore immediately after capture attempt (before upload, so user sees app again quickly) — even on timeout/error
        desktop::region::restore_main_after_capture(&app_handle);
        let screenshot_result = capture_res
            .map_err(|_| "Screenshot capture timed out after 8s — check Screen Recording permission".to_string())??;

        desktop::app::emit_event(&window, "screenshot_captured", &screenshot_result);

        // Upload it
        let upload_result = common::upload_file(
            screenshot_result.path.clone(),
            api_url,
            upload_token,
            visibility,
            None,
            domain,
            None,
        )
        .await?;

        let event = common::create_upload_event(upload_result, Some(screenshot_result.path));

        // Persist to disk history (so it survives app restarts and is visible when app returns)
        let _ = common::add_to_history(common::UploadHistoryItem {
            url: event.url.clone(),
            name: event.name.clone(),
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
            file_type: event.file_type.clone(),
            size: Some(event.size),
            thumbnail_url: Some(event.url.clone()),
        });

        // Copy URL to system clipboard (Rust side — works even when window hidden)
        let app_handle = window.app_handle();
        let _ = app_handle.clipboard().write_text(event.url.clone());

        desktop::app::send_os_notification(&app_handle, "Upload Complete", "URL copied to clipboard");

        // Emit final event for frontend (in-app notification, history refresh)
        desktop::app::emit_event(&window, "screenshot_uploaded", &event);
        // Also emit globally — frontend listens for upload_complete
        let _ = window.app_handle().emit("upload_complete", &event);

        Ok(event)
    }
    .await;

    SCREENSHOT_CAPTURING.store(false, Ordering::SeqCst);

    // On error, also try to notify via OS notification
    if let Err(ref e) = result {
        desktop::app::send_os_notification(window.app_handle(), "Screenshot Failed", e);
    }

    result
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
fn save_config(app: tauri::AppHandle, config: serde_json::Value) -> Result<(), String> {
    let app_config: common::AppConfig = serde_json::from_value(config)
        .map_err(|e| format!("Failed to parse config: {}", e))?;
    let result = common::save_config(&app_config);
    if result.is_ok() {
        // Re-register global hotkeys so new shortcuts take effect immediately — works even when app is backgrounded
        let _ = desktop::hotkeys::reregister_hotkeys(&app);
    }
    result
}

/// Re-register global hotkeys from current config (call after save_config or on demand)
#[tauri::command]
fn reregister_hotkeys(app: tauri::AppHandle) -> Result<(), String> {
    desktop::hotkeys::reregister_hotkeys(&app)
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
        .upload_file(&token, &file_path, &visibility, password, None, None)
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
    let stats = client.get_stats(&token).await?;

    Ok(serde_json::to_value(stats)
        .map_err(|e| format!("Failed to serialize stats: {}", e))?)
}

/// Delete a file from Emberly
#[tauri::command]
async fn emberly_delete_file(
    api_url: String,
    token: String,
    file_id: String,
) -> Result<(), String> {
    let client = common::EmberlyCient::new(api_url);
    client.delete_file(&token, &file_id).await
}

/// Get the user's custom domains and domain-slot usage
#[tauri::command]
async fn emberly_get_domains(
    api_url: String,
    token: String,
) -> Result<serde_json::Value, String> {
    let client = common::EmberlyCient::new(api_url);
    let domains = client.get_domains(&token).await?;

    Ok(serde_json::to_value(domains)
        .map_err(|e| format!("Failed to serialize domains: {}", e))?)
}

/// Get the user's active perk bonuses
#[tauri::command]
async fn emberly_get_perks(
    api_url: String,
    token: String,
) -> Result<serde_json::Value, String> {
    let client = common::EmberlyCient::new(api_url);
    let perks = client.get_perks(&token).await?;

    Ok(serde_json::to_value(perks)
        .map_err(|e| format!("Failed to serialize perks: {}", e))?)
}

/// Shorten a URL via the Emberly URL shortener
#[tauri::command]
async fn emberly_shorten_url(
    api_url: String,
    token: String,
    url: String,
) -> Result<serde_json::Value, String> {
    let client = common::EmberlyCient::new(api_url);
    let shortened = client.shorten_url(&token, &url).await?;

    Ok(serde_json::to_value(shortened)
        .map_err(|e| format!("Failed to serialize shortened url: {}", e))?)
}

/// Update a file's visibility and/or password
#[tauri::command]
async fn emberly_update_file(
    api_url: String,
    token: String,
    file_id: String,
    visibility: Option<String>,
    password: Option<String>,
) -> Result<(), String> {
    let client = common::EmberlyCient::new(api_url);
    client.update_file(&token, &file_id, visibility, password).await
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

// ============================================================================
// Region Capture (Global Overlay) Commands
// ============================================================================

/// Start global region capture overlay (system-wide, works when main window is hidden)
#[tauri::command]
async fn start_region_capture(app: tauri::AppHandle) -> Result<(), String> {
    desktop::region::start_region_capture(app).await
}

/// Cancel / close the region overlay
#[tauri::command]
fn cancel_region_capture(app: tauri::AppHandle) -> Result<(), String> {
    desktop::region::cancel_region_capture(&app)
}

/// Confirm region capture from overlay window - captures region and returns file path
#[tauri::command]
async fn confirm_region_capture(
    app: tauri::AppHandle,
    monitor_index: usize,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    scale_factor: Option<f64>,
) -> Result<ScreenshotResult, String> {
    desktop::region::confirm_region_capture(app, monitor_index, x, y, width, height, scale_factor).await
}

/// Capture region and upload in one call (used by overlay for full flow)
#[tauri::command]
async fn capture_region_and_upload(
    app: tauri::AppHandle,
    monitor_index: usize,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    scale_factor: Option<f64>,
    api_url: Option<String>,
    upload_token: Option<String>,
    visibility: Option<String>,
    domain: Option<String>,
) -> Result<UploadCompleteEvent, String> {
    desktop::region::capture_region_and_upload(
        app,
        monitor_index,
        x,
        y,
        width,
        height,
        scale_factor,
        api_url,
        upload_token,
        visibility,
        domain,
    )
    .await
}

/// Check screen recording permission (macOS)
#[tauri::command]
fn check_screen_recording_permission() -> bool {
    #[cfg(target_os = "macos")]
    {
        desktop::macos::has_screen_recording_permission()
    }
    #[cfg(not(target_os = "macos"))]
    {
        true
    }
}

/// Request screen recording permission (macOS) and open settings if needed
#[tauri::command]
fn request_screen_recording_permission() -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        let has = desktop::macos::has_screen_recording_permission();
        if has {
            return Ok(true);
        }
        let _ = desktop::macos::request_screen_recording_permission();
        // Give system a moment then check again
        let has_now = desktop::macos::has_screen_recording_permission();
        if !has_now {
            desktop::macos::open_screen_recording_settings();
            return Ok(false);
        }
        Ok(true)
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(true)
    }
}

/// Capture window under cursor (single-click without drag) and upload — fixes Helium tabs not captured
#[tauri::command]
async fn capture_window_and_upload(
    app: tauri::AppHandle,
    x: f64,
    y: f64,
    monitor_index: usize,
    scale_factor: Option<f64>,
    api_url: Option<String>,
    upload_token: Option<String>,
    visibility: Option<String>,
    domain: Option<String>,
) -> Result<UploadCompleteEvent, String> {
    desktop::region::capture_window_and_upload(
        app, x, y, monitor_index, scale_factor, api_url, upload_token, visibility, domain,
    )
    .await
}

/// Check accessibility permission (macOS — needed for global shortcuts in background)
#[tauri::command]
fn check_accessibility_permission() -> bool {
    desktop::macos::has_accessibility_permission()
}

/// Request accessibility permission (opens System Settings)
#[tauri::command]
fn request_accessibility_permission() -> Result<bool, String> {
    if desktop::macos::has_accessibility_permission() {
        return Ok(true);
    }
    desktop::macos::open_accessibility_settings();
    // On macOS, AXIsProcessTrusted will be true only after user grants and restarts
    Ok(desktop::macos::has_accessibility_permission())
}

/// Check if app is allowed to run in background (Login Item)
#[tauri::command]
fn check_background_permission(app: tauri::AppHandle) -> bool {
    desktop::macos::is_background_enabled(&app)
}

/// Enable background execution (adds to Login Items)
#[tauri::command]
fn enable_background(app: tauri::AppHandle) -> Result<bool, String> {
    desktop::macos::enable_background(&app)
}

/// Open background items settings
#[tauri::command]
fn open_background_settings() {
    desktop::macos::open_background_settings();
}

/// Open Screen Recording settings (macOS)
#[tauri::command]
fn open_screen_recording_settings() {
    desktop::macos::open_screen_recording_settings();
}

/// Open Accessibility settings (macOS)
#[tauri::command]
fn open_accessibility_settings() {
    desktop::macos::open_accessibility_settings();
}

/// Start native video recording (mp4, 10m max, no ffmpeg)
#[tauri::command]
async fn start_video_recording(
    app: tauri::AppHandle,
    options: Option<desktop::video::VideoRecordOptions>,
) -> Result<desktop::video::VideoRecordingStatus, String> {
    desktop::video::start_video_recording(&app, options).await
}

/// Stop video recording and optionally upload
#[tauri::command]
async fn stop_video_recording(
    app: tauri::AppHandle,
    auto_upload: Option<bool>,
) -> Result<Option<UploadCompleteEvent>, String> {
    desktop::video::stop_video_recording(&app, auto_upload).await
}

/// Cancel video recording
#[tauri::command]
async fn cancel_video_recording(app: tauri::AppHandle) -> Result<(), String> {
    desktop::video::cancel_video_recording(&app).await
}

/// Get video recording status
#[tauri::command]
fn get_recording_status() -> desktop::video::VideoRecordingStatus {
    desktop::video::get_recording_status()
}

/// Toggle video recording
#[tauri::command]
async fn toggle_video_recording(app: tauri::AppHandle) -> Result<(), String> {
    desktop::video::toggle_video_recording(app).await
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
                // Register global hotkeys in Rust so captures work even when main window is hidden/backgrounded
                // (fixes: “need to go back into app to upload”)
                let app_handle = tauri_app.handle().clone();
                let _ = desktop::hotkeys::reregister_hotkeys(&app_handle);
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
            emberly_delete_file,
            emberly_get_domains,
            emberly_get_perks,
            emberly_shorten_url,
            emberly_update_file,
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
            start_region_capture,
            cancel_region_capture,
            confirm_region_capture,
            capture_region_and_upload,
            capture_window_and_upload,
            check_screen_recording_permission,
            request_screen_recording_permission,
            check_accessibility_permission,
            request_accessibility_permission,
            check_background_permission,
            enable_background,
            open_background_settings,
            open_screen_recording_settings,
            open_accessibility_settings,
            start_video_recording,
            stop_video_recording,
            cancel_video_recording,
            get_recording_status,
            toggle_video_recording,
            reregister_hotkeys,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
