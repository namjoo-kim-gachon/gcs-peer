import React from 'react';
import useAuth from '../../hooks/useAuth';

const LoginButton: React.FC = () => {
  const { user, loading, error, signInWithGoogle, signOut } = useAuth();

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  if (!user) {
    return (
      <button
        onClick={signInWithGoogle}
        style={{ padding: '8px 24px', fontSize: 16 }}
      >
        구글로 로그인
      </button>
    );
  }
  return (
    <div>
      <span style={{ marginRight: 12 }}>
        {user.email} ({user.isFaculty ? '교수' : '학생'})
      </span>
      <button onClick={signOut}>로그아웃</button>
    </div>
  );
};

export default LoginButton;
