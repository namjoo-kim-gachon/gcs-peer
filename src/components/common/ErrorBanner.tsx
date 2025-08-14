import React from 'react';

interface ErrorBannerProps {
  error: string;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({ error }) => (
  <div
    style={{
      background: '#ffe5e5',
      color: '#d32f2f',
      padding: '12px',
      borderRadius: 4,
      marginBottom: 16,
    }}
  >
    {error}
  </div>
);

export default ErrorBanner;
