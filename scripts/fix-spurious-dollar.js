#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  // Remove lines that contain only whitespace and a $
  const lines = content.split('\n');
  const newLines = lines.filter(line => {
    const trimmed = line.trim();
    if (trimmed === '$') {
      updated = true;
      console.log(`Removed spurious $ line in: ${filePath}`);
      return false;
    }
    return true;
  });

  if (updated) {
    content = newLines.join('\n');
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

console.log('Removing spurious $ lines...');
processDirectory(srcDir);
console.log('Done!');