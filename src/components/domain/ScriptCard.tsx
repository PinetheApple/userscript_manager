import { useState } from 'react';
import { Button } from '../ui/Button';
import { Toggle } from '../ui/Toggle';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { ERROR_MAX_AGE_MS } from '../../shared/constants';
import type { IUserScript } from '../../shared/types';

interface IScriptCardProps {
  script: IUserScript;
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onClearError: (id: string) => void;
  isActive?: boolean;
}

export function ScriptCard({ script, onToggle, onEdit, onDelete, onClearError, isActive }: IScriptCardProps) {
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const hasRecentError =
    script.lastError != null &&
    Date.now() - script.lastError.timestamp < ERROR_MAX_AGE_MS;

  const errorTime = script.lastError
    ? new Date(script.lastError.timestamp).toLocaleTimeString()
    : null;

  return (
    <>
      <div
        className={[
          'group relative flex flex-col gap-2 rounded-lg border p-3 transition-colors',
          isActive
            ? 'border-accent/40 bg-surface'
            : 'border-border bg-surface hover:border-zinc-600',
        ].join(' ')}
      >
        {/* Header row */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-zinc-100 truncate">
                {script.name}
              </span>
              <span className="text-xs text-zinc-500">{script.version}</span>
              {isActive && (
                <Badge variant="success">active</Badge>
              )}
              {hasRecentError && (
                <button
                  onClick={() => setShowErrorModal(true)}
                  className="focus:outline-none"
                  title="Script error — click to view"
                >
                  <Badge variant="error">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                    error
                  </Badge>
                </button>
              )}
            </div>
            {script.description && (
              <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{script.description}</p>
            )}
          </div>

          <Toggle
            checked={script.enabled}
            onChange={(enabled) => onToggle(script.id, enabled)}
            aria-label={`${script.enabled ? 'Disable' : 'Enable'} ${script.name}`}
          />
        </div>

        {/* Match patterns */}
        {script.matchPatterns.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {script.matchPatterns.slice(0, 3).map((p, i) => (
              <code key={i} className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono truncate max-w-[160px]">
                {p}
              </code>
            ))}
            {script.matchPatterns.length > 3 && (
              <span className="text-xs text-zinc-500">+{script.matchPatterns.length - 3} more</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" onClick={() => onEdit(script.id)}>
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-error hover:text-red-300"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Delete
          </Button>
        </div>
      </div>

      {/* Error modal */}
      <Modal
        open={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Script Error"
        footer={
          <>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                onClearError(script.id);
                setShowErrorModal(false);
              }}
            >
              Clear error
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowErrorModal(false)}>
              Close
            </Button>
          </>
        }
      >
        {script.lastError && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>{script.name}</span>
              <span>·</span>
              <span>{errorTime}</span>
            </div>
            <p className="text-sm text-error font-medium">{script.lastError.message}</p>
            {script.lastError.stack && (
              <pre className="overflow-auto rounded bg-zinc-900 p-3 text-xs text-zinc-400 font-mono max-h-48">
                {script.lastError.stack}
              </pre>
            )}
          </div>
        )}
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Script"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                onDelete(script.id);
                setShowDeleteConfirm(false);
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-zinc-300">
          Are you sure you want to delete <strong className="text-zinc-100">"{script.name}"</strong>?
          This cannot be undone.
        </p>
      </Modal>
    </>
  );
}
