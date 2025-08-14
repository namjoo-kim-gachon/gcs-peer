import React from 'react';

export interface SessionItemProps {
  session: {
    id: number | string;
    name: string;
    description?: string;
    created_at?: string;
  };
  onClick?: () => void;
  onEdit?: (session: any) => void;
  onDelete?: (session: any) => void;
}

const SessionItem: React.FC<SessionItemProps> = ({
  session,
  onClick,
  onEdit,
  onDelete,
}) => {
  return (
    <li>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          // space-between은 가용 공간 분배로 초행 아이템에서 깨질 수 있어 제거
          justifyContent: 'flex-start',
          width: '100%',
          padding: '8px',
          borderBottom: '1px solid #eee',
        }}
        onClick={onClick}
      >
        <div
          style={{
            minWidth: 0,
            flex: '1 1 auto',
          }}
        >
          <div style={{ fontWeight: 500 }}>{session.name}</div>
          {session.description && (
            <div
              style={{
                color: '#888',
                fontSize: 14,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
              }}
            >
              {session.description}
            </div>
          )}
          {session.created_at && (
            <div style={{ color: '#bbb', fontSize: 12 }}>
              {new Date(session.created_at).toLocaleString()}
            </div>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginLeft: 'auto',
          }}
        >
          {onEdit && (
            <button
              style={{ marginRight: 8 }}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(session);
              }}
            >
              수정
            </button>
          )}
          {onDelete && (
            <button
              style={{ color: 'red' }}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(session);
              }}
            >
              삭제
            </button>
          )}
        </div>
      </div>
    </li>
  );
};

export default SessionItem;
