/// Rust-side global hotkey manager — ensures captures work even when app is hidden/backgrounded
/// Mirrors the JS `useHotkeys` but runs in the backend so uploads happen without needing to return to the app.
/// Also shows OS notifications and copies to clipboard directly in Rust.

use tauri::{AppHandle, Manager, Emitter};
use tauri_plugin_clipboard_manager::ClipboardExt as _;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use tauri_plugin_notification::NotificationExt as _;

/// Register (or re-register) all global hotkeys from the config file.
/// Call on startup and after hotkey config changes.
pub fn reregister_hotkeys(app: &AppHandle) -> Result<(), String> {
    // Unregister all previous — ignore errors (e.g., nothing registered yet)
    let _ = app.global_shortcut().unregister_all();

    let config = crate::common::load_config().unwrap_or_default();
    let hk = config.hotkeys;

    // Fullscreen
    if !hk.screenshot_fullscreen.trim().is_empty() {
        let app_c = app.clone();
        let shortcut = hk.screenshot_fullscreen.clone();
        let _ = app.global_shortcut().on_shortcut(shortcut.as_str(), move |_app, _sc, event| {
            if event.state != ShortcutState::Pressed { return; }
            let handle = app_c.clone();
            tauri::async_runtime::spawn(async move {
                do_capture(handle, false).await;
            });
        });
    }

    // All monitors
    if !hk.screenshot_all_monitors.trim().is_empty() {
        let app_c = app.clone();
        let shortcut = hk.screenshot_all_monitors.clone();
        let _ = app.global_shortcut().on_shortcut(shortcut.as_str(), move |_app, _sc, event| {
            if event.state != ShortcutState::Pressed { return; }
            let handle = app_c.clone();
            tauri::async_runtime::spawn(async move {
                do_capture(handle, true).await;
            });
        });
    }

    // Region
    if !hk.screenshot_region.trim().is_empty() {
        let app_c = app.clone();
        let shortcut = hk.screenshot_region.clone();
        let _ = app.global_shortcut().on_shortcut(shortcut.as_str(), move |_app, _sc, event| {
            if event.state != ShortcutState::Pressed { return; }
            let handle = app_c.clone();
            tauri::async_runtime::spawn(async move {
                let _ = crate::desktop::region::start_region_capture(handle).await;
            });
        });
    }

    // Clipboard upload
    if !hk.upload_clipboard.trim().is_empty() {
        let app_c = app.clone();
        let shortcut = hk.upload_clipboard.clone();
        let _ = app.global_shortcut().on_shortcut(shortcut.as_str(), move |_app, _sc, event| {
            if event.state != ShortcutState::Pressed { return; }
            let handle = app_c.clone();
            tauri::async_runtime::spawn(async move {
                do_clipboard_upload(handle).await;
            });
        });
    }

    Ok(())
}

async fn do_capture(app: AppHandle, capture_all: bool) {
    // Guard against concurrent captures (reuse lib's static)
    // Use a simple file or just try; the lib's screenshot_and_upload already has guard,
    // but we implement direct capture here without that guard — use our own.
    use std::sync::atomic::{AtomicBool, Ordering};
    static CAPTURING: AtomicBool = AtomicBool::new(false);
    if CAPTURING.swap(true, Ordering::SeqCst) {
        return;
    }

    let result = async {
        let config = crate::common::load_config().unwrap_or_default();
        if config.upload_token.trim().is_empty() {
            let _ = app.notification().builder().title("Not logged in").body("Please sign in to capture").show();
            return Err("No upload token".to_string());
        }
        let api_url = config.upload_url.clone().unwrap_or_else(|| "https://embrly.ca".to_string());
        let visibility = config.visibility.clone();
        let domain = None::<String>; // config doesn't have preferredDomain separate? Hotkeys config doesn't store domain, but we can load from AppConfig's preferredDomain if exists
        // Note: AppConfig's preferredDomain is not in crate::common::AppConfig? Check — it has upload_url but not preferredDomain. So fallback to None.

        let screenshot = if capture_all {
            crate::desktop::screenshot::capture_all_monitors().await?
        } else {
            crate::desktop::screenshot::capture_screenshot(None).await?
        };

        let upload = crate::common::upload_file(
            screenshot.path.clone(),
            api_url,
            config.upload_token.clone(),
            visibility,
            None,
            domain,
            None,
        ).await?;

        let event = crate::common::create_upload_event(upload, Some(screenshot.path));

        // Clipboard + notification (Rust side — works backgrounded)
        let _ = app.clipboard().write_text(event.url.clone());
        let _ = app.notification().builder().title("Upload Complete").body("URL copied to clipboard").show();

        // History
        let _ = crate::common::add_to_history(crate::common::UploadHistoryItem {
            url: event.url.clone(),
            name: event.name.clone(),
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
            file_type: event.file_type.clone(),
            size: Some(event.size),
            thumbnail_url: Some(event.url.clone()),
        });

        // Emit to main window — frontend's AppContext listens for upload_complete
        if let Some(main) = app.get_webview_window("main") {
            let _ = main.emit("upload_complete", &event);
            let _ = main.emit("screenshot_uploaded", &event);
        }
        let _ = app.emit("upload_complete", &event);

        Ok::<_, String>(event)
    }.await;

    if let Err(e) = result {
        let _ = app.notification().builder().title("Capture Failed").body(e).show();
    }

    CAPTURING.store(false, Ordering::SeqCst);
}

async fn do_clipboard_upload(app: AppHandle) {
    let config = crate::common::load_config().unwrap_or_default();
    if config.upload_token.trim().is_empty() {
        let _ = app.notification().builder().title("Not logged in").body("Please sign in").show();
        return;
    }
    let api_url = config.upload_url.clone().unwrap_or_else(|| "https://embrly.ca".to_string());
    let visibility = config.visibility.clone();

    // Use the existing command logic for clipboard image: read clipboard image, save, upload
    // Duplicate logic from lib.rs upload_clipboard_image but without window param
    use tauri_plugin_clipboard_manager::ClipboardExt;
    let clipboard_image = match app.clipboard().read_image() {
        Ok(img) => img,
        Err(_) => {
            let _ = app.notification().builder().title("Clipboard").body("No image on clipboard").show();
            return;
        }
    };
    let width = clipboard_image.width();
    let height = clipboard_image.height();
    let buffer: image::RgbaImage = match image::ImageBuffer::from_raw(width, height, clipboard_image.rgba().to_vec()) {
        Some(b) => b,
        None => {
            let _ = app.notification().builder().title("Clipboard").body("Failed to decode image").show();
            return;
        }
    };
    let dir = match crate::common::get_screenshots_dir() {
        Ok(d) => d,
        Err(e) => {
            let _ = app.notification().builder().title("Clipboard").body(e).show();
            return;
        }
    };
    let file_name = format!("clipboard_{}.png", chrono::Local::now().format("%Y%m%d_%H%M%S"));
    let file_path = dir.join(&file_name);
    if let Err(e) = buffer.save(&file_path) {
        let _ = app.notification().builder().title("Clipboard").body(format!("Save failed: {}", e)).show();
        return;
    }
    let file_path_str = file_path.to_string_lossy().to_string();
    let upload = crate::common::upload_file(
        file_path_str.clone(),
        api_url,
        config.upload_token.clone(),
        visibility,
        None,
        None,
        None,
    ).await;
    match upload {
        Ok(resp) => {
            let event = crate::common::create_upload_event(resp, Some(file_path_str));
            let _ = app.clipboard().write_text(event.url.clone());
            let _ = app.notification().builder().title("Upload Complete").body("URL copied to clipboard").show();
            let _ = crate::common::add_to_history(crate::common::UploadHistoryItem {
                url: event.url.clone(),
                name: event.name.clone(),
                timestamp: chrono::Utc::now().timestamp_millis() as u64,
                file_type: event.file_type.clone(),
                size: Some(event.size),
                thumbnail_url: Some(event.url.clone()),
            });
            if let Some(main) = app.get_webview_window("main") {
                let _ = main.emit("upload_complete", &event);
            }
            let _ = app.emit("upload_complete", &event);
        }
        Err(e) => {
            let _ = app.notification().builder().title("Clipboard Upload Failed").body(e).show();
        }
    }
}
