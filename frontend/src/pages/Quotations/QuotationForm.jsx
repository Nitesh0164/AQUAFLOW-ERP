import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '../../api/axios';
import { formatINR } from '../../utils/currency';

const QuotationForm = ({ onSuccess, onCancel }) => {
  const [enquiries, setEnquiries] = useState([]);
  const [products, setProducts] = useState({});
  const [loadingInitial, setLoadingInitial] = useState(true);

  const { register, control, handleSubmit, watch, setValue, setError, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      enquiryId: '',
      validUntil: '',
      items: []
    }
  });

  const { fields, replace } = useFieldArray({ control, name: 'items' });

  // Watch fields for live preview calculation
  const watchedItems = watch('items');

  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        const [enqRes, prodRes] = await Promise.all([
          api.get('/enquiries'),
          api.get('/products')
        ]);
        
        // Only allow quoting NEW enquiries
        const eligibleEnquiries = (enqRes.data.enquiries || []).filter(e => e.status === 'NEW');
        setEnquiries(eligibleEnquiries);
        
        // Hash products for quick lookup
        const prodMap = {};
        (prodRes.data.products || []).forEach(p => prodMap[p.id] = p);
        setProducts(prodMap);
      } catch (err) {
        console.error('Error fetching form deps', err);
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchDependencies();
  }, []);

  const selectedEnquiryId = watch('enquiryId');

  // Auto-populate items when Enquiry changes
  useEffect(() => {
    if (selectedEnquiryId) {
      const fetchEnquiryDetails = async () => {
        try {
          const res = await api.get(`/enquiries/${selectedEnquiryId}`);
          const enq = res.data.enquiry;
          
          // Hydrate the fields
          const newItems = enq.items.map(item => {
            const productInfo = products[item.productId];
            return {
              productId: item.productId,
              productName: item.product?.productName || productInfo?.productName || 'Unknown',
              quantity: item.quantity,
              unitPrice: productInfo?.basePrice || 0,
              discountPercent: 0,
              gstPercent: 18 // standard default
            };
          });
          replace(newItems);
        } catch (err) {
          console.error('Failed to fetch enquiry details', err);
        }
      };
      fetchEnquiryDetails();
    } else {
      replace([]);
    }
  }, [selectedEnquiryId, replace, products]);

  const onSubmit = async (data) => {
    try {
      // Strip out preview calculations and submit raw data
      const payload = {
        enquiryId: parseInt(data.enquiryId, 10),
        validUntil: data.validUntil,
        items: data.items.map(i => ({
          productId: parseInt(i.productId, 10),
          quantity: parseInt(i.quantity, 10),
          unitPrice: parseFloat(i.unitPrice),
          discountPercent: parseFloat(i.discountPercent),
          gstPercent: parseFloat(i.gstPercent)
        }))
      };

      await api.post('/quotations', payload);
      onSuccess();
    } catch (err) {
      setError('root', { message: err.response?.data?.message || 'Failed to create quotation' });
    }
  };

  if (loadingInitial) return <div>Loading...</div>;

  // Preview Math Calculator
  let previewGrandTotal = 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="form-row">
        <div className="form-group">
          <label>Enquiry (Eligible: NEW) *</label>
          <select {...register('enquiryId', { required: 'Select an Enquiry' })}>
            <option value="">-- Select Enquiry --</option>
            {enquiries.map(e => (
              <option key={e.id} value={e.id}>
                {e.enquiryNumber} - {e.customer?.companyName}
              </option>
            ))}
          </select>
          {errors.enquiryId && <span className="error">{errors.enquiryId.message}</span>}
        </div>
        <div className="form-group">
          <label>Valid Until *</label>
          <input type="date" {...register('validUntil', { required: 'Required' })} />
          {errors.validUntil && <span className="error">{errors.validUntil.message}</span>}
        </div>
      </div>

      {fields.length > 0 && (
        <div className="items-section">
          <h3>Products (Live Preview)</h3>
          <p style={{fontSize: '12px', color: '#6c757d', marginBottom: '10px'}}>
            * Note: These calculations are previews. The backend generates the final authoritative totals.
          </p>
          <table className="data-table quote-preview-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Unit Price (₹)</th>
                <th>Disc. %</th>
                <th>GST %</th>
                <th>Base Amt</th>
                <th>Line Amt</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => {
                const w = watchedItems[index] || {};
                const qty = parseFloat(w.quantity) || 0;
                const price = parseFloat(w.unitPrice) || 0;
                const discPct = parseFloat(w.discountPercent) || 0;
                const gstPct = parseFloat(w.gstPercent) || 0;

                const baseAmt = qty * price;
                const discAmt = (baseAmt * discPct) / 100;
                const taxAmt = baseAmt - discAmt;
                const gstAmt = (taxAmt * gstPct) / 100;
                const lineAmt = taxAmt + gstAmt;

                previewGrandTotal += lineAmt;

                return (
                  <tr key={field.id}>
                    <td>
                      {field.productName}
                      <input type="hidden" {...register(`items.${index}.productId`)} />
                    </td>
                    <td>
                      <input type="number" min="1" className="quote-input" {...register(`items.${index}.quantity`, { required: true, min: 1 })} />
                    </td>
                    <td>
                      <input type="number" step="0.01" min="0" className="quote-input" {...register(`items.${index}.unitPrice`, { required: true, min: 0 })} />
                    </td>
                    <td>
                      <input type="number" step="0.1" min="0" max="100" className="quote-input" {...register(`items.${index}.discountPercent`, { required: true, min: 0, max: 100 })} />
                    </td>
                    <td>
                      <input type="number" step="0.1" min="0" className="quote-input" {...register(`items.${index}.gstPercent`, { required: true, min: 0 })} />
                    </td>
                    <td>{formatINR(baseAmt)}</td>
                    <td style={{fontWeight: 'bold'}}>{formatINR(lineAmt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="grand-total-preview">
            Preview Grand Total: {formatINR(previewGrandTotal)}
          </div>
        </div>
      )}

      {errors.root && <div className="error global-error">{errors.root.message}</div>}
      
      <button type="submit" className="submit-btn" disabled={isSubmitting || fields.length === 0}>
        {isSubmitting ? 'Saving...' : 'Create Quotation'}
      </button>
    </form>
  );
};

export default QuotationForm;
