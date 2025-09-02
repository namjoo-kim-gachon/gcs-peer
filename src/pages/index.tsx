import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import LoginButton from '../components/common/LoginButton';
import useAuth from '../hooks/useAuth';
import Spinner from '../components/common/Spinner';
import styles from '../components/common/Button.module.css';
import LogoutButton from '../components/common/LogoutButton';
import ErrorBanner from '../components/common/ErrorBanner';

const Home: React.FC = () => {
  const { user, loading, error } = useAuth();
  const router = useRouter();

  // 로그인 후 리다이렉트 처리 (로딩이 끝난 후에만 실행)
  useEffect(() => {
    if (loading) {
      // 아직 초기화 중이면 리다이렉트하지 않음
      return;
    }

    if (!user) return;

    console.log('Home: user logged in, checking redirect...', {
      isFaculty: user.isFaculty,
      returnTo: router.query.returnTo,
    });

    // 쿼리로 전달된 returnTo가 있으면 우선 사용
    const returnTo =
      typeof router.query.returnTo === 'string'
        ? router.query.returnTo
        : undefined;
    const target = returnTo ?? (user.isFaculty ? '/sessions' : '/vote');

    // 현재 경로와 다를 때만 교체(replace)하여 히스토리를 더 깔끔하게 유지
    if (router.asPath !== target) {
      console.log(`Home: redirecting to ${target} (replace)`);
      router.replace(target);
    }
  }, [user, loading, router]);
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
      <div style={title}>GCS 피어 리뷰</div>
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
