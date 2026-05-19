import { useState } from 'react';
import type { AppSettings } from '../types';
import { MIN_DURATION, MAX_DURATION } from '../hooks/useTimer';

interface Props {
  settings: AppSettings;
  onStart: (duration: number, cameraEnabled: boolean) => void;
}

const PRESETS = [
  { label: '25 min', value: 25 * 60, emoji: '🍅' },
  { label: '45 min', value: 45 * 60, emoji: '⚡' },
  { label: '1 hour', value: 60 * 60, emoji: '🎯' },
  { label: '2 hours', value: 120 * 60, emoji: '🔥' },
];

const MOTIVATIONS = [
  "Deep work starts now. Let's crush it.",
  "Your future self will thank you.",
  "One focused session can change everything.",
  "No distractions. Pure focus. Let's go.",
  "Every expert was once a beginner. Keep going.",
];

export function LandingPage({ settings, onStart }: Props) {
  const [duration, setDuration] = useState(25 * 60);
  const [cameraEnabled, setCameraEnabled] = useState(settings.cameraEnabled);
  const [customMins, setCustomMins] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const motivation = MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];

  const effectiveDuration = useCustom
    ? Math.min(MAX_DURATION, Math.max(MIN_DURATION, (parseInt(customMins) || 25) * 60))
    : duration;

  const handleStart = () => onStart(effectiveDuration, cameraEnabled);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem 6rem',
    }}>
      {/* Logo / Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>🧠</div>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0,
        }}>
          FocusFlow
        </h1>
        <p style={{ color: '#64748b', marginTop: '0.5rem', fontSize: '1rem' }}>
          {settings.username ? `Welcome back, ${settings.username}!` : 'Study smarter, not harder'}
        </p>
        <p style={{
          color: '#7c3aed',
          fontStyle: 'italic',
          marginTop: '0.25rem',
          fontSize: '0.9rem',
        }}>
          "{motivation}"
        </p>
      </div>

      {/* Session config card */}
      <div style={{
        background: '#13131a',
        border: '1px solid #1e1e2e',
        borderRadius: '1.5rem',
        padding: '2rem',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 8px 40px rgba(124,58,237,0.1)',
      }}>
        <h2 style={{ color: '#f1f5f9', fontSize: '1.1rem', margin: '0 0 1.25rem', fontWeight: 600 }}>
          Set your session
        </h2>

        {/* Duration presets */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>
            DURATION
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {PRESETS.map(p => (
              <button
                key={p.value}
                onClick={() => { setDuration(p.value); setUseCustom(false); }}
                style={{
                  padding: '0.75rem',
                  borderRadius: '0.75rem',
                  border: `1px solid ${!useCustom && duration === p.value ? '#7c3aed' : '#1e1e2e'}`,
                  background: !useCustom && duration === p.value ? '#7c3aed20' : '#0a0a0f',
                  color: !useCustom && duration === p.value ? '#a78bfa' : '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: !useCustom && duration === p.value ? 600 : 400,
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                }}
              >
                <span>{p.emoji}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>

          {/* Custom duration */}
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="number"
              placeholder="Custom (10–180 min)"
              value={customMins}
              min={10}
              max={180}
              onChange={e => { setCustomMins(e.target.value); setUseCustom(true); }}
              onFocus={() => setUseCustom(true)}
              style={{
                flex: 1,
                padding: '0.65rem 0.85rem',
                borderRadius: '0.75rem',
                border: `1px solid ${useCustom ? '#7c3aed' : '#1e1e2e'}`,
                background: '#0a0a0f',
                color: '#f1f5f9',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>min</span>
          </div>
        </div>

        {/* Camera toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem',
          background: '#0a0a0f',
          borderRadius: '0.75rem',
          border: '1px solid #1e1e2e',
          marginBottom: '1.5rem',
        }}>
          <div>
            <div style={{ color: '#f1f5f9', fontSize: '0.9rem', fontWeight: 500 }}>
              📷 Camera monitoring
            </div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.2rem' }}>
              {cameraEnabled ? 'Phone + face detection active' : '-10% penalty applies'}
            </div>
          </div>
          <button
            onClick={() => setCameraEnabled(p => !p)}
            style={{
              width: 48,
              height: 28,
              borderRadius: 14,
              border: 'none',
              background: cameraEnabled ? '#7c3aed' : '#1e1e2e',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
          >
            <span style={{
              position: 'absolute',
              top: 3,
              left: cameraEnabled ? 23 : 3,
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: '#fff',
              transition: 'left 0.2s',
              display: 'block',
            }} />
          </button>
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          style={{
            width: '100%',
            padding: '1rem',
            borderRadius: '0.875rem',
            border: 'none',
            background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
            color: '#fff',
            fontSize: '1.1rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
            transition: 'transform 0.1s, box-shadow 0.1s',
          }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          🚀 Start Session
        </button>

        <p style={{ textAlign: 'center', color: '#3f3f5a', fontSize: '0.75rem', marginTop: '0.75rem', margin: '0.75rem 0 0' }}>
          Min 10 min · Max 3 hours · No pausing
        </p>
      </div>
    </div>
  );
}
