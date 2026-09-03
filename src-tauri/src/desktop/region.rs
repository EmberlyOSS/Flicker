/// Global region capture overlay - system-wide screenshot region selector
/// Works even when main window is hidden/backgrounded.
/// Inspired by ShareX / CharEx: fullscreen transparent overlay with drag-to-select.

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, Emitter};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri_plugin_clipboard_manager::ClipboardExt as _;
use tauri_plugin_notification::NotificationExt as _;

static REGION_CAPTURING: AtomicBool = AtomicBool::new(false);
static MAIN_WAS_VISIBLE: AtomicBool = AtomicBool::new(false);

/// Check if any region overlay window is currently open
pub fn is_overlay_open(app: &AppHandle) -> bool {
    app.webview_windows()
        .keys()
        .any(|label| label.starts_with("region-overlay"))
}

/// Hide main window before capture so Flicker itself is not included in the screenshot.
/// Records whether it was visible so we can restore it afterwards.
pub fn hide_main_for_capture(app: &AppHandle) {
    if let Some(main) = app.get_webview_window("main") {
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

/// Restore main window if we hid it for capture.
pub fn restore_main_after_capture(app: &AppHandle) {
    if MAIN_WAS_VISIBLE.swap(false, Ordering::SeqCst) {
        if let Some(main) = app.get_webview_window("main") {
            let _ = main.show();
            let _ = main.unminimize();
            let _ = main.set_focus();
        }
    }
}

/// Close all region overlay windows (without restoring main — caller decides)
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

/// Cancel region capture — close overlay and restore main window if we hid it
pub fn cancel_region_capture(app: &AppHandle) -> Result<(), String> {
    close_region_overlay(app)?;
    restore_main_after_capture(app);
    Ok(())
}

/// Start region capture - creates fullscreen transparent overlay(s) covering all monitors
pub async fn start_region_capture(app: AppHandle) -> Result<(), String> {
    // Permission check on macOS
    #[cfg(target_os = "macos")]
    {
        if !crate::desktop::macos::has_screen_recording_permission() {
            let was_requested = crate::desktop::macos::request_screen_recording_permission();
            // Even after request, it will be false until user grants and restarts
            // Check again
            if !crate::desktop::macos::has_screen_recording_permission() {
                let _ = crate::desktop::macos::open_screen_recording_settings();
                // Emit event to frontend to show friendly dialog
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

    // If already open, close first (toggle behavior)
    if is_overlay_open(&app) {
        close_region_overlay(&app)?;
        // small delay to allow close animation
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }

    // Hide main window so it doesn't appear in the screenshot (user reported Flicker always in capture)
    hide_main_for_capture(&app);
    // Give window manager time to hide before we freeze the overlay
    tokio::time::sleep(std::time::Duration::from_millis(120)).await;

    // Get monitors via Tauri (logical positions), fallback to screenshots crate
    let monitors = app.available_monitors().unwrap_or_default();

    if monitors.is_empty() {
        // Fallback: try screenshots crate
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

    // Create overlay for each monitor using Tauri monitor info
    // We also need screenshots::Screen to map index correctly - assume same order
    // For positioning we use Tauri monitor's physical position/size
    for (idx, monitor) in monitors.iter().enumerate() {
        let label = format!("region-overlay-{}", idx);
        if app.get_webview_window(&label).is_some() {
            continue;
        }

        let position = monitor.position();
        let size = monitor.size();
        let scale = monitor.scale_factor();

        // URL with monitor index so frontend knows which monitor it is
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

        // macOS specific: ensure window is on all spaces
        #[cfg(target_os = "macos")]
        {
            builder = builder.hidden_title(true);
        }

        let window = builder.build().map_err(|e| format!("Failed to create overlay: {}", e))?;

        // Ensure correct position/size via explicit calls (more reliable than builder)
        // Use logical for position
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

    // Also ensure main window stays hidden? Don't hide, just let overlay be on top

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
    // screenshots width/height are physical; convert to logical for window
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

/// Confirm region capture - called from overlay window after user selects region
/// x, y, width, height are in LOGICAL pixels relative to that monitor's overlay window (0,0 = top-left of that monitor)
pub async fn confirm_region_capture(
    app: AppHandle,
    monitor_index: usize,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    scale_factor: Option<f64>,
) -> Result<crate::common::ScreenshotResult, String> {
    // Validate dimensions
    if width < 5.0 || height < 5.0 {
        return Err("Selection too small".to_string());
    }

    // Close overlay BEFORE capture so it doesn't appear in screenshot
    close_region_overlay(&app)?;
    // Wait for window to disappear (important on macOS where close is animated)
    tokio::time::sleep(std::time::Duration::from_millis(180)).await;

    // Determine scale factor - use provided or lookup from monitor/screens
    let scale = if let Some(s) = scale_factor {
        s
    } else {
        // Try to get from Tauri monitors
        if let Ok(monitors) = app.available_monitors() {
            if let Some(m) = monitors.get(monitor_index) {
                m.scale_factor()
            } else {
                1.0
            }
        } else {
            // fallback to screenshots
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

    // Convert logical to physical pixels for screenshots crate
    let phys_x = (x * scale).round() as i32;
    let phys_y = (y * scale).round() as i32;
    let phys_w = (width * scale).round() as u32;
    let phys_h = (height * scale).round() as u32;

    // Perform capture on the specific monitor using physical coords relative to that monitor
    // Main window is already hidden (hide_main_for_capture in start), so Flicker won't be in the shot
    let result = crate::desktop::screenshot::capture_region(
        phys_x,
        phys_y,
        phys_w,
        phys_h,
        Some(monitor_index),
    )
    .await;

    // Restore main window now that capture is done (upload will happen next if via capture_and_upload)
    restore_main_after_capture(&app);

    result
}

/// Capture region and immediately upload using stored config (disk config fallback)
/// This is an alternative single-call flow that does capture+upload in Rust
/// Includes guard against concurrent/duplicate calls (fixes “billion uploads”)
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
    // Guard: prevent concurrent/billion uploads — only one region capture at a time
    if REGION_CAPTURING.swap(true, Ordering::SeqCst) {
        return Err("Region capture already in progress".to_string());
    }

    let result: Result<crate::common::UploadCompleteEvent, String> = async {
        let screenshot = confirm_region_capture(app.clone(), monitor_index, x, y, width, height, scale_factor).await?;

        // Load config to get upload credentials if not provided
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
        // domain is separate from upload_url — don't derive from upload_url
        let domain_clone = domain.clone();

        // Upload
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

        let event = crate::common::create_upload_event(upload_result, Some(screenshot.path));

        // Persist to disk history (so history survives even if frontend is backgrounded)
        let _ = crate::common::add_to_history(crate::common::UploadHistoryItem {
            url: event.url.clone(),
            name: event.name.clone(),
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
            file_type: event.file_type.clone(),
            size: Some(event.size),
            thumbnail_url: Some(event.url.clone()),
        });

        // Copy to clipboard (Rust side — works even when app is backgrounded)
        let _ = app.clipboard().write_text(event.url.clone());

        // OS notification (Rust side — guaranteed even when app hidden)
        let _ = app
            .notification()
            .builder()
            .title("Region Captured")
            .body("URL copied to clipboard")
            .show();

        // Emit to main window for in-app history/toast update
        if let Some(main) = app.get_webview_window("main") {
            let _ = main.emit("region_upload_complete", &event);
            let _ = main.emit("upload_complete", &event);
        }

        // Also emit globally
        let _ = app.emit("region_upload_complete", &event);

        Ok(event)
    }
    .await;

    REGION_CAPTURING.store(false, Ordering::SeqCst);

    if let Err(ref e) = result {
        let _ = app
            .notification()
            .builder()
            .title("Region Capture Failed")
            .body(e.clone())
            .show();
    }

    result
}

/// Capture the window under the cursor (single-click without drag) and upload
/// Fixes Helium browser tabs not captured — uses window bounds via screencapture -R
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
        // Close overlay first (if any) — but keep main hidden until after capture
        close_region_overlay(&app)?;
        tokio::time::sleep(std::time::Duration::from_millis(180)).await;

        // Convert local click point to global screen point for window lookup
        let scale = scale_factor.unwrap_or_else(|| {
            app.available_monitors()
                .ok()
                .and_then(|m| m.get(monitor_index).map(|mon| mon.scale_factor()))
                .unwrap_or(1.0)
        });
        // x,y are logical relative to monitor; need global logical
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
        // For window capture, we need physical or logical? Our helper expects logical screen points
        // Pass global logical * scale? Actually our helper now expects logical points (since we use screencapture -R with logical)
        // So use global_x, global_y as logical
        let screenshot = crate::desktop::screenshot::capture_window_at_point(
            global_x.round() as i32,
            global_y.round() as i32,
            Some(monitor_index),
        )
        .await?;

        // Restore main after capture
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
        let _ = app
            .notification()
            .builder()
            .title("Window Captured")
            .body("URL copied to clipboard")
            .show();

        if let Some(main) = app.get_webview_window("main") {
            let _ = main.emit("region_upload_complete", &event);
            let _ = main.emit("upload_complete", &event);
        }
        let _ = app.emit("region_upload_complete", &event);

        Ok(event)
    }
    .await;

    // Ensure main is restored even on error (if we hid it in start)
    restore_main_after_capture(&app);
    REGION_CAPTURING.store(false, Ordering::SeqCst);

    if let Err(ref e) = result {
        let _ = app.notification().builder().title("Window Capture Failed").body(e.clone()).show();
    }

    result
}
