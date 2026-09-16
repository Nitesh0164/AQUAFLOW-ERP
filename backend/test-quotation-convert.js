import jwt from 'jsonwebtoken';
import 'dotenv/config';

const token = jwt.sign(
  { userId: 1, role: 'ADMIN' },
  process.env.JWT_SECRET || 'aquaflow-secret-key-123',
  { expiresIn: '1h' }
);

async function test() {
  console.log('--- Test 1: Convert an ACCEPTED Quotation (Quotation 1) ---');
  // Quotation 1 is currently ACCEPTED from the last test
  const convertRes = await fetch('http://localhost:5000/api/quotations/1/convert', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await convertRes.json();
  console.log(data);

  console.log('\n--- Test 2: Double Conversion Protection ---');
  const convertRes2 = await fetch('http://localhost:5000/api/quotations/1/convert', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(await convertRes2.json());

  console.log('\n--- Test 3: Checking Enquiry Status ---');
  const enqRes = await fetch('http://localhost:5000/api/enquiries/2', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const enqData = await enqRes.json();
  console.log(`Enquiry Status is now: ${enqData.enquiry?.status}`);
}

test();
