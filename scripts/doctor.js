const fs = require('node:fs');
const path = require('node:path');

const checks = [];

function runCheck(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error: error.message });
  }
}

runCheck('load dotenv', () => {
  require('dotenv');
});

runCheck('load @prisma/client', () => {
  require('@prisma/client');
});

runCheck('load discord.js', () => {
  require('discord.js');
});

runCheck('DATABASE_URL format (file:...)', () => {
  const value = (process.env.DATABASE_URL || 'file:./prisma/dev.db').trim();
  if (!value.startsWith('file:')) {
    throw new Error(`Expected file:... DATABASE_URL, got ${value}`);
  }
});

runCheck('prisma schema exists', () => {
  const schemaPath = path.resolve(process.cwd(), 'prisma', 'schema.prisma');
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Missing ${schemaPath}`);
  }
});

const failed = checks.filter((c) => !c.ok);
for (const c of checks) {
  if (c.ok) {
    console.log(`OK: ${c.name}`);
  } else {
    console.error(`ERROR: ${c.name} -> ${c.error}`);
  }
}

if (failed.length) {
  process.exit(1);
}
