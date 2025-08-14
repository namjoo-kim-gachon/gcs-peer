import React from 'react';

const Spinner: React.FC = () => (
  <div style={{ textAlign: 'center', margin: '40px 0' }}>
    <div
      className="spinner"
      style={{
        width: 32,
        height: 32,
        border: '4px solid #eee',
        borderTop: '4px solid #888',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    />
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

export default Spinner;
