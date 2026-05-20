import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://zidenbcpcfrpbwpazbzq.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZGVuYmNwY2ZycGJ3cGF6YnpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNTg4NTIsImV4cCI6MjA5NDgzNDg1Mn0.kYUQ4sq0Z3GpmomL-CNQb5MKKIIVXygb2pAhdnlPEDw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

export interface Profile {
  id: string;
  username: string;
  created_at: string;
}

export interface StudySessionRow {
  id: string;
  user_id: string;
  username: string;
  duration: number;
  score: number;
  score_percent: number;
  distractions: unknown[];
  camera_enabled: boolean;
  started_at: string;
  ended_at: string;
}

export interface LeaderboardEntry {
  username: string;
  total_score: number;       // effective study minutes
  avg_score_percent: number; // 0–1
  session_count: number;
}
