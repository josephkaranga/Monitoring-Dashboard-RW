import React, { useState, useEffect } from 'react';
import { getPendingRequestsCount } from '../services/roleChangeService';
import { useNavigate } from 'react-router-dom';

export default function PendingRequestsBadge() {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [seen, setSeen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadCount();
    const interval = setInterval(loadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (count > 0) setSeen(false);
  }, [count]);

  const loadCount = async () => {
    const result = await getPendingRequestsCount();
    if (result.data !== null) {
      setCount(result.data);
    }
    setLoading(false);
  };

  const handleClick = () => {
    setSeen(true);
    navigate('/dashboard/role-requests');
  };

  if (loading) {
    return (
      <div
        style={{
          padding: '6px 12px',
          background: '#f1f5f9',
          borderRadius: 16,
          fontSize: '0.8rem',
          color: '#94a3b8',
        }}
      >
        <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />
        Loading...
      </div>
    );
  }

  if (count === 0 || seen) {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        color: '#fff',
        border: 'none',
        borderRadius: 20,
        fontSize: '0.85rem',
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
        transition: 'transform 0.2s',
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      title={`${count} pending role change request${count !== 1 ? 's' : ''}`}
    >
      <i className="fa-solid fa-user-clock" />
      <span>{count} Pending</span>
      {count > 5 && (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#fff',
            animation: 'pulse 2s infinite',
          }}
        />
      )}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </button>
  );
}
