#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Find all files that import Button or IconButton from ui
const findFiles = (dir, fileList = []) => {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and .next
      if (!file.includes('node_modules') && !file.includes('.next')) {
        findFiles(filePath, fileList);
      }
    } else if ((file.endsWith('.tsx') || file.endsWith('.ts')) && !file.includes('.d.ts')) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content.includes("from '@/components/ui'") && 
          (content.includes("Button") || content.includes("IconButton"))) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
};

// Update the imports
const updateFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // Check what is being imported from ui
  const importMatch = content.match(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]@\/components\/ui['"]/);
  
  if (importMatch) {
    const imports = importMatch[1].split(',').map(s => s.trim());
    const hasButton = imports.includes('Button');
    const hasIconButton = imports.includes('IconButton');
    const otherImports = imports.filter(imp => imp !== 'Button' && imp !== 'IconButton');
    
    let newImportLines = [];
    
    // Add ModernButton imports if needed
    if (hasButton || hasIconButton) {
      const modernImports = [];
      if (hasButton) modernImports.push('ModernButton');
      if (hasIconButton) modernImports.push('IconButton');
      newImportLines.push(`import { ${modernImports.join(', ')} } from '@/components/shared/ModernButton';`);
    }
    
    // Keep other imports from ui if any
    if (otherImports.length > 0) {
      newImportLines.push(`import { ${otherImports.join(', ')} } from '@/components/ui';`);
    }
    
    // Replace the original import
    content = content.replace(importMatch[0], newImportLines.join('\n'));
    
    // Replace Button usage with ModernButton
    if (hasButton) {
      content = content.replace(/<Button\s/g, '<ModernButton ');
      content = content.replace(/<\/Button>/g, '</ModernButton>');
    }
  }
  
  // Only write if content changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  
  return false;
};

// Main execution
console.log('Fixing Button and IconButton imports...\n');

const srcPath = path.join(__dirname, '..', 'src');
const files = findFiles(srcPath);

console.log(`Found ${files.length} files with Button/IconButton imports from ui\n`);

let updatedCount = 0;
files.forEach(file => {
  if (updateFile(file)) {
    console.log(`✓ Fixed: ${path.relative(process.cwd(), file)}`);
    updatedCount++;
  }
});

console.log(`\n✅ Fixed ${updatedCount} files`);