import { useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import type { IConsoleEntry } from '../../shared/types';

interface IConsolePanelProps {
  entries: IConsoleEntry[];
  onClear: () => void;
}

export function ConsolePanel({ entries, onClear }: IConsolePanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  return (
    <div className="flex flex-col h-full border-t border-border">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-surface">
        <span className="text-xs font-medium text-zinc-400">Console</span>
        <Button variant="ghost" size="sm" onClick={onClear} disabled={entries.length === 0}>
          Clear
        </Button>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-auto font-mono text-xs">
        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-600">
            No output yet
          </div>
        ) : (
          entries.map(entry => (
            <ConsoleLine key={entry.id} entry={entry} />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function ConsoleLine({ entry }: { entry: IConsoleEntry }) {
  const time = new Date(entry.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formatted = entry.args.map(a => {
    if (typeof a === 'string') return a;
    try {
      return JSON.stringify(a, null, 2);
    } catch {
      return String(a);
    }
  }).join(' ');

  return (
    <div
      className={[
        'flex gap-2 px-3 py-1 border-b border-zinc-900 hover:bg-zinc-900/40',
        entry.type === 'error' ? 'bg-red-950/20 text-error' : 'text-zinc-300',
      ].join(' ')}
    >
      <span className="shrink-0 text-zinc-600">{time}</span>
      <span className="shrink-0 text-zinc-600">[{entry.scriptName}]</span>
      <span className="flex-1 break-all whitespace-pre-wrap">{formatted}</span>
    </div>
  );
}
