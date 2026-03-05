import { storage, action, sidePanel, tabs } from '../shared/browser-api';
import { STORAGE_KEYS } from '../shared/constants';
import { urlMatchesScript } from '../shared/url-matcher';
import type { TContentToSWMessage, IAppSettings, IUserScript, TViewMode, IConsoleEntry } from '../shared/types';
import { getAllScripts, setScriptError, updateScript } from './script-registry';
import { handleGMCall } from './gm-handler';
import { injectScript } from './injector';

// ── View mode management ──────────────────────────────────────────────────────

// In-memory cache so onClicked can act synchronously (sidePanel.open requires
// a user-gesture context — any await before calling it loses that context).
let cachedViewMode: TViewMode = 'popup';

async function loadViewMode(): Promise<TViewMode> {
  const result = await storage.sync.get(STORAGE_KEYS.SETTINGS);
  const settings = result[STORAGE_KEYS.SETTINGS] as IAppSettings | undefined;
  return settings?.viewMode ?? 'popup';
}

async function setViewMode(mode: TViewMode): Promise<void> {
  const current = await storage.sync.get(STORAGE_KEYS.SETTINGS);
  const settings = (current[STORAGE_KEYS.SETTINGS] as IAppSettings | undefined) ?? { viewMode: 'popup' };
  await storage.sync.set({ [STORAGE_KEYS.SETTINGS]: { ...settings, viewMode: mode } });
  cachedViewMode = mode;
  await applyViewMode(mode);
}

async function applyViewMode(mode: TViewMode): Promise<void> {
  if (mode === 'popup') {
    await action.setPopup({ popup: 'shell.html' });
  } else {
    // Remove popup so onClicked fires
    await action.setPopup({ popup: '' });
  }
}

// Load and apply persisted view mode on SW startup
loadViewMode().then(mode => {
  cachedViewMode = mode;
  return applyViewMode(mode);
}).catch(console.error);

// Keep cache in sync when storage changes (e.g. from another window)
storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && STORAGE_KEYS.SETTINGS in changes) {
    const settings = changes[STORAGE_KEYS.SETTINGS].newValue as IAppSettings | undefined;
    if (settings?.viewMode) cachedViewMode = settings.viewMode;
  }
});

// Handle icon click when popup is unregistered (sidebar/window mode).
// Must call sidePanel.open() synchronously — no awaits before it.
action.onClicked.addListener((tab) => {
  if (cachedViewMode === 'sidebar') {
    const windowId = tab.windowId;
    if (windowId != null) {
      sidePanel.open({ windowId }).catch(err => {
        console.error('[ScriptFlow] sidePanel.open error:', err);
      });
    }
  } else if (cachedViewMode === 'window') {
    tabs.create({ url: 'shell.html?view=window' }).catch(err => {
      console.error('[ScriptFlow] tabs.create error:', err);
    });
  }
});

// ── Message routing ────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: unknown, sender, sendResponse) => {
    const msg = message as TContentToSWMessage & { type: string };

    switch (msg.type) {
      case 'GET_SCRIPTS_FOR_URL':
        handleGetScriptsForURL(msg as { type: 'GET_SCRIPTS_FOR_URL'; url: string }, sender)
          .then(sendResponse)
          .catch(err => sendResponse({ error: String(err) }));
        return true; // async

      case 'GM_CALL':
        handleGMCallMessage(msg as { type: 'GM_CALL'; requestId: string; scriptId: string; method: string; args: unknown[] })
          .then(sendResponse)
          .catch(err => sendResponse({ error: String(err) }));
        return true;

      case 'SCRIPT_ERROR':
        handleScriptError(msg as { type: 'SCRIPT_ERROR'; scriptId: string; error: { message: string; stack?: string } })
          .then(() => sendResponse({ ok: true }))
          .catch(console.error);
        return true;

      case 'CONSOLE_LOG':
        broadcastConsoleEntry(msg as { type: string; scriptId: string; args: unknown[] }).catch(console.error);
        sendResponse({ ok: true });
        return false;

      case 'SET_VIEW_MODE':
        setViewMode((msg as { type: string; mode: TViewMode }).mode)
          .then(() => sendResponse({ ok: true }))
          .catch(err => sendResponse({ error: String(err) }));
        return true;

      case 'GET_VIEW_MODE':
        sendResponse({ mode: cachedViewMode });
        return false;

      // CRUD operations from the UI
      case 'GET_ALL_SCRIPTS':
        getAllScripts()
          .then(scripts => sendResponse({ scripts }))
          .catch(err => sendResponse({ error: String(err) }));
        return true;

      case 'UPDATE_SCRIPT': {
        const { id, updates } = msg as { type: string; id: string; updates: Partial<IUserScript> };
        updateScript(id, updates)
          .then(script => sendResponse({ script }))
          .catch(err => sendResponse({ error: String(err) }));
        return true;
      }

      default:
        return false;
    }
  }
);

async function handleGetScriptsForURL(
  msg: { url: string },
  sender: chrome.runtime.MessageSender
): Promise<{ scripts: IUserScript[] }> {
  const tabId = sender.tab?.id;
  if (tabId == null) return { scripts: [] };

  const allScripts = await getAllScripts();
  const matching = allScripts.filter(
    s => s.enabled && urlMatchesScript(msg.url, s.matchPatterns, s.excludePatterns)
  );

  for (const script of matching) {
    try {
      await injectScript(tabId, script);
    } catch (err) {
      console.error(`[ScriptFlow] Failed to inject "${script.name}":`, err);
      await setScriptError(script.id, {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
  }

  return { scripts: matching };
}

async function handleGMCallMessage(msg: {
  requestId: string;
  scriptId: string;
  method: string;
  args: unknown[];
}): Promise<{ requestId: string; result?: unknown; error?: string }> {
  try {
    const result = await handleGMCall(
      msg.method as import('../shared/types').TGrantType,
      msg.args,
      msg.scriptId
    );
    return { requestId: msg.requestId, result };
  } catch (err) {
    return {
      requestId: msg.requestId,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function handleScriptError(msg: {
  scriptId: string;
  error: { message: string; stack?: string };
}): Promise<void> {
  await setScriptError(msg.scriptId, msg.error);
}

async function broadcastConsoleEntry(msg: { scriptId: string; args: unknown[] }): Promise<void> {
  const allScripts = await getAllScripts();
  const script = allScripts.find(s => s.id === msg.scriptId);

  // args[0] is the type ('log' | 'error'), rest are the logged values
  const [type, ...logArgs] = msg.args as [string, ...unknown[]];

  const entry: IConsoleEntry = {
    id: `${msg.scriptId}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: type === 'error' ? 'error' : 'log',
    scriptId: msg.scriptId,
    scriptName: script?.name ?? msg.scriptId,
    args: logArgs,
    timestamp: Date.now(),
  };

  // Broadcast to all open extension pages (editor, popup, sidepanel)
  chrome.runtime.sendMessage({ type: 'CONSOLE_ENTRY', entry }).catch(() => {
    // No listeners open — ignore
  });
}

// ── Side panel setup ─────────────────────────────────────────────────────────

if (chrome.sidePanel) {
  chrome.sidePanel.setOptions({ enabled: true }).catch(console.error);
}
