import { scripting } from '../shared/browser-api';
import { EXTENSION_VERSION } from '../shared/constants';
import type { IUserScript, TGrantType } from '../shared/types';

export async function injectScript(tabId: number, script: IUserScript): Promise<void> {
  await scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: installGMPolyfill,
    args: [script.id, script.grants, script.name, script.version],
  });

  await scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: runUserScript,
    args: [script.code, script.id],
  });
}

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
    GM_info: {
      script: { name: scriptName, version: scriptVersion },
      scriptHandler: 'ScriptFlow',
      version: '1.0.0',
    },
  };
}

function runUserScript(code: string, scriptId: string) {
  const _nativeError = console.error.bind(console);

  try {
    const gm = (window as Window & { __SF_GM__?: Record<string, unknown> }).__SF_GM__;
    if (!gm) throw new Error('GM_ polyfill not installed');

    const {
      GM_getValue, GM_setValue, GM_deleteValue, GM_listValues,
      GM_xmlhttpRequest, GM_addStyle, GM_info,
    } = gm;

    // Shadow `console` per-script so relay is always attributed to the right scriptId.
    // Capturing originals here guarantees we call the real browser console, not
    // a relay installed by another script that ran earlier on the same page.
    const _log   = console.log.bind(console);
    const _warn  = console.warn.bind(console);
    const _err   = console.error.bind(console);
    const post = (type: 'log' | 'error', args: unknown[]) =>
      window.postMessage({ source: '__SF_MAIN__', scriptId, method: '__SF_CONSOLE__', args: [type, ...args], requestId: '' }, '*');
    const scriptConsole = {
      log:   (...args: unknown[]) => { _log(...args);  post('log',   args); },
      warn:  (...args: unknown[]) => { _warn(...args); post('log',   args); },
      error: (...args: unknown[]) => { _err(...args);  post('error', args); },
    };

    new Function(
      'GM_getValue', 'GM_setValue', 'GM_deleteValue', 'GM_listValues',
      'GM_xmlhttpRequest', 'GM_addStyle', 'GM_info', 'console',
      code
    )(
      GM_getValue, GM_setValue, GM_deleteValue, GM_listValues,
      GM_xmlhttpRequest, GM_addStyle, GM_info, scriptConsole
    );

  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    _nativeError('[ScriptFlow]', error);
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

void installGMPolyfill;
void runUserScript;
void EXTENSION_VERSION;

export type { TGrantType };
