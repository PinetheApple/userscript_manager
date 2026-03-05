export const STORAGE_KEYS = {
  SCRIPTS: 'sf_scripts',
  SETTINGS: 'sf_settings',
  GM_STORAGE_PREFIX: 'sf_gm_',
} as const;

export const MESSAGE_SOURCES = {
  MAIN: '__SF_MAIN__',
  ISOLATED: '__SF_ISOLATED__',
} as const;

export const EXTENSION_VERSION = '1.0.0';

export const DEFAULT_SCRIPT_TEMPLATE = `// ==UserScript==
// @name         New Script
// @description  Describe what this script does
// @version      1.0.0
// @match        https://example.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(async () => {
  'use strict';

  // Example: intercept a button and use a stored token
  // const token = await GM_getValue('myToken');
  // document.querySelector('#submit-btn')?.addEventListener('click', async (e) => {
  //   e.preventDefault();
  //   const res = await GM_xmlhttpRequest({
  //     method: 'POST',
  //     url: 'https://api.example.com/action',
  //     headers: { Authorization: \`Bearer \${token}\` },
  //   });
  //   console.log(res.responseText);
  // });

})();
`;

export const ERROR_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
