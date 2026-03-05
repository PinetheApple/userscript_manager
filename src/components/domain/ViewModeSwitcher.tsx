import { runtime } from '../../shared/browser-api';
import { STORAGE_KEYS } from '../../shared/constants';
import { useSyncStorage } from '../../hooks/useStorage';
import { useToast } from '../ui/Toast';
import type { IAppSettings, TViewMode } from '../../shared/types';

const MODES: Array<{ value: TViewMode; label: string; icon: React.ReactNode }> = [
  {
    value: 'popup',
    label: 'Popup',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 7h6M9 11h6M9 15h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: 'sidebar',
    label: 'Sidebar',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18" />
      </svg>
    ),
  },
  {
    value: 'window',
    label: 'Window',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M2 9h20" />
        <circle cx="5.5" cy="6.5" r="1" fill="currentColor" />
        <circle cx="8.5" cy="6.5" r="1" fill="currentColor" />
      </svg>
    ),
  },
];

const MODE_MESSAGES: Record<TViewMode, string> = {
  popup: 'Switched to popup mode',
  sidebar: 'Switched to sidebar mode — click the extension icon again',
  window: 'Switched to window mode — click the extension icon to open',
};

export function ViewModeSwitcher() {
  const [settings, setSettings] = useSyncStorage<IAppSettings>(
    STORAGE_KEYS.SETTINGS,
    { viewMode: 'popup' }
  );
  const { showToast } = useToast();

  async function handleModeChange(mode: TViewMode) {
    await setSettings({ ...settings, viewMode: mode });
    // Inform SW to update action popup registration
    await runtime.sendMessage({ type: 'SET_VIEW_MODE', mode });
    showToast(MODE_MESSAGES[mode], 'info');
  }

  const currentMode = settings.viewMode ?? 'popup';

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface-raised p-0.5">
      {MODES.map(({ value, label, icon }) => (
        <button
          key={value}
          onClick={() => handleModeChange(value)}
          title={label}
          aria-label={`Switch to ${label} mode`}
          className={[
            'flex items-center justify-center w-7 h-7 rounded-md transition-colors',
            currentMode === value
              ? 'bg-accent/20 text-accent'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700',
          ].join(' ')}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
