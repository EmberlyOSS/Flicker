/// Rust-side global hotkey manager — ensures captures work even when app is hidden/backgrounded
/// Mirrors the JS `useHotkeys` but runs in the backend so uploads happen without needing to return to the app.
/// Also shows OS notifications and copies to clipboard directly in Rust.

use tauri::{AppHandle, Manager, Emitter};
use tauri_plugin_clipboard_manager::ClipboardExt as _;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

/// Register (or re-register) all global hotkeys from the config file.
/// Call on startup and after hotkey config changes.
pub fn reregister_hotkeys(app: &AppHandle) -> Result<(), String> {
    println!("[Flicker] reregister_hotkeys: called");
    // Unregister all previous — ignore errors (e.g., nothing registered yet)
    let unregister_res = app.global_shortcut().unregister_all();
    println!("[Flicker] reregister_hotkeys: unregister_all result: {:?}", unregister_res.is_ok());

    let config = crate::common::load_config().unwrap_or_default();
    println!("[Flicker] reregister_hotkeys: loaded hotkeys fullscreen='{}' region='{}' all='{}' clipboard='{}' record='{}' token_len={}", 
        config.hotkeys.screenshot_fullscreen, config.hotkeys.screenshot_region, config.hotkeys.screenshot_all_monitors, config.hotkeys.upload_clipboard, config.hotkeys.record_video, config.upload_token.len());
    let hk = config.hotkeys;

    // Fullscreen
    if !hk.screenshot_fullscreen.trim().is_empty() {
        let app_c = app.clone();
        let shortcut = hk.screenshot_fullscreen.clone();
        println!("[Flicker] registering fullscreen hotkey: '{}'", shortcut);
        let res = app.global_shortcut().on_shortcut(shortcut.as_str(), move |_app, _sc, event| {
            println!("[Flicker] hotkey event fullscreen: state={:?} sc={:?}", event.state, _sc);
            if event.state != ShortcutState::Pressed { return; }
            println!("[Flicker] fullscreen hotkey PRESSED, spawning do_capture");
            let handle = app_c.clone();
            tauri::async_runtime::spawn(async move {
                do_capture(handle, false).await;
            });
        });
        println!("[Flicker] register fullscreen result: {:?}", res.is_ok());
        if let Err(e) = &res { eprintln!("[Flicker] failed to register fullscreen '{}': {}", shortcut, e); }
    } else {
        println!("[Flicker] fullscreen hotkey empty, skipping");
    }

    // All monitors
    if !hk.screenshot_all_monitors.trim().is_empty() {
        let app_c = app.clone();
        let shortcut = hk.screenshot_all_monitors.clone();
        println!("[Flicker] registering all-monitors hotkey: '{}'", shortcut);
        let res = app.global_shortcut().on_shortcut(shortcut.as_str(), move |_app, _sc, event| {
            println!("[Flicker] hotkey event all-monitors: state={:?} sc={:?}", event.state, _sc);
            if event.state != ShortcutState::Pressed { return; }
            println!("[Flicker] all-monitors hotkey PRESSED");
            let handle = app_c.clone();
            tauri::async_runtime::spawn(async move {
                do_capture(handle, true).await;
            });
        });
        println!("[Flicker] register all-monitors result: {:?}", res.is_ok());
        if let Err(e) = res { eprintln!("[Flicker] failed to register all-monitors '{}': {}", shortcut, e); }
    } else {
        println!("[Flicker] all-monitors hotkey empty, skipping");
    }

    // Region
    if !hk.screenshot_region.trim().is_empty() {
        let app_c = app.clone();
        let shortcut = hk.screenshot_region.clone();
        println!("[Flicker] registering region hotkey: '{}'", shortcut);
        let res = app.global_shortcut().on_shortcut(shortcut.as_str(), move |_app, _sc, event| {
            println!("[Flicker] hotkey event region: state={:?} sc={:?}", event.state, _sc);
            if event.state != ShortcutState::Pressed { return; }
            println!("[Flicker] region hotkey PRESSED, spawning start_region_capture");
            let handle = app_c.clone();
            tauri::async_runtime::spawn(async move {
                let r = crate::desktop::region::start_region_capture(handle).await;
                println!("[Flicker] start_region_capture result: {:?}", r);
            });
        });
        println!("[Flicker] register region result: {:?}", res.is_ok());
        if let Err(e) = res { eprintln!("[Flicker] failed to register region '{}': {}", shortcut, e); }
    } else {
        println!("[Flicker] region hotkey empty, skipping");
    }

    // Clipboard upload
    if !hk.upload_clipboard.trim().is_empty() {
        let app_c = app.clone();
        let shortcut = hk.upload_clipboard.clone();
        println!("[Flicker] registering clipboard hotkey: '{}'", shortcut);
        let res = app.global_shortcut().on_shortcut(shortcut.as_str(), move |_app, _sc, event| {
            println!("[Flicker] hotkey event clipboard: state={:?} sc={:?}", event.state, _sc);
            if event.state != ShortcutState::Pressed { return; }
            println!("[Flicker] clipboard hotkey PRESSED");
            let handle = app_c.clone();
            tauri::async_runtime::spawn(async move {
                do_clipboard_upload(handle).await;
            });
        });
        println!("[Flicker] register clipboard result: {:?}", res.is_ok());
        if let Err(e) = res { eprintln!("[Flicker] failed to register clipboard '{}': {}", shortcut, e); }
    } else {
        println!("[Flicker] clipboard hotkey empty, skipping");
    }

    // Video recording — same hotkey toggles start/stop and auto-uploads mp4 (10m max)
    let video_hk = hk.record_video.clone();
    if !video_hk.trim().is_empty() {
        let app_c = app.clone();
        println!("[Flicker] registering video hotkey: '{}'", video_hk);
        let res = app.global_shortcut().on_shortcut(video_hk.as_str(), move |_app, _sc, event| {
            println!("[Flicker] hotkey event video: state={:?} sc={:?}", event.state, _sc);
            if event.state != ShortcutState::Pressed { return; }
            println!("[Flicker] video hotkey PRESSED, toggling");
            let handle = app_c.clone();
            tauri::async_runtime::spawn(async move {
                let r = crate::desktop::video::toggle_video_recording(handle).await;
                println!("[Flicker] toggle_video_recording result: {:?}", r);
            });
        });
        println!("[Flicker] register video result: {:?}", res.is_ok());
        if let Err(e) = res { eprintln!("[Flicker] failed to register video '{}': {}", video_hk, e); }
    } else {
        println!("[Flicker] video hotkey empty, skipping");
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
        #[cfg(target_os = "macos")]
        {
            if !crate::desktop::macos::has_screen_recording_permission() {
                let _ = crate::desktop::macos::request_screen_recording_permission();
                if !crate::desktop::macos::has_screen_recording_permission() {
                    crate::desktop::macos::open_screen_recording_settings();
                    return Err("Screen Recording permission required. Enable in System Settings → Privacy & Security → Screen Recording and restart.".to_string());
                }
            }
        }
        let config = crate::common::load_config().unwrap_or_default();
        if config.upload_token.trim().is_empty() {
            crate::desktop::app::send_os_notification(&app, "Not logged in", "Please sign in to capture");
            return Err("No upload token".to_string());
        }
        let api_url = config.upload_url.clone().unwrap_or_else(|| "https://embrly.ca".to_string());
        let visibility = config.visibility.clone();
        let domain = None::<String>;

        crate::desktop::region::hide_main_for_capture(&app);
        tokio::time::sleep(std::time::Duration::from_millis(120)).await;

        let capture_res = tokio::time::timeout(
            std::time::Duration::from_secs(8),
            async {
                if capture_all {
                    crate::desktop::screenshot::capture_all_monitors().await
                } else {
                    crate::desktop::screenshot::capture_screenshot(None).await
                }
            },
        )
        .await;
        crate::desktop::region::restore_main_after_capture(&app);
        let screenshot = capture_res
            .map_err(|_| "Screenshot capture timed out — check Screen Recording permission".to_string())??;

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
        crate::desktop::app::send_os_notification(&app, "Upload Complete", "URL copied to clipboard");

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
        crate::desktop::app::send_os_notification(&app, "Capture Failed", &e);
    }

    CAPTURING.store(false, Ordering::SeqCst);
}

async fn do_clipboard_upload(app: AppHandle) {
    let config = crate::common::load_config().unwrap_or_default();
    if config.upload_token.trim().is_empty() {
        crate::desktop::app::send_os_notification(&app, "Not logged in", "Please sign in");
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
            crate::desktop::app::send_os_notification(&app, "Clipboard", "No image on clipboard");
            return;
        }
    };
    let width = clipboard_image.width();
    let height = clipboard_image.height();
    let buffer: image::RgbaImage = match image::ImageBuffer::from_raw(width, height, clipboard_image.rgba().to_vec()) {
        Some(b) => b,
        None => {
            crate::desktop::app::send_os_notification(&app, "Clipboard", "Failed to decode image");
            return;
        }
    };
    let dir = match crate::common::get_screenshots_dir() {
        Ok(d) => d,
        Err(e) => {
            crate::desktop::app::send_os_notification(&app, "Clipboard", &e);
            return;
        }
    };
    let file_name = format!("clipboard_{}.png", chrono::Local::now().format("%Y%m%d_%H%M%S"));
    let file_path = dir.join(&file_name);
    if let Err(e) = buffer.save(&file_path) {
        crate::desktop::app::send_os_notification(&app, "Clipboard", &format!("Save failed: {}", e));
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
            crate::desktop::app::send_os_notification(&app, "Upload Complete", "URL copied to clipboard");
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
            crate::desktop::app::send_os_notification(&app, "Clipboard Upload Failed", &e);
        }
    }
}
