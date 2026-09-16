import jwt from 'jsonwebtoken';
import 'dotenv/config';

const token = jwt.sign(
  { userId: 1, role: 'ADMIN' },
  process.env.JWT_SECRET || 'aquaflow-secret-key-123',
  { expiresIn: '1h' }
);

async function test() {
  console.log('Testing GET /api/products');
  const prodRes = await fetch('http://localhost:5000/api/products', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(await prodRes.json());

  console.log('Testing GET /api/inventory');
  const invRes = await fetch('http://localhost:5000/api/inventory', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(JSON.stringify(await invRes.json(), null, 2));
}

test();
