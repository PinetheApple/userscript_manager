/**
 * browser-api.ts — The ONLY file in this codebase that touches chrome.* directly.
 * Replacing this file's internals enables Firefox/Safari support.
 *
 * TODO: chrome.scripting is the one exception that currently can't be normalized
 * via webextension-polyfill — it must be updated when porting to Firefox.
 */

export const storage = {
  local: {
    get: (keys?: string | string[] | null): Promise<Record<string, unknown>> =>
      new Promise((resolve, reject) =>
        chrome.storage.local.get(keys ?? null, result =>
          chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(result)
        )
      ),
    set: (items: Record<string, unknown>): Promise<void> =>
      new Promise((resolve, reject) =>
        chrome.storage.local.set(items, () =>
          chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve()
        )
      ),
    remove: (keys: string | string[]): Promise<void> =>
      new Promise((resolve, reject) =>
        chrome.storage.local.remove(keys, () =>
          chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve()
        )
      ),
  },
  sync: {
    get: (keys?: string | string[] | null): Promise<Record<string, unknown>> =>
      new Promise((resolve, reject) =>
        chrome.storage.sync.get(keys ?? null, result =>
          chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(result)
        )
      ),
    set: (items: Record<string, unknown>): Promise<void> =>
      new Promise((resolve, reject) =>
        chrome.storage.sync.set(items, () =>
          chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve()
        )
      ),
  },
  onChanged: {
    addListener: (
      callback: (changes: Record<string, chrome.storage.StorageChange>, area: string) => void
    ) => chrome.storage.onChanged.addListener(callback),
    removeListener: (
      callback: (changes: Record<string, chrome.storage.StorageChange>, area: string) => void
    ) => chrome.storage.onChanged.removeListener(callback),
  },
};

export const runtime = {
  sendMessage: <T = unknown>(message: unknown): Promise<T> =>
    new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, response => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response as T);
        }
      });
    }),
  onMessage: {
    addListener: (
      callback: (
        message: unknown,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response?: unknown) => void
      ) => boolean | void
    ) => chrome.runtime.onMessage.addListener(callback),
  },
  getURL: (path: string) => chrome.runtime.getURL(path),
  id: chrome.runtime.id,
};

export const tabs = {
  query: (queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> =>
    new Promise((resolve, reject) =>
      chrome.tabs.query(queryInfo, tabs =>
        chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(tabs)
      )
    ),
  get: (tabId: number): Promise<chrome.tabs.Tab> =>
    new Promise((resolve, reject) =>
      chrome.tabs.get(tabId, tab =>
        chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(tab)
      )
    ),
  create: (createProperties: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab> =>
    new Promise((resolve, reject) =>
      chrome.tabs.create(createProperties, tab =>
        chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(tab)
      )
    ),
  sendMessage: <T = unknown>(tabId: number, message: unknown): Promise<T> =>
    new Promise((resolve, reject) =>
      chrome.tabs.sendMessage(tabId, message, response =>
        chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(response as T)
      )
    ),
  onActivated: {
    addListener: (callback: (info: chrome.tabs.TabActiveInfo) => void) =>
      chrome.tabs.onActivated.addListener(callback),
    removeListener: (callback: (info: chrome.tabs.TabActiveInfo) => void) =>
      chrome.tabs.onActivated.removeListener(callback),
  },
  onUpdated: {
    addListener: (callback: (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => void) =>
      chrome.tabs.onUpdated.addListener(callback),
    removeListener: (callback: (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => void) =>
      chrome.tabs.onUpdated.removeListener(callback),
  },
};

export const scripting = {
  // TODO: chrome.scripting not yet normalized by webextension-polyfill; update when porting
  executeScript: (injection: chrome.scripting.ScriptInjection<unknown[], unknown>) =>
    chrome.scripting.executeScript(injection),
};

export const sidePanel = {
  // chrome.sidePanel is a Promise-only API (Chrome 116+) — do not wrap in callback
  open: (options: { windowId?: number; tabId?: number }): Promise<void> => {
    if (!chrome.sidePanel) return Promise.resolve();
    return chrome.sidePanel.open(options as Parameters<typeof chrome.sidePanel.open>[0]);
  },
  setOptions: (options: chrome.sidePanel.PanelOptions): Promise<void> => {
    if (!chrome.sidePanel) return Promise.resolve();
    return chrome.sidePanel.setOptions(options);
  },
};

export const action = {
  setPopup: (details: { popup: string; tabId?: number }): Promise<void> =>
    new Promise((resolve, reject) =>
      chrome.action.setPopup(details, () =>
        chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve()
      )
    ),
  onClicked: {
    addListener: (callback: (tab: chrome.tabs.Tab) => void) =>
      chrome.action.onClicked.addListener(callback),
  },
};

export const windows = {
  getCurrent: (): Promise<chrome.windows.Window> =>
    new Promise((resolve, reject) =>
      chrome.windows.getCurrent(win =>
        chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(win)
      )
    ),
};
