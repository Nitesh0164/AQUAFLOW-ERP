import { pool } from '../utils/db.js';
import { createEnquirySchema } from '../validators/enquiry.validator.js';

export const createEnquiry = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const parsed = createEnquirySchema.parse(req.body);
    const { customerId, requiredDate, notes, items } = parsed;

    await client.query('BEGIN');

    // Validate customer exists
    const customerRes = await client.query('SELECT id FROM public."customer" WHERE id = $1', [customerId]);
    if (customerRes.rows.length === 0) {
      throw new Error('Customer does not exist');
    }

    // Validate products exist
    for (const item of items) {
      const prodRes = await client.query('SELECT id FROM public."product" WHERE id = $1', [item.productId]);
      if (prodRes.rows.length === 0) {
        throw new Error(`Product ID ${item.productId} does not exist`);
      }
    }

    // Generate Enquiry Number (ENQ-YYYY-XXXX)
    const year = new Date().getFullYear();
    const prefix = `ENQ-${year}-`;
    const seqRes = await client.query(`
      SELECT "enquiryNumber" FROM public."enquiry"
      WHERE "enquiryNumber" LIKE $1
      ORDER BY "enquiryNumber" DESC LIMIT 1
    `, [`${prefix}%`]);
    
    let nextSeq = 1;
    if (seqRes.rows.length > 0) {
      const lastEnq = seqRes.rows[0].enquiryNumber;
      const lastSeq = parseInt(lastEnq.split('-')[2], 10);
      nextSeq = lastSeq + 1;
    }
    const enquiryNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;

    // Insert Enquiry
    const enquiryInsert = `
      INSERT INTO public."enquiry" ("enquiryNumber", "customerId", "enquiryDate", "requiredDate", notes, status, "createdById", "updatedAt")
      VALUES ($1, $2, NOW(), $3, $4, 'NEW', $5, NOW())
      RETURNING id, "enquiryNumber", status
    `;
    const enquiryRes = await client.query(enquiryInsert, [enquiryNumber, customerId, requiredDate, notes, req.user.userId]);
    const enquiry = enquiryRes.rows[0];

    // Insert Items
    for (const item of items) {
      await client.query(`
        INSERT INTO public."enquiryItem" ("enquiryId", "productId", quantity)
        VALUES ($1, $2, $3)
      `, [enquiry.id, item.productId, item.quantity]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      enquiry
    });
  } catch (error) {
    await client.query('ROLLBACK');
    // If it's a validation error (from Zod or our manual checks) we return 400
    if (error.name === 'ZodError' || error.message.includes('exist')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  } finally {
    client.release();
  }
};

export const getEnquiries = async (req, res, next) => {
  try {
    const query = `
      SELECT e.*, c."companyName"
      FROM public."enquiry" e
      JOIN public."customer" c ON e."customerId" = c.id
      ORDER BY e."enquiryDate" DESC
    `;
    const result = await pool.query(query);

    res.json({
      success: true,
      enquiries: result.rows
    });
  } catch (error) {
    next(error);
  }
};

export const getEnquiryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const enqQuery = `
      SELECT e.*, c."companyName"
      FROM public."enquiry" e
      JOIN public."customer" c ON e."customerId" = c.id
      WHERE e.id = $1
    `;
    const enqRes = await pool.query(enqQuery, [parseInt(id, 10)]);

    if (enqRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    const enquiry = enqRes.rows[0];

    const itemsQuery = `
      SELECT ei.*, p."productName", p."productCode"
      FROM public."enquiryItem" ei
      JOIN public."product" p ON ei."productId" = p.id
      WHERE ei."enquiryId" = $1
    `;
    const itemsRes = await pool.query(itemsQuery, [enquiry.id]);

    res.json({
      success: true,
      enquiry: {
        ...enquiry,
        items: itemsRes.rows
      }
    });
  } catch (error) {
    next(error);
  }
};
