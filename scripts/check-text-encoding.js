const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const includeDirs = ['src', 'test', 'docs', 'scripts', 'apps', 'deploy'];
const includeFiles = [
  'README.md',
  'PROJECT_HQ.md',
  'PROJECT_REVIEW.md',
  '.env',
  '.env.example',
  'package.json',
];
const allowedExt = new Set([
  '.js',
  '.cjs',
  '.md',
  '.html',
  '.json',
  '.yml',
  '.yaml',
  '.txt',
  '.cmd',
  '.ps1',
  '.env',
]);

// Keep markers in escaped form so this checker file itself stays clean.
const suspectPatterns = [
  '\u00E0\u00B8', // common Thai mojibake prefix
  '\u00E0\u00B9', // alternate Thai mojibake prefix
  '\u00E2\u20AC', // smart quote/dash mojibake prefix
  '\u00F0\u0178', // emoji mojibake prefix
  '\u00EF\u00BF\u00BD', // replacement-char mojibake sequence
];

function walk(dirPath, outFiles) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      walk(fullPath, outFiles);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (!allowedExt.has(ext)) continue;
    outFiles.push(fullPath);
  }
}

function scanFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);
  const hits = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.includes('\uFFFD')) {
      hits.push({ line: i + 1, token: 'U+FFFD' });
    }
    for (const token of suspectPatterns) {
      if (line.includes(token)) {
        hits.push({ line: i + 1, token });
      }
    }
  }

  return hits;
}

const files = [];
for (const dir of includeDirs) {
  const target = path.join(root, dir);
  if (fs.existsSync(target)) {
    walk(target, files);
  }
}

for (const file of includeFiles) {
  const target = path.join(root, file);
  if (fs.existsSync(target)) {
    files.push(target);
  }
}

let hasError = false;
for (const filePath of files.sort()) {
  const hits = scanFile(filePath);
  if (hits.length === 0) continue;
  hasError = true;
  const rel = path.relative(root, filePath);
  console.error(`ENCODING_ERROR: ${rel}`);
  for (const hit of hits.slice(0, 20)) {
    console.error(`  line ${hit.line}: token "${hit.token}"`);
  }
  if (hits.length > 20) {
    console.error(`  ... and ${hits.length - 20} more hits`);
  }
}

if (hasError) {
  process.exit(1);
}

console.log('OK: no mojibake patterns found');
