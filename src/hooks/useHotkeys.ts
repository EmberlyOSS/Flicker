import { useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { register, unregister, isRegistered } from '@tauri-apps/plugin-global-shortcut';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { sendNotification } from '@tauri-apps/plugin-notification';
import { UploadCompleteEvent, UploadResponse, HotkeyConfig } from '../types';

interface UseHotkeysOptions {
  hotkeys: HotkeyConfig;
  uploadToken: string;
  visibility: string;
  apiUrl: string;
  domain?: string;
  enabled: boolean;
  onScreenshotStart?: () => void;
  onUploadComplete?: (result: UploadCompleteEvent) => void;
  onError?: (error: string) => void;
  /** Called when the region hotkey is pressed — consumer must show the selector UI */
  onShowRegionSelector?: () => void;
}

export function useHotkeys(options: UseHotkeysOptions) {
  const isCapturingRef = useRef(false);
  const registeredHotkeysRef = useRef<string[]>([]);
  const optionsRef = useRef(options);

  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Take screenshot - calls Rust backend
  const takeScreenshot = useCallback(async (captureAll: boolean = false) => {
    console.log('[Flicker][JS] takeScreenshot called captureAll=', captureAll, 'isCapturing=', isCapturingRef.current);
    if (isCapturingRef.current) {
      console.warn('[Flicker][JS] takeScreenshot blocked: already capturing');
      return;
    }

    const opts = optionsRef.current;
    console.log('[Flicker][JS] takeScreenshot opts enabled=', opts.enabled, 'token_len=', opts.uploadToken?.length, 'apiUrl=', opts.apiUrl);
    if (!opts.enabled || !opts.uploadToken) {
      console.warn('[Flicker][JS] Hotkeys disabled or no upload token', { enabled: opts.enabled, token_len: opts.uploadToken?.length });
      return;
    }

    opts.onScreenshotStart?.();
    isCapturingRef.current = true;
    console.log('[Flicker][JS] invoking screenshot_and_upload ...');

    try {
      // Let Rust handle everything
      const result = await invoke<UploadCompleteEvent>('screenshot_and_upload', {
        apiUrl: opts.apiUrl,
        uploadToken: opts.uploadToken,
        visibility: opts.visibility,
        domain: opts.domain || null,
        captureAll,
        monitorIndex: null,
      });
      console.log('[Flicker][JS] screenshot_and_upload success url=', result.url);

      if (result.url) {
        // Rust already handled clipboard + OS notification (works even when app hidden/backgrounded)
        // We just ensure clipboard fallback and in-app notification via onUploadComplete
        try { await writeText(result.url).catch(() => {}) } catch {}
        opts.onUploadComplete?.(result);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[Flicker][JS] Screenshot error:', msg, error);
      opts.onError?.(msg);
    } finally {
      console.log('[Flicker][JS] takeScreenshot finally, clearing isCapturing');
      isCapturingRef.current = false;
    }
  }, []);

  const takeFullscreenScreenshot = useCallback(() => takeScreenshot(false), [takeScreenshot]);
  const takeAllMonitorsScreenshot = useCallback(() => takeScreenshot(true), [takeScreenshot]);

  /**
   * Directly capture + upload a region given screen coordinates.
   * Called by the RegionSelector overlay after the user finishes dragging.
   */
  const captureAndUploadRegion = useCallback(async (x: number, y: number, width: number, height: number) => {
    if (isCapturingRef.current) return;

    const opts = optionsRef.current;
    if (!opts.enabled || !opts.uploadToken) return;

    opts.onScreenshotStart?.();
    isCapturingRef.current = true;

    try {
      // 1. Capture the region via Rust
      const screenshotResult = await invoke<{ path: string; width: number; height: number }>('capture_region', {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
        monitorIndex: null,
      });

      // 2. Upload the saved file
      const uploadResponse = await invoke<UploadResponse>('upload_file', {
        filePath: screenshotResult.path,
        apiUrl: opts.apiUrl,
        uploadToken: opts.uploadToken,
        visibility: opts.visibility,
        password: null,
        domain: opts.domain || null,
      });

      if (uploadResponse.url) {
        try { await writeText(uploadResponse.url).catch(() => {}) } catch {}
        // This is the in-app fallback path (not global overlay) — show OS notification here
        try { await sendNotification({ title: 'Upload Complete', body: 'Region URL copied to clipboard' }) } catch {}
        opts.onUploadComplete?.({
          id: uploadResponse.id,
          url: uploadResponse.url,
          name: uploadResponse.name,
          size: uploadResponse.size,
          file_type: uploadResponse.type,
          screenshot_path: screenshotResult.path,
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Region capture error:', msg);
      opts.onError?.(msg);
    } finally {
      isCapturingRef.current = false;
    }
  }, []);

  /** Triggers the region selector overlay (via hotkey or button). Uses global system-wide overlay. */
  const takeRegionScreenshot = useCallback(async () => {
    console.log('[Flicker][JS] takeRegionScreenshot called');
    // Try global overlay first (works even when app is in background / hidden)
    try {
      // Check macOS screen recording permission first
      try {
        const hasPermission = await invoke<boolean>('check_screen_recording_permission');
        console.log('[Flicker][JS] check_screen_recording_permission ->', hasPermission);
        if (!hasPermission) {
          const granted = await invoke<boolean>('request_screen_recording_permission').catch(() => false);
          console.log('[Flicker][JS] request_screen_recording_permission ->', granted);
          if (!granted) {
            const msg = 'Screen Recording permission required. Enable it in System Settings > Privacy & Security > Screen Recording and restart Flicker.';
            console.warn('[Flicker][JS]', msg);
            optionsRef.current.onError?.(msg);
            return;
          }
        }
      } catch (permErr) {
        console.warn('[Flicker][JS] Permission check failed, proceeding anyway', permErr);
      }

      console.log('[Flicker][JS] invoking start_region_capture ...');
      await invoke('start_region_capture');
      console.log('[Flicker][JS] start_region_capture success');
      return;
    } catch (e) {
      console.error('[Flicker][JS] Global region capture failed, trying in-app fallback', e);
      const msg = e instanceof Error ? e.message : String(e);
      // If it's a permission error, don't fallback - show error
      if (msg.includes('Screen Recording') || msg.includes('permission')) {
        optionsRef.current.onError?.(msg);
        return;
      }
      // Fallback to in-app selector (for browser preview or if overlay creation failed)
      console.log('[Flicker][JS] falling back to in-app RegionSelector');
      optionsRef.current.onShowRegionSelector?.();
    }
  }, []);

  // Upload whatever image is currently on the clipboard
  const uploadClipboardImage = useCallback(async () => {
    if (isCapturingRef.current) return;

    const opts = optionsRef.current;
    if (!opts.enabled || !opts.uploadToken) {
      console.log('Hotkeys disabled or no upload token');
      return;
    }

    opts.onScreenshotStart?.();
    isCapturingRef.current = true;

    try {
      const response = await invoke<UploadResponse>('upload_clipboard_image', {
        apiUrl: opts.apiUrl,
        uploadToken: opts.uploadToken,
        visibility: opts.visibility,
        password: null,
        domain: opts.domain || null,
      });

      if (response.url) {
        try { await writeText(response.url).catch(() => {}) } catch {}
        // Rust already did OS notification for clipboard path; in-app via onUploadComplete
        opts.onUploadComplete?.({
          id: response.id,
          url: response.url,
          name: response.name,
          size: response.size,
          file_type: response.type,
          screenshot_path: null,
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Clipboard upload error:', msg);
      opts.onError?.(msg);
    } finally {
      isCapturingRef.current = false;
    }
  }, []);

  // Register hotkeys with delay
  useEffect(() => {
    // Skip if not in Tauri or not enabled
    if (typeof window === 'undefined') return;
    if (!(window as any).__TAURI_INTERNALS__) return;
    if (!options.enabled) return;
    if (!options.hotkeys) return;

    let mounted = true;

    const registerHotkeys = async () => {
      // Wait briefly for app to fully initialize — reduced from 1500ms to 400ms so
      // global shortcuts are available even when app starts hidden/backgrounded
      await new Promise(r => setTimeout(r, 400));
      if (!mounted) return;

      // Cleanup old hotkeys
      for (const hk of registeredHotkeysRef.current) {
        try {
          if (await isRegistered(hk)) await unregister(hk);
        } catch (e) {
          console.warn('Unregister failed:', hk);
        }
      }
      registeredHotkeysRef.current = [];

      // Register fullscreen hotkey
      const fullscreenHk = options.hotkeys?.screenshotFullscreen;
      if (fullscreenHk && mounted) {
        try {
          if (!(await isRegistered(fullscreenHk))) {
            await register(fullscreenHk, (e) => {
              if (e.state === 'Pressed') takeFullscreenScreenshot();
            });
            registeredHotkeysRef.current.push(fullscreenHk);
            console.log('Registered:', fullscreenHk);
          }
        } catch (e) {
          console.error('Register failed:', fullscreenHk, e);
        }
      }

      // Register all-monitors hotkey
      const allMonitorsHk = options.hotkeys?.screenshotAllMonitors;
      if (allMonitorsHk && mounted) {
        try {
          if (!(await isRegistered(allMonitorsHk))) {
            await register(allMonitorsHk, (e) => {
              if (e.state === 'Pressed') takeAllMonitorsScreenshot();
            });
            registeredHotkeysRef.current.push(allMonitorsHk);
            console.log('Registered:', allMonitorsHk);
          }
        } catch (e) {
          console.error('Register failed:', allMonitorsHk, e);
        }
      }

      // Register clipboard-upload hotkey
      const clipboardHk = options.hotkeys?.uploadClipboard;
      if (clipboardHk && mounted) {
        try {
          if (!(await isRegistered(clipboardHk))) {
            await register(clipboardHk, (e) => {
              if (e.state === 'Pressed') uploadClipboardImage();
            });
            registeredHotkeysRef.current.push(clipboardHk);
            console.log('Registered:', clipboardHk);
          }
        } catch (e) {
          console.error('Register failed:', clipboardHk, e);
        }
      }

      // Register region-capture hotkey
      const regionHk = options.hotkeys?.screenshotRegion;
      if (regionHk && mounted) {
        try {
          if (!(await isRegistered(regionHk))) {
            await register(regionHk, (e) => {
              if (e.state === 'Pressed') takeRegionScreenshot();
            });
            registeredHotkeysRef.current.push(regionHk);
            console.log('Registered:', regionHk);
          }
        } catch (e) {
          console.error('Register failed:', regionHk, e);
        }
      }

      // Register video record hotkey (Super+Shift+R)
      const videoHk = (options.hotkeys as any)?.recordVideo;
      if (videoHk && mounted) {
        try {
          if (!(await isRegistered(videoHk))) {
            await register(videoHk, async (e) => {
              if (e.state === 'Pressed') {
                try { await invoke('toggle_video_recording'); } catch {}
              }
            });
            registeredHotkeysRef.current.push(videoHk);
            console.log('Registered:', videoHk);
          }
        } catch (e) {
          console.error('Register failed:', videoHk, e);
        }
      }
    };

    registerHotkeys();

    return () => {
      mounted = false;
      // Cleanup
      (async () => {
        for (const hk of registeredHotkeysRef.current) {
          try {
            if (await isRegistered(hk)) await unregister(hk);
          } catch { }
        }
        registeredHotkeysRef.current = [];
      })();
    };
  }, [
    options.enabled,
    options.hotkeys?.screenshotFullscreen,
    options.hotkeys?.screenshotAllMonitors,
    options.hotkeys?.uploadClipboard,
    options.hotkeys?.screenshotRegion,
    (options.hotkeys as any)?.recordVideo,
    takeFullscreenScreenshot,
    takeAllMonitorsScreenshot,
    uploadClipboardImage,
    takeRegionScreenshot,
  ]);

  return { takeFullscreenScreenshot, takeAllMonitorsScreenshot, uploadClipboardImage, takeRegionScreenshot, captureAndUploadRegion };
}
