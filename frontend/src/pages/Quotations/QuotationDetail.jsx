import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { formatDate } from '../../utils/date';
import { formatINR } from '../../utils/currency';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';

const QuotationDetail = ({ quotationId, onActionSuccess }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Dialog state
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, action: null, title: '', message: '', isDanger: false });

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/quotations/${quotationId}`);
      setData(response.data.quotation);
      setError(null);
    } catch (err) {
      setError('Failed to load quotation details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [quotationId]);

  const handleStatusChange = async (newStatus) => {
    try {
      await api.patch(`/quotations/${quotationId}/status`, { status: newStatus });
      setConfirmConfig({ isOpen: false });
      onActionSuccess(`Quotation marked as ${newStatus}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
      setConfirmConfig({ isOpen: false });
    }
  };

  const handleConvert = async () => {
    try {
      const response = await api.post(`/quotations/${quotationId}/convert`);
      setConfirmConfig({ isOpen: false });
      onActionSuccess(`${response.data.salesOrder.orderNumber} created successfully.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Conversion failed. Check for existing Sales Order.');
      setConfirmConfig({ isOpen: false });
    }
  };

  const openConfirm = (action, title, message, isDanger = false) => {
    setConfirmConfig({ isOpen: true, action, title, message, isDanger });
  };

  const executeConfirm = () => {
    if (confirmConfig.action) {
      confirmConfig.action();
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!data) return null;

  return (
    <div>
      {error && <div className="error global-error">{error}</div>}
      
      <div className="detail-grid">
        <div className="detail-item">
          <label>Quotation Number</label>
          <div>{data.quotationNumber}</div>
        </div>
        <div className="detail-item">
          <label>Status</label>
          <div><StatusBadge status={data.status} /></div>
        </div>
        <div className="detail-item">
          <label>Enquiry Number</label>
          <div>{data.enquiry?.enquiryNumber}</div>
        </div>
        <div className="detail-item">
          <label>Valid Until</label>
          <div>{formatDate(data.validUntil)}</div>
        </div>
        <div className="detail-item">
          <label>Customer</label>
          <div>{data.enquiry?.customer?.companyName}</div>
        </div>
        <div className="detail-item">
          <label>Created By</label>
          <div>{data.user?.name}</div>
        </div>
      </div>

      <h3>Authoritative Financial Breakdown</h3>
      <table className="data-table" style={{fontSize: '12px'}}>
        <thead>
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Disc %</th>
            <th>GST %</th>
            <th>Base Amt</th>
            <th>Disc Amt</th>
            <th>Taxable</th>
            <th>GST Amt</th>
            <th>Line Amt</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map(item => (
            <tr key={item.id}>
              <td>{item.product?.productName}</td>
              <td>{item.quantity}</td>
              <td>{formatINR(item.unitPrice)}</td>
              <td>{item.discountPercent}%</td>
              <td>{item.gstPercent}%</td>
              <td>{formatINR(item.baseAmount)}</td>
              <td>{formatINR(item.discountAmount)}</td>
              <td>{formatINR(item.taxableAmount)}</td>
              <td>{formatINR(item.gstAmount)}</td>
              <td style={{fontWeight: 'bold'}}>{formatINR(item.lineAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grand-total-preview" style={{ background: '#e2e3e5', borderColor: '#d6d8db' }}>
        Official Grand Total: {formatINR(data.grandTotal)}
      </div>

      <div className="detail-actions">
        {data.status === 'DRAFT' && (
          <button className="btn-send" onClick={() => openConfirm(() => handleStatusChange('SENT'), 'Send Quotation', 'Send this quotation to the customer?')}>Send</button>
        )}
        {data.status === 'SENT' && (
          <>
            <button className="btn-accept" onClick={() => openConfirm(() => handleStatusChange('ACCEPTED'), 'Accept Quotation', 'Mark this quotation as accepted?')}>Accept</button>
            <button className="btn-reject" onClick={() => openConfirm(() => handleStatusChange('REJECTED'), 'Reject Quotation', 'Reject this quotation?', true)}>Reject</button>
          </>
        )}
        {data.status === 'ACCEPTED' && (
          <button className="btn-convert" onClick={() => openConfirm(handleConvert, 'Convert to Sales Order', 'Are you sure you want to convert this accepted quotation into a live Sales Order?')}>Convert to Sales Order</button>
        )}
      </div>

      <ConfirmDialog 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDanger={confirmConfig.isDanger}
        onConfirm={executeConfirm}
        onCancel={() => setConfirmConfig({ isOpen: false, action: null })}
      />
    </div>
  );
};

export default QuotationDetail;
