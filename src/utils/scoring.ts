import type { DistractionEvent } from '../types';

const PENALTIES: Record<string, number> = {
  tab_switch: 0.05,
  phone_detected: 0.03,
  camera_opted_out: 0.10,
  face_absent: 0.10,
};

export function calculateScore(
  durationSeconds: number,
  distractions: DistractionEvent[],
  cameraEnabled: boolean
): {
  score: number;
  scorePercent: number;
  penaltyBreakdown: { tab_switch: number; phone_detected: number; camera_opted_out: number; face_absent: number };
} {
  const durationMinutes = durationSeconds / 60;

  const penaltyBreakdown = { tab_switch: 0, phone_detected: 0, camera_opted_out: 0, face_absent: 0 };
  let totalPenalty = 0;

  for (const d of distractions) {
    const key = d.type as keyof typeof penaltyBreakdown;
    penaltyBreakdown[key] = (penaltyBreakdown[key] || 0) + d.penalty;
    totalPenalty += d.penalty;
  }

  if (!cameraEnabled) {
    penaltyBreakdown.camera_opted_out = PENALTIES.camera_opted_out;
    totalPenalty += PENALTIES.camera_opted_out;
  }

  const scorePercent = Math.max(0, 1 - totalPenalty);
  const score = durationMinutes * scorePercent;

  return { score, scorePercent, penaltyBreakdown };
}

export function getPenalty(type: string): number {
  return PENALTIES[type] ?? 0;
}

export function formatScore(score: number): string {
  const mins = Math.floor(score);
  const secs = Math.round((score - mins) * 60);
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

export function getScoreLabel(scorePercent: number): { label: string; color: string } {
  if (scorePercent >= 0.9) return { label: 'Excellent', color: '#10b981' };
  if (scorePercent >= 0.75) return { label: 'Great', color: '#06b6d4' };
  if (scorePercent >= 0.6) return { label: 'Good', color: '#7c3aed' };
  if (scorePercent >= 0.4) return { label: 'Fair', color: '#f59e0b' };
  return { label: 'Needs Work', color: '#ef4444' };
}
