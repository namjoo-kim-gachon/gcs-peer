import React from 'react';

const spinnerStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: '50%',
  border: '4px solid rgba(0,0,0,0.08)',
  borderTopColor: '#1976d2',
  animation: 'spin 1s linear infinite',
};

const container: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const Spinner: React.FC = () => (
  <div style={container} aria-hidden="false" aria-label="로딩 중">
    <div style={spinnerStyle} />
    <style jsx>{`
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
    `}</style>
  </div>
);

export default Spinner;
