const fs = require('fs');

let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Remove @default("0.00") and @default(0) from Decimal fields
schema = schema.replace(/@default\("0\.00"\)/g, '');
schema = schema.replace(/@default\(0\.00\)/g, '');
schema = schema.replace(/@default\(0\)/g, '');

fs.writeFileSync('prisma/schema.prisma', schema);
