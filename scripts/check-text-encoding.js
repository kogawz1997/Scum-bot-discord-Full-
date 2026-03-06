const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const includeDirs = ['src', 'test', 'docs'];
const includeFiles = ['README.md', 'PROJECT_REVIEW.md', '.env.example'];
const allowedExt = new Set([
  '.js',
  '.md',
  '.html',
  '.json',
  '.yml',
  '.yaml',
  '.txt',
  '.env',
]);

const suspectPatterns = [
  'à¸',
  'à¹',
  'â€™',
  'â€œ',
  'â€',
  'â€“',
  'â€”',
  'ðŸ',
  'ï¸',
  'ï¿½',
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
