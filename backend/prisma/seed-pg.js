import pg from 'pg';
import 'dotenv/config';
import bcrypt from 'bcrypt';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  console.log('Start seeding AquaFlow ERP database via pg...');

  try {
    // 1. Seed Users
    const adminPassword = await bcrypt.hash('Admin@123', 10);
    await pool.query(`
      INSERT INTO public."user" (name, email, "passwordHash", role, "updatedAt")
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (email) DO UPDATE 
      SET "passwordHash" = EXCLUDED."passwordHash", role = EXCLUDED.role, "updatedAt" = NOW()
    `, ['Admin User', 'admin@aquaflow.com', adminPassword, 'ADMIN']);
    console.log('Upserted User: Admin User');

    const salesPassword = await bcrypt.hash('Sales@123', 10);
    await pool.query(`
      INSERT INTO public."user" (name, email, "passwordHash", role, "updatedAt")
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (email) DO UPDATE 
      SET "passwordHash" = EXCLUDED."passwordHash", role = EXCLUDED.role, "updatedAt" = NOW()
    `, ['Sales User', 'sales@aquaflow.com', salesPassword, 'SALES']);
    console.log('Upserted User: Sales User');

    // 2. Seed Products
    const products = [
      { code: 'PMP-HP-01', name: 'High Pressure RO Pump', category: 'Pumps', unit: 'PCS', price: 28500.00, qty: 15 },
      { code: 'MEM-4040', name: 'RO Membrane 4040', category: 'Membranes', unit: 'PCS', price: 8500.00, qty: 50 },
      { code: 'VSL-FRP-01', name: 'FRP Pressure Vessel', category: 'Pressure Vessels', unit: 'PCS', price: 12500.00, qty: 25 },
      { code: 'FLT-MMF-01', name: 'Multimedia Filter', category: 'Filters', unit: 'PCS', price: 32000.00, qty: 5 },
      { code: 'PMP-DOS-01', name: 'Chemical Dosing Pump', category: 'Dosing Systems', unit: 'PCS', price: 18000.00, qty: 10 },
      { code: 'VLV-BFV-01', name: 'Butterfly Valve', category: 'Valves', unit: 'PCS', price: 3200.00, qty: 100 },
    ];

    for (const item of products) {
      const prodRes = await pool.query(`
        INSERT INTO public.product ("productCode", "productName", category, unit, "basePrice", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT ("productCode") DO UPDATE 
        SET "productName" = EXCLUDED."productName", "basePrice" = EXCLUDED."basePrice", "updatedAt" = NOW()
        RETURNING id
      `, [item.code, item.name, item.category, item.unit, item.price]);
      
      const productId = prodRes.rows[0].id;
      console.log(`Upserted Product: ${item.code} - ${item.name}`);

      // 3. Seed Inventory
      await pool.query(`
        INSERT INTO public.inventory ("productId", "physicalQuantity", "reservedQuantity", "updatedAt")
        VALUES ($1, $2, 0, NOW())
        ON CONFLICT ("productId") DO UPDATE 
        SET "physicalQuantity" = EXCLUDED."physicalQuantity", "updatedAt" = NOW()
      `, [productId, item.qty]);
      console.log(`Upserted Inventory for Product: ${item.code}`);
    }

    console.log('Seeding finished successfully.');
  } catch(e) {
    console.error('Seeding error:', e);
  } finally {
    await pool.end();
  }
}

seed();
