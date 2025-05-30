#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/components/teacher/ReadingDocumentUploader.tsx',
  'src/components/teacher/StudentList.tsx',
  'src/components/student/AssessmentList.tsx',
  'src/styles/StyledComponents.ts'
];

const projectRoot = path.join(__dirname, '..');

filesToFix.forEach(filePath => {
  const fullPath = path.join(projectRoot, filePath);
  
  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    let updated = false;

    // Fix default import to named import
    const defaultImportRegex = /import ModernButton from ['"]@\/components\/shared\/ModernButton['"]/g;
    if (content.match(defaultImportRegex)) {
      content = content.replace(defaultImportRegex, "import { ModernButton } from '@/components/shared/ModernButton'");
      updated = true;
      console.log(`Fixed ModernButton import in: ${filePath}`);
    }

    if (updated) {
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
});

console.log('Done!');