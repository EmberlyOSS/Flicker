use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, Emitter};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri_plugin_clipboard_manager::ClipboardExt as _;

static REGION_CAPTURING: AtomicBool = AtomicBool::new(false);
static MAIN_WAS_VISIBLE: AtomicBool = AtomicBool::new(false);
static MAIN_HIDDEN_BY_USER: AtomicBool = AtomicBool::new(false);

pub fn mark_main_hidden_by_user() {
    MAIN_HIDDEN_BY_USER.store(true, Ordering::SeqCst);
}

pub fn mark_main_shown() {
    MAIN_HIDDEN_BY_USER.store(false, Ordering::SeqCst);
}

pub fn is_overlay_open(app: &AppHandle) -> bool {
    app.webview_windows()
        .keys()
        .any(|label| label.starts_with("region-overlay"))
}

// Minimized or user-hidden windows must never count as visible, or background hotkeys would pop them open.
pub fn hide_main_for_capture(app: &AppHandle) {
    if MAIN_HIDDEN_BY_USER.load(Ordering::SeqCst) {
        MAIN_WAS_VISIBLE.store(false, Ordering::SeqCst);
        return;
    }
    if let Some(main) = app.get_webview_window("main") {
        let minimized = main.is_minimized().unwrap_or(false);
        if minimized {

            MAIN_WAS_VISIBLE.store(false, Ordering::SeqCst);
            return;
        }
        if let Ok(visible) = main.is_visible() {
            if visible {
                MAIN_WAS_VISIBLE.store(true, Ordering::SeqCst);
                let _ = main.hide();
            } else {
                MAIN_WAS_VISIBLE.store(false, Ordering::SeqCst);
            }
        }
    }
}

pub fn restore_main_after_capture(app: &AppHandle) {
    if MAIN_WAS_VISIBLE.swap(false, Ordering::SeqCst)
        && !MAIN_HIDDEN_BY_USER.load(Ordering::SeqCst)
    {
        if let Some(main) = app.get_webview_window("main") {
            let _ = main.show();
            let _ = main.unminimize();
            let _ = main.set_focus();
        }
    }
}

pub fn close_region_overlay(app: &AppHandle) -> Result<(), String> {
    let labels: Vec<String> = app
        .webview_windows()
        .keys()
        .filter(|l| l.starts_with("region-overlay"))
        .cloned()
        .collect();

    for label in labels {
        if let Some(window) = app.get_webview_window(&label) {
            let _ = window.close();
        }
    }
    Ok(())
}

pub fn cancel_region_capture(app: &AppHandle) -> Result<(), String> {
    close_region_overlay(app)?;
    restore_main_after_capture(app);
    Ok(())
}

pub async fn start_region_capture(app: AppHandle) -> Result<(), String> {
    crate::flog!("start_region_capture invoked");

    #[cfg(target_os = "macos")]
    {
        if !crate::desktop::macos::has_screen_recording_permission() {
            let was_requested = crate::desktop::macos::request_screen_recording_permission();

            if !crate::desktop::macos::has_screen_recording_permission() {
                let _ = crate::desktop::macos::open_screen_recording_settings();

                if let Some(main) = app.get_webview_window("main") {
                    let _ = main.emit(
                        "screen_recording_permission_required",
                        serde_json::json!({
                            "message": "Screen Recording permission is required for region capture. Please enable it in System Settings > Privacy & Security > Screen Recording, then restart Flicker.",
                            "requested": was_requested
                        }),
                    );
                }
                return Err(
                    "Screen Recording permission required. Enable it in System Settings > Privacy & Security > Screen Recording and restart Flicker.".to_string()
                );
            }
        }
    }

    if is_overlay_open(&app) {
        close_region_overlay(&app)?;

        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }

    hide_main_for_capture(&app);

    tokio::time::sleep(std::time::Duration::from_millis(120)).await;

    let monitors = app.available_monitors().unwrap_or_default();

    if monitors.is_empty() {

        #[cfg(feature = "desktop")]
        {
            let screens = screenshots::Screen::all()
                .map_err(|e| format!("Failed to get screens: {}", e))?;
            if screens.is_empty() {
                return Err("No screens found".to_string());
            }
            for (idx, screen) in screens.iter().enumerate() {
                create_overlay_for_screen(&app, idx, screen)?;
            }
            return Ok(());
        }
        #[cfg(not(feature = "desktop"))]
        return Err("No screens found".to_string());
    }

    for (idx, monitor) in monitors.iter().enumerate() {
        let label = format!("region-overlay-{}", idx);
        if app.get_webview_window(&label).is_some() {
            continue;
        }

        let position = monitor.position();
        let size = monitor.size();
        let scale = monitor.scale_factor();

        let url = WebviewUrl::App(format!("index.html?overlay=region&monitor={}", idx).into());

        let mut builder = WebviewWindowBuilder::new(&app, &label, url)
            .title("Flicker - Select Region")
            .inner_size(size.width as f64 / scale, size.height as f64 / scale)
            .position(position.x as f64 / scale, position.y as f64 / scale)
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .skip_taskbar(true)
            .resizable(false)
            .visible(true)
            .focused(idx == 0)
            .accept_first_mouse(true);

        #[cfg(target_os = "macos")]
        {
            builder = builder.hidden_title(true);
        }

        let window = builder.build().map_err(|e| format!("Failed to create overlay: {}", e))?;

        let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition {
            x: position.x as f64 / scale,
            y: position.y as f64 / scale,
        }));
        let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize {
            width: size.width as f64 / scale,
            height: size.height as f64 / scale,
        }));
        let _ = window.set_always_on_top(true);
        let _ = window.set_focus();
        let _ = window.show();
    }

    Ok(())
}

#[cfg(feature = "desktop")]
fn create_overlay_for_screen(
    app: &AppHandle,
    idx: usize,
    screen: &screenshots::Screen,
) -> Result<(), String> {
    let info = &screen.display_info;
    let scale = info.scale_factor as f64;
    let logical_x = info.x as f64;
    let logical_y = info.y as f64;

    let logical_w = info.width as f64 / scale;
    let logical_h = info.height as f64 / scale;

    let label = format!("region-overlay-{}", idx);
    if app.get_webview_window(&label).is_some() {
        return Ok(());
    }

    let url = WebviewUrl::App(format!("index.html?overlay=region&monitor={}", idx).into());

    let window = WebviewWindowBuilder::new(app, &label, url)
        .title("Flicker - Select Region")
        .inner_size(logical_w, logical_h)
        .position(logical_x, logical_y)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .visible(true)
        .focused(idx == 0)
        .accept_first_mouse(true)
        .build()
        .map_err(|e| format!("Failed to create overlay: {}", e))?;

    let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition {
        x: logical_x,
        y: logical_y,
    }));
    let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize {
        width: logical_w,
        height: logical_h,
    }));
    let _ = window.set_always_on_top(true);
    let _ = window.show();
    Ok(())
}

pub async fn confirm_region_capture(
    app: AppHandle,
    monitor_index: usize,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    scale_factor: Option<f64>,
) -> Result<crate::common::ScreenshotResult, String> {

    if width < 5.0 || height < 5.0 {
        return Err("Selection too small".to_string());
    }

    close_region_overlay(&app)?;

    tokio::time::sleep(std::time::Duration::from_millis(180)).await;

    let scale = if let Some(s) = scale_factor {
        s
    } else {

        if let Ok(monitors) = app.available_monitors() {
            if let Some(m) = monitors.get(monitor_index) {
                m.scale_factor()
            } else {
                1.0
            }
        } else {

            #[cfg(feature = "desktop")]
            {
                screenshots::Screen::all()
                    .ok()
                    .and_then(|s| s.get(monitor_index).map(|scr| scr.display_info.scale_factor as f64))
                    .unwrap_or(1.0)
            }
            #[cfg(not(feature = "desktop"))]
            1.0
        }
    };

    let phys_x = (x * scale).round() as i32;
    let phys_y = (y * scale).round() as i32;
    let phys_w = (width * scale).round() as u32;
    let phys_h = (height * scale).round() as u32;

    let result = crate::desktop::screenshot::capture_region(
        phys_x,
        phys_y,
        phys_w,
        phys_h,
        Some(monitor_index),
    )
    .await;

    restore_main_after_capture(&app);

    result
}

pub async fn capture_region_and_upload(
    app: AppHandle,
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
) -> Result<crate::common::UploadCompleteEvent, String> {

    if REGION_CAPTURING.swap(true, Ordering::SeqCst) {
        return Err("Region capture already in progress".to_string());
    }

    let result: Result<crate::common::UploadCompleteEvent, String> = async {
        let screenshot = confirm_region_capture(app.clone(), monitor_index, x, y, width, height, scale_factor).await?;

        let config = crate::common::load_config().unwrap_or_default();

        let api_url = api_url
            .or(config.upload_url.clone())
            .unwrap_or_else(|| "https://embrly.ca".to_string());
        let token = upload_token
            .filter(|t| !t.is_empty())
            .unwrap_or(config.upload_token.clone());

        if token.is_empty() {
            return Err("No upload token configured. Please log in via the main window.".to_string());
        }

        let visibility = visibility.unwrap_or(config.visibility.clone());
        // The domain is chosen separately from upload_url and must not be derived from it.
        let domain_clone = domain.clone();

        let upload_result = crate::common::upload_file(
            screenshot.path.clone(),
            api_url,
            token,
            visibility,
            None,
            domain_clone,
            None,
        )
        .await?;

        crate::common::discard_capture(&screenshot.path);
        let event = crate::common::create_upload_event(upload_result, Some(screenshot.path));

        let _ = crate::common::add_to_history(crate::common::UploadHistoryItem {
            url: event.url.clone(),
            name: event.name.clone(),
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
            file_type: event.file_type.clone(),
            size: Some(event.size),
            thumbnail_url: Some(event.url.clone()),
        });

        let _ = app.clipboard().write_text(event.url.clone());

        crate::desktop::app::send_os_notification(&app, "Region Captured", "URL copied to clipboard");

        if let Some(main) = app.get_webview_window("main") {
            let _ = main.emit("region_upload_complete", &event);
            let _ = main.emit("upload_complete", &event);
        }

        let _ = app.emit("region_upload_complete", &event);

        Ok(event)
    }
    .await;

    REGION_CAPTURING.store(false, Ordering::SeqCst);

    if let Err(ref e) = result {
        crate::desktop::app::send_os_notification(&app, "Region Capture Failed", e);
    }

    result
}

pub async fn capture_window_and_upload(
    app: AppHandle,
    x: f64,
    y: f64,
    monitor_index: usize,
    scale_factor: Option<f64>,
    api_url: Option<String>,
    upload_token: Option<String>,
    visibility: Option<String>,
    domain: Option<String>,
) -> Result<crate::common::UploadCompleteEvent, String> {
    if REGION_CAPTURING.swap(true, Ordering::SeqCst) {
        return Err("Region capture already in progress".to_string());
    }

    let result: Result<crate::common::UploadCompleteEvent, String> = async {

        close_region_overlay(&app)?;
        tokio::time::sleep(std::time::Duration::from_millis(180)).await;

        let scale = scale_factor.unwrap_or_else(|| {
            app.available_monitors()
                .ok()
                .and_then(|m| m.get(monitor_index).map(|mon| mon.scale_factor()))
                .unwrap_or(1.0)
        });

        let global_x = {
            if let Ok(monitors) = app.available_monitors() {
                if let Some(mon) = monitors.get(monitor_index) {
                    let pos = mon.position();
                    (pos.x as f64 / scale) + x
                } else {
                    x
                }
            } else {
                x
            }
        };
        let global_y = {
            if let Ok(monitors) = app.available_monitors() {
                if let Some(mon) = monitors.get(monitor_index) {
                    let pos = mon.position();
                    (pos.y as f64 / scale) + y
                } else {
                    y
                }
            } else {
                y
            }
        };

        let screenshot = crate::desktop::screenshot::capture_window_at_point(
            global_x.round() as i32,
            global_y.round() as i32,
            Some(monitor_index),
        )
        .await?;

        restore_main_after_capture(&app);

        let config = crate::common::load_config().unwrap_or_default();
        let api_url = api_url
            .or(config.upload_url.clone())
            .unwrap_or_else(|| "https://embrly.ca".to_string());
        let token = upload_token.filter(|t| !t.is_empty()).unwrap_or(config.upload_token.clone());
        if token.is_empty() {
            return Err("No upload token configured. Please log in via the main window.".to_string());
        }
        let visibility = visibility.unwrap_or(config.visibility.clone());
        let domain_clone = domain.clone();

        let upload_result = crate::common::upload_file(
            screenshot.path.clone(),
            api_url,
            token,
            visibility,
            None,
            domain_clone,
            None,
        )
        .await?;

        crate::common::discard_capture(&screenshot.path);
        let event = crate::common::create_upload_event(upload_result, Some(screenshot.path));

        let _ = crate::common::add_to_history(crate::common::UploadHistoryItem {
            url: event.url.clone(),
            name: event.name.clone(),
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
            file_type: event.file_type.clone(),
            size: Some(event.size),
            thumbnail_url: Some(event.url.clone()),
        });

        let _ = app.clipboard().write_text(event.url.clone());
        crate::desktop::app::send_os_notification(&app, "Window Captured", "URL copied to clipboard");

        if let Some(main) = app.get_webview_window("main") {
            let _ = main.emit("region_upload_complete", &event);
            let _ = main.emit("upload_complete", &event);
        }
        let _ = app.emit("region_upload_complete", &event);

        Ok(event)
    }
    .await;

    restore_main_after_capture(&app);
    REGION_CAPTURING.store(false, Ordering::SeqCst);

    if let Err(ref e) = result {
        crate::desktop::app::send_os_notification(&app, "Window Capture Failed", e);
    }

    result
}
