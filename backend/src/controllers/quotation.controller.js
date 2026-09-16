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
