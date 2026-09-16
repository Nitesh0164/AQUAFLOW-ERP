import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { formatDate } from '../../utils/date';
import StatusBadge from '../../components/StatusBadge';

const EnquiryDetail = ({ enquiryId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const response = await api.get(`/enquiries/${enquiryId}`);
        setData(response.data.enquiry);
      } catch (err) {
        setError('Failed to load details');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [enquiryId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!data) return null;

  return (
    <div>
      <div className="detail-grid">
        <div className="detail-item">
          <label>Enquiry Number</label>
          <div>{data.enquiryNumber}</div>
        </div>
        <div className="detail-item">
          <label>Status</label>
          <div><StatusBadge status={data.status} /></div>
        </div>
        <div className="detail-item">
          <label>Customer</label>
          <div>{data.customer.companyName} ({data.customer.city})</div>
        </div>
        <div className="detail-item">
          <label>Contact Person</label>
          <div>{data.customer.contactPerson} - {data.customer.mobile}</div>
        </div>
        <div className="detail-item">
          <label>Enquiry Date</label>
          <div>{formatDate(data.enquiryDate)}</div>
        </div>
        <div className="detail-item">
          <label>Required Date</label>
          <div>{formatDate(data.requiredDate)}</div>
        </div>
      </div>

      {data.notes && (
        <div className="detail-notes">
          <strong>Notes:</strong> {data.notes}
        </div>
      )}

      <h3>Products</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Quantity</th>
            <th>Unit</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map(item => (
            <tr key={item.id}>
              <td>{item.product.productName} ({item.product.productCode})</td>
              <td>{item.product.category}</td>
              <td>{item.quantity}</td>
              <td>{item.product.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EnquiryDetail;
