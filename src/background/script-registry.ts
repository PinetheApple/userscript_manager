import { storage } from '../shared/browser-api';
import { STORAGE_KEYS } from '../shared/constants';
import type { IUserScript } from '../shared/types';

function generateId(): string {
  return `script_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export async function getAllScripts(): Promise<IUserScript[]> {
  const result = await storage.local.get(STORAGE_KEYS.SCRIPTS);
  const scripts = result[STORAGE_KEYS.SCRIPTS];
  if (!Array.isArray(scripts)) return [];
  return scripts as IUserScript[];
}

export async function getScript(id: string): Promise<IUserScript | null> {
  const scripts = await getAllScripts();
  return scripts.find(s => s.id === id) ?? null;
}

export async function saveAllScripts(scripts: IUserScript[]): Promise<void> {
  await storage.local.set({ [STORAGE_KEYS.SCRIPTS]: scripts });
}

export async function createScript(
  partial: Omit<IUserScript, 'id' | 'createdAt' | 'updatedAt' | 'lastError'>
): Promise<IUserScript> {
  const scripts = await getAllScripts();
  const now = Date.now();
  const script: IUserScript = {
    ...partial,
    id: generateId(),
    lastError: null,
    createdAt: now,
    updatedAt: now,
  };
  await saveAllScripts([...scripts, script]);
  return script;
}

export async function updateScript(
  id: string,
  updates: Partial<Omit<IUserScript, 'id' | 'createdAt'>>
): Promise<IUserScript | null> {
  const scripts = await getAllScripts();
  const idx = scripts.findIndex(s => s.id === id);
  if (idx === -1) return null;

  const updated: IUserScript = {
    ...scripts[idx],
    ...updates,
    id, // preserve id
    updatedAt: Date.now(),
  };
  scripts[idx] = updated;
  await saveAllScripts(scripts);
  return updated;
}

export async function deleteScript(id: string): Promise<boolean> {
  const scripts = await getAllScripts();
  const filtered = scripts.filter(s => s.id !== id);
  if (filtered.length === scripts.length) return false;
  await saveAllScripts(filtered);
  return true;
}

export async function setScriptError(
  scriptId: string,
  error: { message: string; stack?: string }
): Promise<void> {
  await updateScript(scriptId, {
    lastError: { ...error, timestamp: Date.now() },
  });
}

export async function clearScriptError(scriptId: string): Promise<void> {
  await updateScript(scriptId, { lastError: null });
}
