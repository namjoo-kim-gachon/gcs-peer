import { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { User } from '../types';

const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 초기화 플래그는 훅 최상단에 선언되어야 합니다 (hooks 규칙 준수)
  const initRef = useRef(false);

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
      try {
        // onAuthStateChange가 이미 실행되어 초기화가 완료된 경우 불필요한 getSession 호출을 피함
        if (initRef.current) {
          console.log(
            'useAuth: init already handled by onAuthStateChange, skipping getSession',
          );
          setLoading(false);
          return;
        }
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
          initRef.current = true;
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

  const signInWithGoogle = async (returnUrl?: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const redirectTo = returnUrl
      ? `${baseUrl}/?returnTo=${encodeURIComponent(returnUrl)}`
      : baseUrl;

    console.log('useAuth: signInWithGoogle called', {
      returnUrl,
      baseUrl,
      redirectTo,
    });

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      console.error('useAuth: signInWithGoogle error', error);
      setError(error.message);
    }
    return null;
  };

  const signOut = async () => {
    // 먼저 로컬 상태를 정리합니다.
    setUser(null);

    // 로컬 스토리지에서 Supabase 관련 키를 모두 제거합니다.
    if (typeof window !== 'undefined') {
      try {
        Object.keys(window.localStorage).forEach((key) => {
          if (key.startsWith('sb-') && key.includes('-auth-token')) {
            window.localStorage.removeItem(key);
            console.log(`useAuth: removed stale auth token ${key}`);
          }
        });
      } catch (e) {
        console.error('useAuth: failed to clear local storage', e);
      }
    }

    // 서버에 로그아웃을 요청합니다.
    const { error } = await supabase.auth.signOut();

    // 에러가 발생하더라도, '세션 없음' 관련 에러는 경고로 처리하고 무시합니다.
    if (error) {
      const isSessionMissingError =
        (error.message &&
          error.message.toLowerCase().includes('auth session missing')) ||
        (error.status && (error.status === 401 || error.status === 403));

      if (isSessionMissingError) {
        console.warn(
          `Supabase signOut warning: ${error.message}. This is expected if the session was already invalid.`,
        );
      } else {
        // 그 외의 예기치 않은 에러는 콘솔에 에러로 표시합니다.
        console.error('An unexpected error occurred during signOut:', error);
        setError(error.message);
      }
    }
  };

  return { user, loading, error, signInWithGoogle, signOut };
};

export default useAuth;
