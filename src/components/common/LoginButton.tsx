import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import useAuth from '../../hooks/useAuth';

const LoginButton: React.FC = () => {
  const { user, loading, error, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.isFaculty) {
      router.push('/sessions');
    }
  }, [user, router]);

  const container = {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
  } as const;

  const btn = {
    width: '100%',
    maxWidth: 360,
    padding: '12px 18px',
    fontSize: 16,
    background: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    boxShadow: '0 4px 18px rgba(25,118,210,0.12)',
  } as const;

  if (loading) return <div style={container}>로딩 중...</div>;
  if (error)
    return <div style={{ color: 'red', textAlign: 'center' }}>{error}</div>;

  if (!user) {
    return (
      <div style={container}>
        <button
          onClick={signInWithGoogle}
          style={btn}
          aria-label="구글로 로그인"
        >
          <span
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}
          >
            {/* Google G 로고 (간단한 SVG) */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 48 48"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.9 0 7 1.4 9.1 2.9l6.7-6.7C36.6 3.2 30.6 1 24 1 14.8 1 6.9 6.2 3 13.8l7.8 6.1C12.8 14.2 17.8 9.5 24 9.5z"
              />
              <path
                fill="#34A853"
                d="M46.5 24.5c0-1.6-.1-2.7-.4-3.9H24v7.4h12.6c-.6 3.2-2.8 6-6 7.7l7.7 6c4.5-4.2 7.2-10.3 7.2-17.2z"
              />
              <path
                fill="#4A90E2"
                d="M10.8 28.8A14.8 14.8 0 0 1 10 24c0-1.4.2-2.6.5-3.8L3 13.8A23.9 23.9 0 0 0 1 24c0 3.8.9 7.4 2.5 10.6l7.3-5.8z"
              />
              <path
                fill="#FBBC05"
                d="M24 46.9c6.6 0 12.6-2.2 17.2-6l-7.7-6c-2.2 1.5-5 2.5-9.5 2.5-6.2 0-11.2-4.7-12.7-11.1L3 34.2C6.9 41.8 14.8 46.9 24 46.9z"
              />
            </svg>
            <span>구글로 로그인</span>
          </span>
        </button>
      </div>
    );
  }

  return <div style={container} />;
};

export default LoginButton;
