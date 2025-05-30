#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  // Fix ChatbotList.tsx - remove LinkButton from ui import
  if (filePath.includes('ChatbotList.tsx')) {
    const oldImport = `import { Grid, Card, CardBody, LinkButton, Text, Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell, Badge } from '@/components/ui';`;
    const newImport = `import { Grid, Card, CardBody, Text, Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell, Badge } from '@/components/ui';`;
    
    if (content.includes(oldImport)) {
      content = content.replace(oldImport, newImport);
      updated = true;
      console.log(`Fixed LinkButton import in: ${filePath}`);
    }
  }

  // Fix ModernDashboard.tsx - import ButtonGroup from ModernButton
  if (filePath.includes('ModernDashboard.tsx')) {
    // Remove ButtonGroup from ui import
    const oldImport = `import { PageWrapper, Container, Grid, Section, StatsCard, SectionTitle, Flex, ButtonGroup, Heading, Text, Stack } from '@/components/ui';`;
    const newImport = `import { PageWrapper, Container, Grid, Section, StatsCard, SectionTitle, Flex, Heading, Text, Stack } from '@/components/ui';`;
    
    if (content.includes(oldImport)) {
      content = content.replace(oldImport, newImport);
      
      // Add ButtonGroup to ModernButton import
      const modernButtonImport = `import { ModernButton } from '@/components/shared/ModernButton';`;
      const newModernButtonImport = `import { ModernButton, ButtonGroup } from '@/components/shared/ModernButton';`;
      
      if (content.includes(modernButtonImport)) {
        content = content.replace(modernButtonImport, newModernButtonImport);
        updated = true;
        console.log(`Fixed ButtonGroup import in: ${filePath}`);
      }
    }
  }

  // Fix ModernRoomsList.tsx - import ButtonGroup from ModernButton
  if (filePath.includes('ModernRoomsList.tsx')) {
    // Find and update imports with ButtonGroup from ui
    const uiImportRegex = /import\s*\{([^}]*ButtonGroup[^}]*)\}\s*from\s*['"]@\/components\/ui['"];?/g;
    const matches = content.match(uiImportRegex);
    
    if (matches) {
      matches.forEach(match => {
        // Extract imports
        const importItems = match.match(/\{([^}]+)\}/)[1];
        const items = importItems.split(',').map(item => item.trim());
        
        // Remove ButtonGroup
        const newItems = items.filter(item => !item.includes('ButtonGroup'));
        
        if (newItems.length !== items.length) {
          const newImport = `import { ${newItems.join(', ')} } from '@/components/ui';`;
          content = content.replace(match, newImport);
          updated = true;
          console.log(`Removed ButtonGroup from ui import in: ${filePath}`);
        }
      });
      
      // Check if ButtonGroup needs to be added to ModernButton import
      const modernButtonImportRegex = /import\s*\{([^}]+)\}\s*from\s*['"]@\/components\/shared\/ModernButton['"];?/;
      const modernButtonMatch = content.match(modernButtonImportRegex);
      
      if (modernButtonMatch && !modernButtonMatch[1].includes('ButtonGroup')) {
        const items = modernButtonMatch[1].split(',').map(item => item.trim());
        items.push('ButtonGroup');
        const newImport = `import { ${items.join(', ')} } from '@/components/shared/ModernButton';`;
        content = content.replace(modernButtonMatch[0], newImport);
        console.log(`Added ButtonGroup to ModernButton import in: ${filePath}`);
      }
    }
  }

  // Fix auth/page.tsx - replace iconRight with just icon
  if (filePath.includes('auth/page.tsx')) {
    const iconRightRegex = /iconRight=\{<FiArrowRight\s*\/>\}/g;
    if (content.match(iconRightRegex)) {
      content = content.replace(iconRightRegex, 'icon={<FiArrowRight />}');
      updated = true;
      console.log(`Fixed iconRight to icon in: ${filePath}`);
    }
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

console.log('Fixing Button-related imports...');
processDirectory(srcDir);
console.log('Done!');