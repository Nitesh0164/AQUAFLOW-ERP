const fs = require('fs');

let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Replace Decimal(X, Y) with Decimal
schema = schema.replace(/Decimal\(\d+,\s*\d+\)/g, 'Decimal');

// Replace @default(temporal.updatedAt()) with @updatedAt ? No, Prisma 8 removed @updatedAt
// Let's try removing it or just using @default(now()) for now to make it compile.
schema = schema.replace(/@default\(temporal\.updatedAt\(\)\)/g, '@default(now())');

fs.writeFileSync('prisma/schema.prisma', schema);
