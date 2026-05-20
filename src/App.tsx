import { useState, useCallback } from 'react';
import type { AppView, AppSettings, DistractionEvent, SessionData } from './types';
import { getSettings, saveSettings, getSessions, saveSession, clearSessions } from './utils/storage';
import { calculateScore } from './utils/scoring';
import { supabase } from './lib/supabase';
import { useAuth } from './hooks/useAuth';
import { LandingPage } from './components/LandingPage';
import { ActiveSession } from './components/ActiveSession';
import { SessionSummary } from './components/SessionSummary';
import { SessionHistory } from './components/SessionHistory';
import { Settings } from './components/Settings';
import { Navigation } from './components/Navigation';
import { AuthPage } from './components/AuthPage';
import { Leaderboard } from './components/Leaderboard';

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function App() {
  const { user, profile, loading: authLoading, signUp, signIn, signOut } = useAuth();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const [view,          setView]          = useState<AppView>('landing');
  const [settings,      setSettings]      = useState<AppSettings>(getSettings);
  const [sessions,      setSessions]      = useState<SessionData[]>(getSessions);
  const [lastSession,   setLastSession]   = useState<SessionData | null>(null);
  const [sessionConfig, setSessionConfig] = useState<{ duration: number; cameraEnabled: boolean } | null>(null);

  const handleAuth = useCallback(async (username: string, password: string, isSignUp: boolean) => {
    if (isSignUp) return signUp('', password, username);
    return signIn(username, password);
  }, [signUp, signIn]);

  const handleStartSession = useCallback((duration: number, cameraEnabled: boolean) => {
    setSessionConfig({ duration, cameraEnabled });
    setView('session');
  }, []);

  const handleSessionEnd = useCallback(async (
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
      username: profile?.username ?? settings.username,
      startTime: now - elapsed * 1000,
      endTime: now,
      duration: elapsed,
      distractions,
      cameraEnabled: cameraGranted,
      score,
      scorePercent,
      penaltyBreakdown,
    };

    // Always save locally
    saveSession(session);
    setSessions(getSessions());
    setLastSession(session);
    setSessionConfig(null);
    setView('summary');

    // Also sync to Supabase if logged in
    if (user) {
      await supabase.from('study_sessions').insert({
        user_id:       user.id,
        username:      profile?.username ?? settings.username,
        duration:      elapsed,
        score,
        score_percent: scorePercent,
        distractions:  distractions,
        camera_enabled: cameraGranted,
        started_at:    new Date(now - elapsed * 1000).toISOString(),
        ended_at:      new Date(now).toISOString(),
      });
    }
  }, [user, profile, settings.username]);

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

  // Show auth page if not logged in
  if (!authLoading && !user) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0a0a0f', color: '#f1f5f9',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <AuthPage
          mode={authMode}
          onAuth={handleAuth}
          onToggle={() => setAuthMode(m => m === 'signin' ? 'signup' : 'signin')}
        />

      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f', color: '#f1f5f9',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {view === 'landing' && (
        <LandingPage settings={{ ...settings, username: profile?.username ?? settings.username }} onStart={handleStartSession} />
      )}
      {view === 'session' && sessionConfig && (
        <ActiveSession
          duration={sessionConfig.duration}
          cameraEnabled={sessionConfig.cameraEnabled}
          settings={{ ...settings, username: profile?.username ?? settings.username }}
          onSessionEnd={handleSessionEnd}
        />
      )}
      {view === 'summary' && lastSession && (
        <SessionSummary
          session={lastSession}
          onNewSession={() => setView('landing')}
          onViewHistory={() => setView('history')}
        />
      )}
      {view === 'history' && (
        <SessionHistory sessions={sessions} onClear={handleClearHistory} />
      )}
      {view === 'leaderboard' && (
        <Leaderboard currentUsername={profile?.username ?? settings.username} />
      )}
      {view === 'settings' && (
        <Settings settings={settings} onSave={handleSaveSettings} onSignOut={signOut} username={profile?.username} />
      )}

      {view !== 'landing' && !authLoading && (
        <Navigation current={view} onNavigate={handleNavigate} sessionActive={sessionActive} />
      )}
    </div>
  );
}
