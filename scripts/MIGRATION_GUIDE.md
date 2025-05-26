# ModernButton to Button Migration Guide

This guide helps you migrate from the `ModernButton` component to the unified `Button` component from `@/components/ui`.

## Migration Script

A migration script has been created to automate this process: `scripts/migrate-modern-button.js`

### Installation

First, install the required dependency:
```bash
npm install glob
```

### Usage

**Dry Run (recommended first):**
```bash
node scripts/migrate-modern-button.js --dry-run
```

**Execute Migration:**
```bash
node scripts/migrate-modern-button.js
```

## What the Script Does

The script automatically handles the following migrations:

### 1. Import Replacements

```typescript
// Before
import { ModernButton } from '@/components/shared/ModernButton'

// After
import { Button } from '@/components/ui'
```

### 2. Component with IconButton

```typescript
// Before
import { ModernButton, IconButton } from '@/components/shared/ModernButton'

// After
import { Button, IconButton } from '@/components/ui'
```

### 3. Component Usage

```tsx
// Before
<ModernButton variant="primary" size="large">
  Click me
</ModernButton>

// After
<Button variant="primary" size="large">
  Click me
</Button>
```

## Manual Migration Steps

If you prefer to migrate manually or need to handle special cases:

### 1. Find all ModernButton imports
```bash
grep -r "import.*ModernButton" src/
```

### 2. Find all ModernButton usages
```bash
grep -r "<ModernButton" src/
```

### 3. Replace imports
- Search: `import { ModernButton } from '@/components/shared/ModernButton'`
- Replace: `import { Button } from '@/components/ui'`

### 4. Replace component tags
- Search: `<ModernButton`
- Replace: `<Button`
- Search: `</ModernButton>`
- Replace: `</Button>`

## Special Cases to Review

### 1. IconButton Imports
If you're using `IconButton` from the same import, ensure it's also available in `@/components/ui`:
```typescript
import { Button, IconButton } from '@/components/ui'
```

### 2. Custom Props
Review any custom props that might be specific to ModernButton but not supported by the unified Button component.

### 3. Styled Components
If ModernButton was extended using styled-components, you'll need to update those references:
```typescript
// Before
const CustomButton = styled(ModernButton)`
  // styles
`;

// After
const CustomButton = styled(Button)`
  // styles
`;
```

## Verification

After migration, verify:

1. **Build succeeds:** `npm run build`
2. **No TypeScript errors:** `npm run type-check`
3. **Visual appearance:** Check that buttons look correct
4. **Functionality:** Test button interactions

## Rollback

If you need to rollback the changes:
```bash
git checkout -- src/
```

## Migration Summary

The script will provide a summary showing:
- Files scanned
- Files modified
- Imports replaced
- Components replaced
- Any errors encountered

## Troubleshooting

### Common Issues

1. **Missing glob package**
   ```bash
   npm install glob
   ```

2. **Permission errors**
   ```bash
   chmod +x scripts/migrate-modern-button.js
   ```

3. **Path issues**
   Ensure you run the script from the project root directory

### Manual Verification

After running the script, search for any remaining references:
```bash
# Check for any missed imports
grep -r "ModernButton" src/ --exclude-dir=node_modules

# Check for any missed component usage
grep -r "ModernButton" src/ --include="*.tsx" --include="*.jsx"
```