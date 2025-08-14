import React from 'react';

interface EmptyStateProps {
  message: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ message }) => (
  <div style={{ textAlign: 'center', color: '#888', margin: '40px 0' }}>
    {message}
  </div>
);

export default EmptyState;
