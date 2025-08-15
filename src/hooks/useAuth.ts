import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { User } from '../types';

const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserWithRole = async (email: string, id: string) => {
    const { data: allowed, error } = await supabase
      .from('allowed_users')
      .select('email, is_faculty')
      .eq('email', email)
      .single();
    if (allowed) {
      setUser({
        id,
        email: allowed.email,
        isFaculty: allowed.is_faculty,
      });
      setError(null);
    } else {
      setUser(null);
      setError('권한 없음');
    }
  };

  useEffect(() => {
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      const sessionUser = data?.session?.user;
      if (sessionUser?.email && sessionUser?.id) {
        await fetchUserWithRole(sessionUser.email, sessionUser.id);
      } else {
        setUser(null);
      }
      setLoading(false);
    };
    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          return;
        }
        const sessionUser = session?.user;
        if (sessionUser?.email && sessionUser?.id) {
          await fetchUserWithRole(sessionUser.email, sessionUser.id);
        } else {
          setUser(null);
        }
      },
    );
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) {
      setError(error.message);
    }
    return null;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setError(error.message);
    }
    setUser(null);
  };

  return { user, loading, error, signInWithGoogle, signOut };
};

export default useAuth;
