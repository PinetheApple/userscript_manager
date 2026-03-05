import { scripting } from '../shared/browser-api';
import { EXTENSION_VERSION } from '../shared/constants';
import type { IUserScript, TGrantType } from '../shared/types';

/**
 * Inject GM_ polyfill and user script into a tab's MAIN world.
 * Two sequential executeScript calls ensure polyfill exists before user code runs.
 */
export async function injectScript(tabId: number, script: IUserScript): Promise<void> {
  // Step 1: Install GM_ polyfill in MAIN world
  await scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: installGMPolyfill,
    args: [script.id, script.grants, script.name, script.version],
  });

  // Step 2: Run user script in MAIN world
  await scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: runUserScript,
    args: [script.code, script.id],
  });
}

/**
 * Injected into MAIN world to install the GM_ polyfill.
 * NOTE: This function is serialized by chrome.scripting — no closures, no imports.
 */
function installGMPolyfill(
  scriptId: string,
  grants: string[],
  scriptName: string,
  scriptVersion: string
) {
  const pending = new Map<string, [(v: unknown) => void, (e: Error) => void]>();

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.data?.source !== '__SF_ISOLATED__') return;
    const entry = pending.get(event.data.requestId);
    if (!entry) return;
    pending.delete(event.data.requestId);
    if (event.data.error) {
      entry[1](new Error(event.data.error));
    } else {
      entry[0](event.data.result);
    }
  });

  function gmCall(method: string, args: unknown[]): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const requestId = `${scriptId}_${method}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      pending.set(requestId, [resolve, reject]);
      window.postMessage(
        { source: '__SF_MAIN__', requestId, scriptId, method, args },
        '*'
      );
    });
  }

  (window as Window & { __SF_GM__?: unknown }).__SF_GM__ = {
    GM_getValue: grants.includes('GM_getValue')
      ? (k: string, d?: unknown) => gmCall('GM_getValue', [k, d])
      : undefined,
    GM_setValue: grants.includes('GM_setValue')
      ? (k: string, v: unknown) => gmCall('GM_setValue', [k, v])
      : undefined,
    GM_deleteValue: grants.includes('GM_deleteValue')
      ? (k: string) => gmCall('GM_deleteValue', [k])
      : undefined,
    GM_listValues: grants.includes('GM_listValues')
      ? () => gmCall('GM_listValues', [])
      : undefined,
    GM_xmlhttpRequest: grants.includes('GM_xmlhttpRequest')
      ? (d: unknown) => gmCall('GM_xmlhttpRequest', [d])
      : undefined,
    GM_addStyle: grants.includes('GM_addStyle')
      ? (css: string) => {
          const el = document.createElement('style');
          el.textContent = css;
          document.head.appendChild(el);
        }
      : undefined,
    GM_log: grants.includes('GM_log')
      ? (...logArgs: unknown[]) => {
          console.log('[ScriptFlow]', ...logArgs);
          window.postMessage(
            { source: '__SF_MAIN__', scriptId, method: 'GM_log', args: logArgs, requestId: '' },
            '*'
          );
        }
      : undefined,
    GM_info: {
      script: { name: scriptName, version: scriptVersion },
      scriptHandler: 'ScriptFlow',
      version: '1.0.0',
    },
  };
}

/**
 * Injected into MAIN world to run the user script.
 * NOTE: Serialized function — no closures, no imports.
 */
function runUserScript(code: string, scriptId: string) {
  // Capture originals before try so catch block can always log to DevTools
  const _origError = console.error.bind(console);

  try {
    const gm = (window as Window & { __SF_GM__?: Record<string, unknown> }).__SF_GM__;
    if (!gm) throw new Error('GM_ polyfill not installed');

    const {
      GM_getValue, GM_setValue, GM_deleteValue, GM_listValues,
      GM_xmlhttpRequest, GM_addStyle, GM_log, GM_info,
    } = gm;

    // Relay console.log/warn/error to the extension console panel
    const _origLog  = console.log.bind(console);
    const relay = (type: 'log' | 'error', args: unknown[]) => {
      _origLog(...args);
      window.postMessage({ source: '__SF_MAIN__', scriptId, method: '__SF_CONSOLE__', args: [type, ...args], requestId: '' }, '*');
    };
    console.log   = (...args: unknown[]) => relay('log',   args);
    console.warn  = (...args: unknown[]) => relay('log',   args);
    console.error = (...args: unknown[]) => relay('error', args);

    new Function(
      'GM_getValue', 'GM_setValue', 'GM_deleteValue', 'GM_listValues',
      'GM_xmlhttpRequest', 'GM_addStyle', 'GM_log', 'GM_info',
      code
    )(
      GM_getValue, GM_setValue, GM_deleteValue, GM_listValues,
      GM_xmlhttpRequest, GM_addStyle, GM_log, GM_info
    );

  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    _origError('[ScriptFlow]', error);
    window.postMessage(
      {
        source: '__SF_MAIN__',
        requestId: '',
        scriptId,
        method: '__SF_ERROR__',
        args: [{ message: error.message, stack: error.stack, timestamp: Date.now() }],
      },
      '*'
    );
  }
}

// Suppress unused variable warning — these are referenced as serialized functions
void installGMPolyfill;
void runUserScript;
void EXTENSION_VERSION;

export type { TGrantType };
