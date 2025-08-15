import React from 'react';
import { Session } from '../../types';
import SessionItem from './SessionItem';

interface SessionListProps {
  sessions: Session[];
  onSelect: (id: string) => void;
  onEdit?: (session: Session) => void;
  onDelete?: (session: Session) => void;
}

const SessionList: React.FC<SessionListProps> = ({
  sessions,
  onSelect,
  onEdit,
  onDelete,
}) => (
  <div style={{ padding: '8px 16px' }}>
    <ul
      style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        width: '100%',
        display: 'block',
        border: '1px solid #e3eafc',
        borderRadius: 16,
        background: '#fff',
        boxShadow: '0 4px 24px rgba(25, 118, 210, 0.08)',
        overflow: 'hidden',
      }}
    >
      {sessions.map((session) => (
        <SessionItem
          key={session.id}
          session={session}
          onClick={() => onSelect(String(session.id))}
          onEdit={onEdit ? () => onEdit(session) : undefined}
          onDelete={onDelete ? () => onDelete(session) : undefined}
        />
      ))}
    </ul>
  </div>
);

export default SessionList;
