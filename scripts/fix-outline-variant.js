#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  // Replace variant="outline" with variant="ghost" for ModernButton
  const outlineVariantRegex = /variant="outline"/g;
  
  if (content.match(outlineVariantRegex)) {
    content = content.replace(outlineVariantRegex, 'variant="ghost"');
    updated = true;
    console.log(`Fixed outline variant in: ${filePath}`);
  }

  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      processDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      processFile(fullPath);
    }
  }
}

console.log('Fixing outline variant references...');
processDirectory(srcDir);
console.log('Done!');