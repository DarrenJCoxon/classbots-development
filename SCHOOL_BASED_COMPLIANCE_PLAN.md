# School-Based Under-13 Compliance Plan

## Overview
This simplified approach leverages schools as the consent authority, which is allowed under COPPA when schools act "in loco parentis" (in place of parents) for school-authorized educational activities.

## Critical Next Steps (Priority Order)

### 1. **Enhanced Content Filtering (IMMEDIATE)**
The most critical immediate step is preventing inappropriate content sharing.

#### 1.1 Message Filtering Implementation
```typescript
// Block personal information sharing
const PERSONAL_INFO_PATTERNS = [
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone numbers
  /\b\d{5}(?:-\d{4})?\b/g, // ZIP codes
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, // IP addresses
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
  /\b(?:my|i live at|address is)\s+\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|lane|ln)\b/gi,
];

// Block social media and external communication
const EXTERNAL_PLATFORM_PATTERNS = [
  /\b(?:snapchat|instagram|tiktok|facebook|whatsapp|discord|telegram|kik)\b/gi,
  /\b(?:add me on|find me on|message me on|dm me)\b/gi,
];

// Block inappropriate content
const INAPPROPRIATE_CONTENT = [
  // Add age-appropriate content filters
];
```

#### 1.2 Link and Media Blocking
- Block ALL external links for under-13 users
- Prevent image/video uploads in chat
- Block base64 encoded images
- Sanitize all HTML content

### 2. **School Agreement & Dashboard (CRITICAL)**

#### 2.1 School Onboarding Flow
1. School administrator creates account
2. Signs digital agreement acknowledging:
   - They have parental consent for educational technology
   - They will comply with COPPA/FERPA requirements
   - They understand data usage and retention
3. Receives school-wide settings dashboard

#### 2.2 School Administrator Features
```typescript
interface SchoolSettings {
  schoolId: string;
  enabledForUnder13: boolean;
  parentalConsentMethod: 'school_managed' | 'individual_required';
  dataRetentionDays: number; // Default: 180 days after school year
  allowedChatHours: { start: string; end: string };
  blockedDates: Date[]; // School holidays
  contentFilterLevel: 'strict' | 'moderate' | 'standard';
  requireTeacherPresence: boolean; // For under-13
}
```

### 3. **Data Minimization (REQUIRED)**

#### 3.1 Reduce Data Collection
For under-13 students, only collect:
- First name only (no surname)
- Grade level
- School ID
- Username (auto-generated, non-identifying)
- NO email, NO birthdate, NO personal details

#### 3.2 Anonymous Identifiers
```typescript
// Generate anonymous student IDs
function generateStudentIdentifier(schoolId: string, grade: string): string {
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${schoolId}-G${grade}-${randomPart}`;
}
```

### 4. **Enhanced Safety Monitoring (URGENT)**

#### 4.1 Real-Time Content Moderation
- Pre-message scanning before AI sees it
- Automatic blocking of concerning content
- Immediate teacher alerts for serious concerns
- Daily safety reports to school admins

#### 4.2 AI Instruction Updates
```typescript
const UNDER_13_SYSTEM_PROMPT = `
You are talking to a student under 13 years old. You must:
- Never ask for or acknowledge personal information
- Redirect any attempts to share personal details
- Keep all conversations educational and age-appropriate
- Never suggest meeting in person or outside communication
- Report any concerning messages immediately
`;
```

### 5. **Time and Access Restrictions**

#### 5.1 School Hours Only
- Automatic access during school hours only
- Configurable by school timezone
- Weekend access requires explicit school permission
- Holiday blackout dates

#### 5.2 Session Limits
- Maximum 45-minute sessions
- Required 15-minute breaks
- Daily usage caps (e.g., 2 hours)
- Automatic logout after inactivity

### 6. **Simplified Database Changes**

```sql
-- Add school consent table
CREATE TABLE school_coppa_agreements (
  agreement_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(school_id),
  agreed_by_user_id uuid REFERENCES teacher_profiles(user_id),
  agreement_version text NOT NULL,
  agreed_to_terms boolean NOT NULL DEFAULT false,
  under_13_enabled boolean DEFAULT false,
  ip_address inet,
  signed_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '1 year')
);

-- Add minimal age tracking
ALTER TABLE student_profiles
ADD COLUMN is_under_13 boolean DEFAULT false,
ADD COLUMN school_managed_consent boolean DEFAULT false;

-- Content filtering logs
CREATE TABLE filtered_messages (
  filter_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(room_id),
  user_id uuid REFERENCES student_profiles(user_id),
  original_message text,
  filter_reason text,
  created_at timestamp with time zone DEFAULT now()
);
```

### 7. **Legal Documentation**

#### 7.1 School Agreement Template
- Clear COPPA compliance requirements
- School's responsibility for parental consent
- Data usage and retention policies
- Liability and indemnification

#### 7.2 Updated Privacy Policy
- Specific section for school-managed accounts
- Clear data minimization practices
- No behavioral advertising
- Educational purpose only

### 8. **Implementation Timeline**

**Week 1: Content Filtering (CRITICAL)**
- Implement message filtering
- Block external links
- Deploy to production

**Week 2: School Dashboard**
- School agreement system
- Basic school admin dashboard
- Age flagging system

**Week 3: Safety Enhancements**
- Enhanced monitoring
- Time restrictions
- AI prompt updates

**Week 4: Testing & Documentation**
- Full compliance testing
- Legal review
- School onboarding materials

## Next Immediate Action Items

1. **TODAY**: Implement basic content filtering for ALL users
2. **THIS WEEK**: Create school agreement system
3. **NEXT WEEK**: Deploy time restrictions and enhanced monitoring

## Advantages of School-Based Approach

1. **Faster Implementation**: No individual parent emails/tracking
2. **Higher Adoption**: Schools already have consent processes
3. **Simpler Management**: One agreement per school vs thousands of parents
4. **COPPA Compliant**: Schools can act as authorized agents
5. **Better for Teachers**: No consent tracking burden

## Risks to Mitigate

1. **School Liability**: Clear agreements and insurance
2. **Audit Trail**: Document all school consents
3. **Regular Reviews**: Annual re-confirmation
4. **Clear Boundaries**: Educational use only
5. **Data Breaches**: Minimize data collected