# Environment Setup for Skolr

This document outlines the environment variables required for proper operation of the Skolr application.

## Domain Configuration

To ensure magic links and other URLs point to the correct domain, you must set up the following environment variable:

```
NEXT_PUBLIC_APP_URL=https://skolr.app
```

### Important Notes:

1. In development, this can be set to `http://localhost:3000`
2. In production, this **must** be set to `https://skolr.app`
3. The application has fallback logic that will enforce `https://skolr.app` in production, but it's best to set this explicitly

## Where to Configure:

### Development:
- In your local `.env.local` file

### Production:
- In your hosting platform's environment variables section:
  - For Vercel: Project Settings → Environment Variables
  - For Netlify: Site Settings → Build & Deploy → Environment Variables
  - For other platforms: Refer to their documentation

## Critical Features Affected:

The following features rely on correct URL configuration:

1. Magic links for student login
2. CSV student import functionality
3. Room join links
4. Email templates with embedded links
5. OAuth callback URLs

## Verification:

After deploying with updated environment variables, verify that:

1. CSV imports generate links starting with `https://skolr.app/m/`
2. Student magic links work correctly
3. Room join links work correctly

## Troubleshooting:

If you encounter issues with links going to localhost or incorrect domains:

1. Check that `NEXT_PUBLIC_APP_URL` is set correctly in your environment
2. Verify that the build is picking up the environment variables
3. Check the server logs for any "[...] Enforcing production domain for magic link" messages, which indicate the fallback mechanism is being triggered