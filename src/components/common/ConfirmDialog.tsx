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
        background: 'rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: '#fff',
          padding: 24,
          borderRadius: 8,
          minWidth: 320,
        }}
      >
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        <div
          style={{
            marginTop: 24,
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end',
          }}
        >
          <button onClick={onCancel}>취소</button>
          <button
            onClick={onConfirm}
            style={{ background: '#d32f2f', color: '#fff' }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
