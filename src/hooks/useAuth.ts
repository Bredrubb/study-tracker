import { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/supabase';

export function useAuth() {
  const [user,    setUser]    = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    // Hydrate session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    // Keep in sync with auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Supabase requires an email internally — we derive one from the username
  const fakeEmail = (username: string) => `${username.toLowerCase()}@focusflow.local`;

  const signUp = useCallback(async (_email: string, password: string, username: string): Promise<string | null> => {
    // Check username isn't taken
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();
    if (existing) return 'Username already taken';

    const { data, error } = await supabase.auth.signUp({
      email: fakeEmail(username),
      password,
    });
    if (error) return error.message;
    if (!data.user) return 'Sign up failed';

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: data.user.id, username });
    if (profileError) return profileError.message;

    await fetchProfile(data.user.id);
    return null;
  }, [fetchProfile]);

  const signIn = useCallback(async (username: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({
      email: fakeEmail(username),
      password,
    });
    return error ? error.message : null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  return { user, profile, loading, signUp, signIn, signOut };
}
