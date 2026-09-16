import jwt from 'jsonwebtoken';
import 'dotenv/config';

const adminToken = jwt.sign(
  { userId: 1, role: 'ADMIN' },
  process.env.JWT_SECRET || 'aquaflow-secret-key-123',
  { expiresIn: '1h' }
);

const salesToken = jwt.sign(
  { userId: 2, role: 'SALES' },
  process.env.JWT_SECRET || 'aquaflow-secret-key-123',
  { expiresIn: '1h' }
);

async function test() {
  console.log('--- Test 1: Sales Role cannot confirm (Should fail with 403) ---');
  const salesRes = await fetch('http://localhost:5000/api/orders/1/confirm', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${salesToken}` }
  });
  console.log(`Status: ${salesRes.status}`);

  console.log('\n--- Test 2: Admin confirms order (Should pass and reserve stock) ---');
  const adminRes = await fetch('http://localhost:5000/api/orders/1/confirm', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const data = await adminRes.json();
  console.log(data);

  console.log('\n--- Test 3: Double confirmation protection ---');
  const doubleRes = await fetch('http://localhost:5000/api/orders/1/confirm', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log(await doubleRes.json());

  console.log('\n--- Test 4: Check Inventory Updates ---');
  const invRes = await fetch('http://localhost:5000/api/orders/1', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const invData = await invRes.json();
  const pumpItem = invData.salesOrder.items[0];
  console.log(`Product: ${pumpItem.productName}`);
  console.log(`Required: ${pumpItem.required}`);
  console.log(`Physical: ${pumpItem.physicalQuantity}`);
  console.log(`Reserved: ${pumpItem.reservedQuantity}`);
  console.log(`Available: ${pumpItem.availableQuantity}`);
}

test();
