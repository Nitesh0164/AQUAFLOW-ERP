import test from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import { pool } from '../src/utils/db.js';

const BASE_URL = 'http://localhost:5000';
const adminToken = jwt.sign({ userId: 1, role: 'ADMIN' }, process.env.JWT_SECRET || 'aquaflow-secret-key-123', { expiresIn: '1h' });
const salesToken = jwt.sign({ userId: 2, role: 'SALES' }, process.env.JWT_SECRET || 'aquaflow-secret-key-123', { expiresIn: '1h' });

// Helpers
const authHeader = (token) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` });

async function setupTestData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Create isolated customer
    const cRes = await client.query(`INSERT INTO public."customer" ("companyName") VALUES ('Test Customer') RETURNING id`);
    const customerId = cRes.rows[0].id;

    // Create isolated product 1 (for normal tests)
    const pRes = await client.query(`INSERT INTO public."product" ("productCode", "productName", "basePrice") VALUES ('TEST-01', 'Test Product 1', 100) RETURNING id`);
    const productId = pRes.rows[0].id;
    await client.query(`INSERT INTO public."inventory" ("productId", "physicalQuantity", "reservedQuantity") VALUES ($1, 50, 0)`, [productId]);

    // Create isolated product 2 (for concurrency test)
    const pRes2 = await client.query(`INSERT INTO public."product" ("productCode", "productName", "basePrice") VALUES ('TEST-02', 'Test Product 2', 100) RETURNING id`);
    const productId2 = pRes2.rows[0].id;
    await client.query(`INSERT INTO public."inventory" ("productId", "physicalQuantity", "reservedQuantity") VALUES ($1, 100, 0)`, [productId2]);

    await client.query('COMMIT');
    return { customerId, productId, productId2 };
  } finally {
    client.release();
  }
}

let testData;

test.before(async () => {
  testData = await setupTestData();
});

test.after(async () => {
  await pool.end();
});

test('Test 1: Quotation calculation', async () => {
  // qty: 5, price: 100 => base: 500
  // discount: 10% => discountAmount: 50
  // taxable: 450
  // gst: 10% => gstAmount: 45
  // lineAmount: 495
  const res = await fetch(`${BASE_URL}/api/quotations`, {
    method: 'POST',
    headers: authHeader(adminToken),
    body: JSON.stringify({
      customerId: testData.customerId,
      items: [{ productId: testData.productId, quantity: 5, unitPrice: 100, discountPercent: 10, gstPercent: 10 }]
    })
  });
  const data = await res.json();
  assert.strictEqual(res.status, 201);
  assert.strictEqual(data.quotation.grandTotal, '495');

  // Verify items
  const getRes = await fetch(`${BASE_URL}/api/quotations/${data.quotation.id}`, { headers: authHeader(adminToken) });
  const getData = await getRes.json();
  const item = getData.quotation.items[0];
  assert.strictEqual(item.baseAmount, '500');
  assert.strictEqual(item.discountAmount, '50');
  assert.strictEqual(item.taxableAmount, '450');
  assert.strictEqual(item.gstAmount, '45');
  assert.strictEqual(item.lineAmount, '495');
});

test('Test 2: DRAFT cannot convert, REJECTED cannot convert', async () => {
  // 1. Create a DRAFT
  const q1Res = await fetch(`${BASE_URL}/api/quotations`, {
    method: 'POST',
    headers: authHeader(adminToken),
    body: JSON.stringify({
      customerId: testData.customerId,
      items: [{ productId: testData.productId, quantity: 1, unitPrice: 100, discountPercent: 0, gstPercent: 0 }]
    })
  });
  const q1 = await q1Res.json();
  
  // Try convert DRAFT
  const c1Res = await fetch(`${BASE_URL}/api/quotations/${q1.quotation.id}/convert`, { method: 'POST', headers: authHeader(adminToken) });
  assert.strictEqual(c1Res.status, 400, 'DRAFT should not convert');
  
  // 2. Create another DRAFT, change to SENT, then REJECTED
  const q2Res = await fetch(`${BASE_URL}/api/quotations`, {
    method: 'POST',
    headers: authHeader(adminToken),
    body: JSON.stringify({
      customerId: testData.customerId,
      items: [{ productId: testData.productId, quantity: 1, unitPrice: 100, discountPercent: 0, gstPercent: 0 }]
    })
  });
  const q2 = await q2Res.json();
  await fetch(`${BASE_URL}/api/quotations/${q2.quotation.id}/status`, { method: 'PATCH', headers: authHeader(adminToken), body: JSON.stringify({ status: 'SENT' }) });
  await fetch(`${BASE_URL}/api/quotations/${q2.quotation.id}/status`, { method: 'PATCH', headers: authHeader(adminToken), body: JSON.stringify({ status: 'REJECTED' }) });

  // Try convert REJECTED
  const c2Res = await fetch(`${BASE_URL}/api/quotations/${q2.quotation.id}/convert`, { method: 'POST', headers: authHeader(adminToken) });
  assert.strictEqual(c2Res.status, 400, 'REJECTED should not convert');
});

test('Test 3: Quotation cannot generate duplicate Sales Orders', async () => {
  // Create and ACCEPT a quotation
  const qRes = await fetch(`${BASE_URL}/api/quotations`, {
    method: 'POST',
    headers: authHeader(adminToken),
    body: JSON.stringify({
      customerId: testData.customerId,
      items: [{ productId: testData.productId, quantity: 1, unitPrice: 100, discountPercent: 0, gstPercent: 0 }]
    })
  });
  const q = await qRes.json();
  await fetch(`${BASE_URL}/api/quotations/${q.quotation.id}/status`, { method: 'PATCH', headers: authHeader(adminToken), body: JSON.stringify({ status: 'SENT' }) });
  await fetch(`${BASE_URL}/api/quotations/${q.quotation.id}/status`, { method: 'PATCH', headers: authHeader(adminToken), body: JSON.stringify({ status: 'ACCEPTED' }) });

  // First convert should pass
  const c1Res = await fetch(`${BASE_URL}/api/quotations/${q.quotation.id}/convert`, { method: 'POST', headers: authHeader(adminToken) });
  assert.strictEqual(c1Res.status, 201);

  // Second convert should fail
  const c2Res = await fetch(`${BASE_URL}/api/quotations/${q.quotation.id}/convert`, { method: 'POST', headers: authHeader(adminToken) });
  assert.strictEqual(c2Res.status, 400);
});

test('Test 4: Available = 50, Order requires = 70 -> confirmation fails', async () => {
  // We created Product 1 with Available = 50
  const qRes = await fetch(`${BASE_URL}/api/quotations`, {
    method: 'POST',
    headers: authHeader(adminToken),
    body: JSON.stringify({
      customerId: testData.customerId,
      items: [{ productId: testData.productId, quantity: 70, unitPrice: 100, discountPercent: 0, gstPercent: 0 }] // Require 70
    })
  });
  const q = await qRes.json();
  await fetch(`${BASE_URL}/api/quotations/${q.quotation.id}/status`, { method: 'PATCH', headers: authHeader(adminToken), body: JSON.stringify({ status: 'SENT' }) });
  await fetch(`${BASE_URL}/api/quotations/${q.quotation.id}/status`, { method: 'PATCH', headers: authHeader(adminToken), body: JSON.stringify({ status: 'ACCEPTED' }) });

  // Convert to Sales Order (PENDING)
  const cRes = await fetch(`${BASE_URL}/api/quotations/${q.quotation.id}/convert`, { method: 'POST', headers: authHeader(adminToken) });
  const orderData = await cRes.json();
  assert.strictEqual(cRes.status, 201);

  // Attempt to confirm
  const confirmRes = await fetch(`${BASE_URL}/api/orders/${orderData.salesOrder.id}/confirm`, { method: 'POST', headers: authHeader(adminToken) });
  const confirmData = await confirmRes.json();
  assert.strictEqual(confirmRes.status, 400);
  assert.match(confirmData.message, /Insufficient stock/);
});

test('Test 5: SALES calls POST /orders/:id/confirm -> 403 Forbidden', async () => {
  // Using the order generated in Test 4 (it is still PENDING because confirmation failed)
  // Fetch latest order ID just to be safe, or just use any valid integer
  const confirmRes = await fetch(`${BASE_URL}/api/orders/9999/confirm`, { method: 'POST', headers: authHeader(salesToken) });
  assert.strictEqual(confirmRes.status, 403);
});

test('Bonus Test: Concurrent request A = 80, B = 50. Available = 100. Only one succeeds', async () => {
  // Using Product 2 which was seeded with 100 physical, 0 reserved
  // Create Order A (qty: 80)
  const qARes = await fetch(`${BASE_URL}/api/quotations`, {
    method: 'POST', headers: authHeader(adminToken),
    body: JSON.stringify({ customerId: testData.customerId, items: [{ productId: testData.productId2, quantity: 80, unitPrice: 100, discountPercent: 0, gstPercent: 0 }] })
  });
  const qA = await qARes.json();
  await fetch(`${BASE_URL}/api/quotations/${qA.quotation.id}/status`, { method: 'PATCH', headers: authHeader(adminToken), body: JSON.stringify({ status: 'SENT' }) });
  await fetch(`${BASE_URL}/api/quotations/${qA.quotation.id}/status`, { method: 'PATCH', headers: authHeader(adminToken), body: JSON.stringify({ status: 'ACCEPTED' }) });
  const oARes = await fetch(`${BASE_URL}/api/quotations/${qA.quotation.id}/convert`, { method: 'POST', headers: authHeader(adminToken) });
  const oA = await oARes.json();

  // Create Order B (qty: 50)
  const qBRes = await fetch(`${BASE_URL}/api/quotations`, {
    method: 'POST', headers: authHeader(adminToken),
    body: JSON.stringify({ customerId: testData.customerId, items: [{ productId: testData.productId2, quantity: 50, unitPrice: 100, discountPercent: 0, gstPercent: 0 }] })
  });
  const qB = await qBRes.json();
  await fetch(`${BASE_URL}/api/quotations/${qB.quotation.id}/status`, { method: 'PATCH', headers: authHeader(adminToken), body: JSON.stringify({ status: 'SENT' }) });
  await fetch(`${BASE_URL}/api/quotations/${qB.quotation.id}/status`, { method: 'PATCH', headers: authHeader(adminToken), body: JSON.stringify({ status: 'ACCEPTED' }) });
  const oBRes = await fetch(`${BASE_URL}/api/quotations/${qB.quotation.id}/convert`, { method: 'POST', headers: authHeader(adminToken) });
  const oB = await oBRes.json();

  // Fire confirmations concurrently
  const [resA, resB] = await Promise.all([
    fetch(`${BASE_URL}/api/orders/${oA.salesOrder.id}/confirm`, { method: 'POST', headers: authHeader(adminToken) }),
    fetch(`${BASE_URL}/api/orders/${oB.salesOrder.id}/confirm`, { method: 'POST', headers: authHeader(adminToken) })
  ]);

  const statusA = resA.status;
  const statusB = resB.status;

  // One should be 200 (success), the other should be 400 (insufficient stock)
  // Because 80 + 50 = 130, which is > 100.
  const successCount = (statusA === 200 ? 1 : 0) + (statusB === 200 ? 1 : 0);
  const failCount = (statusA === 400 ? 1 : 0) + (statusB === 400 ? 1 : 0);

  assert.strictEqual(successCount, 1, 'Exactly one order should succeed');
  assert.strictEqual(failCount, 1, 'Exactly one order should fail');
});
