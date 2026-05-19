import type { SessionData } from '../types';
import { formatScore, getScoreLabel } from '../utils/scoring';

interface Props {
  session: SessionData;
  onNewSession: () => void;
  onViewHistory: () => void;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

const ENCOURAGEMENTS: Record<string, string[]> = {
  Excellent: ['🌟 Absolutely crushing it!', '🏆 World-class focus!', '🚀 You are unstoppable!'],
  Great:     ['💪 Solid session!', '🔥 Great work, keep it up!', '✨ Really impressive!'],
  Good:      ['👍 Good effort!', '📈 Building momentum!', '💡 Making progress!'],
  Fair:      ['🌱 Room to grow — you got this!', '⚡ Next time, fewer distractions!'],
  'Needs Work': ['💪 Every session is practice!', '🎯 Set your focus for next time!'],
};

function getEncouragement(label: string) {
  const pool = ENCOURAGEMENTS[label] ?? ENCOURAGEMENTS['Good'];
  return pool[Math.floor(Math.random() * pool.length)];
}

interface StatRowProps { label: string; value: string; sub?: string; highlight?: boolean }
function StatRow({ label, value, sub, highlight }: StatRowProps) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0.75rem 0',
      borderBottom: '1px solid #1e1e2e',
    }}>
      <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ color: highlight ? '#a78bfa' : '#f1f5f9', fontWeight: 600, fontSize: '0.95rem' }}>
          {value}
        </span>
        {sub && <div style={{ color: '#64748b', fontSize: '0.7rem' }}>{sub}</div>}
      </div>
    </div>
  );
}

export function SessionSummary({ session, onNewSession, onViewHistory }: Props) {
  const scoreLabel = getScoreLabel(session.scorePercent);
  const encouragement = getEncouragement(scoreLabel.label);
  const tabSwitches = session.distractions.filter(d => d.type === 'tab_switch').length;
  const phoneDetections = session.distractions.filter(d => d.type === 'phone_detected').length;

  const totalPenaltyPct = Math.round((1 - session.scorePercent) * 100);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem 6rem',
    }}>
      {/* Score ring */}
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <svg width={180} height={180} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={90} cy={90} r={78} fill="none" stroke="#1e1e2e" strokeWidth={10} />
          <circle
            cx={90} cy={90} r={78}
            fill="none"
            stroke={scoreLabel.color}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 78}`}
            strokeDashoffset={`${2 * Math.PI * 78 * (1 - session.scorePercent)}`}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: scoreLabel.color }}>
            {Math.round(session.scorePercent * 100)}%
          </div>
          <div style={{ color: scoreLabel.color, fontSize: '0.8rem', fontWeight: 600 }}>
            {scoreLabel.label}
          </div>
        </div>
      </div>

      <h2 style={{ color: '#f1f5f9', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.25rem' }}>
        Session Complete!
      </h2>
      <p style={{ color: '#94a3b8', marginBottom: '1.75rem', textAlign: 'center' }}>
        {encouragement}
      </p>

      {/* Score breakdown card */}
      <div style={{
        background: '#13131a',
        border: '1px solid #1e1e2e',
        borderRadius: '1.25rem',
        padding: '1.5rem',
        width: '100%',
        maxWidth: '400px',
        marginBottom: '1.5rem',
      }}>
        <h3 style={{ color: '#94a3b8', fontSize: '0.75rem', margin: '0 0 0.5rem', letterSpacing: '0.08em' }}>
          SCORE BREAKDOWN
        </h3>

        <StatRow
          label="Time studied"
          value={formatDuration(session.duration)}
        />
        <StatRow
          label="Equivalent score"
          value={formatScore(session.score)}
          highlight
        />
        <StatRow
          label="Efficiency"
          value={`${Math.round(session.scorePercent * 100)}%`}
        />
        <StatRow
          label="Total penalty"
          value={totalPenaltyPct > 0 ? `-${totalPenaltyPct}%` : 'None 🎉'}
          sub={totalPenaltyPct > 0 ? 'Keep reducing distractions!' : undefined}
        />
      </div>

      {/* Distraction breakdown */}
      <div style={{
        background: '#13131a',
        border: '1px solid #1e1e2e',
        borderRadius: '1.25rem',
        padding: '1.5rem',
        width: '100%',
        maxWidth: '400px',
        marginBottom: '2rem',
      }}>
        <h3 style={{ color: '#94a3b8', fontSize: '0.75rem', margin: '0 0 0.5rem', letterSpacing: '0.08em' }}>
          DISTRACTIONS
        </h3>
        <StatRow
          label="Tab switches"
          value={`${tabSwitches} × (${tabSwitches * 5}%)`}
          sub={tabSwitches === 0 ? '🎯 Perfect tab discipline!' : undefined}
        />
        <StatRow
          label="Phone detections"
          value={`${phoneDetections} × (${phoneDetections * 3}%)`}
          sub={phoneDetections === 0 && session.cameraEnabled ? '📵 Phone-free session!' : undefined}
        />
        {!session.cameraEnabled && (
          <StatRow
            label="Camera opted out"
            value="-10%"
            sub="Enable camera next time"
          />
        )}
        <div style={{
          marginTop: '0.5rem',
          padding: '0.6rem 0.75rem',
          background: session.distractions.length === 0 && session.cameraEnabled
            ? '#10b98120' : '#0a0a0f',
          borderRadius: '0.5rem',
          color: '#94a3b8',
          fontSize: '0.8rem',
          textAlign: 'center',
        }}>
          {session.distractions.length === 0 && session.cameraEnabled
            ? '🏆 Zero distractions — elite focus!'
            : `${session.distractions.length} total distraction event${session.distractions.length !== 1 ? 's' : ''}`
          }
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', width: '100%', maxWidth: '400px' }}>
        <button
          onClick={onNewSession}
          style={{
            flex: 1,
            padding: '0.875rem',
            borderRadius: '0.875rem',
            border: 'none',
            background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
            color: '#fff',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(124,58,237,0.35)',
          }}
        >
          🚀 New Session
        </button>
        <button
          onClick={onViewHistory}
          style={{
            flex: 1,
            padding: '0.875rem',
            borderRadius: '0.875rem',
            border: '1px solid #1e1e2e',
            background: '#13131a',
            color: '#94a3b8',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          📊 History
        </button>
      </div>
    </div>
  );
}
