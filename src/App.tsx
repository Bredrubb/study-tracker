import { useState, useCallback } from 'react';
import type { AppView, AppSettings, DistractionEvent, SessionData } from './types';
import { getSettings, saveSettings, getSessions, saveSession, clearSessions } from './utils/storage';
import { calculateScore } from './utils/scoring';
import { LandingPage } from './components/LandingPage';
import { ActiveSession } from './components/ActiveSession';
import { SessionSummary } from './components/SessionSummary';
import { SessionHistory } from './components/SessionHistory';
import { Settings } from './components/Settings';
import { Navigation } from './components/Navigation';

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function App() {
  const [view, setView] = useState<AppView>('landing');
  const [settings, setSettings] = useState<AppSettings>(getSettings);
  const [sessions, setSessions] = useState<SessionData[]>(getSessions);
  const [lastSession, setLastSession] = useState<SessionData | null>(null);
  const [sessionConfig, setSessionConfig] = useState<{ duration: number; cameraEnabled: boolean } | null>(null);

  const handleStartSession = useCallback((duration: number, cameraEnabled: boolean) => {
    setSessionConfig({ duration, cameraEnabled });
    setView('session');
  }, []);

  const handleSessionEnd = useCallback((
    elapsed: number,
    distractions: DistractionEvent[],
    cameraGranted: boolean,
  ) => {
    const now = Date.now();
    const { score, scorePercent, penaltyBreakdown } = calculateScore(
      elapsed, distractions, cameraGranted,
    );

    const session: SessionData = {
      id: uid(),
      username: settings.username,
      startTime: now - elapsed * 1000,
      endTime: now,
      duration: elapsed,
      distractions,
      cameraEnabled: cameraGranted,
      score,
      scorePercent,
      penaltyBreakdown,
    };

    saveSession(session);
    setSessions(getSessions());
    setLastSession(session);
    setSessionConfig(null);
    setView('summary');
  }, [settings.username]);

  const handleNewSession = useCallback(() => {
    setView('landing');
  }, []);

  const handleSaveSettings = useCallback((newSettings: AppSettings) => {
    saveSettings(newSettings);
    setSettings(newSettings);
  }, []);

  const handleClearHistory = useCallback(() => {
    clearSessions();
    setSessions([]);
  }, []);

  const handleNavigate = useCallback((target: AppView) => {
    if (view === 'session') return;
    if (target === 'session') {
      setView(lastSession ? 'summary' : 'landing');
      return;
    }
    setView(target);
  }, [view, lastSession]);

  const sessionActive = view === 'session';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#f1f5f9',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {view === 'landing' && (
        <LandingPage settings={settings} onStart={handleStartSession} />
      )}
      {view === 'session' && sessionConfig && (
        <ActiveSession
          duration={sessionConfig.duration}
          cameraEnabled={sessionConfig.cameraEnabled}
          settings={settings}
          onSessionEnd={handleSessionEnd}
        />
      )}
      {view === 'summary' && lastSession && (
        <SessionSummary
          session={lastSession}
          onNewSession={handleNewSession}
          onViewHistory={() => setView('history')}
        />
      )}
      {view === 'history' && (
        <SessionHistory sessions={sessions} onClear={handleClearHistory} />
      )}
      {view === 'settings' && (
        <Settings settings={settings} onSave={handleSaveSettings} />
      )}

      {view !== 'landing' && (
        <Navigation
          current={view}
          onNavigate={handleNavigate}
          sessionActive={sessionActive}
        />
      )}
    </div>
  );
}
