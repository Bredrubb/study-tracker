import type { ToastMessage } from '../types';

interface Props {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

const icons: Record<ToastMessage['type'], string> = {
  warning: '⚠️',
  error: '🚨',
  info: 'ℹ️',
  success: '✅',
};

const colors: Record<ToastMessage['type'], string> = {
  warning: '#f59e0b',
  error:   '#ef4444',
  info:    '#06b6d4',
  success: '#10b981',
};

export function Toast({ toasts, onRemove }: Props) {
  return (
    <div style={{
      position: 'fixed',
      top: '1.25rem',
      right: '1.25rem',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      maxWidth: '22rem',
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.75rem',
            background: '#1e1e2e',
            border: `1px solid ${colors[t.type]}40`,
            boxShadow: `0 4px 24px ${colors[t.type]}30`,
            animation: 'slideIn 0.25s ease',
            cursor: 'pointer',
          }}
          onClick={() => onRemove(t.id)}
        >
          <span style={{ fontSize: '1.1rem' }}>{icons[t.type]}</span>
          <span style={{ fontSize: '0.875rem', color: '#e2e8f0', flex: 1 }}>{t.message}</span>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>✕</span>
        </div>
      ))}
    </div>
  );
}
