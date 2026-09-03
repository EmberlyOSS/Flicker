/// Desktop screenshot capture functionality

use crate::common::file;
use crate::common::types::ScreenshotResult;

#[cfg(feature = "desktop")]
use screenshots::Screen;

/// Capture a screenshot of the entire screen or specified monitor
#[cfg(feature = "desktop")]
pub async fn capture_screenshot(monitor_index: Option<usize>) -> Result<ScreenshotResult, String> {
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;
    
    if screens.is_empty() {
        return Err("No screens found".to_string());
    }
    
    let screen_idx = monitor_index.unwrap_or(0);
    let screen = screens.get(screen_idx)
        .ok_or_else(|| format!("Monitor {} not found", screen_idx))?;
    
    let image = screen.capture()
        .map_err(|e| format!("Failed to capture screen: {}", e))?;
    
    let width = image.width();
    let height = image.height();
    
    // Generate unique filename
    let filename = file::generate_screenshot_filename("screenshot");
    
    let screenshots_dir = file::get_screenshots_dir()?;
    let file_path = screenshots_dir.join(&filename);
    image.save(&file_path)
        .map_err(|e| format!("Failed to save screenshot: {}", e))?;
    
    Ok(ScreenshotResult {
        path: file_path.to_string_lossy().to_string(),
        width,
        height,
    })
}

/// Capture a specific region of the screen on a given monitor
#[cfg(feature = "desktop")]
pub async fn capture_region(
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    monitor_index: Option<usize>,
) -> Result<ScreenshotResult, String> {
    // On macOS, try screencapture CLI first for better Chromium window support (Helium tabs)
    // which are sometimes missing with the screenshots crate's CGDisplay path.
    #[cfg(target_os = "macos")]
    {
        if let Ok(result) = capture_region_macos_screencapture(x, y, width, height, monitor_index).await {
            return Ok(result);
        }
        // Fall through to screenshots crate on failure
    }

    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;
    
    if screens.is_empty() {
        return Err("No screens found".to_string());
    }
    
    let screen_idx = monitor_index.unwrap_or(0);
    let screen = screens.get(screen_idx)
        .ok_or_else(|| format!("Monitor {} not found", screen_idx))?;
    
    let image = screen.capture_area(x, y, width, height)
        .map_err(|e| format!("Failed to capture region: {}", e))?;
    
    let img_width = image.width();
    let img_height = image.height();
    
    let filename = file::generate_screenshot_filename("screenshot");
    
    let screenshots_dir = file::get_screenshots_dir()?;
    let file_path = screenshots_dir.join(&filename);
    image.save(&file_path)
        .map_err(|e| format!("Failed to save screenshot: {}", e))?;
    
    Ok(ScreenshotResult {
        path: file_path.to_string_lossy().to_string(),
        width: img_width,
        height: img_height,
    })
}

#[cfg(all(feature = "desktop", target_os = "macos"))]
async fn capture_region_macos_screencapture(
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    monitor_index: Option<usize>,
) -> Result<ScreenshotResult, String> {
    use std::process::Command;
    // screencapture -R expects logical points (not physical pixels) on Retina.
    // Our x,y,width,height are already physical (scaled). Convert back to logical for screencapture.
    // Try to get scale for this monitor to convert.
    let scale = if let Some(idx) = monitor_index {
        Screen::all().ok().and_then(|s| s.get(idx).map(|sc| sc.display_info.scale_factor as f64)).unwrap_or(1.0)
    } else {
        1.0
    };
    let lx = (x as f64 / scale).round() as i32;
    let ly = (y as f64 / scale).round() as i32;
    let lw = (width as f64 / scale).round() as u32;
    let lh = (height as f64 / scale).round() as u32;

    let filename = file::generate_screenshot_filename("screenshot");
    let screenshots_dir = file::get_screenshots_dir()?;
    let file_path = screenshots_dir.join(&filename);
    let rect = format!("{},{},{},{}", lx, ly, lw, lh);
    let output = Command::new("screencapture")
        .args(["-x", "-R", &rect, &file_path.to_string_lossy().to_string()])
        .output()
        .map_err(|e| format!("screencapture failed: {}", e))?;
    if !output.status.success() {
        return Err(format!("screencapture failed: {:?}", String::from_utf8_lossy(&output.stderr)));
    }
    // Verify file exists and get dimensions via image crate
    let img = image::open(&file_path).map_err(|e| format!("Failed to open capture: {}", e))?;
    Ok(ScreenshotResult {
        path: file_path.to_string_lossy().to_string(),
        width: img.width(),
        height: img.height(),
    })
}

/// Capture the window under the given screen point (for single-click region capture)
/// On macOS, uses CGWindowList + screencapture -l to include full window chrome (tabs) — fixes Helium not capturing tabs
#[cfg(feature = "desktop")]
pub async fn capture_window_at_point(
    x: i32,
    y: i32,
    monitor_index: Option<usize>,
) -> Result<ScreenshotResult, String> {
    #[cfg(target_os = "macos")]
    {
        if let Ok(result) = capture_window_macos(x, y, monitor_index).await {
            return Ok(result);
        }
        // Fallback: capture a small region around the point if window capture fails
    }
    // Fallback on other platforms or if macOS window capture failed: capture 1px and let caller handle
    // For now, capture the monitor's full area as fallback
    capture_screenshot(monitor_index).await
}

#[cfg(all(feature = "desktop", target_os = "macos"))]
async fn capture_window_macos(
    x: i32,
    y: i32,
    _monitor_index: Option<usize>,
) -> Result<ScreenshotResult, String> {
    use core_foundation::array::CFArray;
    use core_foundation::base::{CFType, TCFType};
    use core_foundation::dictionary::CFDictionary;
    use core_foundation::number::CFNumber;
    use core_foundation::string::CFString;
    use core_graphics::window::{
        kCGNullWindowID, kCGWindowBounds, kCGWindowListOptionOnScreenOnly, kCGWindowOwnerName,
        CGWindowListCopyWindowInfo,
    };
    use std::process::Command;

    let window_list = unsafe { CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly, kCGNullWindowID) };
    if window_list.is_null() {
        return Err("Failed to get window list".to_string());
    }
    let cf_array: CFArray<CFType> = unsafe { CFArray::wrap_under_create_rule(window_list) };

    let mut target_bounds: Option<(f64, f64, f64, f64)> = None;

    for dict_cf in cf_array.iter() {
        let dict: CFDictionary = unsafe { CFDictionary::wrap_under_get_rule(dict_cf.as_CFTypeRef() as *mut _) };
        // Get bounds
        let bounds_ptr = match unsafe { dict.find(kCGWindowBounds as *const _ as *const _) } {
            Some(v) => v,
            None => continue,
        };
        let bounds_dict: CFDictionary = unsafe { CFDictionary::wrap_under_get_rule(*bounds_ptr as *mut _) };
        let get_num = |key: &str| -> Option<f64> {
            let cf_key = CFString::new(key);
            let val = bounds_dict.find(cf_key.as_concrete_TypeRef() as *const _)?;
            let num = unsafe { CFNumber::wrap_under_get_rule(*val as *mut _) };
            num.to_f64()
        };
        let wx = get_num("X").unwrap_or(0.0);
        let wy = get_num("Y").unwrap_or(0.0);
        let ww = get_num("Width").unwrap_or(0.0);
        let wh = get_num("Height").unwrap_or(0.0);

        if ww < 50.0 || wh < 50.0 {
            continue; // Skip tiny windows (shadows, etc.)
        }

        let px = x as f64;
        let py = y as f64;
        if px < wx || px > wx + ww || py < wy || py > wy + wh {
            continue;
        }

        // Skip Flicker itself
        if let Some(owner_ptr) = unsafe { dict.find(kCGWindowOwnerName as *const _ as *const _) } {
            let owner: CFString = unsafe { CFString::wrap_under_get_rule(*owner_ptr as *mut _) };
            if owner.to_string() == "Flicker" {
                continue;
            }
        }

        // Skip transparent overlay windows (they have very low alpha or are Flicker overlay)
        // We already filtered Flicker, but also check for overlay by bounds being full-screen transparent
        // Just take first matching non-Flicker window
        target_bounds = Some((wx, wy, ww, wh));
        break;
    }

    let (wx, wy, ww, wh) = target_bounds.ok_or("No window found at point".to_string())?;

    // Capture the window's bounds as a region — this includes chrome (tabs) unlike content-only captures
    // Use screencapture -R which correctly handles Retina and window chrome on macOS
    let filename = file::generate_screenshot_filename("window");
    let screenshots_dir = file::get_screenshots_dir()?;
    let file_path = screenshots_dir.join(&filename);
    // screencapture -R expects logical points on macOS (Retina aware), our wx/wy/ww/wh are already in points
    let rect = format!("{},{},{},{}", wx.round() as i32, wy.round() as i32, ww.round() as u32, wh.round() as u32);
    let output = Command::new("screencapture")
        .args(["-x", "-R", &rect, &file_path.to_string_lossy().to_string()])
        .output()
        .map_err(|e| format!("screencapture -R failed: {}", e))?;
    if !output.status.success() {
        return Err(format!("screencapture -R failed: {:?}", String::from_utf8_lossy(&output.stderr)));
    }

    let img = image::open(&file_path).map_err(|e| format!("Failed to open window capture: {}", e))?;
    Ok(ScreenshotResult {
        path: file_path.to_string_lossy().to_string(),
        width: img.width(),
        height: img.height(),
    })
}

/// Capture all monitors combined into a single image
#[cfg(feature = "desktop")]
pub async fn capture_all_monitors() -> Result<ScreenshotResult, String> {
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
        let capture = screen.capture()
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
    
    // Generate unique filename
    let filename = file::generate_screenshot_filename("screenshot_all");
    
    let screenshots_dir = file::get_screenshots_dir()?;
    let file_path = screenshots_dir.join(&filename);
    combined.save(&file_path)
        .map_err(|e| format!("Failed to save screenshot: {}", e))?;
    
    Ok(ScreenshotResult {
        path: file_path.to_string_lossy().to_string(),
        width: total_width,
        height: total_height,
    })
}

/// Get list of all available monitors
#[cfg(feature = "desktop")]
pub fn get_monitors() -> Result<Vec<crate::common::types::MonitorInfo>, String> {
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;
    
    Ok(screens.iter().enumerate().map(|(i, screen)| {
        let info = &screen.display_info;
        crate::common::types::MonitorInfo {
            index: i,
            id: info.id,
            x: info.x,
            y: info.y,
            width: info.width,
            height: info.height,
            is_primary: info.is_primary,
            scale_factor: info.scale_factor as f64,
        }
    }).collect())
}

/// Get the monitor index at a specific screen coordinate
#[cfg(feature = "desktop")]
pub fn get_monitor_at_point(x: i32, y: i32) -> Result<Option<usize>, String> {
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;
    
    for (i, screen) in screens.iter().enumerate() {
        let info = &screen.display_info;
        let screen_x = info.x;
        let screen_y = info.y;
        let screen_width = info.width as i32;
        let screen_height = info.height as i32;
        
        if x >= screen_x && x < screen_x + screen_width &&
           y >= screen_y && y < screen_y + screen_height {
            return Ok(Some(i));
        }
    }
    
    Ok(None)
}
