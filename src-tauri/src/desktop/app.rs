/// Desktop platform app initialization and window management

use tauri::{Manager, Emitter};

/// Initialize the system tray with menu and event handlers
pub fn setup_system_tray(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
    
    let show_item = MenuItem::with_id(app, "show", "Show Flicker", true, None::<&str>)?;
    let capture_region_item = MenuItem::with_id(app, "capture-region", "Capture Region", true, None::<&str>)?;
    let capture_screen_item = MenuItem::with_id(app, "capture-screen", "Capture Screen", true, None::<&str>)?;
    let capture_all_item = MenuItem::with_id(app, "capture-all", "Capture All Monitors", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_item, &capture_region_item, &capture_screen_item, &capture_all_item, &separator, &quit_item])?;
    
    let _tray = tauri::tray::TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("Flicker - Click to open")
        .menu(&menu)
        .on_menu_event(|app, event| {
            match event.id.as_ref() {
                "show" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_focus();
                    }
                }
                "capture-region" => {
                    let handle = app.clone();
                    tauri::async_runtime::spawn(async move {
                        let _ = crate::desktop::region::start_region_capture(handle).await;
                    });
                }
                "capture-screen" => {
                    let handle = app.clone();
                    tauri::async_runtime::spawn(async move {
                        // Trigger fullscreen capture via main window emit
                        if let Some(win) = handle.get_webview_window("main") {
                            let _ = win.emit("tray_capture", serde_json::json!({"mode": "screen"}));
                        }
                        // Fallback: directly invoke screenshot_and_upload if possible
                        // The main window's JS will handle tray_capture event
                    });
                }
                "capture-all" => {
                    let handle = app.clone();
                    tauri::async_runtime::spawn(async move {
                        if let Some(win) = handle.get_webview_window("main") {
                            let _ = win.emit("tray_capture", serde_json::json!({"mode": "all"}));
                        }
                    });
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;
    
    Ok(())
}

/// Setup window event handlers (minimize to tray on close)
pub fn setup_window_handlers(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
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
}

/// Setup all plugins required by the application
pub fn setup_plugins(builder: tauri::Builder<tauri::Wry>) -> tauri::Builder<tauri::Wry> {
    builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
}

/// Emit an event to the frontend
pub fn emit_event(
    window: &tauri::Window,
    event_name: &str,
    payload: impl serde::ser::Serialize,
) {
    let _ = window.emit(event_name, &payload);
}

/// Show the main window
pub fn show_window(app: &tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.show()
            .map_err(|e| format!("Failed to show window: {}", e))?;
        window.unminimize()
            .map_err(|e| format!("Failed to unminimize window: {}", e))?;
        window.set_focus()
            .map_err(|e| format!("Failed to set focus: {}", e))?;
    }
    Ok(())
}

/// Hide the main window
pub fn hide_window(app: &tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.hide()
            .map_err(|e| format!("Failed to hide window: {}", e))?;
    }
    Ok(())
}

/// Exit the application
pub fn exit_app(app: &tauri::AppHandle) {
    app.exit(0);
}
