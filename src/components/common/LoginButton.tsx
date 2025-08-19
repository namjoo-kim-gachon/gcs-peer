import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import useAuth from '../../hooks/useAuth';
import Spinner from './Spinner';
import styles from './Button.module.css';

// 공통 스타일을 컴포넌트 바깥으로 이동하여 재생성 방지
const container = {
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
} as const;

const inlineSpan = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
} as const;

const LoginButton: React.FC = () => {
  const { user, loading, error, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading)
    return (
      <div style={container}>
        <Spinner />
      </div>
    );
  if (error)
    return <div style={{ color: 'red', textAlign: 'center' }}>{error}</div>;

  if (!user) {
    return (
      <div style={container}>
        <button
          onClick={async () => {
            setIsSubmitting(true);
            try {
              // returnTo 파라미터가 있으면 전달
              const returnPath = router.query.returnTo as string;
              await signInWithGoogle(returnPath);
            } catch (err) {
              console.error('signInWithGoogle failed', err);
            } finally {
              setIsSubmitting(false);
            }
          }}
          className={`${styles.button} ${isSubmitting ? styles.disabled : ''}`}
          aria-label="구글로 로그인"
          disabled={isSubmitting || loading}
        >
          <span style={inlineSpan}>
            {/* Google G 로고 (간단한 SVG) */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 48 48"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
            >
              <title>Google</title>
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
            <span>가천대 계정으로 로그인</span>
          </span>
        </button>
      </div>
    );
  }

  // 로그인된 상태라면 홈페이지에서 리다이렉트 처리를 담당하므로 스피너만 표시
  return (
    <div style={container}>
      <Spinner />
    </div>
  );
};

export default LoginButton;
