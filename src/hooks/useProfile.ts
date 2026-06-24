import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { Database } from '../types/database';

type UserRow = Database['public']['Tables']['users']['Row'];

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserRow | null>(null);

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    supabase.from('users').select('*').eq('id', user.id).single().then(({ data }) => setProfile(data));
  }, [user?.id]);

  return profile;
}
