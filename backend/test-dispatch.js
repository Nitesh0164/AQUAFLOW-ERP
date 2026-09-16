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
  console.log('--- Test 1: Sales Role cannot dispatch (Should fail with 403) ---');
  const salesRes = await fetch('http://localhost:5000/api/orders/1/dispatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${salesToken}` },
    body: JSON.stringify({ vehicleNumber: 'RJ14AB1234', driverName: 'Rakesh Sharma' })
  });
  console.log(`Status: ${salesRes.status}`);

  console.log('\n--- Test 2: Admin dispatches order (Should pass and finalize inventory) ---');
  const adminRes = await fetch('http://localhost:5000/api/orders/1/dispatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ vehicleNumber: 'RJ14AB1234', driverName: 'Rakesh Sharma' })
  });
  const data = await adminRes.json();
  console.log(data);

  console.log('\n--- Test 3: Double dispatch protection ---');
  const doubleRes = await fetch('http://localhost:5000/api/orders/1/dispatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ vehicleNumber: 'RJ14AB1234', driverName: 'Rakesh Sharma' })
  });
  console.log(await doubleRes.json());

  console.log('\n--- Test 4: Check Finalized Inventory Ledger ---');
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
