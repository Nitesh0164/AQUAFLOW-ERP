import { pool } from '../utils/db.js';

export const getInventory = async (req, res, next) => {
  try {
    const query = `
      SELECT 
        p."productName" as product,
        i."physicalQuantity",
        i."reservedQuantity"
      FROM public."inventory" i
      JOIN public."product" p ON i."productId" = p.id
      ORDER BY p."productName" ASC
    `;
    const result = await pool.query(query);

    const inventory = result.rows.map(row => {
      // Calculate available dynamically
      const availableQuantity = row.physicalQuantity - row.reservedQuantity;
      return {
        product: row.product,
        physicalQuantity: row.physicalQuantity,
        reservedQuantity: row.reservedQuantity,
        availableQuantity
      };
    });

    res.json({
      success: true,
      inventory
    });
  } catch (error) {
    next(error);
  }
};
