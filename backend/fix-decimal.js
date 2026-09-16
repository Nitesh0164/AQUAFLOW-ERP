const fs = require('fs');

let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Replace @default(0.00) with @default("0.00")
schema = schema.replace(/@default\(0\.00\)/g, '@default("0.00")');

fs.writeFileSync('prisma/schema.prisma', schema);
