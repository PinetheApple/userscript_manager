import { useState } from 'react';
import { useScripts } from '../../hooks/useScripts';
import { ScriptCard } from '../../components/domain/ScriptCard';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';

export function Manager() {
  const { scripts, loading, createScript, updateScript, toggleScript, deleteScript } = useScripts();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? scripts.filter(
        s =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.description.toLowerCase().includes(search.toLowerCase())
      )
    : scripts;

  async function handleCreate() {
    try {
      const script = await createScript();
      openEditor(script.id);
    } catch (err) {
      showToast('Failed to create script', 'error');
      console.error(err);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteScript(id);
      showToast('Script deleted', 'success');
    } catch (err) {
      showToast('Failed to delete script', 'error');
      console.error(err);
    }
  }

  function openEditor(scriptId: string) {
    const url = chrome.runtime.getURL(`editor.html?id=${scriptId}`);
    chrome.tabs.create({ url });
  }

  return (
    <div className="min-h-screen" style={{ background: '#09090b' }}>
      <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-100">ScriptFlow</h1>
              <p className="text-xs text-zinc-500">Userscript Manager</p>
            </div>
          </div>
          <Button variant="primary" onClick={handleCreate}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            New Script
          </Button>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search scripts..."
          className="w-full h-9 rounded-lg border border-border bg-surface-raised px-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-zinc-950"
        />

        {/* Stats */}
        <div className="flex gap-4">
          <Stat label="Total" value={scripts.length} />
          <Stat label="Enabled" value={scripts.filter(s => s.enabled).length} color="text-success" />
          <Stat label="With errors" value={scripts.filter(s => s.lastError != null).length} color="text-error" />
        </div>

        {/* Script list */}
        <div className="flex flex-col gap-2">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-5 w-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
              title={search ? 'No scripts match your search' : 'No scripts yet'}
              description={
                search
                  ? 'Try a different search term'
                  : 'Create your first userscript to customize any website'
              }
              action={search ? undefined : { label: 'Create Script', onClick: handleCreate }}
            />
          ) : (
            filtered.map(script => (
              <ScriptCard
                key={script.id}
                script={script}
                onToggle={toggleScript}
                onEdit={openEditor}
                onDelete={handleDelete}
                onClearError={(id) => updateScript(id, { lastError: null })}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color = 'text-zinc-100',
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-surface px-4 py-2.5 flex-1">
      <span className={`text-2xl font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
  );
}
