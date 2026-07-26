import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  event_type: string;
  message: string;
  level: 'info' | 'warning' | 'error';
  metadata?: Record<string, unknown>;
}

export interface DeviceInfo {
  os_name: string;
  os_version: string;
  architecture: string;
  cpu_count: number;
  available_memory_mb: number;
  app_version: string;
  app_data_dir: string;
}

// Check if we're in a Tauri environment
function isTauri(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
}

export function useAudit() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const getAuditLogs = useCallback(
    async (limit?: number): Promise<AuditLogEntry[]> => {
      if (!isTauri()) {
        console.warn('Audit logs only available in Tauri environment');
        return [];
      }

      try {
        const result = await invoke<AuditLogEntry[]>('get_audit_logs', {
          limit: limit ?? null,
        });
        setLogs(result);
        return result;
      } catch (error) {
        console.error('Failed to get audit logs:', error);
        return [];
      }
    },
    []
  );

  const loadAuditLogs = useCallback(
    async (limit?: number) => {
      setLoading(true);
      try {
        await getAuditLogs(limit);
      } finally {
        setLoading(false);
      }
    },
    [getAuditLogs]
  );

  const loadDeviceInfo = useCallback(async () => {
    if (!isTauri()) {
      console.warn('Device info only available in Tauri environment');
      return null;
    }

    try {
      const info = await invoke<DeviceInfo>('get_device_info');
      setDeviceInfo(info);
      return info;
    } catch (error) {
      console.error('Failed to get device info:', error);
      return null;
    }
  }, []);

  const clearAuditLogs = useCallback(async () => {
    if (!isTauri()) return;

    try {
      await invoke('clear_audit_logs');
      setLogs([]);
    } catch (error) {
      console.error('Failed to clear audit logs:', error);
    }
  }, []);

  const exportAuditLogs = useCallback(
    async (): Promise<string | null> => {
      if (!isTauri()) {
        // In browser, just return the current logs as JSON
        return JSON.stringify(logs, null, 2);
      }

      try {
        const exported = await invoke<string>('export_audit_logs');
        return exported;
      } catch (error) {
        console.error('Failed to export audit logs:', error);
        return null;
      }
    },
    [logs]
  );

  const logEvent = useCallback(
    async (
      eventType: string,
      message: string,
      level: 'info' | 'warning' | 'error' = 'info',
      metadata?: Record<string, unknown>
    ) => {
      if (!isTauri()) {
        // In browser, just log to console
        console.log(`[AUDIT] [${level.toUpperCase()}] ${eventType}: ${message}`, metadata);
        return;
      }

      try {
        await invoke('log_event', {
          eventType,
          message,
          level,
          metadata: metadata ?? null,
        });
        // Refresh logs after adding
        await getAuditLogs();
      } catch (error) {
        console.error('Failed to log event:', error);
      }
    },
    [getAuditLogs]
  );

  return {
    logs,
    deviceInfo,
    loading,
    getAuditLogs,
    loadAuditLogs,
    loadDeviceInfo,
    clearAuditLogs,
    exportAuditLogs,
    logEvent,
    isTauriAvailable: isTauri(),
  };
}
