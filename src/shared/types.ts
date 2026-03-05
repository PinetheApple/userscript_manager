export type TGrantType =
  | 'GM_getValue'
  | 'GM_setValue'
  | 'GM_deleteValue'
  | 'GM_listValues'
  | 'GM_xmlhttpRequest'
  | 'GM_addStyle'
  | 'GM_log'
  | 'GM_info';

export type TViewMode = 'popup' | 'sidebar' | 'window';

export type TRunAt = 'document-start' | 'document-end' | 'document-idle';

export interface IScriptError {
  message: string;
  stack?: string;
  timestamp: number;
}

export interface IUserScript {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  enabled: boolean;
  code: string;            // Full source including ==UserScript== block
  matchPatterns: string[]; // @match
  excludePatterns: string[]; // @exclude
  grants: TGrantType[];     // @grant
  runAt: TRunAt;
  lastError: IScriptError | null;
  createdAt: number;
  updatedAt: number;
}

export interface IAppSettings {
  viewMode: TViewMode;
}

export interface IGMXHRDetails {
  method?: string;
  url: string;
  headers?: Record<string, string>;
  data?: string;
  timeout?: number;
  onload?: (response: IGMXHRResponse) => void;
  onerror?: (response: IGMXHRResponse) => void;
  ontimeout?: () => void;
}

export interface IGMXHRResponse {
  status: number;
  statusText: string;
  responseText: string;
  responseHeaders: string;
  finalUrl: string;
}

// Message discriminated unions — Content Script → Service Worker
export type TContentToSWMessage =
  | { type: 'GET_SCRIPTS_FOR_URL'; url: string; tabId: number }
  | { type: 'GM_CALL'; requestId: string; scriptId: string; method: TGrantType; args: unknown[] }
  | { type: 'SCRIPT_ERROR'; scriptId: string; error: IScriptError };

// Service Worker → Content Script
export type TSWToContentMessage =
  | { type: 'GM_RESPONSE'; requestId: string; result: unknown; error?: string }
  | { type: 'INJECT_SCRIPTS'; scripts: Array<{ id: string; name: string; version: string; code: string; grants: TGrantType[]; runAt: TRunAt }> };

// postMessage between MAIN world and ISOLATED world
export interface IMainToIsolatedMessage {
  source: '__SF_MAIN__';
  requestId: string;
  scriptId: string;
  method: string;
  args: unknown[];
}

export interface IIsolatedToMainMessage {
  source: '__SF_ISOLATED__';
  requestId: string;
  result?: unknown;
  error?: string;
}

export interface IConsoleEntry {
  id: string;
  type: 'log' | 'error';
  scriptId: string;
  scriptName: string;
  args: unknown[];
  timestamp: number;
}
