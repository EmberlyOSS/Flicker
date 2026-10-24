import { useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
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

  onShowRegionSelector?: () => void;
}

export function useHotkeys(options: UseHotkeysOptions) {
  const isCapturingRef = useRef(false);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

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

  const captureAndUploadRegion = useCallback(async (x: number, y: number, width: number, height: number) => {
    if (isCapturingRef.current) return;

    const opts = optionsRef.current;
    if (!opts.enabled || !opts.uploadToken) return;

    opts.onScreenshotStart?.();
    isCapturingRef.current = true;

    try {

      const screenshotResult = await invoke<{ path: string; width: number; height: number }>('capture_region', {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
        monitorIndex: null,
      });

      const uploadResponse = await invoke<UploadResponse>('upload_file', {
        filePath: screenshotResult.path,
        apiUrl: opts.apiUrl,
        uploadToken: opts.uploadToken,
        visibility: opts.visibility,
        password: null,
        domain: opts.domain || null,
        discardAfter: true,
      });

      if (uploadResponse.url) {
        try { await writeText(uploadResponse.url).catch(() => {}) } catch {}

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

  const takeRegionScreenshot = useCallback(async () => {
    console.log('[Flicker][JS] takeRegionScreenshot called');

    try {

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

      if (msg.includes('Screen Recording') || msg.includes('permission')) {
        optionsRef.current.onError?.(msg);
        return;
      }

      console.log('[Flicker][JS] falling back to in-app RegionSelector');
      optionsRef.current.onShowRegionSelector?.();
    }
  }, []);

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

  return { takeFullscreenScreenshot, takeAllMonitorsScreenshot, uploadClipboardImage, takeRegionScreenshot, captureAndUploadRegion };
}
