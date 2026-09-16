import jwt from 'jsonwebtoken';
import 'dotenv/config';

const token = jwt.sign(
  { userId: 1, role: 'ADMIN' },
  process.env.JWT_SECRET || 'aquaflow-secret-key-123',
  { expiresIn: '1h' }
);

async function test() {
  console.log('--- Testing Failed Enquiry (Invalid Product) ---');
  const failRes = await fetch('http://localhost:5000/api/enquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      customerId: 1,
      requiredDate: '2026-10-15',
      notes: 'Should fail due to rollback',
      items: [{ productId: 9999, quantity: 4 }] // 9999 doesn't exist
    })
  });
  console.log(await failRes.json());

  console.log('\n--- Testing Successful Enquiry ---');
  const passRes = await fetch('http://localhost:5000/api/enquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      customerId: 1,
      requiredDate: '2026-10-15',
      notes: 'Required for new 50 KLD RO plant',
      items: [
        { productId: 1, quantity: 4 },
        { productId: 2, quantity: 20 },
        { productId: 3, quantity: 6 }
      ]
    })
  });
  const data = await passRes.json();
  console.log(data);

  if (data.enquiry?.id) {
    console.log('\n--- Testing GET /api/enquiries/:id ---');
    const getRes = await fetch(`http://localhost:5000/api/enquiries/${data.enquiry.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(JSON.stringify(await getRes.json(), null, 2));
  }
}

test();
