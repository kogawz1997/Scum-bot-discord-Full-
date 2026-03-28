'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const GENERATED_CLIENT_METADATA_PATH = path.join(
  PROJECT_ROOT,
  'artifacts',
  'prisma',
  'generated',
  'current.json',
);

function trimText(value, maxLen = 4000) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.length <= maxLen ? text : text.slice(0, maxLen);
}

function resolveClientModulePath() {
  const directPath = trimText(process.env.PRISMA_CLIENT_MODULE_PATH, 4000);
  if (directPath) {
    return path.isAbsolute(directPath)
      ? directPath
      : path.resolve(PROJECT_ROOT, directPath);
  }
  if (!fs.existsSync(GENERATED_CLIENT_METADATA_PATH)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(GENERATED_CLIENT_METADATA_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    const outputPath = trimText(parsed?.outputPath, 4000);
    if (!outputPath) return null;
    return path.isAbsolute(outputPath)
      ? outputPath
      : path.resolve(PROJECT_ROOT, outputPath);
  } catch {
    return null;
  }
}

function tryRequire(modulePath) {
  if (!modulePath) return null;
  try {
    return require(modulePath);
  } catch {
    return null;
  }
}

function getPrismaClientModule() {
  const generatedModulePath = resolveClientModulePath();
  const generatedModule = tryRequire(generatedModulePath);
  if (generatedModule?.PrismaClient) {
    return generatedModule;
  }
  return require('@prisma/client');
}

function getGeneratedClientMetadata() {
  if (!fs.existsSync(GENERATED_CLIENT_METADATA_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(GENERATED_CLIENT_METADATA_PATH, 'utf8'));
  } catch {
    return null;
  }
}

const prismaClientModule = getPrismaClientModule();

module.exports = {
  GENERATED_CLIENT_METADATA_PATH,
  Prisma: prismaClientModule.Prisma,
  PrismaClient: prismaClientModule.PrismaClient,
  getGeneratedClientMetadata,
  getPrismaClientModule,
  resolveClientModulePath,
};
