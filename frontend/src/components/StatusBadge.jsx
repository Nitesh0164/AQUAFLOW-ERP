import React from 'react';

const StatusBadge = ({ status }) => {
  let color = '#6c757d'; // default gray
  let bgColor = '#e9ecef';

  switch (status) {
    case 'NEW':
      color = '#004085';
      bgColor = '#cce5ff';
      break;
    case 'QUOTED':
      color = '#856404';
      bgColor = '#fff3cd';
      break;
    case 'ACCEPTED':
    case 'WON':
      color = '#155724';
      bgColor = '#d4edda';
      break;
    case 'LOST':
    case 'REJECTED':
    case 'CANCELLED':
      color = '#721c24';
      bgColor = '#f8d7da';
      break;
    case 'PENDING':
      color = '#856404';
      bgColor = '#fff3cd';
      break;
    case 'CONFIRMED':
      color = '#0c5460';
      bgColor = '#d1ecf1';
      break;
    case 'DISPATCHED':
      color = '#155724';
      bgColor = '#d4edda';
      break;
    default:
      break;
  }

  return (
    <span style={{
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 'bold',
      backgroundColor: bgColor,
      color: color,
      display: 'inline-block'
    }}>
      {status}
    </span>
  );
};

export default StatusBadge;
