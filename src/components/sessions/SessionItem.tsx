import React from 'react';
import { useRouter } from 'next/router';
import { FaPlay, FaPencilAlt, FaTrash } from 'react-icons/fa';

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
  const router = useRouter();

  const buttonStyle: React.CSSProperties = {
    padding: '8px',
    fontSize: 14,
    background: 'transparent',
    color: '#6c757d',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    transition: 'background 0.2s',
  };

  const hoverEffect = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLButtonElement).style.background = '#f0f0f0';
  };
  const leaveEffect = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
  };

  return (
    <li
      style={{
        borderBottom: '1px solid #eee',
        transition: 'background 0.2s',
        cursor: 'pointer',
      }}
      onClick={() => router.push(`/sessions/${session.id}/status`)}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#f7faff')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '16px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            minWidth: 0,
            flex: '1 1 auto',
            marginRight: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 16, color: '#333' }}>
              {session.name}
            </div>
            {session.created_at && (
              <div
                style={{ color: '#bbb', fontSize: 12, whiteSpace: 'nowrap' }}
              >
                {new Date(session.created_at).toLocaleString()}
              </div>
            )}
          </div>
          {session.description && (
            <div
              style={{
                color: '#666',
                fontSize: 14,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
              }}
            >
              {session.description}
            </div>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 4,
            alignItems: 'center',
          }}
        >
          <button
            style={{ ...buttonStyle, color: '#1976d2' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                '#e3f2fd';
            }}
            onMouseLeave={leaveEffect}
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/sessions/${session.id}/status`);
            }}
          >
            <FaPlay />
          </button>
          {onEdit && (
            <button
              style={buttonStyle}
              onMouseEnter={hoverEffect}
              onMouseLeave={leaveEffect}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(session);
              }}
            >
              <FaPencilAlt />
            </button>
          )}
          {onDelete && (
            <button
              style={{ ...buttonStyle, color: '#d32f2f' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  '#ffebee';
              }}
              onMouseLeave={leaveEffect}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(session);
              }}
            >
              <FaTrash />
            </button>
          )}
        </div>
      </div>
    </li>
  );
};

export default SessionItem;
