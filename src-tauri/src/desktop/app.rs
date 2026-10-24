use tauri::Manager;

pub fn setup_system_tray(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
    
    let show_item = MenuItem::with_id(app, "show", "Show Flicker", true, None::<&str>)?;
    let capture_region_item = MenuItem::with_id(app, "capture-region", "Capture Region", true, None::<&str>)?;
    let capture_screen_item = MenuItem::with_id(app, "capture-screen", "Capture Screen", true, None::<&str>)?;
    let capture_all_item = MenuItem::with_id(app, "capture-all", "Capture All Monitors", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_item, &capture_region_item, &capture_screen_item, &capture_all_item, &separator, &quit_item])?;
    
    let tray = tauri::tray::TrayIconBuilder::new();
    #[cfg(target_os = "macos")]
    let tray = tray
        .icon(tauri::image::Image::from_bytes(include_bytes!("../../icons/tray-template.png"))?)
        .icon_as_template(true);
    #[cfg(not(target_os = "macos"))]
    let tray = tray.icon(app.default_window_icon().unwrap().clone());

    let _tray = tray
        .tooltip("Flicker - Click to open")
        .menu(&menu)
        .on_menu_event(|app, event| {
            match event.id.as_ref() {
                "show" => {
                    let _ = show_window(app);
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
                        crate::desktop::hotkeys::do_capture(handle, false).await;
                    });
                }
                "capture-all" => {
                    let handle = app.clone();
                    tauri::async_runtime::spawn(async move {
                        crate::desktop::hotkeys::do_capture(handle, true).await;
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
                let _ = show_window(tray.app_handle());
            }
        })
        .build(app)?;
    
    Ok(())
}

pub fn setup_window_handlers(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(window) = app.get_webview_window("main") {
        let handle = app.handle().clone();
        let window_clone = window.clone();
        window.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let config = crate::common::config::load_config().unwrap_or_default();
                match config.behavior.close_action.as_str() {
                    "quit" => handle.exit(0),
                    "minimize" => {
                        let _ = window_clone.minimize();
                    }
                    _ => {
                        let _ = hide_window(&handle);
                        notify_still_running(&handle, &config.hotkeys.open_app);
                    }
                }
            }
        });
    }

    Ok(())
}

/// Tells the user once where Flicker went the first time closing hides it.
fn notify_still_running(app: &tauri::AppHandle, open_hotkey: &str) {
    let Ok(dir) = crate::common::config::get_config_dir() else { return };
    let marker = dir.join("close-notice-shown");
    if marker.exists() {
        return;
    }
    let _ = std::fs::write(&marker, "1");
    let place = if cfg!(target_os = "macos") { "menu bar" } else { "system tray" };
    let body = if open_hotkey.trim().is_empty() {
        format!("Open it again from the Flicker icon in your {}.", place)
    } else {
        let keys = if cfg!(target_os = "macos") {
            open_hotkey.replace("Super", "Cmd").replace("Alt", "Option")
        } else {
            open_hotkey.replace("Super", "Win").replace("Control", "Ctrl")
        };
        format!("Press {} or use the Flicker icon in your {} to open it again.", keys, place)
    };
    send_os_notification(app, "Flicker is still running", &body);
}

pub fn setup_plugins(builder: tauri::Builder<tauri::Wry>) -> tauri::Builder<tauri::Wry> {
    // Must be the first plugin: launching Flicker again shows the copy that's already running.
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        let _ = show_window(app);
    }));
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

pub fn emit_event(
    window: &tauri::Window,
    event_name: &str,
    payload: impl serde::ser::Serialize,
) {
    use tauri::Emitter;
    let _ = window.emit(event_name, &payload);
}

pub fn show_window(app: &tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        crate::desktop::region::mark_main_shown();
        #[cfg(target_os = "macos")]
        let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
        window.show()
            .map_err(|e| format!("Failed to show window: {}", e))?;
        window.unminimize()
            .map_err(|e| format!("Failed to unminimize window: {}", e))?;
        window.set_focus()
            .map_err(|e| format!("Failed to set focus: {}", e))?;
    }
    Ok(())
}

pub fn hide_window(app: &tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        crate::desktop::region::mark_main_hidden_by_user();
        window.hide()
            .map_err(|e| format!("Failed to hide window: {}", e))?;
        // Without a window there's nothing to switch to, so drop the Dock icon and stay in the menu bar.
        #[cfg(target_os = "macos")]
        let _ = app.set_activation_policy(tauri::ActivationPolicy::Accessory);
    }
    Ok(())
}

/// Brings Flicker to the front, or hides it when it's already the focused window.
pub fn toggle_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let visible = window.is_visible().unwrap_or(false);
        let minimized = window.is_minimized().unwrap_or(false);
        let focused = window.is_focused().unwrap_or(false);
        if visible && !minimized && focused {
            let _ = hide_window(app);
        } else {
            let _ = show_window(app);
        }
    }
}

pub fn exit_app(app: &tauri::AppHandle) {
    app.exit(0);
}

pub fn send_os_notification(app: &tauri::AppHandle, title: &str, body: &str) {
    use tauri_plugin_notification::NotificationExt;
    let _ = app.notification().builder().title(title).body(body).show();
}
