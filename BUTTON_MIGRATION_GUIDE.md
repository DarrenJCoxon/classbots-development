# Button Migration Guide

## Migration from ModernButton to Unified Button Component

### Import Changes

Replace:
```tsx
import { ModernButton } from '@/components/shared/ModernButton';
import { ModernButton, IconButton } from '@/components/shared/ModernButton';
```

With:
```tsx
import { Button, IconButton } from '@/components/ui';
```

### Component Usage Changes

1. **Basic Button**
   ```tsx
   // Old
   <ModernButton variant="primary" size="medium">
     Click me
   </ModernButton>
   
   // New
   <Button variant="primary" size="medium">
     Click me
   </Button>
   ```

2. **Button with Icon**
   ```tsx
   // Old
   <ModernButton variant="primary">
     <FiPlus />
     Add Item
   </ModernButton>
   
   // New
   <Button variant="primary" icon={<FiPlus />}>
     Add Item
   </Button>
   ```

3. **Button with Icon on Right**
   ```tsx
   // Old
   <ModernButton variant="primary">
     Next
     <FiArrowRight />
   </ModernButton>
   
   // New
   <Button variant="primary" iconRight={<FiArrowRight />}>
     Next
   </Button>
   ```

4. **Loading States**
   ```tsx
   // Old
   <ModernButton disabled={isLoading}>
     {isLoading ? 'Loading...' : 'Submit'}
   </ModernButton>
   
   // New
   <Button loading={isLoading}>
     Submit
   </Button>
   ```

5. **Icon Button**
   ```tsx
   // Old
   <IconButton>
     <FiSettings />
   </IconButton>
   
   // New
   <IconButton icon={<FiSettings />} aria-label="Settings" />
   ```

### Mobile Responsiveness

The unified Button component includes enhanced mobile responsiveness:
- Automatically adjusts padding and font size on mobile
- ButtonGroup stacks vertically on mobile/tablet
- Full width buttons on mobile when in ButtonGroup

### Files to Update

High priority files (user-facing):
- [x] `/src/app/page.tsx` - Homepage
- [x] `/src/app/auth/page.tsx` - Auth page
- [x] `/src/app/teacher-dashboard/rooms/page.tsx` - Rooms page
- [x] `/src/components/teacher/ModernDashboard.tsx` - Dashboard
- [x] `/src/components/teacher/ModernRoomsList.tsx` - Rooms list
- [x] `/src/components/teacher/ModernRoomCard.tsx` - Room cards
- [x] `/src/components/teacher/ChatbotList.tsx` - Chatbot list
- [x] `/src/components/teacher/ConcernsList.tsx` - Concerns list
- [x] `/src/components/shared/Chat.tsx` - Chat component
- [x] `/src/components/shared/ChatInput.tsx` - Chat input

Remaining files to update:
- `/src/app/student-access/page.tsx`
- `/src/app/join-room/page.tsx`
- `/src/app/student/dashboard/page.tsx`
- `/src/app/teacher-dashboard/chatbots/page.tsx`
- `/src/app/teacher-dashboard/assessments/page.tsx`
- `/src/components/teacher/ChatbotForm.tsx`
- `/src/components/teacher/DocumentUploader.tsx`
- `/src/components/teacher/EditRoomModal.tsx`
- And others...

### Testing Checklist

After migration, test:
1. [ ] Button hover states work correctly
2. [ ] Loading states display properly
3. [ ] Disabled states are visually clear
4. [ ] Mobile responsiveness (buttons resize and stack properly)
5. [ ] Icons display correctly
6. [ ] Button groups layout properly on all screen sizes
7. [ ] Full width buttons work as expected