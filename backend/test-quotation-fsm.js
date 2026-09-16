import jwt from 'jsonwebtoken';
import 'dotenv/config';

const token = jwt.sign(
  { userId: 1, role: 'ADMIN' },
  process.env.JWT_SECRET || 'aquaflow-secret-key-123',
  { expiresIn: '1h' }
);

async function patchStatus(id, newStatus) {
  const res = await fetch(`http://localhost:5000/api/quotations/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ status: newStatus })
  });
  return res.json();
}

async function test() {
  console.log('--- Quotation 1 is currently DRAFT ---');
  console.log('Test 1: DRAFT -> ACCEPTED (Should fail)');
  console.log(await patchStatus(1, 'ACCEPTED'));

  console.log('\nTest 2: DRAFT -> SENT (Should pass)');
  console.log(await patchStatus(1, 'SENT'));

  console.log('\nTest 3: SENT -> ACCEPTED (Should pass)');
  console.log(await patchStatus(1, 'ACCEPTED'));

  console.log('\nTest 4: ACCEPTED -> REJECTED (Should fail)');
  console.log(await patchStatus(1, 'REJECTED'));
}

test();
