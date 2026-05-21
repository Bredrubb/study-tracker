export type AppView = 'landing' | 'session' | 'summary' | 'history' | 'settings' | 'leaderboard' | 'friends';

export type DistractionType = 'tab_switch' | 'phone_detected' | 'camera_opted_out' | 'face_absent';

export interface DistractionEvent {
  id: string;
  type: DistractionType;
  timestamp: number;
  penalty: number;
  message: string;
}

export interface SessionData {
  id: string;
  username: string;
  startTime: number;
  endTime: number;
  duration: number; // seconds
  distractions: DistractionEvent[];
  cameraEnabled: boolean;
  score: number; // equivalent minutes
  scorePercent: number; // 0–1
  penaltyBreakdown: {
    tab_switch: number;
    phone_detected: number;
    camera_opted_out: number;
    face_absent: number;
  };
}

export interface AppSettings {
  username: string;
  cameraEnabled: boolean;
  notificationsEnabled: boolean;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'warning' | 'error' | 'info' | 'success';
}
