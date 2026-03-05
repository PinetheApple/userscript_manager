import { useCallback, useEffect, useState } from 'react';
import { runtime, storage } from '../shared/browser-api';
import { STORAGE_KEYS, DEFAULT_SCRIPT_TEMPLATE } from '../shared/constants';
import { parseMetadata } from '../shared/metadata-parser';
import type { IUserScript } from '../shared/types';

function generateId(): string {
  return `script_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function scriptFromTemplate(): IUserScript {
  const meta = parseMetadata(DEFAULT_SCRIPT_TEMPLATE);
  const now = Date.now();
  return {
    id: generateId(),
    name: meta.name,
    description: meta.description,
    version: meta.version,
    author: meta.author,
    enabled: true,
    code: DEFAULT_SCRIPT_TEMPLATE,
    matchPatterns: meta.matchPatterns,
    excludePatterns: meta.excludePatterns,
    grants: meta.grants,
    runAt: meta.runAt,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  };
}

interface IUseScriptsReturn {
  scripts: IUserScript[];
  loading: boolean;
  createScript: (code?: string) => Promise<IUserScript>;
  updateScript: (id: string, updates: Partial<Omit<IUserScript, 'id' | 'createdAt'>>) => Promise<void>;
  deleteScript: (id: string) => Promise<void>;
  toggleScript: (id: string, enabled: boolean) => Promise<void>;
}

export function useScripts(): IUseScriptsReturn {
  const [scripts, setScripts] = useState<IUserScript[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storage.local.get(STORAGE_KEYS.SCRIPTS).then(result => {
      const stored = result[STORAGE_KEYS.SCRIPTS];
      setScripts(Array.isArray(stored) ? (stored as IUserScript[]) : []);
      setLoading(false);
    });

    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area === 'local' && STORAGE_KEYS.SCRIPTS in changes) {
        const newValue = changes[STORAGE_KEYS.SCRIPTS].newValue;
        setScripts(Array.isArray(newValue) ? (newValue as IUserScript[]) : []);
      }
    };

    storage.onChanged.addListener(listener);
    return () => storage.onChanged.removeListener(listener);
  }, []);

  const saveScripts = useCallback(async (updated: IUserScript[]) => {
    setScripts(updated);
    await storage.local.set({ [STORAGE_KEYS.SCRIPTS]: updated });
  }, []);

  const createScript = useCallback(async (code?: string): Promise<IUserScript> => {
    const template = scriptFromTemplate();
    const script: IUserScript = code
      ? {
          ...template,
          code,
          ...parseMetadata(code),
          id: template.id,
          lastError: null,
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
        }
      : template;

    const current = await storage.local.get(STORAGE_KEYS.SCRIPTS);
    const existing = Array.isArray(current[STORAGE_KEYS.SCRIPTS])
      ? (current[STORAGE_KEYS.SCRIPTS] as IUserScript[])
      : [];
    await saveScripts([...existing, script]);
    return script;
  }, [saveScripts]);

  const updateScript = useCallback(async (
    id: string,
    updates: Partial<Omit<IUserScript, 'id' | 'createdAt'>>
  ) => {
    const current = await storage.local.get(STORAGE_KEYS.SCRIPTS);
    const existing = Array.isArray(current[STORAGE_KEYS.SCRIPTS])
      ? (current[STORAGE_KEYS.SCRIPTS] as IUserScript[])
      : [];
    const updated = existing.map(s =>
      s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s
    );
    await saveScripts(updated);
  }, [saveScripts]);

  const deleteScript = useCallback(async (id: string) => {
    const current = await storage.local.get(STORAGE_KEYS.SCRIPTS);
    const existing = Array.isArray(current[STORAGE_KEYS.SCRIPTS])
      ? (current[STORAGE_KEYS.SCRIPTS] as IUserScript[])
      : [];
    await saveScripts(existing.filter(s => s.id !== id));
  }, [saveScripts]);

  const toggleScript = useCallback(async (id: string, enabled: boolean) => {
    await updateScript(id, { enabled });
  }, [updateScript]);

  return { scripts, loading, createScript, updateScript, deleteScript, toggleScript };
}
