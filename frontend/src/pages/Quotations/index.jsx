import React, { useEffect, useState, useContext } from 'react';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';
import { formatDate } from '../../utils/date';
import { formatINR } from '../../utils/currency';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import QuotationForm from './QuotationForm';
import QuotationDetail from './QuotationDetail';
import './Quotations.css';

const Quotations = () => {
  const { user } = useContext(AuthContext);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const response = await api.get('/quotations');
      setQuotations(response.data.quotations || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch quotations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    showSuccess('Quotation created successfully!');
    fetchQuotations();
  };

  const handleDetailActionSuccess = (msg) => {
    setDetailId(null);
    showSuccess(msg);
    fetchQuotations();
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const isSales = user?.role === 'SALES';

  return (
    <div>
      <div className="page-header">
        <h1>Quotations</h1>
        {isSales && (
          <button onClick={() => setIsFormOpen(true)}>+ Create Quotation</button>
        )}
      </div>

      {successMsg && <div style={{ color: 'green', marginBottom: '15px', fontWeight: 'bold' }}>{successMsg}</div>}
      {error && <div className="error global-error">{error}</div>}

      {loading ? (
        <div>Loading quotations...</div>
      ) : quotations.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '8px' }}>
          No quotations found.
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Quotation Number</th>
              <th>Enquiry</th>
              <th>Customer</th>
              <th>Valid Until</th>
              <th>Grand Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotations.map((q) => (
              <tr key={q.id}>
                <td>{q.quotationNumber}</td>
                <td>{q.enquiry?.enquiryNumber}</td>
                <td>{q.enquiry?.customer?.companyName}</td>
                <td>{formatDate(q.validUntil)}</td>
                <td style={{fontWeight: 'bold'}}>{formatINR(q.grandTotal)}</td>
                <td><StatusBadge status={q.status} /></td>
                <td>
                  <button className="action-btn" onClick={() => setDetailId(q.id)}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Creation Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Create New Quotation">
        <QuotationForm onSuccess={handleFormSuccess} onCancel={() => setIsFormOpen(false)} />
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!detailId} onClose={() => setDetailId(null)} title="Quotation Details">
        {detailId && <QuotationDetail quotationId={detailId} onActionSuccess={handleDetailActionSuccess} />}
      </Modal>
    </div>
  );
};

export default Quotations;
