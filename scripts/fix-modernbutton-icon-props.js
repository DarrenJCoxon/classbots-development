#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  // Find ModernButton with icon prop
  const modernButtonRegex = /<ModernButton([^>]*)icon=\{<([^/]+)\/>\}([^>]*)>([\s\S]*?)<\/ModernButton>/g;
  
  let match;
  const replacements = [];
  
  while ((match = modernButtonRegex.exec(content)) !== null) {
    const beforeIcon = match[1];
    const iconComponent = match[2];
    const afterIcon = match[3];
    const children = match[4];
    
    // Build the new ModernButton without icon prop
    const newButton = `<ModernButton${beforeIcon}${afterIcon}><${iconComponent} /> ${children}</ModernButton>`;
    
    replacements.push({
      old: match[0],
      new: newButton
    });
  }
  
  // Apply replacements
  for (const replacement of replacements) {
    content = content.replace(replacement.old, replacement.new);
    updated = true;
    console.log(`Fixed icon prop in: ${filePath}`);
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

console.log('Fixing ModernButton icon props...');
processDirectory(srcDir);
console.log('Done!');