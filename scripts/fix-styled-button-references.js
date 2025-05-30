#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/app/teacher-dashboard/rooms/page.tsx',
  'src/components/teacher/ReadingDocumentUploader.tsx',
  'src/components/teacher/StudentList.tsx',
  'src/components/student/AssessmentList.tsx',
  'src/app/teacher-dashboard/assessments/[assessmentId]/page.tsx',
  'src/styles/StyledComponents.ts'
];

const projectRoot = path.join(__dirname, '..');

filesToFix.forEach(filePath => {
  const fullPath = path.join(projectRoot, filePath);
  
  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    let updated = false;

    // Replace styled(Button) with styled(ModernButton)
    if (content.includes('styled(Button)')) {
      content = content.replace(/styled\(Button\)/g, 'styled(ModernButton)');
      updated = true;
      
      // Check if ModernButton is imported
      if (!content.includes('ModernButton') || content.includes('import.*ModernButton')) {
        // Add ModernButton import if not present
        const importRegex = /import[\s\S]*?from\s+['"]@\/components\/shared\/ModernButton['"]/;
        if (!importRegex.test(content)) {
          // Find a good place to add the import (after other imports)
          const lastImportMatch = content.match(/import[^;]+from\s+['"][^'"]+['"];?\s*\n/g);
          if (lastImportMatch) {
            const lastImport = lastImportMatch[lastImportMatch.length - 1];
            const insertPosition = content.indexOf(lastImport) + lastImport.length;
            content = content.slice(0, insertPosition) + 
                      "import { ModernButton } from '@/components/shared/ModernButton';\n" + 
                      content.slice(insertPosition);
          } else {
            // Add at the beginning after 'use client' if present
            const useClientMatch = content.match(/['"]use client['"];?\s*\n/);
            if (useClientMatch) {
              const insertPosition = useClientMatch.index + useClientMatch[0].length;
              content = content.slice(0, insertPosition) + 
                        "\nimport { ModernButton } from '@/components/shared/ModernButton';\n" + 
                        content.slice(insertPosition);
            } else {
              content = "import { ModernButton } from '@/components/shared/ModernButton';\n\n" + content;
            }
          }
        }
      }
      
      console.log(`Fixed styled(Button) references in: ${filePath}`);
    }

    if (updated) {
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
});

console.log('Done!');