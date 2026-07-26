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
    if (isCapturingRef.current) return;

    const opts = optionsRef.current;
    if (!opts.enabled || !opts.uploadToken) {
      console.log('Hotkeys disabled or no upload token');
      return;
    }

    opts.onScreenshotStart?.();
    isCapturingRef.current = true;

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

      if (result.url) {
        // Copy to clipboard
        await writeText(result.url).catch(console.error);

        // Notify user (fire and forget)
        sendNotification({
          title: 'Upload Complete',
          body: 'URL copied to clipboard',
        });

        opts.onUploadComplete?.(result);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Screenshot error:', msg);
      opts.onError?.(msg);
    } finally {
      isCapturingRef.current = false;
    }
  }, []);

  const takeFullscreenScreenshot = useCallback(() => takeScreenshot(false), [takeScreenshot]);
  const takeAllMonitorsScreenshot = useCallback(() => takeScreenshot(true), [takeScreenshot]);

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
        await writeText(response.url).catch(console.error);

        sendNotification({
          title: 'Upload Complete',
          body: 'URL copied to clipboard',
        });

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
      // Wait for app to fully initialize
      await new Promise(r => setTimeout(r, 1500));
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
    takeFullscreenScreenshot,
    takeAllMonitorsScreenshot,
    uploadClipboardImage,
  ]);

  return { takeFullscreenScreenshot, takeAllMonitorsScreenshot, uploadClipboardImage };
}
