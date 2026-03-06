import { useCallback, useEffect, useState } from 'react';
import { storage } from '../shared/browser-api';

/**
 * Generic chrome.storage.local hook.
 * Returns [value, setValue, loading].
 */
export function useStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => Promise<void>, boolean] {
  const [value, setValueState] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storage.local.get(key).then(result => {
      setValueState(key in result ? (result[key] as T) : defaultValue);
      setLoading(false);
    });

    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area === 'local' && key in changes) {
        setValueState(changes[key].newValue as T ?? defaultValue);
      }
    };

    storage.onChanged.addListener(listener);
    return () => storage.onChanged.removeListener(listener);
  }, [key]);

  const setValue = useCallback(
    async (newValue: T) => {
      setValueState(newValue);
      await storage.local.set({ [key]: newValue });
    },
    [key]
  );

  return [value, setValue, loading];
}

/**
 * Generic chrome.storage.sync hook.
 */
export function useSyncStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => Promise<void>, boolean] {
  const [value, setValueState] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storage.sync.get(key).then(result => {
      setValueState(key in result ? (result[key] as T) : defaultValue);
      setLoading(false);
    });

    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area === 'sync' && key in changes) {
        setValueState(changes[key].newValue as T ?? defaultValue);
      }
    };

    storage.onChanged.addListener(listener);
    return () => storage.onChanged.removeListener(listener);
  }, [key]);

  const setValue = useCallback(
    async (newValue: T) => {
      setValueState(newValue);
      await storage.sync.set({ [key]: newValue });
    },
    [key]
  );

  return [value, setValue, loading];
}
