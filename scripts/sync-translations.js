import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '..', 'src');
const enPath = path.resolve(srcDir, 'locales', 'en.json');
const zhPath = path.resolve(srcDir, 'locales', 'zh-CN.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
const zh = JSON.parse(fs.readFileSync(zhPath, 'utf-8'));

const tCalls = new Set();
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const regex = /(?<![.\w])t\(['"`](.+?)['"`][,)]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    tCalls.add(match[1]);
  }
}

function walkDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'locales') {
      walkDir(full);
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      scanFile(full);
    }
  }
}

walkDir(srcDir);

const newKeys = [];
for (const key of tCalls) {
  if (!(key in en)) {
    en[key] = key;
    zh[key] = '';
    newKeys.push(key);
  }
}

fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n');
fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2) + '\n');

if (newKeys.length > 0) {
  console.log('New keys found and added:');
  for (const k of newKeys) console.log(`  - ${k}`);
  console.log('\n⚠ Chinese translations are empty for these new keys. Please fill them in.');
} else {
  console.log('No new keys found. All translations are up to date.');
}
