import React from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import Modal from '../../components/Modal';

const DispatchModal = ({ isOpen, onClose, orderId, onSuccess }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm();

  const onSubmit = async (data) => {
    try {
      await api.post(`/sales-orders/${orderId}/dispatch`, data);
      onSuccess('Order dispatched successfully!');
    } catch (err) {
      setError('root', { message: err.response?.data?.message || 'Failed to dispatch order.' });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Dispatch Order (ID: ${orderId})`}>
      <form onSubmit={handleSubmit(onSubmit)} className="dispatch-form">
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
    </Modal>
  );
};

export default DispatchModal;
