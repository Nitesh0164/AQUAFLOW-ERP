import jwt from 'jsonwebtoken';
import 'dotenv/config';

const token = jwt.sign(
  { userId: 1, role: 'ADMIN' },
  process.env.JWT_SECRET || 'aquaflow-secret-key-123',
  { expiresIn: '1h' }
);

async function test() {
  console.log('--- Creating Quotation for Enquiry ID 2 ---');
  const postRes = await fetch('http://localhost:5000/api/quotations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      enquiryId: 2,
      customerId: 1,
      validUntil: '2026-10-25',
      items: [
        { 
          productId: 1, 
          quantity: 4, 
          unitPrice: 28500,
          discountPercent: 10, // 28500 * 4 = 114000. Less 10% = 11400. Taxable = 102600. GST @ 18% = 18468. Line = 121068
          gstPercent: 18
        }
      ]
    })
  });
  const data = await postRes.json();
  console.log('Quotation POST Response:', JSON.stringify(data, null, 2));

  if (data.quotation?.id) {
    console.log('\n--- Fetching Quotation by ID ---');
    const getRes = await fetch(`http://localhost:5000/api/quotations/${data.quotation.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(JSON.stringify(await getRes.json(), null, 2));
  }

  console.log('\n--- Verifying Enquiry Status ---');
  const enqRes = await fetch('http://localhost:5000/api/enquiries/2', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const enqData = await enqRes.json();
  console.log(`Enquiry Status is now: ${enqData.enquiry?.status}`);
}

test();
