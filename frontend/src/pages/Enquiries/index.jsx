import React, { useEffect, useState } from 'react';
import api from '../../api/axios';

const Enquiries = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // Automatically test a protected endpoint when the page loads
  useEffect(() => {
    const testAuth = async () => {
      try {
        const response = await api.get('/customers');
        setData(response.data);
      } catch (err) {
        setError(err.message);
      }
    };
    testAuth();
  }, []);

  return (
    <div>
      <h1>Customer Enquiries</h1>
      <p>Placeholder for the Enquiries list and creation form.</p>
      
      <div style={{ marginTop: '20px', padding: '15px', background: '#e9ecef', borderRadius: '5px' }}>
        <h3>Protected Endpoint Test (/api/customers)</h3>
        {error ? (
          <p style={{ color: 'red' }}>Error: {error}</p>
        ) : data ? (
          <p style={{ color: 'green' }}>Success! Retrieved {data.customers?.length || 0} customers using Authorization Bearer token.</p>
        ) : (
          <p>Loading protected data...</p>
        )}
      </div>
    </div>
  );
};

export default Enquiries;
