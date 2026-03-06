import { useEffect, useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { validateMatchPattern } from '../../shared/url-matcher';
import type { TGrantType, TRunAt, IUserScript } from '../../shared/types';

const GRANT_OPTIONS: TGrantType[] = [
  'GM_getValue', 'GM_setValue', 'GM_deleteValue', 'GM_listValues',
  'GM_xmlhttpRequest', 'GM_addStyle',
];

const RUN_AT_OPTIONS: TRunAt[] = ['document-start', 'document-end', 'document-idle'];

interface IMetadataFormProps {
  script: IUserScript;
  onChange: (updates: Partial<IUserScript>) => void;
}

export function MetadataForm({ script, onChange }: IMetadataFormProps) {
  const [newPattern, setNewPattern] = useState('');
  const [patternError, setPatternError] = useState('');
  const [newExclude, setNewExclude] = useState('');
  const [excludeError, setExcludeError] = useState('');

  function addPattern() {
    const err = validateMatchPattern(newPattern.trim());
    if (err) {
      setPatternError(err);
      return;
    }
    onChange({ matchPatterns: [...script.matchPatterns, newPattern.trim()] });
    setNewPattern('');
    setPatternError('');
  }

  function removePattern(index: number) {
    onChange({ matchPatterns: script.matchPatterns.filter((_, i) => i !== index) });
  }

  function addExclude() {
    const err = validateMatchPattern(newExclude.trim());
    if (err) {
      setExcludeError(err);
      return;
    }
    onChange({ excludePatterns: [...script.excludePatterns, newExclude.trim()] });
    setNewExclude('');
    setExcludeError('');
  }

  function removeExclude(index: number) {
    onChange({ excludePatterns: script.excludePatterns.filter((_, i) => i !== index) });
  }

  function toggleGrant(grant: TGrantType) {
    const has = script.grants.includes(grant);
    onChange({
      grants: has
        ? script.grants.filter(g => g !== grant)
        : [...script.grants, grant],
    });
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Basic info */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Name"
          value={script.name}
          onChange={e => onChange({ name: e.target.value })}
          placeholder="My Script"
        />
        <Input
          label="Version"
          value={script.version}
          onChange={e => onChange({ version: e.target.value })}
          placeholder="1.0.0"
        />
      </div>
      <Input
        label="Description"
        value={script.description}
        onChange={e => onChange({ description: e.target.value })}
        placeholder="What does this script do?"
      />
      <Input
        label="Author"
        value={script.author}
        onChange={e => onChange({ author: e.target.value })}
        placeholder="Your name"
      />

      {/* Run at */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-300">Run at</label>
        <div className="flex gap-2">
          {RUN_AT_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => onChange({ runAt: opt })}
              className={[
                'px-2.5 py-1 rounded text-xs font-medium border transition-colors',
                script.runAt === opt
                  ? 'border-accent/60 bg-accent/20 text-accent'
                  : 'border-border bg-surface-raised text-zinc-400 hover:border-zinc-600',
              ].join(' ')}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Match patterns */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-300">Match patterns</label>
        <div className="flex flex-col gap-1">
          {script.matchPatterns.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded font-mono truncate">
                {p}
              </code>
              <Button variant="ghost" size="sm" onClick={() => removePattern(i)} aria-label="Remove">
                <svg className="h-3.5 w-3.5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newPattern}
            onChange={e => { setNewPattern(e.target.value); setPatternError(''); }}
            onKeyDown={e => e.key === 'Enter' && addPattern()}
            placeholder="https://example.com/*"
            error={patternError}
            className="flex-1 h-8 text-xs"
          />
          <Button variant="secondary" size="sm" onClick={addPattern}>Add</Button>
        </div>
      </div>

      {/* Exclude patterns */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-300">Exclude patterns</label>
        <div className="flex flex-col gap-1">
          {script.excludePatterns.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded font-mono truncate">
                {p}
              </code>
              <Button variant="ghost" size="sm" onClick={() => removeExclude(i)} aria-label="Remove">
                <svg className="h-3.5 w-3.5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newExclude}
            onChange={e => { setNewExclude(e.target.value); setExcludeError(''); }}
            onKeyDown={e => e.key === 'Enter' && addExclude()}
            placeholder="https://example.com/skip/*"
            error={excludeError}
            className="flex-1 h-8 text-xs"
          />
          <Button variant="secondary" size="sm" onClick={addExclude}>Add</Button>
        </div>
      </div>

      {/* Grants */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-300">Grants</label>
        <div className="flex flex-wrap gap-1.5">
          {GRANT_OPTIONS.map(grant => (
            <button
              key={grant}
              onClick={() => toggleGrant(grant)}
              className={[
                'px-2 py-0.5 rounded text-xs font-mono border transition-colors',
                script.grants.includes(grant)
                  ? 'border-accent/60 bg-accent/20 text-accent'
                  : 'border-border bg-surface-raised text-zinc-500 hover:border-zinc-600 hover:text-zinc-300',
              ].join(' ')}
            >
              {grant}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
