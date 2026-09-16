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

import { createDispatchSchema } from '../validators/dispatch.validator.js';

export const dispatchOrder = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const salesOrderId = parseInt(id, 10);
    const parsed = createDispatchSchema.parse(req.body);
    
    await client.query('BEGIN');

    // 1. Fetch Sales Order FOR UPDATE (Locking the row)
    const soRes = await client.query('SELECT status FROM public."salesOrder" WHERE id = $1 FOR UPDATE', [salesOrderId]);
    if (soRes.rows.length === 0) {
      throw new Error('Sales Order not found');
    }

    const order = soRes.rows[0];
    if (order.status !== 'CONFIRMED') {
      throw new Error(`Only CONFIRMED orders can be dispatched. Current status is ${order.status}`);
    }

    // 2. Prevent Double Dispatch
    const existingDispatchRes = await client.query('SELECT id FROM public."dispatch" WHERE "salesOrderId" = $1', [salesOrderId]);
    if (existingDispatchRes.rows.length > 0) {
      throw new Error('This Sales Order has already been dispatched');
    }

    // 3. Generate Dispatch Number (DSP-YYYY-XXXX)
    const year = new Date().getFullYear();
    const prefix = `DSP-${year}-`;
    const seqRes = await client.query(`
      SELECT "dispatchNumber" FROM public."dispatch"
      WHERE "dispatchNumber" LIKE $1
      ORDER BY "dispatchNumber" DESC LIMIT 1
    `, [`${prefix}%`]);
    
    let nextSeq = 1;
    if (seqRes.rows.length > 0) {
      const lastDSP = seqRes.rows[0].dispatchNumber;
      const lastSeq = parseInt(lastDSP.split('-')[2], 10);
      nextSeq = lastSeq + 1;
    }
    const dispatchNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;

    // 4. Insert Dispatch Record
    const dispatchDate = parsed.dispatchDate || null;
    const dispatchInsert = `
      INSERT INTO public."dispatch" (
        "dispatchNumber", "salesOrderId", "dispatchDate", "vehicleNumber", "driverName", "createdAt", "updatedAt"
      )
      VALUES ($1, $2, COALESCE($3::timestamp, NOW()), $4, $5, NOW(), NOW())
      RETURNING id, "dispatchNumber"
    `;
    const dispatchRes = await client.query(dispatchInsert, [
      dispatchNumber, salesOrderId, dispatchDate, parsed.vehicleNumber, parsed.driverName
    ]);
    const dispatch = dispatchRes.rows[0];

    // 5. Fetch Order Items in strict order to prevent deadlocks
    const itemsRes = await client.query('SELECT "productId", quantity FROM public."salesOrderItem" WHERE "salesOrderId" = $1 ORDER BY "productId" ASC', [salesOrderId]);
    
    // 6. Insert Dispatch Items and Update Inventory
    for (const item of itemsRes.rows) {
      // Insert Dispatch Item
      await client.query(`
        INSERT INTO public."dispatchItem" (
          "dispatchId", "productId", quantity
        )
        VALUES ($1, $2, $3)
      `, [dispatch.id, item.productId, item.quantity]);

      // Update Inventory (goods are physically leaving, so subtract from both)
      // Since we already reserved them, we are safely decrementing both physical and reserved
      await client.query(`
        UPDATE public."inventory"
        SET "physicalQuantity" = "physicalQuantity" - $1, 
            "reservedQuantity" = "reservedQuantity" - $1, 
            "updatedAt" = NOW()
        WHERE "productId" = $2
      `, [item.quantity, item.productId]);
    }

    // 7. Update Sales Order Status to DISPATCHED
    await client.query(`
      UPDATE public."salesOrder"
      SET status = 'DISPATCHED', "updatedAt" = NOW()
      WHERE id = $1
    `, [salesOrderId]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      dispatch
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.name === 'ZodError' || error.message.includes('dispatched') || error.message.includes('CONFIRMED')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  } finally {
    client.release();
  }
};
