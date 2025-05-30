#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Find all files that import ModernButton
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
      if (content.includes("import ModernButton from '@/components/shared/ModernButton'")) {
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
  
  // Replace default import with named import
  content = content.replace(
    /import\s+ModernButton\s+from\s+['"]@\/components\/shared\/ModernButton['"]/g,
    "import { ModernButton } from '@/components/shared/ModernButton'"
  );
  
  // Only write if content changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  
  return false;
};

// Main execution
console.log('Fixing ModernButton imports to use named export...\n');

const srcPath = path.join(__dirname, '..', 'src');
const files = findFiles(srcPath);

console.log(`Found ${files.length} files with ModernButton default imports\n`);

let updatedCount = 0;
files.forEach(file => {
  if (updateFile(file)) {
    console.log(`✓ Fixed: ${path.relative(process.cwd(), file)}`);
    updatedCount++;
  }
});

console.log(`\n✅ Fixed ${updatedCount} files`);
console.log(`\nNow running build to verify...`);