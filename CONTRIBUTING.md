# Contributing to ScriptFlow

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.0
- Chrome ≥ 120 (for MV3 + sidePanel APIs)

## Getting started

```bash
# Install dependencies
bun install

# Generate icons (required for first build)
bun run icons

# Build for Chrome (development, with sourcemaps)
bun run dev:chrome
# or watch mode:
bun run dev
```

## Project structure

```
src/
├── background/     Service worker — message routing, script injection, GM_ handlers
├── content/        Content script — MAIN ↔ ISOLATED bridge
├── pages/
│   ├── shell/      Popup + sidebar + window (same app, adapts to size)
│   ├── manager/    Full script management page (options_ui)
│   └── editor/     CodeMirror editor + MetadataForm + ConsolePanel
├── components/
│   ├── ui/         Button, Toggle, Badge, Input, Modal, EmptyState, Toast
│   └── domain/     ScriptCard, MetadataForm, ConsolePanel, ViewModeSwitcher
├── hooks/          useScripts, useCurrentTab, useStorage
├── shared/         Types, constants, browser-api, url-matcher, metadata-parser
└── styles/         main.css (Tailwind v4)
```

## Architecture rules

### `src/shared/browser-api.ts` — the abstraction boundary

This is the **only** file that imports or calls `chrome.*` APIs directly (with the exception of `chrome.scripting` in `injector.ts` which cannot yet be normalized).

All other source files must import from `browser-api.ts`. This ensures the entire codebase can be ported to Firefox/Safari by replacing a single file's internals.

### No closures in `chrome.scripting.executeScript`

Functions passed to `chrome.scripting.executeScript` are **serialized** as strings. They cannot reference outer variables or imported modules. All required data must be passed through the `args:` array.

### TypeScript naming conventions

- Interfaces: `I` prefix (e.g. `IUserScript`)
- Type aliases: `T` prefix (e.g. `TGrantType`)
- Enums: `E` prefix (e.g. `ERunAt`)

### State management

No external state library. React `useState` + `useEffect` + `chrome.storage.onChanged` listeners provide reactive storage-backed state. See `useScripts.ts` and `useStorage.ts`.

## Build

```bash
# Chrome (default)
bun run build:chrome

# Production (minified, no sourcemaps)
bun run build.ts --prod --target chrome

# Firefox placeholder (MV2 — not yet complete)
bun run build:firefox

# Clean dist/
bun run clean
```

Output is in `dist/<target>/`.

## Loading the extension

1. `bun run build:chrome` (or `dev:chrome` for watch mode)
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" → select `dist/chrome/`
5. The ScriptFlow icon appears in the toolbar

## Script execution model

```
Page navigation
  └─ content.js (ISOLATED world) → SW: GET_SCRIPTS_FOR_URL
       └─ SW filters enabled + matching scripts
            └─ For each script:
                 1. executeScript: installGMPolyfill → MAIN world
                 2. executeScript: runUserScript → MAIN world
  └─ User script postMessages GM_ calls to content script
       └─ Content script forwards to SW via chrome.runtime.sendMessage
            └─ SW executes GM_ operation, responds
                 └─ Content script posts response back to MAIN world
```

## GM_ support matrix

| Method | Implemented | Notes |
|--------|-------------|-------|
| `GM_getValue` | ✓ | Scoped to script ID in chrome.storage.local |
| `GM_setValue` | ✓ | Scoped to script ID in chrome.storage.local |
| `GM_deleteValue` | ✓ | |
| `GM_listValues` | ✓ | |
| `GM_xmlhttpRequest` | ✓ | Uses SW fetch (bypasses page CORS) |
| `GM_addStyle` | ✓ | Executes in MAIN world, no SW round-trip |
| `GM_log` | ✓ | Relayed to editor ConsolePanel |
| `GM_info` | ✓ | Static object — name, version, scriptHandler |

## Testing

Manual verification checklist (see plan for full details):

1. `bun install` completes without errors
2. `bun run icons` generates PNGs in `public/icons/`
3. `bun run build` produces a valid `dist/chrome/`
4. Load as unpacked extension — no manifest errors
5. Content script runs without errors on any page
6. Popup shows "No scripts active on this page"
7. Create a script with `@match *://*/*` → appears in list
8. GM_getValue / GM_setValue persist across reloads
9. GM_xmlhttpRequest makes cross-origin requests
10. Runtime errors → script.lastError + red badge

## Code style

- TypeScript strict mode throughout
- No `any` unless unavoidable (and comment why)
- Tailwind classes only — no inline styles except for dynamic values
- No external UI libraries — all components are hand-rolled
- KISS/DRY/SOLID/YAGNI: don't add features not in the plan

## Manifest permissions philosophy

Every permission is justified for Chrome Web Store review:

- `storage` — GM_getValue/setValue and script persistence
- `scripting` — inject user scripts into pages (the core feature)
- `activeTab` — read current tab URL in popup
- `sidePanel` — Chrome side panel support
- `<all_urls>` host permission — user controls targeting via @match

## Cross-browser portability

- `browser-api.ts` is the seam for Chrome → Firefox/Safari
- `webextension-polyfill` normalizes the `browser.*` namespace
- `manifests/manifest.firefox.json` and `manifest.safari.json` are placeholders
- Main blocker: `chrome.scripting` (MV3-only) — needs polyfill/alternative for Firefox MV2
