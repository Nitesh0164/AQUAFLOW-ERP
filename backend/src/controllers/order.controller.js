import { pool } from '../utils/db.js';

export const getOrders = async (req, res, next) => {
  try {
    const query = `
      SELECT so.*, c."companyName"
      FROM public."salesOrder" so
      JOIN public."customer" c ON so."customerId" = c.id
      ORDER BY so."createdAt" DESC
    `;
    const result = await pool.query(query);

    res.json({
      success: true,
      salesOrders: result.rows
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const soQuery = `
      SELECT so.*, c."companyName"
      FROM public."salesOrder" so
      JOIN public."customer" c ON so."customerId" = c.id
      WHERE so.id = $1
    `;
    const soRes = await pool.query(soQuery, [parseInt(id, 10)]);

    if (soRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sales Order not found' });
    }

    const salesOrder = soRes.rows[0];

    const itemsQuery = `
      SELECT 
        soi.id,
        soi."productId",
        p."productName",
        p."productCode",
        soi.quantity as "required",
        soi."unitPrice",
        soi."lineAmount",
        i."physicalQuantity",
        i."reservedQuantity",
        (i."physicalQuantity" - i."reservedQuantity") as "availableQuantity"
      FROM public."salesOrderItem" soi
      JOIN public."product" p ON soi."productId" = p.id
      JOIN public."inventory" i ON p.id = i."productId"
      WHERE soi."salesOrderId" = $1
    `;
    const itemsRes = await pool.query(itemsQuery, [salesOrder.id]);

    res.json({
      success: true,
      salesOrder: {
        ...salesOrder,
        items: itemsRes.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

export const confirmOrder = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    
    await client.query('BEGIN');

    // 1. Fetch Sales Order FOR UPDATE (Locking the row)
    const soRes = await client.query('SELECT status FROM public."salesOrder" WHERE id = $1 FOR UPDATE', [parseInt(id, 10)]);
    if (soRes.rows.length === 0) {
      throw new Error('Sales Order not found');
    }

    const order = soRes.rows[0];
    if (order.status !== 'PENDING') {
      throw new Error(`Only PENDING orders can be confirmed. Current status is ${order.status}`);
    }

    // 2. Fetch Order Items in strict productId order to prevent deadlocks
    const itemsRes = await client.query('SELECT "productId", quantity FROM public."salesOrderItem" WHERE "salesOrderId" = $1 ORDER BY "productId" ASC', [parseInt(id, 10)]);
    
    // 3. Process each item (check stock and reserve)
    for (const item of itemsRes.rows) {
      // Lock the specific inventory row
      const invRes = await client.query('SELECT "physicalQuantity", "reservedQuantity" FROM public."inventory" WHERE "productId" = $1 FOR UPDATE', [item.productId]);
      if (invRes.rows.length === 0) {
        throw new Error(`Inventory record not found for product ID ${item.productId}`);
      }

      const inv = invRes.rows[0];
      const available = inv.physicalQuantity - inv.reservedQuantity;

      // Check if enough stock is available
      if (item.quantity > available) {
        throw new Error(`Insufficient stock for product ID ${item.productId}. Required: ${item.quantity}, Available: ${available}`);
      }

      // Reserve the stock
      await client.query(`
        UPDATE public."inventory"
        SET "reservedQuantity" = "reservedQuantity" + $1, "updatedAt" = NOW()
        WHERE "productId" = $2
      `, [item.quantity, item.productId]);
    }

    // 4. Update Sales Order Status to CONFIRMED
    const updateRes = await client.query(`
      UPDATE public."salesOrder"
      SET status = 'CONFIRMED', "updatedAt" = NOW()
      WHERE id = $1
      RETURNING id, "orderNumber", status
    `, [parseInt(id, 10)]);

    await client.query('COMMIT');

    res.json({
      success: true,
      salesOrder: updateRes.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.message.includes('Insufficient') || error.message.includes('PENDING')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  } finally {
    client.release();
  }
};
