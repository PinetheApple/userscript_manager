import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, historyKeymap, history, indentWithTab } from '@codemirror/commands';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { jsLinter, lintGutter, gmCompletion } from './editorExtensions';
import { useScripts } from '../../hooks/useScripts';
import { MetadataForm } from '../../components/domain/MetadataForm';
import { ConsolePanel } from '../../components/domain/ConsolePanel';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { parseMetadata, serializeMetadata, extractBodyCode } from '../../shared/metadata-parser';
import { runtime, storage } from '../../shared/browser-api';
import { MESSAGE_SOURCES, DEFAULT_SCRIPT_TEMPLATE } from '../../shared/constants';
import type { IUserScript, IConsoleEntry } from '../../shared/types';

function getScriptId(): string | null {
  return new URLSearchParams(window.location.search).get('id');
}

function makeDefaultScript(): IUserScript {
  const meta = parseMetadata(DEFAULT_SCRIPT_TEMPLATE);
  const now = Date.now();
  return {
    id: '',
    ...meta,
    enabled: true,
    code: DEFAULT_SCRIPT_TEMPLATE,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  };
}

const PANEL_HEIGHT_DEFAULT = 220;
const PANEL_HEIGHT_MIN = 80;
const PANEL_HEIGHT_MAX = 600;
const TOOLBAR_HEIGHT = 41; // px — keep in sync with toolbar

export function Editor() {
  const { scripts, loading, createScript, updateScript } = useScripts();
  const { showToast } = useToast();

  const [scriptId, setScriptId] = useState<string | null>(getScriptId());
  const initialIsNew = !getScriptId();
  const [script, setScript] = useState<IUserScript | null>(initialIsNew ? makeDefaultScript() : null);
  const [code, setCode] = useState(initialIsNew ? extractBodyCode(DEFAULT_SCRIPT_TEMPLATE) : '');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'metadata' | 'console'>('metadata');
  const [consoleEntries, setConsoleEntries] = useState<IConsoleEntry[]>([]);
  const [showPanel, setShowPanel] = useState(true);
  const [panelHeight, setPanelHeight] = useState(PANEL_HEIGHT_DEFAULT);

  const [wordWrap, setWordWrap] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const wrapCompartment = useRef(new Compartment());

  // Load script
  useEffect(() => {
    if (loading) return;
    if (scriptId) {
      const found = scripts.find(s => s.id === scriptId);
      if (found) {
        setScript(found);
        setCode(extractBodyCode(found.code));
      }
    }
  }, [loading, scriptId, scripts]);

  // Initialize CodeMirror
  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    const view = new EditorView({
      state: EditorState.create({
        doc: code,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightSpecialChars(),
          history(),
          drawSelection(),
          rectangularSelection(),
          crosshairCursor(),
          highlightActiveLine(),
          closeBrackets(),
          autocompletion({ override: [gmCompletion] }),
          javascript({ typescript: false }),
          jsLinter,
          lintGutter(),
          oneDark,
          keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...historyKeymap,
            ...completionKeymap,
            indentWithTab,
          ]),
          EditorView.updateListener.of(update => {
            if (update.docChanged) {
              setCode(update.state.doc.toString());
            }
          }),
          wrapCompartment.current.of(wordWrap ? EditorView.lineWrapping : []),
          EditorView.theme({
            '&': { height: '100%' },
            '.cm-scroller': { overflow: 'auto', height: '100%' },
          }),
        ],
      }),
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync word wrap toggle into the editor
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: wrapCompartment.current.reconfigure(wordWrap ? EditorView.lineWrapping : []),
    });
  }, [wordWrap]);

  // Sync external code changes to editor (e.g. initial load)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== code && code) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: code },
      });
    }
  }, [script?.id]);

  // Listen for console messages from the SW
  useEffect(() => {
    const listener = (message: unknown) => {
      const msg = message as { type?: string; entry?: IConsoleEntry };
      if (msg.type === 'CONSOLE_ENTRY' && msg.entry) {
        setConsoleEntries(prev => [...prev, msg.entry!]);
        setActiveTab('console');
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // ── Panel resize ────────────────────────────────────────────────────────────

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startHeight: panelHeight };

    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      // Dragging up increases panel height (delta is negative when moving up)
      const delta = dragRef.current.startY - e.clientY;
      const next = Math.min(PANEL_HEIGHT_MAX, Math.max(PANEL_HEIGHT_MIN, dragRef.current.startHeight + delta));
      setPanelHeight(next);
    };

    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [panelHeight]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'z' && e.altKey) {
        e.preventDefault();
        setWordWrap(w => !w);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, script, code, scriptId, wordWrap]);

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    try {
      const body = viewRef.current?.state.doc.toString() ?? code;
      // Reconstruct full code: metadata header (from form) + body (from editor)
      const meta = script
        ? { name: script.name, description: script.description, version: script.version,
            author: script.author, matchPatterns: script.matchPatterns,
            excludePatterns: script.excludePatterns, grants: script.grants, runAt: script.runAt }
        : parseMetadata(body);
      const fullCode = serializeMetadata(meta) + '\n\n' + body;

      if (scriptId && script) {
        await updateScript(scriptId, { ...meta, code: fullCode, lastError: null });
        showToast('Saved', 'success');
      } else {
        const newScript = await createScript(fullCode);
        setScriptId(newScript.id);
        setScript(newScript);
        const url = new URL(window.location.href);
        url.searchParams.set('id', newScript.id);
        window.history.replaceState(null, '', url.toString());
        showToast('Script created', 'success');
      }
    } catch (err) {
      showToast('Failed to save', 'error');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function handleMetadataChange(updates: Partial<IUserScript>) {
    if (!script) return;
    setScript(prev => prev ? { ...prev, ...updates } : prev);
  }

  // ── Layout ──────────────────────────────────────────────────────────────────

  const editorHeight = showPanel
    ? `calc(100vh - ${TOOLBAR_HEIGHT + panelHeight + 5}px)`
    : `calc(100vh - ${TOOLBAR_HEIGHT}px)`;

  return (
    <div className="flex flex-col h-screen bg-base">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded bg-accent/20 flex items-center justify-center">
            <svg className="w-3 h-3 text-accent" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-zinc-200">
            {script?.name ?? 'New Script'}
          </span>
          {script?.enabled === false && (
            <span className="text-xs text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">disabled</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Tab switcher */}
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-surface-raised p-0.5">
            {(['metadata', 'console'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setShowPanel(true); }}
                className={[
                  'px-2.5 py-1 rounded text-xs font-medium transition-colors capitalize',
                  activeTab === tab && showPanel
                    ? 'bg-accent/20 text-accent'
                    : 'text-zinc-500 hover:text-zinc-300',
                ].join(' ')}
              >
                {tab}
                {tab === 'console' && consoleEntries.length > 0 && (
                  <span className="ml-1 text-xs bg-zinc-700 text-zinc-400 rounded-full px-1">
                    {consoleEntries.length}
                  </span>
                )}
              </button>
            ))}
            <button
              onClick={() => setShowPanel(p => !p)}
              className="px-1.5 py-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
              title={showPanel ? 'Hide panel' : 'Show panel'}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={showPanel ? 'M19 9l-7 7-7-7' : 'M5 15l7-7 7 7'} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            Save
          </Button>
        </div>
      </div>

      {/* Editor + panel */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Code editor */}
        <div ref={editorRef} style={{ height: editorHeight }} className="min-h-0 overflow-hidden" />

        {/* Bottom panel */}
        {showPanel && (
          <>
            {/* Drag handle */}
            <div
              onMouseDown={onDragStart}
              className="group shrink-0 h-[5px] cursor-ns-resize flex items-center justify-center bg-transparent hover:bg-accent/20 transition-colors"
              title="Drag to resize"
            >
              <div className="w-8 h-[2px] rounded-full bg-zinc-700 group-hover:bg-accent/60 transition-colors" />
            </div>

            <div style={{ height: panelHeight }} className="shrink-0 overflow-hidden flex flex-col border-t border-border">
              {activeTab === 'metadata' && script ? (
                <div className="overflow-auto h-full">
                  <MetadataForm script={script} onChange={handleMetadataChange} />
                </div>
              ) : activeTab === 'console' ? (
                <ConsolePanel
                  entries={consoleEntries}
                  onClear={() => setConsoleEntries([])}
                />
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
