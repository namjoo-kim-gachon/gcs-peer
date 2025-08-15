import React from 'react';
import PageHeader from '../components/common/PageHeader';

const Forbidden: React.FC = () => {
  return (
    <div
      style={{
        maxWidth: 480,
        margin: '80px auto',
        padding: 32,
        textAlign: 'center',
        border: '1px solid #eee',
        borderRadius: 8,
      }}
    >
      <PageHeader title="권한 없음" />
      <p style={{ fontSize: 18, margin: '32px 0' }}>
        이 페이지에 접근할 권한이 없습니다.
        <br />
        관리자(교수)만 접근 가능합니다.
      </p>
      <a href="/" style={{ color: '#1976d2', textDecoration: 'underline' }}>
        홈으로 돌아가기
      </a>
    </div>
  );
};

export default Forbidden;
