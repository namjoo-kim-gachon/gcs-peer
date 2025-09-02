import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { User } from '../types';

const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // cleanup을 위한 refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  const isMountedRef = useRef(true);
  // 초기화 전에 도착한 세션 이벤트 보관
  const pendingSessionRef = useRef<any | null>(null);

  // 에러 상태 초기화 헬퍼
  const clearError = useCallback(() => {
    if (isMountedRef.current) {
      setError(null);
    }
  }, []);

  // 사용자 역할 조회 (debounced)
  const fetchUserWithRole = useCallback(
    async (email: string, id: string, signal?: AbortSignal) => {
      try {
        clearError();
        const { data: allowed, error } = await supabase
          .from('allowed_users')
          .select('email, is_faculty')
          .eq('email', email)
          .single();

        if (signal?.aborted) return;

        if (allowed && isMountedRef.current) {
          setUser({
            id,
            email: allowed.email,
            isFaculty: allowed.is_faculty,
          });
        } else if (isMountedRef.current) {
          setUser(null);
          setError('권한 없음');
        }
      } catch (err) {
        if (!signal?.aborted && isMountedRef.current) {
          console.error('fetchUserWithRole error', err);
          setUser(null);
          setError('사용자 정보 조회 실패');
        }
      }
    },
    [clearError],
  );

  // timeout과 함께 session 조회
  const getSessionWithTimeout = useCallback(async (signal: AbortSignal) => {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new Error('Aborted'));
        return;
      }

      const sessionPromise = supabase.auth.getSession();

      timeoutRef.current = setTimeout(() => {
        if (!signal.aborted) {
          resolve({ __timeout: true });
        }
      }, 5000);

      sessionPromise
        .then((result) => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          if (!signal.aborted) {
            resolve(result);
          }
        })
        .catch((err) => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          if (!signal.aborted) {
            reject(err);
          }
        });
    });
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    const initializeAuth = async () => {
      // 이전 작업들 정리
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
        console.log('useAuth: initializing auth');
        clearError();

        const res: any = await getSessionWithTimeout(signal);

        if (signal.aborted) return;

        if (res && res.__timeout) {
          console.error('useAuth.getSession timed out');
          if (isMountedRef.current) {
            setUser(null);
          }
          return;
        }

        const { data, error } = res as { data?: any; error?: any };
        if (error) {
          console.error('useAuth.getSession error', error);
          if (isMountedRef.current) {
            setUser(null);
            setError('세션 조회 실패');
          }
          return;
        }

        const sessionUser = data?.session?.user;
        if (sessionUser?.email && sessionUser?.id) {
          await fetchUserWithRole(sessionUser.email, sessionUser.id, signal);
        } else if (isMountedRef.current) {
          setUser(null);
        }
      } catch (err) {
        if (!signal.aborted && isMountedRef.current) {
          console.error('useAuth.initializeAuth failed', err);
          setUser(null);
          setError('인증 초기화 실패');
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          isInitializedRef.current = true;
          console.log('useAuth: initialization finished, loading=false');
          // 초기화 이전에 도착한 세션 이벤트가 있었다면 처리
          if (pendingSessionRef.current) {
            const pending = pendingSessionRef.current;
            pendingSessionRef.current = null;
            const pendingUser = pending?.user;
            if (pendingUser?.email && pendingUser?.id) {
              console.log('useAuth: applying pending session user');
              const postInitController = new AbortController();
              fetchUserWithRole(
                pendingUser.email,
                pendingUser.id,
                postInitController.signal,
              );
            }
          }
        }
      }
    };

    initializeAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          console.log('useAuth:onAuthStateChange', event, session?.user?.email);

          if (!isMountedRef.current) return;
          // 초기화가 끝나기 전에 들어온 이벤트는 보관 (중복 fetchUserWithRole 방지)
          if (!isInitializedRef.current) {
            pendingSessionRef.current = session;
            console.log('useAuth: queued session event until init complete');
            return;
          }

          clearError();

          if (event === 'SIGNED_OUT') {
            setUser(null);
            return;
          }

          const sessionUser = session?.user;
          if (sessionUser?.email && sessionUser?.id) {
            // 새로운 AbortController 생성 (이전 요청과 독립적)
            const authChangeController = new AbortController();
            await fetchUserWithRole(
              sessionUser.email,
              sessionUser.id,
              authChangeController.signal,
            );
          } else {
            setUser(null);
          }
        } catch (err) {
          if (isMountedRef.current) {
            console.error('onAuthStateChange handler error', err);
            setError('인증 상태 변경 처리 실패');
          }
        }
      },
    );

    return () => {
      isMountedRef.current = false;

      // 모든 진행 중인 작업 정리
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      listener?.subscription.unsubscribe();
    };
  }, [fetchUserWithRole, getSessionWithTimeout, clearError]);

  const signInWithGoogle = async (returnUrl?: string) => {
    try {
      clearError();
      const baseUrl =
        typeof window !== 'undefined' ? window.location.origin : '';
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
        if (isMountedRef.current) {
          setError(error.message);
        }
      }
    } catch (err) {
      console.error('useAuth: signInWithGoogle failed', err);
      if (isMountedRef.current) {
        setError('로그인 실패');
      }
    }
    return null;
  };

  const signOut = async () => {
    try {
      clearError();

      // 진행 중인 모든 요청 취소
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // 먼저 로컬 상태를 정리합니다.
      if (isMountedRef.current) {
        setUser(null);
      }

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
          if (isMountedRef.current) {
            setError(error.message);
          }
        }
      }
    } catch (err) {
      console.error('useAuth: signOut failed', err);
      if (isMountedRef.current) {
        setError('로그아웃 실패');
      }
    }
  };

  return { user, loading, error, signInWithGoogle, signOut };
};

export default useAuth;
