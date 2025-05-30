#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  // Find and remove loading={...} props from ModernButton components
  const modernButtonRegex = /<ModernButton([^>]*?)loading=\{[^}]+\}([^>]*?)>/g;
  
  let match;
  while ((match = modernButtonRegex.exec(content)) !== null) {
    const before = match[1];
    const after = match[2];
    const newTag = `<ModernButton${before}${after}>`;
    
    content = content.replace(match[0], newTag);
    updated = true;
    console.log(`Removed loading prop from ModernButton in: ${filePath}`);
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

console.log('Removing loading props from ModernButton...');
processDirectory(srcDir);
console.log('Done!');