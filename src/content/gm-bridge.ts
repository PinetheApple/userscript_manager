import { runtime } from '../shared/browser-api';
import { MESSAGE_SOURCES } from '../shared/constants';
import type { TContentToSWMessage } from '../shared/types';

/**
 * gm-bridge.ts — Bridges MAIN world ↔ ISOLATED world ↔ Service Worker.
 *
 * The content script runs in ISOLATED world and can't call chrome.runtime
 * from MAIN world, so user scripts postMessage to ISOLATED world, which
 * forwards to the SW and posts the response back.
 */

export function setupGMBridge(): void {
  window.addEventListener('message', handleMainWorldMessage);
}

function handleMainWorldMessage(event: MessageEvent): void {
  if (event.source !== window) return;
  if (event.data?.source !== MESSAGE_SOURCES.MAIN) return;

  const { requestId, scriptId, method, args } = event.data as {
    requestId: string;
    scriptId: string;
    method: string;
    args: unknown[];
  };

  if (method === '__SF_ERROR__') {
    // Forward script runtime errors to the SW
    const error = args[0] as { message: string; stack?: string };
    const msg: TContentToSWMessage = {
      type: 'SCRIPT_ERROR',
      scriptId,
      error: { ...error, timestamp: Date.now() },
    };
    runtime.sendMessage(msg).catch(console.error);
    return;
  }

  if (method === 'GM_log' || method === '__SF_CONSOLE__') {
    runtime.sendMessage({ type: 'CONSOLE_LOG', scriptId, args }).catch(() => {});
    return;
  }

  // Forward GM_ call to service worker
  const gmMsg: TContentToSWMessage = {
    type: 'GM_CALL',
    requestId,
    scriptId,
    method: method as import('../shared/types').TGrantType,
    args,
  };

  runtime.sendMessage<{ requestId: string; result?: unknown; error?: string }>(gmMsg)
    .then(response => {
      window.postMessage(
        {
          source: MESSAGE_SOURCES.ISOLATED,
          requestId: response.requestId,
          result: response.result,
          error: response.error,
        },
        '*'
      );
    })
    .catch(err => {
      window.postMessage(
        {
          source: MESSAGE_SOURCES.ISOLATED,
          requestId,
          error: err instanceof Error ? err.message : String(err),
        },
        '*'
      );
    });
}
