const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding AquaFlow ERP database...');

  // Create Users
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@aquaflow.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@aquaflow.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log(`Upserted User: ${adminUser.name}`);

  const salesPassword = await bcrypt.hash('Sales@123', 10);
  const salesUser = await prisma.user.upsert({
    where: { email: 'sales@aquaflow.com' },
    update: {},
    create: {
      name: 'Sales User',
      email: 'sales@aquaflow.com',
      passwordHash: salesPassword,
      role: 'SALES',
    },
  });
  console.log(`Upserted User: ${salesUser.name}`);

  // Create Products
  const productsData = [
    { code: 'PMP-HP-01', name: 'High Pressure RO Pump', category: 'Pumps', unit: 'PCS', price: 28500.00, qty: 15 },
    { code: 'MEM-4040', name: 'RO Membrane 4040', category: 'Membranes', unit: 'PCS', price: 8500.00, qty: 50 },
    { code: 'VSL-FRP-01', name: 'FRP Pressure Vessel', category: 'Pressure Vessels', unit: 'PCS', price: 12500.00, qty: 25 },
    { code: 'FLT-MMF-01', name: 'Multimedia Filter', category: 'Filters', unit: 'PCS', price: 32000.00, qty: 5 },
    { code: 'PMP-DOS-01', name: 'Chemical Dosing Pump', category: 'Dosing Systems', unit: 'PCS', price: 18000.00, qty: 10 },
    { code: 'VLV-BFV-01', name: 'Butterfly Valve', category: 'Valves', unit: 'PCS', price: 3200.00, qty: 100 },
  ];

  for (const item of productsData) {
    const product = await prisma.product.upsert({
      where: { productCode: item.code },
      update: {},
      create: {
        productCode: item.code,
        productName: item.name,
        category: item.category,
        unit: item.unit,
        basePrice: item.price,
      },
    });

    console.log(`Upserted Product: ${product.productCode} - ${product.productName}`);

    // Create or update Inventory
    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: {},
      create: {
        productId: product.id,
        physicalQuantity: item.qty,
        reservedQuantity: 0,
      },
    });
    console.log(`Upserted Inventory for Product: ${product.productCode}`);
  }

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
