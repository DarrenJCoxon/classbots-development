# Student CSV Import Optimizations

## Current Performance Issues

1. **Sequential Processing**: Each student is processed one by one
2. **500ms Delay Per Student**: Artificial delay after each user creation
3. **Individual Username Checks**: Separate query for each username collision
4. **No Connection Pooling**: Creates new admin client for each request
5. **Multiple DB Operations**: 3-4 separate operations per student

## Performance Impact

For 30 students:
- Current: ~20-30 seconds
- Optimized: ~3-5 seconds

## Key Optimizations to Implement

### 1. Replace Sequential Loop with Parallel Processing

Replace the current loop (lines 139-346) with:

```typescript
// Pre-fetch all existing usernames
const { data: existingUsernameRecords } = await supabaseAdmin
  .from('student_profiles')
  .select('username')
  .not('username', 'is', null);

const existingUsernames = new Set(
  existingUsernameRecords?.map(r => r.username) || []
);

// Process in parallel batches
const BATCH_SIZE = 10;
const results = [];

for (let i = 0; i < records.length; i += BATCH_SIZE) {
  const batch = records.slice(i, i + BATCH_SIZE);
  const batchResults = await Promise.all(
    batch.map(record => processStudent(record, existingUsernames))
  );
  results.push(...batchResults);
  
  // Small delay between batches only
  if (i + BATCH_SIZE < records.length) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
```

### 2. Remove/Reduce the 500ms Delay

Change line 247:
```typescript
// Remove this line entirely or reduce to 50ms max
await new Promise(resolve => setTimeout(resolve, 500));
```

### 3. Use Connection Pool

Replace:
```typescript
const supabaseAdmin = createAdminClient();
```

With:
```typescript
const supabaseAdmin = getAdminClient();
```

### 4. Batch Database Operations

After creating all auth users, batch insert profiles and memberships:

```typescript
// Batch insert all profiles
const profilesData = successfulStudents.map(s => ({
  user_id: s.userId,
  full_name: s.fullName,
  username: s.username,
  pin_code: s.pinCode,
  // ... other fields
}));

await supabaseAdmin
  .from('student_profiles')
  .upsert(profilesData, { onConflict: 'user_id' });

// Batch insert all memberships
const membershipsData = successfulStudents.map(s => ({
  room_id: roomId,
  student_id: s.userId,
  joined_at: new Date().toISOString()
}));

await supabaseAdmin
  .from('room_memberships')
  .upsert(membershipsData, { onConflict: 'room_id,student_id' });
```

### 5. Optimize Username Generation

Create a function that generates unique usernames without database queries:

```typescript
function generateUniqueUsername(
  firstName: string,
  surname: string,
  existingUsernames: Set<string>
): string {
  const baseUsername = `${firstName}${surname}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  
  let username = baseUsername;
  let counter = 1;
  
  while (existingUsernames.has(username)) {
    username = `${baseUsername}${counter}`;
    counter++;
  }
  
  existingUsernames.add(username); // Prevent duplicates in batch
  return username;
}
```

## Implementation Steps

1. **Backup Current Route**: Keep the existing route as a fallback
2. **Test with Small Batches**: Start with 5-10 students
3. **Monitor Rate Limits**: Watch for Supabase Auth API limits
4. **Add Progress Tracking**: Consider Server-Sent Events for real-time progress
5. **Add Error Recovery**: Implement retry logic for failed students

## Expected Results

- **30 students**: From ~20s to ~3-5s (80% improvement)
- **100 students**: From ~70s to ~10-15s
- **Better UX**: Real-time progress updates
- **More Reliable**: Better error handling and recovery

## Alternative: Background Processing

For very large imports (100+ students), consider:

1. **Queue System**: Use Supabase Edge Functions or a job queue
2. **Immediate Response**: Return job ID immediately
3. **Progress Tracking**: Poll or use WebSocket for status
4. **Email Notification**: Send results when complete

## Database Indexes to Add

```sql
-- Improve username lookup performance
CREATE INDEX idx_student_profiles_username ON student_profiles(username);
CREATE INDEX idx_student_profiles_school_id ON student_profiles(school_id);

-- Improve membership checks
CREATE INDEX idx_room_memberships_room_student ON room_memberships(room_id, student_id);
```

## Usage

To use the optimized route:
1. Copy `route-optimized.ts` to replace the existing route
2. Or gradually apply the optimizations to the existing route
3. Test thoroughly with different CSV sizes
4. Monitor performance improvements

The optimized implementation is available in `route-optimized.ts`.