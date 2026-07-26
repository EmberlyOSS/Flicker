import { AppConfig } from '../types';
import { loadConfig } from '../config';
import { useState, useEffect } from 'react';

export function useConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load config synchronously from localStorage - this is fast
    try {
      const loaded = loadConfig();
      setConfig(loaded);
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { config, isLoading, setConfig };
}
