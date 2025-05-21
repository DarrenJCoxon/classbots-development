# Email Authentication Troubleshooting Guide

## Current Issue
Authentication emails (signup confirmations) are not being sent from Supabase, though they were working previously.

## Quick Diagnostic Steps

### 1. Test Page Created
Navigate to: `http://localhost:3000/test-email-auth`

This page will help test:
- Email signup functionality
- Password reset emails  
- Current auth configuration
- Detailed error logging

### 2. Supabase Dashboard Checks

**Authentication → Settings → Email Auth**
- ✅ Ensure "Enable email confirmations" is ON
- ✅ Ensure "Enable email change confirmations" is ON  
- ✅ Check "Secure email change" setting

**Authentication → Settings → SMTP Settings**
- ✅ Check if custom SMTP is configured
- ✅ If using Supabase's default SMTP, ensure it's not rate limited
- ✅ Verify SMTP credentials if using custom provider

**Authentication → Settings → Email Templates**  
- ✅ Confirm templates are active
- ✅ Check "Confirm signup" template
- ✅ Verify redirect URLs match your domain

### 3. Common Causes & Solutions

#### A. Rate Limiting (Most Common)
Supabase's default SMTP has strict rate limits:
- **Solution**: Set up custom SMTP (Resend, SendGrid, etc.)
- Your `.env.local` shows Resend credentials - these may need to be configured in Supabase dashboard

#### B. Domain/URL Mismatch
- **Check**: Redirect URLs in email templates
- **Ensure**: `emailRedirectTo` matches allowed domains
- **Current setting**: `${window.location.origin}/auth/callback?redirect=...`

#### C. Email Provider Issues
- **Check**: Spam/junk folders
- **Test**: With different email providers (Gmail, Outlook, etc.)
- **Verify**: No email bounces in Supabase logs

#### D. Code Issues
Current signup code in `AuthForm.tsx`:
```javascript
const { error: signUpError } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(teacherRedirect)}`,
    data: signupData
  },
});
```

### 4. Environment Configuration Check

**Current Supabase Settings:**
- URL: `https://geafwqcjiopeinpqykpk.supabase.co`
- Project: `geafwqcjiopeinpqykpk`

**SMTP Settings (from .env.local):**
- Provider: Resend
- Host: `smtp.resend.com`
- Port: `465`
- From: `alerts@skolr.app`

### 5. Immediate Actions

1. **Test the diagnostic page**: `/test-email-auth`
2. **Check Supabase logs**: Look for email delivery errors
3. **Verify Resend integration**: Ensure Resend is configured in Supabase dashboard
4. **Test with fresh email**: Use an email that has never been tested before

### 6. Supabase Dashboard Navigation

1. Go to: https://supabase.com/dashboard/project/geafwqcjiopeinpqykpk
2. Navigate to: **Authentication** → **Settings** 
3. Check all email-related settings
4. Navigate to: **Logs** to see delivery attempts

### 7. Alternative Testing

If the issue persists, try:
```javascript
// Test password reset email (often has different rate limits)
await supabase.auth.resetPasswordForEmail('test@example.com')
```

### 8. Expected Behavior

**Working Flow:**
1. User fills signup form
2. Supabase sends confirmation email
3. User clicks email link  
4. Redirected to `/auth/callback`
5. Profile created and user redirected to dashboard

**Current Flow:**
1. User fills signup form
2. ❌ **No email sent**
3. User never gets confirmation link

## Next Steps

1. Run the test page
2. Check Supabase dashboard settings
3. Review Supabase logs for errors
4. Test with different email addresses
5. Consider switching to custom SMTP if using default Supabase SMTP

## Files Modified for Testing

- ✅ Created: `/src/app/test-email-auth/page.tsx`
- 📋 Review: `/src/components/auth/AuthForm.tsx` (signup logic)
- 📋 Review: `/src/app/auth/callback/route.ts` (callback handler)