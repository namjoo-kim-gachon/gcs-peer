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
    // OAuth 리다이렉트 콜백 처리: URL에 토큰/코드가 포함되어 있으면 getSessionFromUrl로 세션 회수
    if (typeof window !== 'undefined') {
      const href = window.location.href;
      if (
        href.includes('access_token') ||
        href.includes('refresh_token') ||
        href.includes('code=') ||
        href.includes('provider=')
      ) {
        (async () => {
          try {
            console.log(
              'useAuth: detected OAuth redirect, trying getSessionFromUrl',
            );
            const authClient: any = supabase.auth as any;
            if (typeof authClient.getSessionFromUrl === 'function') {
              const { data, error } = await authClient.getSessionFromUrl();
              if (error) {
                console.error('useAuth.getSessionFromUrl error', error);
              } else {
                const sessionUser = data?.session?.user;
                if (sessionUser?.email && sessionUser?.id) {
                  await fetchUserWithRole(sessionUser.email, sessionUser.id);
                }
              }
            } else {
              console.warn(
                'useAuth: getSessionFromUrl not available on supabase.auth',
              );
            }
          } catch (err) {
            console.error('useAuth.getSessionFromUrl failed', err);
          } finally {
            // URL 정리: 해시/쿼리 제거하여 동일한 처리가 반복되지 않도록 함
            try {
              if (typeof window !== 'undefined') {
                const clean =
                  window.location.origin +
                  window.location.pathname +
                  window.location.search.replace(/([#?].*)/, '');
                window.history.replaceState(
                  {},
                  document.title,
                  window.location.pathname,
                );
              }
            } catch (e) {}
          }
        })();
      }
    }

    const getSession = async () => {
      try {
        console.log('useAuth: getSession start');
        // 타임아웃 폴백: supabase.auth.getSession()가 응답하지 않으면 8초 후 폴백
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve({ __timeout: true }), 8000),
        );
        const res: any = await Promise.race([sessionPromise, timeoutPromise]);
        if (res && res.__timeout) {
          console.error('useAuth.getSession timed out');
          setUser(null);
          return;
        }
        const { data, error } = res as { data?: any; error?: any };
        if (error) {
          console.error('useAuth.getSession error', error);
          setUser(null);
          return;
        }
        const sessionUser = data?.session?.user;
        if (sessionUser?.email && sessionUser?.id) {
          await fetchUserWithRole(sessionUser.email, sessionUser.id);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('useAuth.getSession failed', err);
        setUser(null);
      } finally {
        setLoading(false);
        console.log('useAuth: getSession finished, loading=false');
      }
    };
    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          console.log('useAuth:onAuthStateChange', event, session?.user?.email);
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
        } catch (err) {
          console.error('onAuthStateChange handler error', err);
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
      throw new Error(error.message);
    }
    setUser(null);
  };

  return { user, loading, error, signInWithGoogle, signOut };
};

export default useAuth;
