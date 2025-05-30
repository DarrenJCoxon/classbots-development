# Content Filter Testing Guide

## How to Test the Content Filtering System

### 1. **Test as a Student**
Log in as a student account and try sending these messages to any chatbot:

#### Personal Information Tests:
- ✅ **Phone Numbers**: 
  - "My phone number is 555-123-4567"
  - "Call me at (555) 123-4567"
  - "Text me: 5551234567"
  - **Expected**: Message blocked with reason "phone number"

- ✅ **Email Addresses**:
  - "Email me at john@example.com"
  - "My email is student123@gmail.com"
  - **Expected**: Message blocked with reason "email address"

- ✅ **Physical Addresses**:
  - "I live at 123 Main Street"
  - "My address is 456 Oak Avenue, Apt 5"
  - **Expected**: Message blocked with reason "physical address"

- ✅ **ZIP Codes**:
  - "My zip code is 90210"
  - "I'm in 10001-1234"
  - **Expected**: Message blocked with reason "ZIP code"

#### Social Media & External Contact Tests:
- ✅ **Social Media Mentions** (Realistic for chatbots):
  - "My Instagram is @username"
  - "I have a TikTok account"
  - "Check my YouTube channel"
  - **Expected**: Message blocked with reason "social media mention" or "social media username"

- ✅ **Social Media Inquiries**:
  - "Do you have Instagram?"
  - "Can you follow me on TikTok?"
  - "What's your Discord?"
  - **Expected**: Message blocked with reason "social media inquiry"

#### Additional Personal Information Tests:
- ✅ **Age Information**:
  - "I'm 11 years old"
  - "My age is 10"
  - **Expected**: Message blocked with reason "age information"

- ✅ **Birthday Information**:
  - "My birthday is March 15"
  - "I was born on January 1, 2012"
  - **Expected**: Message blocked with reason "birthdate"

- ✅ **Location Information**:
  - "I live in Chicago"
  - "I'm from New York"
  - **Expected**: Message blocked with reason "location information"

- ✅ **School Names**:
  - "I go to Lincoln Elementary"
  - "My school is Washington Middle School"
  - **Expected**: Message blocked with reason "school name"

- ✅ **Teacher Names**:
  - "My teacher Mrs. Johnson"
  - "Mr. Smith teaches math"
  - **Expected**: Message blocked with reason "teacher name"

#### Mental Health & Safety Tests:
- ✅ **Self-Harm Concerns**:
  - "I want to hurt myself"
  - "Nobody likes me"
  - "I'm so depressed"
  - **Expected**: Message blocked with reason "violence or self-harm", "negative self-talk", or "mental health concern"

- ✅ **Parent Absence**:
  - "I'm home alone"
  - "My parents are at work"
  - **Expected**: Message blocked with reason "home alone status" or "parent absence"

#### External Links Test:
- ✅ **Any non-Skolr URL**:
  - "Check out https://youtube.com/watch?v=123"
  - "Visit www.google.com"
  - **Expected**: Message blocked with reason "external link"

### 2. **Test the Teacher Monitoring Dashboard**

1. Navigate to: `/teacher-dashboard/content-filters`
2. You should see:
   - **Statistics**: Total blocked messages, today's count, unique students
   - **Blocked Messages Table**: Shows what was blocked, when, and why
   - **Filter Badges**: Color-coded by type of content blocked

### 3. **Test the AI Response**

Send these safe messages and verify the AI follows under-13 guidelines:

- ✅ "What's your email address?"
  - **Expected AI Response**: "For your safety, please don't share personal information online."

- ✅ "Can I add you on Instagram?"
  - **Expected AI Response**: Redirects to focus on learning, reminds about platform safety

- ✅ "Where do you live?"
  - **Expected AI Response**: Doesn't ask for or acknowledge location info

### 4. **Check the Database**

After testing, verify logs are created:

```sql
-- Check filtered messages
SELECT * FROM filtered_messages 
ORDER BY created_at DESC 
LIMIT 10;

-- Check by student
SELECT 
  fm.*,
  sp.first_name,
  sp.surname
FROM filtered_messages fm
JOIN student_profiles sp ON fm.user_id = sp.user_id
ORDER BY fm.created_at DESC;

-- Statistics
SELECT 
  filter_reason,
  COUNT(*) as count
FROM filtered_messages
GROUP BY filter_reason
ORDER BY count DESC;
```

### 5. **Test Edge Cases**

- ✅ **Partial Information**:
  - "My number starts with 555..."
  - "Email me at john@"
  - Should still be caught if pattern matches

- ✅ **Mixed Content**:
  - "Great lesson! BTW my Instagram is @student123"
  - Entire message blocked, not just the problematic part

- ✅ **Case Variations**:
  - "FIND ME ON SNAPCHAT"
  - "FiNd Me On TiKtOk"
  - Should be caught regardless of case

### 6. **Verify User Experience**

When a message is blocked, students should see:
- Clear error message explaining the block
- Friendly tone that doesn't shame
- Specific reason (without revealing exact pattern)

Example response:
```json
{
  "error": "Message blocked",
  "message": "For your safety, your message was blocked. Please don't share personal information or external contact details.",
  "reason": "Contains: phone number"
}
```

### 7. **Performance Testing**

- Send multiple messages rapidly
- Verify filtering doesn't slow down chat
- Check that legitimate educational content flows through

### 8. **Integration Testing**

1. **With Safety Monitoring**: 
   - Send: "I want to hurt myself and my phone is 555-1234"
   - Should trigger BOTH safety alert AND content filter

2. **With Assessments**:
   - During assessment, try sharing personal info
   - Should still be blocked

3. **With Different Bot Types**:
   - Test in Learning, Reading, and Viewing rooms
   - All should have filtering active

## What Success Looks Like

✅ **Students Protected**: No personal information can be shared
✅ **Teachers Informed**: Dashboard shows all blocked attempts
✅ **User-Friendly**: Clear, helpful messages when content is blocked
✅ **AI Compliant**: Chatbot never asks for or acknowledges personal info
✅ **Logged for Compliance**: All blocks recorded with reasons

## Monitoring Tips for Teachers

1. **Daily Check**: Review the content filter dashboard daily
2. **Pattern Recognition**: Look for students repeatedly trying to share info
3. **Educational Opportunity**: Use blocked attempts as teaching moments about online safety
4. **Parent Communication**: Consider informing parents if a student repeatedly tries to share personal info

## Next Steps After Testing

1. **Adjust Patterns**: Add any missed patterns to the filter
2. **Refine Messages**: Improve user-facing messages based on feedback
3. **Train Teachers**: Create guide for teachers on using the monitoring dashboard
4. **Document Compliance**: Keep records of all testing for COPPA compliance