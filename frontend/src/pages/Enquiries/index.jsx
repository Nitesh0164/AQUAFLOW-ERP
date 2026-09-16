import React, { useEffect, useState, useContext } from 'react';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';
import { formatDate } from '../../utils/date';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import EnquiryForm from './EnquiryForm';
import EnquiryDetail from './EnquiryDetail';
import './Enquiries.css';

const Enquiries = () => {
  const { user } = useContext(AuthContext);
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      const response = await api.get('/enquiries');
      setEnquiries(response.data.enquiries || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch enquiries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSuccessMsg('Enquiry created successfully!');
    fetchEnquiries();
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const isSales = user?.role === 'SALES';

  return (
    <div>
      <div className="page-header">
        <h1>Customer Enquiries</h1>
        {isSales && (
          <button onClick={() => setIsFormOpen(true)}>+ New Enquiry</button>
        )}
      </div>

      {successMsg && <div style={{ color: 'green', marginBottom: '15px' }}>{successMsg}</div>}
      {error && <div className="error global-error">{error}</div>}

      {loading ? (
        <div>Loading enquiries...</div>
      ) : enquiries.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '8px' }}>
          No enquiries found.
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Enquiry Number</th>
              <th>Customer</th>
              <th>Enquiry Date</th>
              <th>Required Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {enquiries.map((enq) => (
              <tr key={enq.id}>
                <td>{enq.enquiryNumber}</td>
                <td>{enq.customer?.companyName || `ID: ${enq.customerId}`}</td>
                <td>{formatDate(enq.enquiryDate)}</td>
                <td>{formatDate(enq.requiredDate)}</td>
                <td><StatusBadge status={enq.status} /></td>
                <td>
                  <button className="action-btn" onClick={() => setDetailId(enq.id)}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Creation Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Create New Enquiry">
        <EnquiryForm onSuccess={handleFormSuccess} onCancel={() => setIsFormOpen(false)} />
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!detailId} onClose={() => setDetailId(null)} title="Enquiry Details">
        {detailId && <EnquiryDetail enquiryId={detailId} />}
      </Modal>
    </div>
  );
};

export default Enquiries;
