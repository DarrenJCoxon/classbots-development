#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

// Configuration
const config = {
  srcDir: path.join(__dirname, '..', 'src'),
  patterns: [
    '**/*.tsx',
    '**/*.ts',
    '**/*.jsx',
    '**/*.js'
  ],
  excludePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**'
  ]
};

// Migration rules
const migrations = {
  imports: [
    {
      pattern: /import\s*{\s*ModernButton\s*}\s*from\s*['"]@\/components\/shared\/ModernButton['"]/g,
      replacement: "import { Button } from '@/components/ui'",
      description: 'Replace ModernButton import with Button from @/components/ui'
    },
    {
      pattern: /import\s*{\s*ModernButton\s*,\s*IconButton\s*}\s*from\s*['"]@\/components\/shared\/ModernButton['"]/g,
      replacement: "import { Button, IconButton } from '@/components/ui'",
      description: 'Replace ModernButton with IconButton import'
    },
    {
      pattern: /import\s*{\s*IconButton\s*,\s*ModernButton\s*}\s*from\s*['"]@\/components\/shared\/ModernButton['"]/g,
      replacement: "import { IconButton, Button } from '@/components/ui'",
      description: 'Replace ModernButton with IconButton import (reversed order)'
    }
  ],
  components: [
    {
      pattern: /<ModernButton/g,
      replacement: '<Button',
      description: 'Replace ModernButton opening tags'
    },
    {
      pattern: /<\/ModernButton>/g,
      replacement: '</Button>',
      description: 'Replace ModernButton closing tags'
    }
  ]
};

// Statistics tracking
let stats = {
  filesScanned: 0,
  filesModified: 0,
  importsReplaced: 0,
  componentsReplaced: 0,
  errors: []
};

// Find all files matching patterns
function findFiles() {
  const files = [];
  
  config.patterns.forEach(pattern => {
    const matches = glob.sync(path.join(config.srcDir, pattern), {
      ignore: config.excludePatterns
    });
    files.push(...matches);
  });
  
  return [...new Set(files)]; // Remove duplicates
}

// Process a single file
function processFile(filePath) {
  try {
    stats.filesScanned++;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let fileModified = false;
    let fileStats = {
      imports: 0,
      components: 0
    };
    
    // Apply import migrations
    migrations.imports.forEach(migration => {
      const matches = content.match(migration.pattern);
      if (matches) {
        content = content.replace(migration.pattern, migration.replacement);
        fileStats.imports += matches.length;
        stats.importsReplaced += matches.length;
        fileModified = true;
      }
    });
    
    // Apply component migrations
    migrations.components.forEach(migration => {
      const matches = content.match(migration.pattern);
      if (matches) {
        content = content.replace(migration.pattern, migration.replacement);
        fileStats.components += matches.length;
        stats.componentsReplaced += matches.length;
        fileModified = true;
      }
    });
    
    // Write file if modified
    if (fileModified) {
      fs.writeFileSync(filePath, content, 'utf8');
      stats.filesModified++;
      
      console.log(`${colors.green}✓${colors.reset} ${path.relative(process.cwd(), filePath)}`);
      if (fileStats.imports > 0) {
        console.log(`  ${colors.blue}→${colors.reset} Replaced ${fileStats.imports} import(s)`);
      }
      if (fileStats.components > 0) {
        console.log(`  ${colors.blue}→${colors.reset} Replaced ${fileStats.components} component(s)`);
      }
    }
    
  } catch (error) {
    stats.errors.push({
      file: filePath,
      error: error.message
    });
    console.error(`${colors.red}✗${colors.reset} Error processing ${path.relative(process.cwd(), filePath)}: ${error.message}`);
  }
}

// Main migration function
function migrate() {
  console.log(`${colors.bright}ModernButton → Button Migration Script${colors.reset}\n`);
  console.log(`Scanning for files in: ${path.relative(process.cwd(), config.srcDir)}\n`);
  
  const files = findFiles();
  console.log(`Found ${files.length} files to scan\n`);
  
  // Process each file
  files.forEach(processFile);
  
  // Print summary
  console.log(`\n${colors.bright}Migration Summary${colors.reset}`);
  console.log(`${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`Files scanned:    ${stats.filesScanned}`);
  console.log(`Files modified:   ${stats.filesModified}`);
  console.log(`Imports replaced: ${stats.importsReplaced}`);
  console.log(`Components replaced: ${stats.componentsReplaced}`);
  
  if (stats.errors.length > 0) {
    console.log(`\n${colors.red}Errors: ${stats.errors.length}${colors.reset}`);
    stats.errors.forEach(err => {
      console.log(`  - ${path.relative(process.cwd(), err.file)}: ${err.error}`);
    });
  }
  
  console.log(`\n${colors.green}✓ Migration complete!${colors.reset}`);
}

// Dry run function
function dryRun() {
  console.log(`${colors.bright}ModernButton → Button Migration Script (DRY RUN)${colors.reset}\n`);
  console.log(`${colors.yellow}This is a dry run - no files will be modified${colors.reset}\n`);
  console.log(`Scanning for files in: ${path.relative(process.cwd(), config.srcDir)}\n`);
  
  const files = findFiles();
  console.log(`Found ${files.length} files to scan\n`);
  
  let wouldModify = [];
  
  files.forEach(filePath => {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let wouldChange = false;
      let changes = [];
      
      // Check import migrations
      migrations.imports.forEach(migration => {
        const matches = content.match(migration.pattern);
        if (matches) {
          wouldChange = true;
          changes.push(`  ${colors.blue}→${colors.reset} Would replace ${matches.length} import(s)`);
        }
      });
      
      // Check component migrations
      migrations.components.forEach(migration => {
        const matches = content.match(migration.pattern);
        if (matches) {
          wouldChange = true;
          changes.push(`  ${colors.blue}→${colors.reset} Would replace ${matches.length} component(s)`);
        }
      });
      
      if (wouldChange) {
        wouldModify.push({
          file: filePath,
          changes: changes
        });
      }
      
    } catch (error) {
      console.error(`${colors.red}✗${colors.reset} Error reading ${path.relative(process.cwd(), filePath)}: ${error.message}`);
    }
  });
  
  // Print files that would be modified
  if (wouldModify.length > 0) {
    console.log(`${colors.yellow}Files that would be modified:${colors.reset}\n`);
    wouldModify.forEach(item => {
      console.log(`${colors.green}✓${colors.reset} ${path.relative(process.cwd(), item.file)}`);
      item.changes.forEach(change => console.log(change));
    });
    console.log(`\n${colors.yellow}Total files that would be modified: ${wouldModify.length}${colors.reset}`);
  } else {
    console.log(`${colors.green}No files need modification${colors.reset}`);
  }
}

// Check if glob is installed
try {
  require.resolve('glob');
} catch (e) {
  console.error(`${colors.red}Error: 'glob' package is required but not installed.${colors.reset}`);
  console.log(`Please run: ${colors.bright}npm install glob${colors.reset}`);
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || args.includes('-d');

// Run migration
if (isDryRun) {
  dryRun();
} else {
  migrate();
}