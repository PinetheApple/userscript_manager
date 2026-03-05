import { runtime } from '../shared/browser-api';
import type { TContentToSWMessage } from '../shared/types';
import { setupGMBridge } from './gm-bridge';

// Set up the MAIN ↔ ISOLATED postMessage bridge
setupGMBridge();

// Request scripts for this URL from the service worker
function requestScripts(): void {
  const msg: TContentToSWMessage = {
    type: 'GET_SCRIPTS_FOR_URL',
    url: window.location.href,
    tabId: 0, // SW gets actual tabId from sender.tab.id
  };

  runtime.sendMessage(msg).catch(err => {
    // SW may not be ready yet (e.g. extension just installed) — ignore
    if (String(err).includes('Could not establish connection')) return;
    console.warn('[ScriptFlow] Failed to request scripts:', err);
  });
}

// Run once at document_start. Scripts needing the DOM should use
// document.addEventListener('DOMContentLoaded', ...) inside their own code.
requestScripts();

// Handle context invalidation (SW restarted)
chrome.runtime.onMessage.addListener((message) => {
  // SW can push messages to content scripts in the future here
  return false;
});
