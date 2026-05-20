import { useState } from 'react';

interface Props {
  onAuth: (username: string, password: string, isSignUp: boolean) => Promise<string | null>;
  onToggle: () => void;
  mode: 'signin' | 'signup';
}

function Field({ label, type, value, onChange, placeholder }: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        style={{
          width: '100%', boxSizing: 'border-box',
          background: '#0d0d14', border: '1px solid #1e1e2e',
          borderRadius: '0.625rem', padding: '0.75rem 1rem',
          color: '#f1f5f9', fontSize: '0.95rem', outline: 'none',
        }}
      />
    </div>
  );
}

export function AuthPage({ onAuth, onToggle, mode }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [busy,     setBusy]     = useState(false);

  const isSignUp = mode === 'signup';

  const handleSubmit = async () => {
    if (!username || !password) { setError('Please fill in all fields'); return; }
    if (isSignUp && username.length < 3) { setError('Username must be at least 3 characters'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { setError('Username can only contain letters, numbers and underscores'); return; }

    setBusy(true);
    setError('');
    const err = await onAuth(username, password, isSignUp);
    if (err) setError(err);
    setBusy(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '1rem',
    }}>
      <div style={{
        width: '100%', maxWidth: '400px',
        background: '#13131a', border: '1px solid #1e1e2e',
        borderRadius: '1rem', padding: '2rem',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🧠</div>
          <h1 style={{ color: '#f1f5f9', fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>FocusFlow</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.4rem' }}>
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        <div onKeyDown={handleKey}>
          <Field
            label="Username"
            type="text"
            value={username}
            onChange={setUsername}
            placeholder="e.g. studyking99"
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div style={{
            background: '#ef444420', border: '1px solid #ef444440',
            borderRadius: '0.5rem', padding: '0.6rem 0.875rem',
            color: '#fca5a5', fontSize: '0.8rem', marginBottom: '1rem',
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={busy}
          style={{
            width: '100%', padding: '0.875rem',
            background: busy ? '#4c1d95' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            border: 'none', borderRadius: '0.75rem',
            color: '#fff', fontSize: '1rem', fontWeight: 700,
            cursor: busy ? 'wait' : 'pointer', marginBottom: '1rem',
          }}
        >
          {busy ? '⏳ Please wait…' : isSignUp ? '🚀 Create Account' : '🔑 Sign In'}
        </button>

        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => { onToggle(); setError(''); }}
            style={{
              background: 'none', border: 'none', color: '#a78bfa',
              cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
            }}
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}
