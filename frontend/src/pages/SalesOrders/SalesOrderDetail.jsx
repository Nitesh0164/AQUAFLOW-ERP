import React, { useEffect, useState, useContext } from 'react';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';
import { formatDate } from '../../utils/date';
import { formatINR } from '../../utils/currency';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import DispatchModal from './DispatchModal';

const SalesOrderDetail = ({ orderId, onActionSuccess }) => {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Action Modals
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/sales-orders/${orderId}`);
      setData(response.data.salesOrder);
      setError(null);
    } catch (err) {
      setError('Failed to load Sales Order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [orderId]);

  const handleConfirmOrder = async () => {
    try {
      await api.post(`/sales-orders/${orderId}/confirm`);
      setConfirmConfig({ isOpen: false });
      onActionSuccess('Order confirmed and inventory reserved successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Inventory confirmation failed.');
      setConfirmConfig({ isOpen: false });
    }
  };

  const handleDispatchSuccess = (msg) => {
    setIsDispatchOpen(false);
    onActionSuccess(msg);
  };

  if (loading) return <div>Loading...</div>;
  if (!data) return null;

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div>
      {error && <div className="error global-error">{error}</div>}
      
      <div className="detail-grid">
        <div className="detail-item">
          <label>Sales Order Number</label>
          <div>{data.orderNumber}</div>
        </div>
        <div className="detail-item">
          <label>Status</label>
          <div><StatusBadge status={data.status} /></div>
        </div>
        <div className="detail-item">
          <label>Quotation Reference</label>
          <div>{data.quotation?.quotationNumber || 'N/A'}</div>
        </div>
        <div className="detail-item">
          <label>Order Date</label>
          <div>{formatDate(data.orderDate)}</div>
        </div>
        <div className="detail-item">
          <label>Customer</label>
          <div>{data.customer?.companyName}</div>
        </div>
        <div className="detail-item">
          <label>Total Amount</label>
          <div>{formatINR(data.totalAmount)}</div>
        </div>
      </div>

      <h3>Inventory Allocation</h3>
      <table className="data-table inventory-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Ordered Qty</th>
            <th>Unit</th>
            <th>Physical Qty</th>
            <th>Reserved Qty</th>
            <th>Available Qty</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map(item => {
            const reqQty = item.quantity;
            const physQty = item.product?.physicalQuantity || 0;
            const resQty = item.product?.reservedQuantity || 0;
            const availQty = physQty - resQty;
            
            // Only flag as insufficient if it's currently PENDING and we don't have enough.
            // If it's already CONFIRMED, the stock is already reserved for this order!
            const isInsufficient = data.status === 'PENDING' && availQty < reqQty;

            return (
              <tr key={item.id}>
                <td>{item.product?.productName}</td>
                <td className="qty-required">{reqQty}</td>
                <td>{item.product?.unit}</td>
                <td>{physQty}</td>
                <td>{resQty}</td>
                <td className={`qty-available ${isInsufficient ? 'qty-insufficient' : 'qty-sufficient'}`}>
                  {availQty}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {isAdmin && data.status === 'PENDING' && (
        <div className="detail-actions">
          <button 
            className="btn-convert" 
            style={{ width: '100%' }}
            onClick={() => setConfirmConfig({ isOpen: true })}
          >
            Confirm & Reserve Stock
          </button>
        </div>
      )}

      {isAdmin && data.status === 'CONFIRMED' && (
        <div className="detail-actions">
          <button 
            className="btn-accept" 
            style={{ width: '100%' }}
            onClick={() => setIsDispatchOpen(true)}
          >
            Dispatch Order
          </button>
        </div>
      )}

      {/* Confirmation Dialog for Inventory Reservation */}
      <ConfirmDialog 
        isOpen={confirmConfig.isOpen}
        title="Confirm Sales Order"
        message="Confirm this Sales Order and reserve required inventory?"
        onConfirm={handleConfirmOrder}
        onCancel={() => setConfirmConfig({ isOpen: false })}
      />

      {/* Dispatch Modal */}
      {isDispatchOpen && (
        <DispatchModal 
          isOpen={isDispatchOpen} 
          orderId={orderId} 
          onClose={() => setIsDispatchOpen(false)}
          onSuccess={handleDispatchSuccess}
        />
      )}
    </div>
  );
};

export default SalesOrderDetail;
