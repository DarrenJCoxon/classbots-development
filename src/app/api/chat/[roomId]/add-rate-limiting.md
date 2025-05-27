# Adding Rate Limiting to Chat Endpoint

To add rate limiting to the chat POST endpoint, add these imports at the top of the file:

```typescript
import { withRateLimit, RateLimits } from '@/lib/rate-limiter';
```

Then wrap the POST export with rate limiting:

## Current:
```typescript
export async function POST(request: NextRequest) {
  // ... existing code
}
```

## Change to:
```typescript
export const POST = withRateLimit(
  async (request: NextRequest) => {
    // ... existing code (no changes needed inside)
  },
  RateLimits.chat // 60 messages per minute per user
);
```

That's it! The rate limiter will:
- Allow 60 messages per minute per user
- Return 429 status when exceeded
- Add rate limit headers to responses
- Track by IP or auth token