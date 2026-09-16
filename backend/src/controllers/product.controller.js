import { pool } from '../utils/db.js';

export const getProducts = async (req, res, next) => {
  try {
    const query = 'SELECT * FROM public."product" ORDER BY "productCode" ASC';
    const result = await pool.query(query);

    res.json({
      success: true,
      products: result.rows
    });
  } catch (error) {
    next(error);
  }
};
