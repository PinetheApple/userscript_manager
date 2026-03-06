import { storage } from '../shared/browser-api';
import { STORAGE_KEYS } from '../shared/constants';
import type { TGrantType, IGMXHRDetails, IGMXHRResponse } from '../shared/types';

type GMArgs = unknown[];

export async function handleGMCall(
  method: TGrantType,
  args: GMArgs,
  scriptId: string
): Promise<unknown> {
  switch (method) {
    case 'GM_getValue':
      return handleGetValue(scriptId, args[0] as string, args[1]);
    case 'GM_setValue':
      return handleSetValue(scriptId, args[0] as string, args[1]);
    case 'GM_deleteValue':
      return handleDeleteValue(scriptId, args[0] as string);
    case 'GM_listValues':
      return handleListValues(scriptId);
    case 'GM_xmlhttpRequest':
      return handleXHR(args[0] as IGMXHRDetails);
    default:
      throw new Error(`Unknown GM method: ${method}`);
  }
}

function storageKey(scriptId: string, key: string): string {
  return `${STORAGE_KEYS.GM_STORAGE_PREFIX}${scriptId}_${key}`;
}

async function handleGetValue(
  scriptId: string,
  key: string,
  defaultValue: unknown
): Promise<unknown> {
  const storKey = storageKey(scriptId, key);
  const result = await storage.local.get(storKey);
  return storKey in result ? result[storKey] : defaultValue;
}

async function handleSetValue(scriptId: string, key: string, value: unknown): Promise<void> {
  const storKey = storageKey(scriptId, key);
  await storage.local.set({ [storKey]: value });
}

async function handleDeleteValue(scriptId: string, key: string): Promise<void> {
  const storKey = storageKey(scriptId, key);
  await storage.local.remove(storKey);
}

async function handleListValues(scriptId: string): Promise<string[]> {
  const prefix = `${STORAGE_KEYS.GM_STORAGE_PREFIX}${scriptId}_`;
  const all = await storage.local.get(null);
  return Object.keys(all)
    .filter(k => k.startsWith(prefix))
    .map(k => k.slice(prefix.length));
}

async function handleXHR(details: IGMXHRDetails): Promise<IGMXHRResponse> {
  const {
    method = 'GET',
    url,
    headers = {},
    data,
    timeout = 30000,
  } = details;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: data ?? undefined,
      signal: controller.signal,
    });

    const responseText = await response.text();
    const responseHeaders = Array.from(response.headers.entries())
      .map(([k, v]) => `${k}: ${v}`)
      .join('\r\n');

    return {
      status: response.status,
      statusText: response.statusText,
      responseText,
      responseHeaders,
      finalUrl: response.url,
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('GM_xmlhttpRequest timed out');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
