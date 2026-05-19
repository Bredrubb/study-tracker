import { useEffect, useCallback, useRef } from 'react';
import type { DistractionEvent, AppSettings } from '../types';
import { useTimer } from '../hooks/useTimer';
import { useCamera } from '../hooks/useCamera';
import { useTabMonitoring } from '../hooks/useTabMonitoring';
import { useToasts } from '../hooks/useToasts';
import { getPenalty } from '../utils/scoring';
import { CameraFeed } from './CameraFeed';
import { Toast } from './Toast';

interface Props {
  duration: number;
  cameraEnabled: boolean;
  settings: AppSettings;
  onSessionEnd: (elapsed: number, distractions: DistractionEvent[], cameraGranted: boolean) => void;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ActiveSession({ duration, cameraEnabled, settings, onSessionEnd }: Props) {
  const { timeRemaining, elapsed, isExpired, start, stop, formatTime } = useTimer(duration);
  const {
    videoRef, stream, permission, modelsLoading, modelsReady, loadError,
    facePresent, phoneDetected, detectionResult,
    requestCamera, loadModels, startDetection, stopDetection, stopCamera,
  } = useCamera();

  const { toasts, addToast, removeToast } = useToasts();
  const distractionsRef = useRef<DistractionEvent[]>([]);
  const cameraGrantedRef = useRef(false);
  const sessionEndedRef = useRef(false);
  const phoneAlertCooldownRef = useRef(false);
  const faceAlertCooldownRef = useRef(false);
  const faceAbsentSinceRef = useRef<number | null>(null);
  const faceAbsentPenaltyRef = useRef(false);

  const { startMonitoring, stopMonitoring } = useTabMonitoring(
    useCallback(() => {
      addToast('🌐 You switched away from the study tab', 'warning');
      distractionsRef.current.push({
        id: uid(),
        type: 'tab_switch',
        timestamp: Date.now(),
        penalty: getPenalty('tab_switch'),
        message: 'Left study tab',
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const endSession = useCallback(() => {
    if (sessionEndedRef.current) return;
    sessionEndedRef.current = true;
    stop();
    stopMonitoring();
    stopDetection();
    stopCamera();
    onSessionEnd(elapsed || 1, distractionsRef.current, cameraGrantedRef.current);
  }, [stop, stopMonitoring, stopDetection, stopCamera, elapsed, onSessionEnd]);

  useEffect(() => {
    start();
    startMonitoring();

    if (cameraEnabled) {
      requestCamera().then(granted => {
        cameraGrantedRef.current = granted;
        if (!granted) {
          addToast('📷 Camera denied — -10% penalty applied', 'error');
          return;
        }
        loadModels().then(ok => {
          if (!ok) return; // loadModels returns false on error
          startDetection(
            () => {
              // Phone detected
              if (!phoneAlertCooldownRef.current) {
                phoneAlertCooldownRef.current = true;
                addToast('📱 Phone detected in frame! (-3%)', 'error');
                distractionsRef.current.push({
                  id: uid(),
                  type: 'phone_detected',
                  timestamp: Date.now(),
                  penalty: getPenalty('phone_detected'),
                  message: 'Phone detected in frame',
                });
                setTimeout(() => { phoneAlertCooldownRef.current = false; }, 8000);
              }
            },
            (faceIsPresent: boolean) => {
              if (faceIsPresent) {
                // Face returned — reset absence tracking
                faceAbsentSinceRef.current = null;
                faceAbsentPenaltyRef.current = false;
              } else {
                // Start absence timer on first miss
                if (faceAbsentSinceRef.current === null) {
                  faceAbsentSinceRef.current = Date.now();
                }
                // Warn once per absence episode
                if (!faceAlertCooldownRef.current) {
                  faceAlertCooldownRef.current = true;
                  addToast('⚠️ No face detected — are you still there?', 'warning');
                  setTimeout(() => { faceAlertCooldownRef.current = false; }, 10000);
                }
                // Apply 10% penalty after 10 continuous seconds absent
                const absentMs = Date.now() - (faceAbsentSinceRef.current ?? Date.now());
                if (absentMs >= 10_000 && !faceAbsentPenaltyRef.current) {
                  faceAbsentPenaltyRef.current = true;
                  addToast('❌ Left frame for 10s — -10% penalty', 'error');
                  distractionsRef.current.push({
                    id: uid(),
                    type: 'face_absent',
                    timestamp: Date.now(),
                    penalty: getPenalty('face_absent'),
                    message: 'Left camera frame for 10+ seconds',
                  });
                }
              }
            },
          );
        });
      });
    }

    return () => {
      stopMonitoring();
      stopDetection();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isExpired && !sessionEndedRef.current) {
      addToast('⏰ Time is up — great work!', 'success');
      setTimeout(endSession, 1500);
    }
  }, [isExpired, endSession, addToast]);

  const progressPct = ((duration - timeRemaining) / duration) * 100;
  const distractionCount = distractionsRef.current.length;
  const urgentColor = timeRemaining < 60 ? '#ef4444' : timeRemaining < 300 ? '#f59e0b' : '#7c3aed';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem 6rem',
    }}>
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* Always render when camera enabled so videoRef is attached before requestCamera runs */}
      {cameraEnabled && (
        <CameraFeed
          videoRef={videoRef as React.RefObject<HTMLVideoElement>}
          stream={stream}
          permission={permission}
          facePresent={facePresent}
          phoneDetected={phoneDetected}
          modelsLoading={modelsLoading}
          modelsReady={modelsReady}
          loadError={loadError}
          detectionResult={detectionResult}
        />
      )}

      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
          {settings.username ? `${settings.username} · ` : ''}Session in progress
        </div>
      </div>

      {/* Timer ring */}
      <div style={{ position: 'relative', marginBottom: '2rem' }}>
        <svg width={240} height={240} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={120} cy={120} r={108} fill="none" stroke="#1e1e2e" strokeWidth={12} />
          <circle
            cx={120} cy={120} r={108}
            fill="none"
            stroke={urgentColor}
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 108}`}
            strokeDashoffset={`${2 * Math.PI * 108 * (1 - progressPct / 100)}`}
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            fontSize: timeRemaining >= 3600 ? '2.25rem' : '3rem',
            fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
            color: urgentColor,
            lineHeight: 1,
            transition: 'color 0.5s',
          }}>
            {formatTime(timeRemaining)}
          </div>
          <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.4rem' }}>remaining</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Elapsed',      value: formatTime(elapsed),                  icon: '⏱' },
          { label: 'Distractions', value: String(distractionCount),             icon: '⚡', color: distractionCount > 0 ? '#f59e0b' : '#10b981' },
          { label: 'Camera',       value: !cameraEnabled ? 'Off' : permission === 'granted' ? 'On' : 'Denied', icon: '📷' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#13131a', border: '1px solid #1e1e2e',
            borderRadius: '0.875rem', padding: '0.875rem 1rem',
            textAlign: 'center', minWidth: '80px',
          }}>
            <div style={{ fontSize: '1.1rem' }}>{s.icon}</div>
            <div style={{ color: s.color || '#f1f5f9', fontSize: '1rem', fontWeight: 700, marginTop: '0.2rem' }}>{s.value}</div>
            <div style={{ color: '#64748b', fontSize: '0.7rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Model status banners */}
      {cameraEnabled && permission === 'granted' && modelsLoading && (
        <div style={{
          background: '#7c3aed20', border: '1px solid #7c3aed40',
          borderRadius: '0.75rem', padding: '0.5rem 1rem',
          color: '#a78bfa', fontSize: '0.8rem', marginBottom: '1rem',
        }}>
          🔄 Loading AI detection models…
        </div>
      )}
      {cameraEnabled && permission === 'granted' && loadError && (
        <div style={{
          background: '#ef444420', border: '1px solid #ef444440',
          borderRadius: '0.75rem', padding: '0.5rem 1rem',
          color: '#fca5a5', fontSize: '0.8rem', marginBottom: '1rem',
        }}>
          ⚠️ AI models failed to load — camera monitoring inactive
        </div>
      )}
      {cameraEnabled && permission === 'granted' && modelsReady && phoneDetected && (
        <div style={{
          background: '#ef444420', border: '1px solid #ef4444',
          borderRadius: '0.75rem', padding: '0.5rem 1rem',
          color: '#fca5a5', fontSize: '0.85rem', marginBottom: '1rem',
          animation: 'pulse 1s infinite',
        }}>
          📱 Phone detected in frame!
        </div>
      )}
      {cameraEnabled && permission === 'granted' && modelsReady && !facePresent && !phoneDetected && (
        <div style={{
          background: '#f59e0b20', border: '1px solid #f59e0b40',
          borderRadius: '0.75rem', padding: '0.5rem 1rem',
          color: '#fcd34d', fontSize: '0.85rem', marginBottom: '1rem',
        }}>
          ⚠️ No face detected — step back into frame
        </div>
      )}

      <button
        onClick={endSession}
        style={{
          padding: '0.875rem 2.5rem', borderRadius: '0.875rem',
          border: '1px solid #1e1e2e', background: '#13131a',
          color: '#94a3b8', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#1e1e2e'; e.currentTarget.style.color = '#f1f5f9'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#13131a'; e.currentTarget.style.color = '#94a3b8'; }}
      >
        ⏹ End Session
      </button>
      <p style={{ color: '#3f3f5a', fontSize: '0.75rem', marginTop: '0.75rem', textAlign: 'center' }}>
        Stay focused — no pausing allowed
      </p>
    </div>
  );
}
