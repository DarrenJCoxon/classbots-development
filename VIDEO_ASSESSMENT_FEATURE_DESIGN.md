# Video to Assessment Transition Feature Design

## Overview
Enable seamless transition from watching a video (viewing room bot) to taking an assessment about that video content.

## Implementation Options

### Option 1: Linked Bot Approach (Recommended)
Create a relationship between viewing room bots and assessment bots.

**Database Changes:**
```sql
-- Add column to link viewing room to assessment bot
ALTER TABLE public.chatbots
ADD COLUMN linked_assessment_bot_id UUID REFERENCES public.chatbots(chatbot_id);

-- Or create a many-to-many relationship table
CREATE TABLE public.bot_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_bot_id UUID NOT NULL REFERENCES public.chatbots(chatbot_id) ON DELETE CASCADE,
    to_bot_id UUID NOT NULL REFERENCES public.chatbots(chatbot_id) ON DELETE CASCADE,
    transition_type VARCHAR(50) DEFAULT 'video_to_assessment',
    trigger_condition VARCHAR(100), -- 'video_complete', 'video_75_percent', 'manual'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Features:**
1. Teacher creates both a viewing room bot and an assessment bot
2. Links them together with transition rules
3. System automatically switches when video reaches certain point
4. Assessment questions can reference the video content

### Option 2: Hybrid Bot Type
Create a new bot type that combines video + assessment.

**Database Changes:**
```sql
-- Add new bot type
ALTER TYPE bot_type_enum ADD VALUE 'video_assessment' AFTER 'viewing_room';

-- Add assessment phase fields
ALTER TABLE public.chatbots
ADD COLUMN assessment_trigger VARCHAR(50), -- 'video_end', 'video_percentage', 'manual'
ADD COLUMN assessment_trigger_value INTEGER, -- percentage if using video_percentage
ADD COLUMN video_assessment_criteria TEXT; -- assessment criteria for video content
```

### Option 3: Room-Level Configuration
Allow rooms to have sequential bot experiences.

**Database Changes:**
```sql
-- Create room bot sequence table
CREATE TABLE public.room_bot_sequence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(room_id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    chatbot_id UUID NOT NULL REFERENCES public.chatbots(chatbot_id),
    activation_trigger VARCHAR(100), -- 'immediate', 'previous_complete', 'timer'
    activation_data JSONB, -- additional trigger configuration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Recommended Implementation Plan

### Phase 1: Video Progress Tracking
```typescript
// Add video progress tracking to chat messages
interface VideoProgressData {
  videoId: string;
  duration: number;
  currentTime: number;
  percentageWatched: number;
  completedAt?: string;
}

// Store in chat_messages metadata or create dedicated table
CREATE TABLE public.student_video_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.student_profiles(user_id),
    room_id UUID NOT NULL REFERENCES public.rooms(room_id),
    chatbot_id UUID NOT NULL REFERENCES public.chatbots(chatbot_id),
    video_url TEXT NOT NULL,
    video_duration INTEGER, -- seconds
    watch_time INTEGER DEFAULT 0, -- seconds watched
    percentage_complete DECIMAL(5,2) DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Phase 2: Transition UI Components
```typescript
// VideoPlayer component with progress tracking
export function VideoPlayer({ 
  videoInfo, 
  onProgress, 
  onComplete,
  showAssessmentButton 
}: VideoPlayerProps) {
  // Track video progress
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    const progress = (video.currentTime / video.duration) * 100;
    onProgress?.(progress, video.currentTime, video.duration);
    
    if (progress >= 95) { // Consider 95% as complete
      onComplete?.();
    }
  };
}

// Transition prompt component
export function AssessmentTransition({ 
  onStartAssessment,
  assessmentBotName 
}: TransitionProps) {
  return (
    <TransitionCard>
      <h3>Ready for the Assessment?</h3>
      <p>Now that you've watched the video, test your understanding with {assessmentBotName}</p>
      <ModernButton onClick={onStartAssessment}>
        Start Assessment
      </ModernButton>
    </TransitionCard>
  );
}
```

### Phase 3: Teacher Configuration UI
```typescript
// In ChatbotForm for viewing_room bots
{formData.bot_type === 'viewing_room' && (
  <FormGroup>
    <Label>Link to Assessment Bot (Optional)</Label>
    <Select
      value={formData.linked_assessment_bot_id}
      onChange={handleChange}
    >
      <option value="">No assessment</option>
      {assessmentBots.map(bot => (
        <option key={bot.chatbot_id} value={bot.chatbot_id}>
          {bot.name}
        </option>
      ))}
    </Select>
    <HelpText>
      Students will be prompted to take this assessment after watching the video
    </HelpText>
  </FormGroup>
)}
```

## User Experience Flow

1. **Student enters room** with viewing room bot
2. **Video starts playing** with progress tracked
3. **At video completion** (or configured percentage):
   - Show completion message
   - Display "Start Assessment" button
   - Optionally auto-transition after countdown
4. **Assessment begins**:
   - Same room, different bot
   - Assessment bot has context about which video was watched
   - Questions can reference specific video content
5. **Results saved** with video context

## Benefits

1. **Seamless Learning Flow**: Watch → Assess in one session
2. **Better Engagement**: Immediate assessment while content is fresh
3. **Progress Tracking**: Know who watched what and how much
4. **Flexible Configuration**: Teachers control when/how transition happens
5. **Context Preservation**: Assessment knows which video was watched

## Next Steps

1. Choose implementation approach (recommend Option 1)
2. Create database migrations
3. Build video progress tracking
4. Implement transition UI
5. Update teacher configuration
6. Test end-to-end flow