# Classbots Development - Cleanup Report

## Summary

This report identifies files, components, and dependencies that can be removed or consolidated to improve codebase maintainability.

## 1. Unused Files That Can Be Deleted

### Already Deleted (from git status)
These files have already been removed and can be committed:

#### Debug/Test Files
- `/src/app/api/chat/debug-error/route.ts` - Debug endpoint
- `/src/app/api/debug-cache/route.ts` - Debug endpoint
- `/src/app/test-pdf/page.tsx` - Test page
- `/test-skolrread-flow.js` - Test script
- `/public/test.pdf` - Test asset

#### Deprecated PDF Viewer Implementation
- `/src/app/api/pdf-proxy/route.ts` - Old PDF proxy
- `/src/app/api/pdf-viewer/route.ts` - Old PDF viewer API
- `/public/pdf-worker/pdf.worker.min.js` - PDF.js worker
- `/public/pdf-worker/pdf.worker.min.mjs` - PDF.js worker
- `/src/components/shared/ReliablePDFViewer.tsx` - Old PDF viewer component
- `/src/types/pdfparse.d.ts` - Old PDF parser types

#### Removed SkolrRead Feature
- `/src/app/api/teacher/skolrread/[sessionId]/route.ts`
- `/src/app/api/teacher/skolrread/route.ts`
- `/src/app/api/teacher/skolrread/upload/route.ts`
- `/src/app/student/read/[documentId]/page.tsx`
- `/src/app/teacher-dashboard/rooms/[roomId]/skolrread/[sessionId]/edit/page.tsx`
- `/src/app/teacher-dashboard/rooms/[roomId]/skolrread/[sessionId]/page.tsx`
- `/src/app/teacher-dashboard/rooms/[roomId]/skolrread/create/page.tsx`
- `/src/app/teacher-dashboard/rooms/[roomId]/skolrread/page.tsx`
- `/src/components/teacher/SkolrReadDocumentUploader.tsx`
- `/src/app/api/student/document/[documentId]/route.ts`

#### Documentation/Setup Files
- `/READING_FEATURE_PLAN.md` - Old feature plan
- `/project.txt` - Old project notes
- `/clean-supabase-setup/` - Entire directory (old setup files)
- `/src/app/teacher-dashboard/rooms/[roomId]/students/[studentId]/NOTES.md`

#### Old Migration Files
All files in `/supabase/migrations/backup/` can be deleted as they are old migration backups.

## 2. Components That Have Been Replaced

### UI Component Duplication
The codebase has multiple implementations of similar components:

#### Loading Components (3 implementations)
- `/src/components/shared/LoadingSpinner.tsx` - Original spinner
- `/src/components/shared/AnimatedLoader.tsx` - New animated version
- `/src/components/shared/ModernLoader.tsx` - Another modern version

**Recommendation**: Standardize on `AnimatedLoader.tsx` and remove the others.

#### Room List Components (3 implementations)
- `/src/components/teacher/RoomList.tsx` - Original implementation
- `/src/components/teacher/SimpleRoomsList.tsx` - Simplified version
- `/src/components/teacher/ModernRoomsList.tsx` - Modern redesign

**Recommendation**: The app currently uses `ModernRoomsList`. Remove `RoomList.tsx` and `SimpleRoomsList.tsx`.

#### Room Card Components (2 implementations)
- `/src/components/teacher/SimpleRoomCard.tsx` - Simple version
- `/src/components/teacher/ModernRoomCard.tsx` - Modern version

**Recommendation**: Remove `SimpleRoomCard.tsx` as `ModernRoomCard.tsx` is being used.

#### Dashboard Components (2 implementations)
- `/src/components/teacher/Dashboard.tsx` - Original dashboard
- `/src/components/teacher/ModernDashboard.tsx` - Modern redesign

**Recommendation**: The app uses `ModernDashboard`. Remove the original `Dashboard.tsx`.

## 3. API Routes for Emergency Use Only

### Emergency Access Route
- `/src/app/api/emergency-room-access/route.ts`

This is a "last-resort emergency endpoint" with extensive workarounds and should only be used when normal authentication flows fail. Consider documenting this clearly and potentially moving it to a separate emergency utilities folder.

## 4. Duplicate Functionality to Consolidate

### Card Components
Multiple card implementations exist:
- `GlassCard` - Glass morphism card
- `DashboardCard` - Dashboard-specific card
- `StatsCard` - Statistics card
- `ChatbotCard` - Chatbot-specific card

**Recommendation**: Create a single flexible card component with variants.

### Button Components
- `AnimatedButton` - Animated button
- `ModernButton` - Modern styled button

**Recommendation**: Consolidate into a single button component with animation options.

## 5. Unused Dependencies in package.json

Based on code analysis, these dependencies appear to be unused:

### Definitely Unused
- `react-pdf` (^9.2.1) - No imports found in codebase
- `nodemailer` (^7.0.3) - No imports found, using Resend instead
- `@types/nodemailer` (^6.4.17) - TypeScript types for unused nodemailer
- `@types/react-pdf` (^6.2.0) - TypeScript types for unused react-pdf

### Potentially Unused (Verify Before Removing)
- `critters` (^0.0.23) - CSS optimization, check if used in build process
- `node-fetch` (^2.7.0) - Native fetch is available in Node 18+
- `tr46` (^5.1.1) - URL handling, might be indirect dependency

### Keep But Monitor
- `pdf2json` (^3.1.6) - Currently used in `/src/lib/document-processing/pdf-extractor.ts`
- `multer` (^1.4.5-lts.2) - Check if still used for file uploads

## 6. Additional Cleanup Recommendations

### 1. Consolidate Theme System
The app has multiple styling approaches:
- Styled Components theme
- Glass morphism utilities
- Direct CSS in components

**Recommendation**: Standardize on the new theme system with design tokens.

### 2. Remove Test/Development Code
- Remove console.log statements in production code
- Remove commented-out code blocks
- Clean up TODO comments

### 3. Organize Imports
Many files have inconsistent import ordering. Consider using an import sorter.

### 4. Type Safety Improvements
- Remove `@ts-expect-error` comments where possible
- Add proper types for API responses
- Remove `any` types

### 5. File Organization
- Move all PDF-related utilities to a single module
- Consolidate authentication helpers
- Group related API routes

## Action Items

### Immediate Actions (Safe to do now)
1. Remove unused dependencies from package.json
2. Delete already-removed files (commit the deletions)
3. Remove duplicate loading components
4. Remove old room list implementations
5. Remove old dashboard component

### Requires Testing
1. Verify emergency access route is documented
2. Test that pdf2json is still needed
3. Confirm multer usage
4. Check build process for critters usage

### Future Improvements
1. Consolidate card components into variants
2. Unify button components
3. Standardize theme system
4. Add ESLint rules for imports and console.logs