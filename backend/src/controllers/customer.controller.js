import { pool } from '../utils/db.js';
import { createCustomerSchema } from '../validators/customer.validator.js';

export const createCustomer = async (req, res, next) => {
  try {
    const parsed = createCustomerSchema.parse(req.body);
    const { companyName, contactPerson, mobile, email, city } = parsed;

    const query = `
      INSERT INTO public."customer" ("companyName", "contactPerson", mobile, email, city, "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;
    const result = await pool.query(query, [companyName, contactPerson, mobile, email, city]);

    res.status(201).json({
      success: true,
      customer: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomers = async (req, res, next) => {
  try {
    const query = 'SELECT * FROM public."customer" ORDER BY "createdAt" DESC';
    const result = await pool.query(query);

    res.json({
      success: true,
      customers: result.rows
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = 'SELECT * FROM public."customer" WHERE id = $1';
    
    // Ensure id is parsed as integer
    const result = await pool.query(query, [parseInt(id, 10)]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({
      success: true,
      customer: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};
