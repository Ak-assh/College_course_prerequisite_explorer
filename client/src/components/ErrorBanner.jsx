import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorBanner({ message, onRetry }) {
  if (!message) return null;

  return (
    <div style={{
      background: 'rgba(239, 68, 68, 0.15)',
      border: '1px solid rgba(239, 68, 68, 0.35)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 16px',
      margin: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      color: '#fca5a5',
      fontSize: '13px',
      zIndex: 50
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <AlertTriangle size={18} color="#ef4444" />
        <div>
          <strong style={{ color: '#ffffff' }}>Notice: </strong>
          {message}
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(239, 68, 68, 0.25)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#ffffff',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={12} />
          Retry
        </button>
      )}
    </div>
  );
}
