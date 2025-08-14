import React from 'react';
import { useRouter } from 'next/router';
import PageHeader from '../../components/common/PageHeader';
import Spinner from '../../components/common/Spinner';

const SessionDetailPage: React.FC = () => {
  const router = useRouter();
  const { sessionId } = router.query;

  // 추후 상세 구현 예정 (스켈레톤)
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      <PageHeader title="세션 상세" />
      <Spinner />
      <div style={{ color: '#888', marginTop: 24 }}>
        상세 페이지는 추후 확장 예정입니다.
      </div>
    </div>
  );
};

export default SessionDetailPage;
