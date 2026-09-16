import { pool } from '../utils/db.js';
import { createQuotationSchema } from '../validators/quotation.validator.js';

export const createQuotation = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const parsed = createQuotationSchema.parse(req.body);
    const { enquiryId, customerId, validUntil, items } = parsed;

    await client.query('BEGIN');

    // Validate customer exists
    const customerRes = await client.query('SELECT id FROM public."customer" WHERE id = $1', [customerId]);
    if (customerRes.rows.length === 0) {
      throw new Error('Customer does not exist');
    }

    // Validate enquiry exists (if provided)
    if (enquiryId) {
      const enqRes = await client.query('SELECT id, status FROM public."enquiry" WHERE id = $1', [enquiryId]);
      if (enqRes.rows.length === 0) {
        throw new Error('Enquiry does not exist');
      }
    }

    // Validate products and perform math
    let grandTotal = 0;
    const computedItems = [];

    for (const item of items) {
      const prodRes = await client.query('SELECT id FROM public."product" WHERE id = $1', [item.productId]);
      if (prodRes.rows.length === 0) {
        throw new Error(`Product ID ${item.productId} does not exist`);
      }

      const baseAmount = item.quantity * item.unitPrice;
      const discountAmount = baseAmount * (item.discountPercent / 100);
      const taxableAmount = baseAmount - discountAmount;
      const gstAmount = taxableAmount * (item.gstPercent / 100);
      const lineAmount = taxableAmount + gstAmount;

      grandTotal += lineAmount;

      computedItems.push({
        ...item,
        baseAmount,
        discountAmount,
        taxableAmount,
        gstAmount,
        lineAmount
      });
    }

    // Generate Quotation Number (QUO-YYYY-XXXX)
    const year = new Date().getFullYear();
    const prefix = `QUO-${year}-`;
    const seqRes = await client.query(`
      SELECT "quotationNumber" FROM public."quotation"
      WHERE "quotationNumber" LIKE $1
      ORDER BY "quotationNumber" DESC LIMIT 1
    `, [`${prefix}%`]);
    
    let nextSeq = 1;
    if (seqRes.rows.length > 0) {
      const lastQuo = seqRes.rows[0].quotationNumber;
      const lastSeq = parseInt(lastQuo.split('-')[2], 10);
      nextSeq = lastSeq + 1;
    }
    const quotationNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;

    // Insert Quotation
    const quoInsert = `
      INSERT INTO public."quotation" (
        "quotationNumber", "enquiryId", "customerId", "validUntil", "grandTotal", status, "createdById", "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, 'DRAFT', $6, NOW())
      RETURNING id, "quotationNumber", "grandTotal", status
    `;
    
    const validUntilDate = validUntil || null;
    const enquiryIdVal = enquiryId || null;
    
    const quoRes = await client.query(quoInsert, [
      quotationNumber, enquiryIdVal, customerId, validUntilDate, grandTotal, req.user.userId
    ]);
    const quotation = quoRes.rows[0];

    // Insert Items
    for (const cItem of computedItems) {
      await client.query(`
        INSERT INTO public."quotationItem" (
          "quotationId", "productId", quantity, "unitPrice", "discountPercent", "gstPercent", 
          "baseAmount", "discountAmount", "taxableAmount", "gstAmount", "lineAmount"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        quotation.id, cItem.productId, cItem.quantity, cItem.unitPrice, 
        cItem.discountPercent, cItem.gstPercent, cItem.baseAmount, cItem.discountAmount, 
        cItem.taxableAmount, cItem.gstAmount, cItem.lineAmount
      ]);
    }

    // Update Enquiry Status to QUOTED
    if (enquiryId) {
      await client.query(`
        UPDATE public."enquiry"
        SET status = 'QUOTED', "updatedAt" = NOW()
        WHERE id = $1
      `, [enquiryId]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      quotation
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.name === 'ZodError' || error.message.includes('exist')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  } finally {
    client.release();
  }
};

export const getQuotations = async (req, res, next) => {
  try {
    const query = `
      SELECT q.*, c."companyName"
      FROM public."quotation" q
      JOIN public."customer" c ON q."customerId" = c.id
      ORDER BY q."createdAt" DESC
    `;
    const result = await pool.query(query);

    res.json({
      success: true,
      quotations: result.rows
    });
  } catch (error) {
    next(error);
  }
};

export const getQuotationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quoQuery = `
      SELECT q.*, c."companyName"
      FROM public."quotation" q
      JOIN public."customer" c ON q."customerId" = c.id
      WHERE q.id = $1
    `;
    const quoRes = await pool.query(quoQuery, [parseInt(id, 10)]);

    if (quoRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    const quotation = quoRes.rows[0];

    const itemsQuery = `
      SELECT qi.*, p."productName", p."productCode"
      FROM public."quotationItem" qi
      JOIN public."product" p ON qi."productId" = p.id
      WHERE qi."quotationId" = $1
    `;
    const itemsRes = await pool.query(itemsQuery, [quotation.id]);

    res.json({
      success: true,
      quotation: {
        ...quotation,
        items: itemsRes.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateQuotationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status: newStatus } = req.body;

    if (!['SENT', 'ACCEPTED', 'REJECTED'].includes(newStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    // Fetch current status
    const quoQuery = 'SELECT status FROM public."quotation" WHERE id = $1';
    const quoRes = await pool.query(quoQuery, [parseInt(id, 10)]);

    if (quoRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    const currentStatus = quoRes.rows[0].status;

    // FSM Validation
    const validTransitions = {
      'DRAFT': ['SENT'],
      'SENT': ['ACCEPTED', 'REJECTED'],
      'ACCEPTED': [],
      'REJECTED': []
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot transition quotation from ${currentStatus} to ${newStatus}` 
      });
    }

    // Update Status
    const updateQuery = `
      UPDATE public."quotation"
      SET status = $1, "updatedAt" = NOW()
      WHERE id = $2
      RETURNING id, "quotationNumber", status
    `;
    const updateRes = await pool.query(updateQuery, [newStatus, parseInt(id, 10)]);

    res.json({
      success: true,
      quotation: updateRes.rows[0]
    });

  } catch (error) {
    next(error);
  }
};

export const convertQuotationToOrder = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const quotationId = parseInt(id, 10);

    await client.query('BEGIN');

    // 1. Fetch Quotation and check status
    const quoRes = await client.query('SELECT status, "customerId", "grandTotal", "enquiryId" FROM public."quotation" WHERE id = $1', [quotationId]);
    if (quoRes.rows.length === 0) {
      throw new Error('Quotation not found');
    }

    const quotation = quoRes.rows[0];
    if (quotation.status !== 'ACCEPTED') {
      throw new Error(`Only ACCEPTED quotations can be converted. Current status is ${quotation.status}`);
    }

    // 2. Prevent Double Conversion (Unique constraint will also catch this, but this is a cleaner message)
    const existingOrderRes = await client.query('SELECT id FROM public."salesOrder" WHERE "quotationId" = $1', [quotationId]);
    if (existingOrderRes.rows.length > 0) {
      throw new Error('This quotation has already been converted into a Sales Order');
    }

    // 3. Generate Sales Order Number (SO-YYYY-XXXX)
    const year = new Date().getFullYear();
    const prefix = `SO-${year}-`;
    const seqRes = await client.query(`
      SELECT "orderNumber" FROM public."salesOrder"
      WHERE "orderNumber" LIKE $1
      ORDER BY "orderNumber" DESC LIMIT 1
    `, [`${prefix}%`]);
    
    let nextSeq = 1;
    if (seqRes.rows.length > 0) {
      const lastSO = seqRes.rows[0].orderNumber;
      const lastSeq = parseInt(lastSO.split('-')[2], 10);
      nextSeq = lastSeq + 1;
    }
    const orderNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;

    // 4. Insert Sales Order
    const soInsert = `
      INSERT INTO public."salesOrder" (
        "orderNumber", "quotationId", "customerId", "orderDate", "totalAmount", status, "createdAt", "updatedAt"
      )
      VALUES ($1, $2, $3, NOW(), $4, 'PENDING', NOW(), NOW())
      RETURNING id, "orderNumber", status
    `;
    const soRes = await client.query(soInsert, [orderNumber, quotationId, quotation.customerId, quotation.grandTotal]);
    const salesOrder = soRes.rows[0];

    // 5. Copy Items
    const itemsRes = await client.query(`
      SELECT "productId", quantity, "unitPrice", "lineAmount"
      FROM public."quotationItem"
      WHERE "quotationId" = $1
    `, [quotationId]);

    for (const item of itemsRes.rows) {
      await client.query(`
        INSERT INTO public."salesOrderItem" (
          "salesOrderId", "productId", quantity, "unitPrice", "lineAmount"
        )
        VALUES ($1, $2, $3, $4, $5)
      `, [salesOrder.id, item.productId, item.quantity, item.unitPrice, item.lineAmount]);
    }

    // 6. Update Enquiry to WON
    if (quotation.enquiryId) {
      await client.query(`
        UPDATE public."enquiry"
        SET status = 'WON', "updatedAt" = NOW()
        WHERE id = $1
      `, [quotation.enquiryId]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      salesOrder
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.message.includes('converted') || error.message.includes('ACCEPTED')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  } finally {
    client.release();
  }
};
