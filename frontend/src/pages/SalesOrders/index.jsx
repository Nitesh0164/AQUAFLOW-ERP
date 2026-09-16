import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { formatDate } from '../../utils/date';
import { formatINR } from '../../utils/currency';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import SalesOrderDetail from './SalesOrderDetail';
import './SalesOrders.css';

const SalesOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [detailId, setDetailId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/sales-orders');
      setOrders(response.data.salesOrders || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch sales orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleActionSuccess = (msg) => {
    setDetailId(null); // close detail modal
    setSuccessMsg(msg);
    fetchOrders(); // re-fetch list
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Sales Orders</h1>
        {/* We do NOT have a Create button here. Orders are created via Quotation conversion! */}
      </div>

      {successMsg && <div style={{ color: 'green', marginBottom: '15px', fontWeight: 'bold' }}>{successMsg}</div>}
      {error && <div className="error global-error">{error}</div>}

      {loading ? (
        <div>Loading sales orders...</div>
      ) : orders.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '8px' }}>
          No Sales Orders found.
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Order Number</th>
              <th>Customer</th>
              <th>Quotation Ref</th>
              <th>Order Date</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((so) => (
              <tr key={so.id}>
                <td style={{fontWeight: 'bold'}}>{so.orderNumber}</td>
                <td>{so.customer?.companyName}</td>
                <td>{so.quotation?.quotationNumber || 'N/A'}</td>
                <td>{formatDate(so.orderDate)}</td>
                <td style={{fontWeight: 'bold'}}>{formatINR(so.totalAmount)}</td>
                <td><StatusBadge status={so.status} /></td>
                <td>
                  <button className="action-btn" onClick={() => setDetailId(so.id)}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Detail Modal */}
      <Modal isOpen={!!detailId} onClose={() => setDetailId(null)} title="Sales Order Details">
        {detailId && <SalesOrderDetail orderId={detailId} onActionSuccess={handleActionSuccess} />}
      </Modal>
    </div>
  );
};

export default SalesOrders;
