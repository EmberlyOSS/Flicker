import { useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { register, unregister, isRegistered } from '@tauri-apps/plugin-global-shortcut';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import { useConfig } from './useConfig';
import { UploadResponse } from '../types';

export function useHotkeys() {
  const { config, isLoading } = useConfig();
  const isCapturingRef = useRef(false);
  const registeredHotkeysRef = useRef<string[]>([]);
  const configRef = useRef(config);

  // Keep config ref updated
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Format bytes helper
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Send notification helper
  const sendUploadNotification = useCallback(async (success: boolean, message: string, url?: string) => {
    try {
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }

      if (permissionGranted) {
        sendNotification({
          title: success ? 'Upload Successful!' : 'Upload Failed',
          body: message,
        });
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }, []);

  // Take screenshot with optional all-monitors flag
  const takeScreenshot = useCallback(async (captureAll: boolean = false) => {
    if (isCapturingRef.current) {
      console.log('Screenshot already in progress, skipping...');
      return;
    }

    const currentConfig = configRef.current;
    if (!currentConfig?.apiKey || !currentConfig?.uploadUrl) {
      console.error('API key or upload URL not configured');
      await sendUploadNotification(false, 'Please configure your API key and upload URL in settings');
      return;
    }

    isCapturingRef.current = true;
    console.log(`Taking ${captureAll ? 'all monitors' : 'fullscreen'} screenshot...`);

    try {
      const result = await invoke<UploadResponse>('screenshot_and_upload', {
        apiKey: currentConfig.apiKey,
        uploadUrl: currentConfig.uploadUrl,
        captureAll: captureAll,
      });

      console.log('Screenshot result:', result);

      if (result.success && result.url) {
        // Copy URL to clipboard
        try {
          await writeText(result.url);
          console.log('URL copied to clipboard:', result.url);
        } catch (clipboardError) {
          console.error('Failed to copy to clipboard:', clipboardError);
        }

        // Format file size if available
        const sizeInfo = result.size ? ` (${formatBytes(result.size)})` : '';
        await sendUploadNotification(true, `URL copied to clipboard${sizeInfo}\n${result.url}`, result.url);
      } else {
        const errorMessage = result.error || 'Unknown error occurred';
        console.error('Upload failed:', errorMessage);
        await sendUploadNotification(false, errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Screenshot error:', errorMessage);
      await sendUploadNotification(false, errorMessage);
    } finally {
      isCapturingRef.current = false;
    }
  }, [sendUploadNotification]);

  // Screenshot functions
  const takeFullscreenScreenshot = useCallback(() => takeScreenshot(false), [takeScreenshot]);
  const takeAllMonitorsScreenshot = useCallback(() => takeScreenshot(true), [takeScreenshot]);

  // Register hotkeys
  useEffect(() => {
    if (isLoading || !config) return;

    const registerHotkeys = async () => {
      // Unregister any previously registered hotkeys
      for (const hotkey of registeredHotkeysRef.current) {
        try {
          const registered = await isRegistered(hotkey);
          if (registered) {
            await unregister(hotkey);
            console.log(`Unregistered hotkey: ${hotkey}`);
          }
        } catch (error) {
          console.error(`Failed to unregister hotkey ${hotkey}:`, error);
        }
      }
      registeredHotkeysRef.current = [];

      // Register fullscreen screenshot hotkey
      if (config.hotkeys?.screenshotFullscreen) {
        const hotkey = config.hotkeys.screenshotFullscreen;
        try {
          const alreadyRegistered = await isRegistered(hotkey);
          if (!alreadyRegistered) {
            await register(hotkey, (event) => {
              if (event.state === 'Pressed') {
                console.log('Fullscreen screenshot hotkey pressed');
                takeFullscreenScreenshot();
              }
            });
            registeredHotkeysRef.current.push(hotkey);
            console.log(`Registered fullscreen hotkey: ${hotkey}`);
          }
        } catch (error) {
          console.error(`Failed to register fullscreen hotkey ${hotkey}:`, error);
        }
      }

      // Register all monitors screenshot hotkey
      if (config.hotkeys?.screenshotAllMonitors) {
        const hotkey = config.hotkeys.screenshotAllMonitors;
        try {
          const alreadyRegistered = await isRegistered(hotkey);
          if (!alreadyRegistered) {
            await register(hotkey, (event) => {
              if (event.state === 'Pressed') {
                console.log('All monitors screenshot hotkey pressed');
                takeAllMonitorsScreenshot();
              }
            });
            registeredHotkeysRef.current.push(hotkey);
            console.log(`Registered all monitors hotkey: ${hotkey}`);
          }
        } catch (error) {
          console.error(`Failed to register all monitors hotkey ${hotkey}:`, error);
        }
      }
    };

    registerHotkeys();

    // Cleanup on unmount or config change
    return () => {
      const cleanup = async () => {
        for (const hotkey of registeredHotkeysRef.current) {
          try {
            const registered = await isRegistered(hotkey);
            if (registered) {
              await unregister(hotkey);
              console.log(`Cleanup: Unregistered hotkey: ${hotkey}`);
            }
          } catch (error) {
            console.error(`Cleanup: Failed to unregister hotkey ${hotkey}:`, error);
          }
        }
        registeredHotkeysRef.current = [];
      };
      cleanup();
    };
  }, [isLoading, config?.hotkeys?.screenshotFullscreen, config?.hotkeys?.screenshotAllMonitors, takeFullscreenScreenshot, takeAllMonitorsScreenshot]);

  return {
    takeFullscreenScreenshot,
    takeAllMonitorsScreenshot,
  };
}
