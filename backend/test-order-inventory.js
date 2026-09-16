import jwt from 'jsonwebtoken';
import 'dotenv/config';

const token = jwt.sign(
  { userId: 1, role: 'ADMIN' },
  process.env.JWT_SECRET || 'aquaflow-secret-key-123',
  { expiresIn: '1h' }
);

async function test() {
  console.log('--- Fetching Sales Order 1 with Inventory ---');
  const res = await fetch('http://localhost:5000/api/orders/1', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

test();
