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
  <ul
    style={{
      listStyle: 'none',
      padding: 0,
      margin: 0,
      width: '100%',
      display: 'block',
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
);

export default SessionList;
