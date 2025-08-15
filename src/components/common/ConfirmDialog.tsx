import React from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: 'linear-gradient(180deg,#fff 80%,#f7f7f7 100%)',
          padding: '38px 32px 32px 32px',
          borderRadius: 18,
          minWidth: 340,
          maxWidth: 380,
          boxShadow: '0 8px 32px rgba(25,118,210,0.13)',
          border: '1.5px solid #e3eafc',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#1976d2',
            marginBottom: 18,
            letterSpacing: 1,
          }}
        >
          {title}
        </h2>
        {description && (
          <p
            style={{
              fontSize: 16,
              color: '#333',
              marginBottom: 18,
              lineHeight: 1.6,
            }}
          >
            {description}
          </p>
        )}
        <div
          style={{
            marginTop: 18,
            display: 'flex',
            gap: 16,
            justifyContent: 'center',
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: '10px 28px',
              fontSize: 16,
              fontWeight: 600,
              background: '#e3eafc',
              color: '#1976d2',
              border: 'none',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(25,118,210,0.08)',
              letterSpacing: 1,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 28px',
              fontSize: 16,
              fontWeight: 600,
              background: 'linear-gradient(90deg,#d32f2f 60%,#c62828 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(211,47,47,0.10)',
              letterSpacing: 1,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
