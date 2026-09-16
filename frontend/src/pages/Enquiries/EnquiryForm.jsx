import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '../../api/axios';

const EnquiryForm = ({ onSuccess, onCancel }) => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  
  const { register, control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      items: [{ productId: '', quantity: 1 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [custRes, prodRes] = await Promise.all([
          api.get('/customers'),
          api.get('/products')
        ]);
        setCustomers(custRes.data.customers || []);
        setProducts(prodRes.data.products || []);
      } catch (err) {
        console.error('Failed to load form dependencies', err);
      }
    };
    fetchData();
  }, []);

  const onSubmit = async (data) => {
    try {
      // Validation: Check for duplicate products
      const productIds = data.items.map(i => i.productId);
      const uniqueProductIds = new Set(productIds);
      if (productIds.length !== uniqueProductIds.size) {
        setError('root', { message: 'Duplicate products found. Please combine quantities.' });
        return;
      }

      // Convert ID strings to numbers for backend
      const payload = {
        customerId: parseInt(data.customerId, 10),
        requiredDate: data.requiredDate,
        notes: data.notes,
        items: data.items.map(item => ({
          productId: parseInt(item.productId, 10),
          quantity: parseInt(item.quantity, 10)
        }))
      };

      await api.post('/enquiries', payload);
      onSuccess();
    } catch (err) {
      setError('root', { 
        message: err.response?.data?.message || 'Failed to create enquiry'
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="form-row">
        <div className="form-group">
          <label>Customer *</label>
          <select {...register('customerId', { required: 'Customer is required' })}>
            <option value="">-- Select Customer --</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.companyName} ({c.city})</option>
            ))}
          </select>
          {errors.customerId && <span className="error">{errors.customerId.message}</span>}
        </div>
        <div className="form-group">
          <label>Required Date *</label>
          <input type="date" {...register('requiredDate', { required: 'Required Date is required' })} />
          {errors.requiredDate && <span className="error">{errors.requiredDate.message}</span>}
        </div>
      </div>

      <div className="form-group">
        <label>Notes</label>
        <textarea rows="3" {...register('notes')}></textarea>
      </div>

      <div className="items-section">
        <h3>Products</h3>
        {fields.map((item, index) => (
          <div key={item.id} className="item-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Product *</label>
              <select {...register(`items.${index}.productId`, { required: 'Select a product' })}>
                <option value="">-- Select --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.productName} ({p.productCode})</option>
                ))}
              </select>
              {errors?.items?.[index]?.productId && <span className="error">{errors.items[index].productId.message}</span>}
            </div>
            
            <div className="form-group" style={{ flex: 1 }}>
              <label>Quantity *</label>
              <input 
                type="number" 
                min="1"
                {...register(`items.${index}.quantity`, { 
                  required: 'Required',
                  min: { value: 1, message: 'Must be > 0' }
                })} 
              />
              {errors?.items?.[index]?.quantity && <span className="error">{errors.items[index].quantity.message}</span>}
            </div>

            {fields.length > 1 && (
              <button type="button" className="remove-btn" onClick={() => remove(index)}>
                Remove
              </button>
            )}
          </div>
        ))}

        <button 
          type="button" 
          className="add-btn" 
          onClick={() => append({ productId: '', quantity: 1 })}
        >
          + Add Product
        </button>
      </div>

      {errors.root && <div className="error global-error">{errors.root.message}</div>}
      
      <button type="submit" className="submit-btn" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Create Enquiry'}
      </button>
    </form>
  );
};

export default EnquiryForm;
