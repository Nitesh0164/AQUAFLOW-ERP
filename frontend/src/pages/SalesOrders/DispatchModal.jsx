import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';

const DispatchModal = ({ isOpen, onClose, orderData, onSuccess }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formData, setFormData] = useState(null);

  const onPreSubmit = (data) => {
    setFormData(data);
    setConfirmOpen(true);
  };

  const executeDispatch = async () => {
    setConfirmOpen(false);
    try {
      const response = await api.post(`/sales-orders/${orderData.id}/dispatch`, formData);
      onSuccess('Order dispatched successfully.');
    } catch (err) {
      setError('root', { message: err.response?.data?.message || 'Failed to dispatch order.' });
    }
  };

  if (!orderData) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Dispatch Order (ID: ${orderData.orderNumber})`}>
      
      {/* Read-only Sales Order Info */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <p><strong>Order Number:</strong> {orderData.orderNumber}</p>
        <p><strong>Customer:</strong> {orderData.customer?.companyName}</p>
        
        <h4 style={{ marginTop: '10px', marginBottom: '5px' }}>Products</h4>
        <table className="data-table" style={{ fontSize: '12px' }}>
          <thead>
            <tr>
              <th>Product</th>
              <th>Ordered Qty</th>
            </tr>
          </thead>
          <tbody>
            {orderData.items?.map(item => (
              <tr key={item.id}>
                <td>{item.product?.productName}</td>
                <td style={{ fontWeight: 'bold' }}>{item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleSubmit(onPreSubmit)} className="dispatch-form">
        <div className="form-group">
          <label>Dispatch Date *</label>
          <input 
            type="date" 
            {...register('dispatchDate', { required: 'Required' })} 
          />
          {errors.dispatchDate && <span className="error">{errors.dispatchDate.message}</span>}
        </div>
        <div className="form-group">
          <label>Vehicle Number *</label>
          <input 
            type="text" 
            placeholder="e.g. MH12AB1234" 
            {...register('vehicleNumber', { required: 'Required' })} 
          />
          {errors.vehicleNumber && <span className="error">{errors.vehicleNumber.message}</span>}
        </div>
        <div className="form-group">
          <label>Driver Name *</label>
          <input 
            type="text" 
            placeholder="e.g. Rajesh Kumar" 
            {...register('driverName', { required: 'Required' })} 
          />
          {errors.driverName && <span className="error">{errors.driverName.message}</span>}
        </div>
        
        {errors.root && <div className="error global-error">{errors.root.message}</div>}
        
        <button type="submit" className="submit-btn btn-success" disabled={isSubmitting} style={{ backgroundColor: '#28a745' }}>
          {isSubmitting ? 'Processing...' : 'Confirm Dispatch'}
        </button>
      </form>

      <ConfirmDialog 
        isOpen={confirmOpen}
        title="Confirm Dispatch"
        message="Dispatch this Sales Order? Inventory quantities will be updated."
        confirmText="Yes, Dispatch"
        onConfirm={executeDispatch}
        onCancel={() => setConfirmOpen(false)}
      />
    </Modal>
  );
};

export default DispatchModal;
