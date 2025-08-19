import React, { useState } from 'react';
import { useRouter } from 'next/router';
import useAuth from '../../hooks/useAuth';
import Button from './Button';
import styles from './Button.module.css';

type Props = {
  withConfirm?: boolean;
  confirmMessage?: string;
  className?: string;
};

const LogoutButton: React.FC<Props> = ({
  withConfirm = false,
  confirmMessage = '로그아웃하시겠습니까?',
  className,
}) => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { signOut } = useAuth();

  const doLogout = async () => {
    setLoading(true);
    console.log('doLogout start');
    // 타임아웃: 8초 후에 강제 종료하여 스피너가 고착되지 않도록 함
    const timer = setTimeout(() => {
      console.error('logout timeout');
      setLoading(false);
      alert('로그아웃 요청이 지연되고 있습니다. 다시 시도해 주세요.');
    }, 8000);
    try {
      await signOut();
    } catch (err: any) {
      console.error('logout failed', err);
      alert('로그아웃에 실패했습니다: ' + (err?.message || String(err)));
    } finally {
      clearTimeout(timer);
    }
    try {
      if (typeof window !== 'undefined')
        sessionStorage.removeItem('loginReturnTo');
    } catch (err) {
      console.error('sessionStorage cleanup failed', err);
    }
    setLoading(false);
    router.replace('/');
  };

  // 전달된 className이 문자열 'inline'인 경우 CSS 모듈 클래스으로 매핑
  const appliedClassName = className === 'inline' ? styles.inline : className;
  const inlineStyle =
    className === 'inline'
      ? { width: 'auto', maxWidth: 'none', padding: '8px 12px' }
      : undefined;

  return (
    <Button
      onClick={async () => {
        if (withConfirm) {
          if (!confirm(confirmMessage)) return;
        }
        await doLogout();
      }}
      loading={loading}
      aria-label="로그아웃"
      className={appliedClassName}
      style={inlineStyle}
    >
      로그아웃
    </Button>
  );
};

export default LogoutButton;
