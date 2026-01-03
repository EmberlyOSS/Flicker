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
import { UploadCompleteEvent, HotkeyConfig } from '../types';

interface UseHotkeysOptions {
  hotkeys?: HotkeyConfig;
  uploadToken?: string;
  visibility?: string;
  apiUrl?: string;
  enabled?: boolean;
  onScreenshotStart?: () => void;
  onUploadComplete?: (result: UploadCompleteEvent) => void;
  onError?: (error: string) => void;
}

export function useHotkeys(options?: UseHotkeysOptions) {
  const { config, isLoading } = useConfig();
  const isCapturingRef = useRef(false);
  const registeredHotkeysRef = useRef<string[]>([]);
  
  // Create a base config that defaults to hook values
  const getBaseConfig = useCallback((): UseHotkeysOptions => {
    return {
      hotkeys: options?.hotkeys || config?.hotkeys,
      uploadToken: options?.uploadToken || config?.uploadToken,
      visibility: options?.visibility || config?.visibility || 'PUBLIC',
      apiUrl: options?.apiUrl || config?.uploadUrl || 'https://embrly.ca',
      enabled: options?.enabled ?? !!config?.uploadToken,
      onScreenshotStart: options?.onScreenshotStart,
      onUploadComplete: options?.onUploadComplete,
      onError: options?.onError
    };
  }, [config, options]);

  const configRef = useRef(getBaseConfig());
  
  // Keep config ref updated
  useEffect(() => {
    configRef.current = getBaseConfig();
  }, [getBaseConfig]);

  // Format bytes helper
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Send notification helper
  const sendUploadNotification = useCallback(async (success: boolean, message: string) => {
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
    if (!currentConfig.uploadToken || !currentConfig.apiUrl) {
      console.error('API token or API URL not configured');
      await sendUploadNotification(false, 'Please sign in or configure your API settings');
      return;
    }

    if (currentConfig.onScreenshotStart) {
      currentConfig.onScreenshotStart();
    }

    isCapturingRef.current = true;
    console.log(`Taking ${captureAll ? 'all monitors' : 'fullscreen'} screenshot...`);

    try {
      const result = await invoke<UploadCompleteEvent>('screenshot_and_upload', {
        uploadToken: currentConfig.uploadToken,
        apiUrl: currentConfig.apiUrl,
        visibility: currentConfig.visibility || 'PUBLIC',
        captureAll: captureAll,
        monitorIndex: null,
      });

      console.log('Screenshot result:', result);

      if (result.url) {
        // Copy URL to clipboard
        try {
          await writeText(result.url);
          console.log('URL copied to clipboard:', result.url);
        } catch (clipboardError) {
          console.error('Failed to copy to clipboard:', clipboardError);
        }

        if (currentConfig.onUploadComplete) {
          currentConfig.onUploadComplete(result);
        }

        // Format file size if available
        const sizeInfo = result.size ? ` (${formatBytes(result.size)})` : '';
        await sendUploadNotification(true, `URL copied to clipboard${sizeInfo}\n${result.url}`);
      } else {
        const errorMessage = 'Unknown upload error occurred';
        console.error('Upload failed:', errorMessage);
        if (currentConfig.onError) {
          currentConfig.onError(errorMessage);
        }
        await sendUploadNotification(false, errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Screenshot error:', errorMessage);
      if (currentConfig.onError) {
        currentConfig.onError(errorMessage);
      }
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

    const currentConfig = configRef.current;

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
      if (currentConfig.hotkeys?.screenshotFullscreen) {
        const hotkey = currentConfig.hotkeys.screenshotFullscreen;
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
      if (currentConfig.hotkeys?.screenshotAllMonitors) {
        const hotkey = currentConfig.hotkeys.screenshotAllMonitors;
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
  }, [isLoading, config, takeFullscreenScreenshot, takeAllMonitorsScreenshot]);

  return {
    takeFullscreenScreenshot,
    takeAllMonitorsScreenshot,
  };
}
