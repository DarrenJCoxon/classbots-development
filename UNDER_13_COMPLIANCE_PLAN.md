# Under-13 Compliance Implementation Plan for Skolr

## Overview
This document outlines the comprehensive plan to make Skolr compliant with COPPA (Children's Online Privacy Protection Act), FERPA (Family Educational Rights and Privacy Act), and GDPR for users under 13 years old.

## Current Safety Features (Already Implemented)
- ✅ AI-powered safety monitoring for concerning content
- ✅ Automatic teacher alerts for safety concerns
- ✅ Country-specific helpline integration
- ✅ Supportive messages for students in distress
- ✅ Username/PIN authentication (no real email required)
- ✅ Teacher-controlled room access
- ✅ Row Level Security (RLS) on all data

## Phase 1: Database Schema Updates (Priority: CRITICAL)

### 1.1 Student Profile Updates
```sql
-- Add age-related fields to student_profiles
ALTER TABLE student_profiles 
ADD COLUMN birthdate date,
ADD COLUMN requires_parental_consent boolean DEFAULT false,
ADD COLUMN parental_consent_status text CHECK (parental_consent_status IN ('pending', 'granted', 'denied', 'revoked')),
ADD COLUMN parent_email text,
ADD COLUMN consent_granted_at timestamp with time zone,
ADD COLUMN consent_revoked_at timestamp with time zone;

-- Create parental consents table
CREATE TABLE parental_consents (
  consent_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES student_profiles(user_id) ON DELETE CASCADE,
  parent_email text NOT NULL,
  consent_token uuid DEFAULT gen_random_uuid(),
  consent_status text NOT NULL DEFAULT 'pending' CHECK (consent_status IN ('pending', 'granted', 'denied', 'expired')),
  ip_address inet,
  user_agent text,
  granted_at timestamp with time zone,
  expires_at timestamp with time zone DEFAULT (now() + interval '7 days'),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(student_id, parent_email)
);

-- Create parent profiles table
CREATE TABLE parent_profiles (
  parent_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text,
  created_at timestamp with time zone DEFAULT now(),
  last_login timestamp with time zone
);

-- Link parents to students
CREATE TABLE parent_student_relationships (
  parent_id uuid REFERENCES parent_profiles(parent_id) ON DELETE CASCADE,
  student_id uuid REFERENCES student_profiles(user_id) ON DELETE CASCADE,
  relationship_type text DEFAULT 'parent' CHECK (relationship_type IN ('parent', 'guardian', 'authorized_adult')),
  PRIMARY KEY (parent_id, student_id)
);
```

### 1.2 Data Retention Policies
```sql
-- Add data retention fields
ALTER TABLE chat_messages 
ADD COLUMN scheduled_deletion_date timestamp with time zone;

ALTER TABLE assessments 
ADD COLUMN scheduled_deletion_date timestamp with time zone;

-- Create audit log for data access
CREATE TABLE data_access_logs (
  log_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('student', 'teacher', 'parent', 'admin')),
  accessed_data_type text NOT NULL,
  accessed_data_id uuid,
  purpose text,
  ip_address inet,
  created_at timestamp with time zone DEFAULT now()
);
```

## Phase 2: Age Verification & Consent Flow

### 2.1 Student Registration Flow
1. **Age Gate**: First screen asks for birthdate
2. **Under 13 Detection**: If under 13, redirect to parental consent flow
3. **Parent Email Collection**: Require parent/guardian email
4. **Consent Email**: Send verifiable consent request to parent
5. **Account Pending**: Student account created but inactive until consent
6. **Consent Verification**: Parent clicks link, reviews privacy policy, grants consent
7. **Account Activation**: Student can now access the platform

### 2.2 Teacher Bulk Import Updates
- CSV must include birthdate for each student
- System automatically flags under-13 students
- Batch consent emails sent to parents
- Dashboard shows consent status for each student

## Phase 3: Enhanced Safety Features

### 3.1 Content Filtering
```typescript
// Enhanced message filtering for younger users
const INAPPROPRIATE_CONTENT_PATTERNS = [
  // Profanity and inappropriate language
  /\b(profanity|patterns|here)\b/gi,
  // Personal information sharing
  /\b(my phone number|my address|where i live|my email)\b/gi,
  // Attempts to share social media
  /\b(instagram|snapchat|tiktok|facebook|whatsapp)\b/gi,
  // Meeting requests
  /\b(meet me|come to my|let's hang out|see you at)\b/gi
];

// Block external links for under-13
const BLOCK_EXTERNAL_LINKS = /https?:\/\/(?!skolr\.app)/gi;
```

### 3.2 Time Restrictions
- Configurable daily usage limits
- School hours only mode
- Automatic logout after inactivity
- Parent-controlled schedule

### 3.3 Enhanced Monitoring
- Real-time alerts for suspicious patterns
- Weekly safety reports to parents
- Stricter thresholds for under-13 users
- No private messaging between students

## Phase 4: Parent Dashboard

### 4.1 Parent Portal Features
- **Activity Overview**: See child's usage statistics
- **Chat History**: Review all conversations (with privacy considerations)
- **Safety Alerts**: Receive and manage safety notifications
- **Consent Management**: Update or revoke consent
- **Data Export**: Download all child's data
- **Data Deletion**: Request complete data removal
- **Communication Preferences**: Choose alert methods

### 4.2 Parent Authentication
- Email/password authentication
- Two-factor authentication option
- Password reset flow
- Session management

## Phase 5: Privacy & Compliance Documentation

### 5.1 Privacy Policy Updates
- Clear section for children under 13
- Data collection practices
- Parental rights under COPPA
- Data retention and deletion policies
- Third-party service usage
- International data transfers

### 5.2 Terms of Service
- Age restrictions
- Acceptable use policy for children
- Teacher/school responsibilities
- Parent/guardian obligations
- Liability limitations

### 5.3 Compliance Checklists
- COPPA compliance checklist
- FERPA compliance for educational records
- GDPR compliance for EU users
- State-specific requirements (e.g., California's SOPIPA)

## Phase 6: Technical Implementation

### 6.1 API Endpoints Needed
```typescript
// Parent-related endpoints
POST   /api/parent/register
POST   /api/parent/verify-email
POST   /api/parent/consent/grant
POST   /api/parent/consent/revoke
GET    /api/parent/children
GET    /api/parent/child/:studentId/activity
GET    /api/parent/child/:studentId/chats
GET    /api/parent/child/:studentId/export
DELETE /api/parent/child/:studentId/data

// Age verification endpoints
POST   /api/student/verify-age
POST   /api/student/request-consent
GET    /api/student/consent-status
```

### 6.2 UI Components Needed
- Age verification modal
- Parental consent flow screens
- Parent dashboard layout
- Consent status indicators
- Activity reports
- Safety alert management

## Phase 7: Operational Procedures

### 7.1 Data Governance
- Appoint Data Protection Officer (DPO)
- Regular privacy audits
- Data breach response plan
- Employee training on child data protection

### 7.2 Support Procedures
- Parent support documentation
- Teacher training materials
- Consent troubleshooting guide
- FAQ for common issues

### 7.3 Monitoring & Reporting
- Monthly compliance reports
- Consent rate tracking
- Safety incident reports
- Platform usage analytics (aggregated)

## Implementation Timeline

### Week 1-2: Database & Backend
- Implement schema changes
- Create consent management system
- Build parent authentication

### Week 3-4: Frontend & Flows
- Age verification UI
- Parental consent flow
- Parent dashboard basics

### Week 5-6: Safety Enhancements
- Content filtering updates
- Time restriction features
- Enhanced monitoring

### Week 7-8: Documentation & Testing
- Privacy policy drafting
- Legal review
- Compliance testing
- User acceptance testing

### Week 9-10: Launch Preparation
- Teacher training
- Parent onboarding materials
- Soft launch with pilot schools
- Gather feedback and iterate

## Success Metrics
- 95%+ parental consent rate
- Zero COPPA violations
- <24 hour consent processing time
- 100% safety alert delivery
- Parent satisfaction score >4.5/5

## Risk Mitigation
- Legal counsel review before launch
- Insurance for data protection
- Regular third-party audits
- Clear escalation procedures
- Transparent communication

## Budget Considerations
- Legal review: $10,000-20,000
- Development time: 8-10 weeks
- Ongoing compliance monitoring
- Parent support resources
- Marketing to schools/parents