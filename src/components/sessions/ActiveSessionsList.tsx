import React from 'react';
import { useRouter } from 'next/router';
import useActiveSessions from '../../hooks/useActiveSessions';
import Spinner from '../common/Spinner';
import EmptyState from '../common/EmptyState';

interface ActiveSessionsListProps {
  userName: string;
}

const ActiveSessionsList: React.FC<ActiveSessionsListProps> = ({
  userName,
}) => {
  const { sessions, isLoading, error } = useActiveSessions(userName);
  const router = useRouter();

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <Spinner />
        <div style={{ marginTop: '10px', color: '#666' }}>
          진행 중인 세션을 조회하고 있습니다...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '20px',
          color: '#d32f2f',
          backgroundColor: '#ffebee',
          borderRadius: '8px',
          border: '1px solid #ffcdd2',
        }}
      >
        세션 조회 중 오류가 발생했습니다: {error.message}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <EmptyState message="현재 참여할 수 있는 피어 평가가 없습니다. 교수님이 새로운 평가를 시작하면 여기에 표시됩니다." />
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '600px' }}>
      <h3
        style={{
          marginBottom: '20px',
          color: '#1976d2',
          textAlign: 'center',
          fontSize: '20px',
          fontWeight: 600,
        }}
      >
        참여 가능한 평가 ({sessions.length}개)
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sessions.map((session) => (
          <div
            key={session.session_id}
            style={{
              border: '1px solid #e0e0e0',
              borderRadius: '12px',
              padding: '16px',
              backgroundColor: '#fff',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            }}
            onClick={() => router.push(`/vote/${session.session_id}`)}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              e.currentTarget.style.borderColor = '#1976d2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
              e.currentTarget.style.borderColor = '#e0e0e0';
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '8px',
              }}
            >
              <h4
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#333',
                }}
              >
                {session.session_name}
              </h4>
              <span
                style={{
                  backgroundColor: '#4caf50',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                진행중
              </span>
            </div>

            {session.session_description && (
              <p
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  color: '#666',
                  lineHeight: '1.4',
                }}
              >
                {session.session_description}
              </p>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '13px',
                color: '#888',
              }}
            >
              <span>팀: {session.team_name}</span>
              <span>
                {new Date(session.session_created_at).toLocaleDateString(
                  'ko-KR',
                )}{' '}
                생성
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActiveSessionsList;
