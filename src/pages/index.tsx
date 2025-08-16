import React from 'react';
import LoginButton from '../components/common/LoginButton';

const Home: React.FC = () => {
  const page = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px',
    background: '#fff',
  };
  const title = {
    fontSize: 28,
    fontWeight: 800,
    color: '#1976d2',
    marginBottom: 20,
    textAlign: 'center' as const,
  };
  const box = {
    width: '100%',
    maxWidth: 480,
    display: 'flex',
    justifyContent: 'center',
  };

  return (
    <div style={page}>
      <div style={title}>GCS Peer</div>
      <div style={box}>
        <LoginButton />
      </div>

      <div
        style={{
          width: '100%',
          textAlign: 'center',
          marginTop: 32,
          color: '#aaa',
          fontSize: 13,
          padding: '16px 0 4px 0',
        }}
      >
        <div
          style={{
            width: '100%',
            textAlign: 'center',
            marginTop: 40,
            color: '#555',
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: 1,
            opacity: 0.7,
            borderTop: '1px solid #eee',
            padding: '18px 0 8px 0',
            background: 'linear-gradient(180deg, #fff 80%, #f7f7f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#1976d2',
              opacity: 0.8,
            }}
          >
            ⓒ
          </span>
          <span style={{ fontSize: 15, fontWeight: 500 }}>
            Gachon Cocone School 2025
          </span>
        </div>
      </div>
    </div>
  );
};

export default Home;
