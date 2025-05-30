#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  // 1. Remove Button from imports where it's imported from StyledComponents
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]@\/styles\/StyledComponents['"]/g;
  const matches = Array.from(content.matchAll(importRegex));
  
  for (const match of matches) {
    const imports = match[1];
    const importItems = imports.split(',').map(item => item.trim());
    
    if (importItems.includes('Button')) {
      // Remove Button from the imports
      const newImportItems = importItems.filter(item => item !== 'Button');
      const newImports = newImportItems.join(', ');
      const newImportStatement = `import { ${newImports} } from '@/styles/StyledComponents'`;
      
      content = content.replace(match[0], newImportStatement);
      updated = true;
      
      // Check if ModernButton is already imported
      if (!content.includes("import { ModernButton }") && !content.includes("import {ModernButton}")) {
        // Add ModernButton import after this import
        const insertPosition = content.indexOf(newImportStatement) + newImportStatement.length;
        content = content.slice(0, insertPosition) + 
                  ";\nimport { ModernButton } from '@/components/shared/ModernButton'" + 
                  content.slice(insertPosition);
      }
    }
  }
  
  // 2. Replace <Button with <ModernButton (but not styled(Button) or IconButton)
  const buttonTagRegex = /<Button\s/g;
  if (content.match(buttonTagRegex)) {
    content = content.replace(buttonTagRegex, '<ModernButton ');
    updated = true;
  }
  
  // 3. Replace </Button> with </ModernButton>
  const buttonCloseTagRegex = /<\/Button>/g;
  if (content.match(buttonCloseTagRegex)) {
    content = content.replace(buttonCloseTagRegex, '</ModernButton>');
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed Button references in: ${filePath}`);
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

console.log('Fixing all Button references...');
processDirectory(srcDir);
console.log('Done!');