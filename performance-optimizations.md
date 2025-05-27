# Page Load Performance Optimizations

## 1. 🎯 Implement Code Splitting & Lazy Loading

### Problem: Loading everything upfront
- Heavy components like Chat, PDFViewer loaded on every page
- Large dependencies (pdf2json, jsdom, mammoth) in bundle

### Solution:
```typescript
// Before
import { Chat } from '@/components/shared/Chat';

// After
import dynamic from 'next/dynamic';
const Chat = dynamic(() => import('@/components/shared/Chat'), {
  loading: () => <ChatSkeleton />,
  ssr: false
});
```

## 2. ⚡ Optimize Initial Data Loading

### Problem: Sequential data fetching
Teacher dashboard loads 6+ queries sequentially

### Solution: Parallel data fetching
```typescript
// Create API endpoint that returns all dashboard data
// /api/teacher/dashboard-data
const [stats, activity, rooms] = await Promise.all([
  fetch('/api/teacher/dashboard-stats'),
  fetch('/api/teacher/recent-activity'),
  fetch('/api/teacher/rooms')
]);
```

## 3. 📦 Reduce Bundle Size

### Heavy Dependencies to Optimize:
- `jsdom` (26.1.0) - Only needed server-side
- `pdf2json` (3.1.6) - Only needed for processing
- `mammoth` (1.9.0) - Only needed for DOCX

### Solution: Move to API routes only
```typescript
// Don't import in client components
// Move to API routes or dynamic imports
```

## 4. 🖼️ Optimize Images

### Add Next.js Image optimization:
```typescript
import Image from 'next/image';

<Image
  src="/images/skolr-logo.png"
  alt="Logo"
  width={200}
  height={50}
  priority // For above-fold images
  placeholder="blur"
/>
```

## 5. 🔄 Implement Static Generation

### For marketing pages:
```typescript
// src/app/page.tsx
export const revalidate = 3600; // Revalidate every hour

// Pre-render at build time
export async function generateStaticParams() {
  return [];
}
```

## 6. 💾 Add Aggressive Caching

### In next.config.ts:
```typescript
async headers() {
  return [
    {
      source: '/_next/static/:path*',
      headers: [{
        key: 'Cache-Control',
        value: 'public, max-age=31536000, immutable',
      }],
    },
    {
      source: '/api/:path*',
      headers: [{
        key: 'Cache-Control',
        value: 'private, max-age=0, must-revalidate',
      }],
    },
  ];
}
```

## 7. 🎨 Optimize Styled Components

### Enable CSS extraction:
```typescript
// next.config.ts
compiler: {
  styledComponents: {
    displayName: false, // Disable in production
    ssr: true,
    fileName: false,
    cssProp: true,
    minify: true, // Add this
  },
},
```

## 8. 🚦 Progressive Enhancement

### Show content immediately:
```typescript
// Show skeleton while loading
if (loading) return <DashboardSkeleton />;

// Show partial data as it arrives
return (
  <Dashboard>
    {stats ? <StatsCards data={stats} /> : <StatsCardsSkeleton />}
    {activity ? <ActivityFeed data={activity} /> : <ActivitySkeleton />}
  </Dashboard>
);
```

## 9. 🔧 Optimize API Routes

### Add response caching:
```typescript
export async function GET(request: NextRequest) {
  // Set cache headers
  const response = NextResponse.json(data);
  response.headers.set('Cache-Control', 'private, max-age=60');
  return response;
}
```

## 10. 📊 Add Performance Monitoring

### Track Core Web Vitals:
```typescript
// src/app/layout.tsx
export function reportWebVitals(metric: any) {
  console.log(metric);
  // Send to analytics
}
```

## Quick Wins (Do These First):

1. **Lazy load heavy components** (Chat, PDF viewers)
2. **Parallel data fetching** on dashboard
3. **Add loading skeletons** for perceived performance
4. **Enable gzip compression** in production
5. **Preconnect to external domains**:
   ```html
   <link rel="preconnect" href="https://your-supabase-url.supabase.co" />
   <link rel="preconnect" href="https://openrouter.ai" />
   ```

## Expected Results:
- Initial page load: 3-5s → Under 1s
- Time to Interactive: 5-8s → 2-3s
- Lighthouse Score: 60-70 → 90+