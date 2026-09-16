import 'dotenv/config';
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { userId: 1, role: 'ADMIN' },
  process.env.JWT_SECRET || 'aquaflow-secret-key-123',
  { expiresIn: '1h' }
);

async function test() {
  console.log('Testing POST /api/customers');
  const postRes = await fetch('http://localhost:5000/api/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      companyName: 'Aqua Systems Ltd',
      contactPerson: 'John Doe',
      mobile: '9876543210',
      city: 'Mumbai',
      email: 'john@aquasystems.com'
    })
  });
  const postData = await postRes.json();
  console.log(postData);

  const customerId = postData.customer?.id;

  console.log('Testing GET /api/customers');
  const getRes = await fetch('http://localhost:5000/api/customers', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(await getRes.json());

  if (customerId) {
    console.log(`Testing GET /api/customers/${customerId}`);
    const getByIdRes = await fetch(`http://localhost:5000/api/customers/${customerId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(await getByIdRes.json());
  }
}

test();
