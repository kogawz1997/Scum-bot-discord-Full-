const { PrismaClient } = require('@prisma/client');

// singleton
const prisma = new PrismaClient();

module.exports = {
  prisma,
};

