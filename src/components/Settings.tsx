import { useState } from 'react';
import type { AppSettings } from '../types';

interface Props {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onSignOut?: () => void;
  username?: string;
}

export function Settings({ settings, onSave, onSignOut, username: accountUsername }: Props) {
  const [username, setUsername] = useState(settings.username);
  const [cameraEnabled, setCameraEnabled] = useState(settings.cameraEnabled);
  const [notificationsEnabled, setNotificationsEnabled] = useState(settings.notificationsEnabled);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave({ username, cameraEnabled, notificationsEnabled });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ minHeight: '100vh', padding: '2rem 1rem 6rem', maxWidth: '480px', margin: '0 auto' }}>
      <h1 style={{ color: '#f1f5f9', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        ⚙️ Settings
      </h1>
      <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '0.875rem' }}>
        Your data stays on this device — no accounts needed.
      </p>

      {/* Profile */}
      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#94a3b8', fontSize: '0.75rem', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
          PROFILE
        </h2>
        <div style={{
          background: '#13131a', border: '1px solid #1e1e2e',
          borderRadius: '1rem', padding: '1rem 1.25rem',
        }}>
          <label style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>
            Your name (optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Alex"
            value={username}
            maxLength={30}
            onChange={e => setUsername(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 0.875rem',
              borderRadius: '0.75rem',
              border: '1px solid #1e1e2e',
              background: '#0a0a0f',
              color: '#f1f5f9',
              fontSize: '0.9rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#7c3aed')}
            onBlur={e => (e.currentTarget.style.borderColor = '#1e1e2e')}
          />
          <p style={{ color: '#3f3f5a', fontSize: '0.72rem', margin: '0.4rem 0 0' }}>
            Stored locally on this device only.
          </p>
        </div>
      </section>

      {/* Monitoring */}
      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#94a3b8', fontSize: '0.75rem', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
          MONITORING
        </h2>
        <div style={{ background: '#13131a', border: '1px solid #1e1e2e', borderRadius: '1rem', overflow: 'hidden' }}>
          <ToggleRow
            label="Camera monitoring"
            description="Phone & face detection using TensorFlow.js (client-side only, frames never sent anywhere)"
            value={cameraEnabled}
            onChange={setCameraEnabled}
            icon="📷"
          />
          <div style={{ borderTop: '1px solid #1e1e2e' }} />
          <ToggleRow
            label="Toast notifications"
            description="Real-time alerts for detected distractions during sessions"
            value={notificationsEnabled}
            onChange={setNotificationsEnabled}
            icon="🔔"
          />
        </div>
      </section>

      {/* Privacy note */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#94a3b8', fontSize: '0.75rem', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
          PRIVACY
        </h2>
        <div style={{
          background: '#13131a', border: '1px solid #1e1e2e',
          borderRadius: '1rem', padding: '1rem 1.25rem',
        }}>
          {[
            { icon: '🔒', text: 'Camera frames are never recorded or uploaded' },
            { icon: '💾', text: 'All data is stored in your browser\'s localStorage' },
            { icon: '🚫', text: 'No accounts, no servers, no tracking' },
            { icon: '🤖', text: 'AI detection runs 100% in-browser via TensorFlow.js' },
          ].map(item => (
            <div key={item.text} style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
              marginBottom: '0.65rem',
            }}>
              <span>{item.icon}</span>
              <span style={{ color: '#94a3b8', fontSize: '0.83rem' }}>{item.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Logged-in account info */}
      {accountUsername && (
        <div style={{
          background: '#7c3aed15', border: '1px solid #7c3aed40',
          borderRadius: '0.875rem', padding: '0.875rem 1.25rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '1rem',
        }}>
          <div>
            <div style={{ color: '#a78bfa', fontWeight: 700 }}>@{accountUsername}</div>
            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Signed in · scores sync to leaderboard</div>
          </div>
          {onSignOut && (
            <button
              onClick={onSignOut}
              style={{
                background: '#1e1e2e', border: '1px solid #3f3f5a',
                borderRadius: '0.5rem', padding: '0.4rem 0.875rem',
                color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer',
              }}
            >
              Sign out
            </button>
          )}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        style={{
          width: '100%',
          padding: '0.9rem',
          borderRadius: '0.875rem',
          border: 'none',
          background: saved
            ? 'linear-gradient(135deg, #10b981, #059669)'
            : 'linear-gradient(135deg, #7c3aed, #5b21b6)',
          color: '#fff',
          fontSize: '1rem',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'background 0.3s',
        }}
      >
        {saved ? '✅ Saved!' : '💾 Save Settings'}
      </button>
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon: string;
}

function ToggleRow({ label, description, value, onChange, icon }: ToggleRowProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '1rem',
      padding: '1rem 1.25rem',
    }}>
      <span style={{ fontSize: '1.3rem' }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ color: '#f1f5f9', fontWeight: 500, fontSize: '0.9rem' }}>{label}</div>
        <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.15rem' }}>{description}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 48, height: 28, borderRadius: 14,
          border: 'none', background: value ? '#7c3aed' : '#1e1e2e',
          cursor: 'pointer', position: 'relative',
          transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 3,
          left: value ? 23 : 3,
          width: 22, height: 22,
          borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', display: 'block',
        }} />
      </button>
    </div>
  );
}
