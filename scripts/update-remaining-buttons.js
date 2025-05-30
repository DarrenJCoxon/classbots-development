#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Find all files that still import Button from '@/components/ui'
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
      if (content.includes("import { Button } from '@/components/ui'") || 
          content.includes('import { Button } from "@/components/ui"')) {
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
  
  // Check if ModernButton is already imported
  const hasModernButton = content.includes('ModernButton');
  
  // Replace Button imports with ModernButton
  content = content.replace(
    /import\s*{\s*Button\s*}\s*from\s*['"]@\/components\/ui['"]/g,
    "import ModernButton from '@/components/shared/ModernButton'"
  );
  
  // If there were other imports from ui along with Button
  content = content.replace(
    /import\s*{\s*([^}]*),?\s*Button\s*,?\s*([^}]*)\s*}\s*from\s*['"]@\/components\/ui['"]/g,
    (match, before, after) => {
      const otherImports = [before, after].filter(Boolean).join(', ').trim();
      if (otherImports) {
        return `import { ${otherImports} } from '@/components/ui';\nimport ModernButton from '@/components/shared/ModernButton'`;
      }
      return "import ModernButton from '@/components/shared/ModernButton'";
    }
  );
  
  // Replace all Button usages with ModernButton
  // Be careful not to replace Button in other contexts (like type definitions)
  content = content.replace(/<Button\s/g, '<ModernButton ');
  content = content.replace(/<\/Button>/g, '</ModernButton>');
  
  // Only write if content changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  
  return false;
};

// Main execution
console.log('Updating remaining Button imports to ModernButton...\n');

const srcPath = path.join(__dirname, '..', 'src');
const files = findFiles(srcPath);

console.log(`Found ${files.length} files with Button imports from '@/components/ui'\n`);

let updatedCount = 0;
files.forEach(file => {
  if (updateFile(file)) {
    console.log(`✓ Updated: ${path.relative(process.cwd(), file)}`);
    updatedCount++;
  } else {
    console.log(`⚠️  No changes needed: ${path.relative(process.cwd(), file)}`);
  }
});

console.log(`\n✅ Updated ${updatedCount} files`);
console.log(`\nNext steps:`);
console.log(`1. Run 'npm run build' to verify the changes`);
console.log(`2. Test the application to ensure all buttons work correctly`);
console.log(`3. Delete src/components/ui/Button.tsx if everything works`);