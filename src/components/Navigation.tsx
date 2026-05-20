import type { AppView } from '../types';

interface Props {
  current: AppView;
  onNavigate: (view: AppView) => void;
  sessionActive: boolean;
}

const navItems: { view: AppView; label: string; icon: string }[] = [
  { view: 'session',     label: 'Session',     icon: '⏱' },
  { view: 'history',     label: 'History',     icon: '📊' },
  { view: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  { view: 'settings',    label: 'Settings',    icon: '⚙️' },
];

export function Navigation({ current, onNavigate, sessionActive }: Props) {
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      padding: '0.75rem 1rem 1.25rem',
      background: 'linear-gradient(to top, #0a0a0f 60%, transparent)',
      zIndex: 100,
    }}>
      <div style={{
        display: 'flex',
        gap: '0.25rem',
        background: '#13131a',
        border: '1px solid #1e1e2e',
        borderRadius: '1.5rem',
        padding: '0.375rem',
      }}>
        {navItems.map(({ view, label, icon }) => {
          const isActive = current === view || (view === 'session' && current === 'summary');
          const isDisabled = sessionActive && view !== 'session';
          return (
            <button
              key={view}
              onClick={() => !isDisabled && onNavigate(view)}
              disabled={isDisabled}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1.1rem',
                borderRadius: '1.25rem',
                border: 'none',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                background: isActive ? '#7c3aed' : 'transparent',
                color: isActive ? '#fff' : isDisabled ? '#3f3f5a' : '#94a3b8',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 400,
                transition: 'all 0.2s',
                opacity: isDisabled ? 0.4 : 1,
              }}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
