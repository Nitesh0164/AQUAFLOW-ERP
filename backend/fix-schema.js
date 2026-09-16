const fs = require('fs');

let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Remove generator block
schema = schema.replace(/generator client\s*\{[^}]+\}/g, '');

// Remove datasource block
schema = schema.replace(/datasource db\s*\{[^}]+\}/g, '');

// Replace @updatedAt with @default(temporal.updatedAt())
// Wait, the error said "field-preset call". Let's try @default(temporal.updatedAt())
schema = schema.replace(/@updatedAt/g, '@default(temporal.updatedAt())');

// Replace Decimal @db.Decimal(X, Y) with Decimal(X, Y)
schema = schema.replace(/Decimal\s+@db\.Decimal\(([^)]+)\)/g, 'Decimal($1)');

fs.writeFileSync('prisma/schema.prisma', schema);
