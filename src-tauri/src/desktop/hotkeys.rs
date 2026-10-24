use tauri::{AppHandle, Manager, Emitter};
use tauri_plugin_clipboard_manager::ClipboardExt as _;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use std::collections::HashMap;
use std::sync::Mutex;

static HOTKEY_FAILURES: Mutex<Option<HashMap<String, String>>> = Mutex::new(None);

const IN_USE: &str = "Another app is already using this shortcut";
const DUPLICATE: &str = "Also assigned to another Flicker action";

fn field_for(name: &str) -> &'static str {
    match name {
        "fullscreen" => "screenshotFullscreen",
        "all-monitors" => "screenshotAllMonitors",
        "region" => "screenshotRegion",
        "clipboard" => "uploadClipboard",
        "open-app" => "openApp",
        _ => "recordVideo",
    }
}

fn record_failure(name: &str, reason: &str) {
    crate::common::audit::record("hotkey", &format!("{} shortcut not registered: {}", name, reason), "warning");
    if let Ok(mut guard) = HOTKEY_FAILURES.lock() {
        guard.get_or_insert_with(HashMap::new).insert(field_for(name).to_string(), reason.to_string());
    }
}

pub fn hotkey_failures() -> HashMap<String, String> {
    HOTKEY_FAILURES.lock().ok().and_then(|g| g.clone()).unwrap_or_default()
}

pub fn reregister_hotkeys(app: &AppHandle) -> Result<(), String> {
    crate::flog!("reregister_hotkeys: called");

    let unregister_res = app.global_shortcut().unregister_all();
    if let Ok(mut guard) = HOTKEY_FAILURES.lock() {
        *guard = Some(HashMap::new());
    }
    crate::flog!("reregister_hotkeys: unregister_all result: {:?}", unregister_res.is_ok());

    let config = crate::common::load_config().unwrap_or_default();
    crate::flog!("reregister_hotkeys: loaded hotkeys fullscreen='{}' region='{}' all='{}' clipboard='{}' record='{}' token_len={}",
        config.hotkeys.screenshot_fullscreen, config.hotkeys.screenshot_region, config.hotkeys.screenshot_all_monitors, config.hotkeys.upload_clipboard, config.hotkeys.record_video, config.upload_token.len());
    let hk = config.hotkeys;

    // A shortcut bound to two actions would fire both on one press, so the first registration wins.
    let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut claim = |name: &str, shortcut: &str| -> bool {
        let key = shortcut.trim().to_lowercase();
        if key.is_empty() {
            return false;
        }
        if !seen.insert(key) {
            record_failure(name, DUPLICATE);
            crate::flog_err!("hotkey '{}' ({}) already registered — skipping duplicate", shortcut, name);
            return false;
        }
        true
    };

    if claim("fullscreen", &hk.screenshot_fullscreen) {
        let app_c = app.clone();
        let shortcut = hk.screenshot_fullscreen.clone();
        crate::flog!("registering fullscreen hotkey: '{}'", shortcut);
        let res = app.global_shortcut().on_shortcut(shortcut.as_str(), move |_app, _sc, event| {
            crate::flog!("hotkey event fullscreen: state={:?} sc={:?}", event.state, _sc);
            if event.state != ShortcutState::Pressed { return; }
            crate::flog!("fullscreen hotkey PRESSED, spawning do_capture");
            let handle = app_c.clone();
            tauri::async_runtime::spawn(async move {
                do_capture(handle, false).await;
            });
        });
        crate::flog!("register fullscreen result: {:?}", res.is_ok());
        if let Err(e) = &res { record_failure("fullscreen", IN_USE); crate::flog_err!("failed to register fullscreen '{}': {}", shortcut, e); }
    } else {
        crate::flog!("fullscreen hotkey empty, skipping");
    }

    if claim("all-monitors", &hk.screenshot_all_monitors) {
        let app_c = app.clone();
        let shortcut = hk.screenshot_all_monitors.clone();
        crate::flog!("registering all-monitors hotkey: '{}'", shortcut);
        let res = app.global_shortcut().on_shortcut(shortcut.as_str(), move |_app, _sc, event| {
            crate::flog!("hotkey event all-monitors: state={:?} sc={:?}", event.state, _sc);
            if event.state != ShortcutState::Pressed { return; }
            crate::flog!("all-monitors hotkey PRESSED");
            let handle = app_c.clone();
            tauri::async_runtime::spawn(async move {
                do_capture(handle, true).await;
            });
        });
        crate::flog!("register all-monitors result: {:?}", res.is_ok());
        if let Err(e) = res { record_failure("all-monitors", IN_USE); crate::flog_err!("failed to register all-monitors '{}': {}", shortcut, e); }
    } else {
        crate::flog!("all-monitors hotkey empty, skipping");
    }

    if claim("region", &hk.screenshot_region) {
        let app_c = app.clone();
        let shortcut = hk.screenshot_region.clone();
        crate::flog!("registering region hotkey: '{}'", shortcut);
        let res = app.global_shortcut().on_shortcut(shortcut.as_str(), move |_app, _sc, event| {
            crate::flog!("hotkey event region: state={:?} sc={:?}", event.state, _sc);
            if event.state != ShortcutState::Pressed { return; }
            crate::flog!("region hotkey PRESSED, spawning start_region_capture");
            let handle = app_c.clone();
            tauri::async_runtime::spawn(async move {
                let r = crate::desktop::region::start_region_capture(handle).await;
                crate::flog!("start_region_capture result: {:?}", r);
            });
        });
        crate::flog!("register region result: {:?}", res.is_ok());
        if let Err(e) = res { record_failure("region", IN_USE); crate::flog_err!("failed to register region '{}': {}", shortcut, e); }
    } else {
        crate::flog!("region hotkey empty, skipping");
    }

    if claim("clipboard", &hk.upload_clipboard) {
        let app_c = app.clone();
        let shortcut = hk.upload_clipboard.clone();
        crate::flog!("registering clipboard hotkey: '{}'", shortcut);
        let res = app.global_shortcut().on_shortcut(shortcut.as_str(), move |_app, _sc, event| {
            crate::flog!("hotkey event clipboard: state={:?} sc={:?}", event.state, _sc);
            if event.state != ShortcutState::Pressed { return; }
            crate::flog!("clipboard hotkey PRESSED");
            let handle = app_c.clone();
            tauri::async_runtime::spawn(async move {
                do_clipboard_upload(handle).await;
            });
        });
        crate::flog!("register clipboard result: {:?}", res.is_ok());
        if let Err(e) = res { record_failure("clipboard", IN_USE); crate::flog_err!("failed to register clipboard '{}': {}", shortcut, e); }
    } else {
        crate::flog!("clipboard hotkey empty, skipping");
    }

    if claim("open-app", &hk.open_app) {
        let app_c = app.clone();
        let shortcut = hk.open_app.clone();
        crate::flog!("registering open-app hotkey: '{}'", shortcut);
        let res = app.global_shortcut().on_shortcut(shortcut.as_str(), move |_app, _sc, event| {
            if event.state != ShortcutState::Pressed { return; }
            crate::desktop::app::toggle_window(&app_c);
        });
        if let Err(e) = res { record_failure("open-app", IN_USE); crate::flog_err!("failed to register open-app '{}': {}", shortcut, e); }
    }

    let video_hk = hk.record_video.clone();
    if claim("video", &video_hk) {
        let app_c = app.clone();
        crate::flog!("registering video hotkey: '{}'", video_hk);
        let res = app.global_shortcut().on_shortcut(video_hk.as_str(), move |_app, _sc, event| {
            crate::flog!("hotkey event video: state={:?} sc={:?}", event.state, _sc);
            if event.state != ShortcutState::Pressed { return; }
            crate::flog!("video hotkey PRESSED, toggling");
            let handle = app_c.clone();
            tauri::async_runtime::spawn(async move {
                let r = crate::desktop::video::toggle_video_recording(handle).await;
                crate::flog!("toggle_video_recording result: {:?}", r);
            });
        });
        crate::flog!("register video result: {:?}", res.is_ok());
        if let Err(e) = res { record_failure("video", IN_USE); crate::flog_err!("failed to register video '{}': {}", video_hk, e); }
    } else {
        crate::flog!("video hotkey empty, skipping");
    }

    let _ = app.emit("hotkeys_status", hotkey_failures());
    Ok(())
}

pub async fn do_capture(app: AppHandle, capture_all: bool) {

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
        // Triggered from another app, so stay hidden.
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

        crate::common::discard_capture(&screenshot.path);
        let event = crate::common::create_upload_event(upload, Some(screenshot.path));

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
            crate::common::discard_capture(&file_path_str);
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
