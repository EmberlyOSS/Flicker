use screenshots::Screen;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{Emitter, Manager};
use uuid::Uuid;

/// Response from the Emberly file upload API
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UploadResponse {
    pub url: String,
    pub name: String,
    pub size: u64,
    #[serde(rename = "type")]
    pub file_type: String,
}

/// Screenshot result with file path
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScreenshotResult {
    pub path: String,
    pub width: u32,
    pub height: u32,
}

/// Upload result with URL for clipboard
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UploadCompleteEvent {
    pub url: String,
    pub name: String,
    pub size: u64,
    pub file_type: String,
    pub screenshot_path: Option<String>,
}

/// Get the screenshots directory
fn get_screenshots_dir() -> Result<PathBuf, String> {
    let base_dir = dirs::picture_dir()
        .or_else(dirs::home_dir)
        .ok_or("Could not find pictures directory")?;

    let screenshots_dir = base_dir.join("Flicker Screenshots");

    if !screenshots_dir.exists() {
        std::fs::create_dir_all(&screenshots_dir)
            .map_err(|e| format!("Failed to create screenshots directory: {}", e))?;
    }

    Ok(screenshots_dir)
}

/// Capture a screenshot of the entire screen or primary monitor
#[tauri::command]
async fn capture_screenshot(monitor_index: Option<usize>) -> Result<ScreenshotResult, String> {
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;

    if screens.is_empty() {
        return Err("No screens found".to_string());
    }

    let screen_idx = monitor_index.unwrap_or(0);
    let screen = screens
        .get(screen_idx)
        .ok_or_else(|| format!("Monitor {} not found", screen_idx))?;

    let image = screen
        .capture()
        .map_err(|e| format!("Failed to capture screen: {}", e))?;

    let width = image.width();
    let height = image.height();

    // Generate unique filename with timestamp
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let uuid_short = &Uuid::new_v4().to_string()[..8];
    let filename = format!("screenshot_{}_{}.png", timestamp, uuid_short);

    let screenshots_dir = get_screenshots_dir()?;
    let file_path = screenshots_dir.join(&filename);

    // Save the screenshot
    image
        .save(&file_path)
        .map_err(|e| format!("Failed to save screenshot: {}", e))?;

    Ok(ScreenshotResult {
        path: file_path.to_string_lossy().to_string(),
        width,
        height,
    })
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
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;

    if screens.is_empty() {
        return Err("No screens found".to_string());
    }

    let screen_idx = monitor_index.unwrap_or(0);
    let screen = screens
        .get(screen_idx)
        .ok_or_else(|| format!("Monitor {} not found", screen_idx))?;

    let image = screen
        .capture_area(x, y, width, height)
        .map_err(|e| format!("Failed to capture region: {}", e))?;

    let img_width = image.width();
    let img_height = image.height();

    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let uuid_short = &Uuid::new_v4().to_string()[..8];
    let filename = format!("screenshot_{}_{}.png", timestamp, uuid_short);

    let screenshots_dir = get_screenshots_dir()?;
    let file_path = screenshots_dir.join(&filename);

    image
        .save(&file_path)
        .map_err(|e| format!("Failed to save screenshot: {}", e))?;

    Ok(ScreenshotResult {
        path: file_path.to_string_lossy().to_string(),
        width: img_width,
        height: img_height,
    })
}

/// Get list of available monitors
#[tauri::command]
fn get_monitors() -> Result<Vec<serde_json::Value>, String> {
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;

    Ok(screens
        .iter()
        .enumerate()
        .map(|(i, screen)| {
            serde_json::json!({
                "index": i,
                "id": screen.display_info.id,
                "x": screen.display_info.x,
                "y": screen.display_info.y,
                "width": screen.display_info.width,
                "height": screen.display_info.height,
                "is_primary": screen.display_info.is_primary,
                "scale_factor": screen.display_info.scale_factor,
            })
        })
        .collect())
}

/// Get the monitor index at a specific screen coordinate
#[tauri::command]
fn get_monitor_at_point(x: i32, y: i32) -> Result<Option<usize>, String> {
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;

    for (i, screen) in screens.iter().enumerate() {
        let info = &screen.display_info;
        let screen_x = info.x;
        let screen_y = info.y;
        let screen_width = info.width as i32;
        let screen_height = info.height as i32;

        if x >= screen_x
            && x < screen_x + screen_width
            && y >= screen_y
            && y < screen_y + screen_height
        {
            return Ok(Some(i));
        }
    }

    Ok(None)
}

/// Capture all monitors combined into a single image
#[tauri::command]
async fn capture_all_monitors() -> Result<ScreenshotResult, String> {
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;

    if screens.is_empty() {
        return Err("No screens found".to_string());
    }

    // Calculate the bounding box for all monitors
    let mut min_x = i32::MAX;
    let mut min_y = i32::MAX;
    let mut max_x = i32::MIN;
    let mut max_y = i32::MIN;

    for screen in &screens {
        let info = &screen.display_info;
        min_x = min_x.min(info.x);
        min_y = min_y.min(info.y);
        max_x = max_x.max(info.x + info.width as i32);
        max_y = max_y.max(info.y + info.height as i32);
    }

    let total_width = (max_x - min_x) as u32;
    let total_height = (max_y - min_y) as u32;

    // Create a new image buffer for the combined screenshot
    let mut combined = image::RgbaImage::new(total_width, total_height);

    // Capture each screen and composite them
    for screen in &screens {
        let info = &screen.display_info;
        let capture = screen
            .capture()
            .map_err(|e| format!("Failed to capture screen: {}", e))?;

        // Calculate where this screen goes in the combined image
        let offset_x = (info.x - min_x) as u32;
        let offset_y = (info.y - min_y) as u32;

        // Copy pixels from the capture to the combined image
        for (x, y, pixel) in capture.enumerate_pixels() {
            let dest_x = offset_x + x;
            let dest_y = offset_y + y;
            if dest_x < total_width && dest_y < total_height {
                combined.put_pixel(dest_x, dest_y, *pixel);
            }
        }
    }

    // Save the combined image
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let uuid_short = &Uuid::new_v4().to_string()[..8];
    let filename = format!("screenshot_all_{}_{}.png", timestamp, uuid_short);

    let screenshots_dir = get_screenshots_dir()?;
    let file_path = screenshots_dir.join(&filename);

    combined
        .save(&file_path)
        .map_err(|e| format!("Failed to save screenshot: {}", e))?;

    Ok(ScreenshotResult {
        path: file_path.to_string_lossy().to_string(),
        width: total_width,
        height: total_height,
    })
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
    let file_path_buf = PathBuf::from(&file_path);

    // Read file
    let file_bytes =
        std::fs::read(&file_path_buf).map_err(|e| format!("Failed to read file: {}", e))?;

    let file_name = file_path_buf
        .file_name()
        .ok_or("Invalid file path")?
        .to_string_lossy()
        .to_string();

    let mime_type = mime_guess::from_path(&file_path_buf)
        .first_raw()
        .unwrap_or("application/octet-stream")
        .to_string();

    // Create multipart form
    let client = reqwest::Client::new();
    let mut form = reqwest::multipart::Form::new()
        .part(
            "file",
            reqwest::multipart::Part::bytes(file_bytes)
                .file_name(file_name.clone())
                .mime_str(&mime_type)
                .map_err(|e| e.to_string())?,
        )
        .text("visibility", visibility);

    if let Some(pwd) = password {
        form = form.text("password", pwd);
    }

    let upload_url = format!("{}/api/files", api_url.trim_end_matches('/'));

    let response = client
        .post(&upload_url)
        .header("Authorization", format!("Bearer {}", upload_token))
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Upload request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Upload failed with status {}: {}",
            response.status(),
            response.text().await.unwrap_or_default()
        ));
    }

    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let data = body.get("data").ok_or("Missing 'data' in response")?;

    let upload_response: UploadResponse = serde_json::from_value(data.clone())
        .map_err(|e| format!("Failed to parse upload response: {}", e))?;

    // Emit success event with file path for preview
    let event = UploadCompleteEvent {
        url: upload_response.url.clone(),
        name: upload_response.name.clone(),
        size: upload_response.size,
        file_type: upload_response.file_type.clone(),
        screenshot_path: Some(file_path),
    };
    let _ = window.emit("upload_complete", &event);

    Ok(upload_response)
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
    let _ = window.emit("screenshot_started", serde_json::json!({}));

    // Capture screenshot based on mode
    let screenshot = if capture_all.unwrap_or(false) {
        capture_all_monitors().await?
    } else {
        capture_screenshot(monitor_index).await?
    };

    let _ = window.emit("screenshot_captured", &screenshot);

    // Upload it
    let upload_result = upload_file(
        window.clone(),
        screenshot.path.clone(),
        api_url,
        upload_token,
        visibility,
        None,
    )
    .await?;

    let event = UploadCompleteEvent {
        url: upload_result.url,
        name: upload_result.name,
        size: upload_result.size,
        file_type: upload_result.file_type,
        screenshot_path: Some(screenshot.path),
    };

    // Emit final event
    let _ = window.emit("screenshot_uploaded", &event);

    Ok(event)
}

/// Gets system information
#[tauri::command]
fn get_system_info() -> serde_json::Value {
    serde_json::json!({
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "temp_dir": std::env::temp_dir().to_string_lossy(),
        "screenshots_dir": get_screenshots_dir().ok(),
    })
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // Create system tray with menu
            use tauri::menu::{Menu, MenuItem};

            let show_item = MenuItem::with_id(app, "show", "Show Flicker", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let _tray = tauri::tray::TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Flicker - Click to open")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Handle window close to minimize to tray instead of quitting
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        // Prevent the window from closing, hide it instead
                        api.prevent_close();
                        let _ = window_clone.hide();
                    }
                });
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
            screenshot_and_upload,
            get_system_info,
            get_screenshots_path,
            get_test_image_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
