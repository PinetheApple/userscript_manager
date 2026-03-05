import { useMemo, useState } from 'react';
import { useScripts } from '../../hooks/useScripts';
import { useCurrentTab } from '../../hooks/useCurrentTab';
import { ScriptCard } from '../../components/domain/ScriptCard';
import { ViewModeSwitcher } from '../../components/domain/ViewModeSwitcher';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { urlMatchesScript } from '../../shared/url-matcher';
import { runtime } from '../../shared/browser-api';

// Detect view context from URL params
function getViewMode(): 'popup' | 'sidebar' | 'window' {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  if (view === 'window') return 'window';
  if (view === 'sidebar') return 'sidebar';
  return 'popup';
}

const viewMode = getViewMode();

const containerClass = 'w-full h-screen flex flex-col overflow-hidden';

export function Shell() {
  const { scripts, loading, updateScript, toggleScript, deleteScript } = useScripts();
  const currentTab = useCurrentTab();
  const [search, setSearch] = useState('');

  const activeScripts = useMemo(() => {
    if (!currentTab.url) return [];
    return scripts.filter(
      s => s.enabled && urlMatchesScript(currentTab.url!, s.matchPatterns, s.excludePatterns)
    );
  }, [scripts, currentTab.url]);

  const filteredScripts = useMemo(() => {
    if (!search.trim()) return scripts;
    const q = search.toLowerCase();
    return scripts.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );
  }, [scripts, search]);

  function openEditor(scriptId?: string) {
    const url = chrome.runtime.getURL(
      scriptId ? `editor.html?id=${scriptId}` : 'editor.html'
    );
    chrome.tabs.create({ url });
  }

  function openManager() {
    chrome.runtime.openOptionsPage();
  }

  return (
    <div className={containerClass} style={{ background: '#09090b' }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-accent/20 flex items-center justify-center">
            <svg className="w-3 h-3 text-accent" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-zinc-100">ScriptFlow</span>
          {activeScripts.length > 0 && (
            <span className="text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded-full font-medium">
              {activeScripts.length} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <ViewModeSwitcher />
          <Button variant="ghost" size="sm" onClick={openManager} title="Open Manager">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" strokeLinecap="round" />
              <path d="M12 8v4l3 3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Current page info */}
      {currentTab.url && (
        <div className="px-3 py-2 border-b border-border bg-surface shrink-0">
          <p className="text-xs text-zinc-500 truncate" title={currentTab.url}>
            <span className="text-zinc-600">Page: </span>
            {currentTab.title ?? currentTab.url}
          </p>
          {activeScripts.length === 0 && !loading && (
            <p className="text-xs text-zinc-600 mt-0.5">No scripts active on this page</p>
          )}
        </div>
      )}

      {/* Search */}
      <div className="px-3 py-2 shrink-0">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search scripts..."
          className="w-full h-7 rounded-md border border-border bg-surface-raised px-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* Script list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-4 w-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : filteredScripts.length === 0 ? (
          <EmptyState
            icon={
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title={search ? 'No scripts match your search' : 'No scripts yet'}
            description={search ? 'Try a different search term' : 'Create your first userscript to get started'}
            action={search ? undefined : { label: 'New Script', onClick: () => openEditor() }}
          />
        ) : (
          filteredScripts.map(script => (
            <ScriptCard
              key={script.id}
              script={script}
              isActive={activeScripts.some(a => a.id === script.id)}
              onToggle={toggleScript}
              onEdit={openEditor}
              onDelete={deleteScript}
              onClearError={(id) => updateScript(id, { lastError: null })}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-3 py-2 shrink-0 flex items-center justify-between">
        <span className="text-xs text-zinc-600">
          {scripts.length} script{scripts.length !== 1 ? 's' : ''}
        </span>
        <Button variant="primary" size="sm" onClick={() => openEditor()}>
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          New Script
        </Button>
      </div>
    </div>
  );
}
