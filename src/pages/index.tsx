import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import LoginButton from '../components/common/LoginButton';
import useAuth from '../hooks/useAuth';
import Spinner from '../components/common/Spinner';
import styles from '../components/common/Button.module.css';
import LogoutButton from '../components/common/LogoutButton';

const Home: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // 로그인 후 리다이렉트 처리
  useEffect(() => {
    if (user) {
      console.log('Home: user logged in, checking redirect...', {
        isFaculty: user.isFaculty,
      });

      if (user.isFaculty) {
        // 교직원이면 /sessions로 리다이렉트
        console.log('Home: faculty user, redirecting to /sessions');
        router.push('/sessions');
      } else {
        // 학생이면 /vote로 리다이렉트
        console.log('Home: student user, redirecting to /vote');
        router.push('/vote');
      }
    }
  }, [user, router]);
  const page = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px',
    background: '#fff',
  };
  const title = {
    fontSize: 28,
    fontWeight: 800,
    color: '#1976d2',
    marginBottom: 20,
    textAlign: 'center' as const,
  };
  const box = {
    width: '100%',
    maxWidth: 480,
    display: 'flex',
    justifyContent: 'center',
  };

  return (
    <div style={page}>
      <div style={title}>GCS 피어 평가</div>
      <div
        style={{
          fontSize: 18,
          color: '#555',
          marginBottom: 24,
          textAlign: 'center',
          fontWeight: 500,
          opacity: 0.85,
        }}
      >
        등록된 GCS 학생과 교직원만 로그인 할 수 있습니다
      </div>

      <div style={box}>{user ? <LogoutButton /> : <LoginButton />}</div>

      <div
        style={{
          width: '100%',
          textAlign: 'center',
          marginTop: 32,
          color: '#aaa',
          fontSize: 13,
          padding: '16px 0 4px 0',
        }}
      >
        <div
          style={{
            width: '100%',
            textAlign: 'center',
            marginTop: 40,
            color: '#555',
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: 1,
            opacity: 0.7,
            borderTop: '1px solid #eee',
            padding: '18px 0 8px 0',
            background: 'linear-gradient(180deg, #fff 80%, #f7f7f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#1976d2',
              opacity: 0.8,
            }}
          >
            ⓒ
          </span>
          <span style={{ fontSize: 15, fontWeight: 500 }}>
            Gachon Cocone School 2025
          </span>
        </div>
      </div>
    </div>
  );
};

export default Home;
