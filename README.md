# ScriptFlow

A Chrome extension (MV3) userscript manager. Write and run custom JavaScript on any website, with a built-in editor, GM_ API support, and a live console panel.

![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-blue) ![Bun](https://img.shields.io/badge/built%20with-Bun-orange) ![React 19](https://img.shields.io/badge/React-19-61dafb)

## Features

- **Script editor** — CodeMirror 6 with syntax highlighting, JS linting, bracket matching, and GM_ API autocompletion
- **GM_ API** — `GM_getValue`, `GM_setValue`, `GM_deleteValue`, `GM_listValues`, `GM_xmlhttpRequest`, `GM_addStyle`, `GM_info`
- **Console panel** — `console.log` output from user scripts relayed to the editor in real time
- **Three view modes** — popup, sidebar, or detached window; switch and it opens immediately
- **Match patterns** — standard WebExtension `<scheme>://<host>/<path>` syntax with wildcard support
- **Error reporting** — runtime errors surface as a badge on the script card

## Stack

| | |
|---|---|
| Runtime | [Bun](https://bun.sh) |
| Bundler | [esbuild](https://esbuild.github.io) |
| UI | [React 19](https://react.dev) |
| Styles | [Tailwind v4](https://tailwindcss.com) |
| Editor | [CodeMirror 6](https://codemirror.net) |
| Linting | [acorn](https://github.com/acornjs/acorn) |

## Getting started

**Prerequisites:** [Bun](https://bun.sh) ≥ 1.0, Chrome ≥ 120

```bash
git clone <repo>
cd userscript_manager

bun install

# Generate icons (required once before first build)
bun run icons

# Build for Chrome
bun run build
```

Then load the extension:

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `dist/chrome/`

## Development

```bash
# Watch mode (rebuilds on save)
bun run dev
```

The build output goes to `dist/chrome/`. After each rebuild, click the reload button on the extension card in `chrome://extensions/`.

## Writing scripts

Scripts use the standard `==UserScript==` header format:

```js
// ==UserScript==
// @name         My Script
// @description  Does something useful
// @version      1.0.0
// @match        https://example.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(async () => {
  'use strict';

  const saved = await GM_getValue('count', 0);
  await GM_setValue('count', saved + 1);
  console.log('Visit count:', saved + 1);
})();
```

The `==UserScript==` header is managed via the **Metadata** panel in the editor — edit the code body only, not the header directly.

### GM_ API

| Method | Description |
|--------|-------------|
| `GM_getValue(key, default?)` | Read a persisted value |
| `GM_setValue(key, value)` | Write a persisted value |
| `GM_deleteValue(key)` | Delete a persisted value |
| `GM_listValues()` | List all stored keys |
| `GM_xmlhttpRequest(details)` | Cross-origin HTTP request (bypasses CORS) |
| `GM_addStyle(css)` | Inject a CSS string into the page |
| `GM_info` | Object with `script.name`, `script.version`, `scriptHandler` |

All GM_ methods are Promise-based. Storage is scoped per script.

### Editor shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save script |
| `Alt+Z` | Toggle word wrap |

## Project structure

```
src/
├── background/       Service worker — message routing, script injection, GM_ handlers
├── content/          Content script — GM_ bridge between MAIN and ISOLATED worlds
├── pages/
│   ├── shell/        Popup / sidebar / window (same app, adapts to context)
│   ├── manager/      Full script management page (opens as a tab)
│   └── editor/       CodeMirror editor + MetadataForm + ConsolePanel
├── components/
│   ├── ui/           Button, Toggle, Badge, Modal, Toast, EmptyState
│   └── domain/       ScriptCard, MetadataForm, ConsolePanel, ViewModeSwitcher
├── hooks/            useScripts, useCurrentTab, useStorage
├── shared/           Types, constants, browser-api, url-matcher, metadata-parser
└── styles/           main.css (Tailwind v4)
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for architecture details, build commands, and the script execution model.

## How it works

When you navigate to a page:

1. The content script (ISOLATED world) sends `GET_SCRIPTS_FOR_URL` to the service worker
2. The SW filters enabled scripts whose `@match` patterns match the URL
3. For each matching script, the SW injects two functions into the **MAIN world** via `chrome.scripting.executeScript`:
   - `installGMPolyfill` — sets up `window.__SF_GM__` with the granted GM_ methods
   - `runUserScript` — wraps the user's code in a `new Function()` and runs it
4. GM_ calls are bridged back to the SW via `window.postMessage` → content script → `chrome.runtime.sendMessage`
5. `console.log` output is relayed to the editor's Console panel via the same bridge

## Permissions

| Permission | Reason |
|------------|--------|
| `storage` | Script persistence and GM_getValue/setValue |
| `scripting` | Inject user scripts into pages |
| `activeTab` | Read the current tab URL in the popup |
| `tabs` | Update the active page indicator when switching tabs |
| `sidePanel` | Chrome side panel support |
| `<all_urls>` | Host permission — user controls targeting via @match patterns |
