# Assessment Scoring Fix Plan

## Problem
Students can answer only a subset of questions and still get high scores because the AI doesn't know how many questions were skipped.

## Solution 1: Question Tracking in Messages (Recommended)

### Implementation Steps:

1. **Modify the chatbot to include question metadata in each message**
   - When the bot sends a question, include metadata like:
     ```json
     {
       "chatbotId": "...",
       "questionNumber": 3,
       "totalQuestions": 10,
       "questionType": "recall",
       "topic": "cell_biology"
     }
     ```

2. **Update the assessment prompt to count questions**
   - The assessment process should:
     - Count total questions presented (from metadata)
     - Count questions answered
     - Calculate: Score = (Correct Answers / Total Questions Presented) × 100

3. **Example Assessment Prompt Update**
   ```
   When evaluating, consider:
   - Total questions presented: [count from metadata]
   - Questions answered: [count user responses]
   - Questions skipped: [total - answered]
   - Correct answers: [count correct responses]
   
   Grade should reflect performance on ALL presented questions, not just answered ones.
   Skipped questions should count as incorrect.
   ```

## Solution 2: Session-Based Question Tracking

### Alternative approach using a questions table:

1. **Create a question_tracking table**
   ```sql
   CREATE TABLE assessment_question_tracking (
     tracking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     room_id UUID NOT NULL,
     student_id UUID NOT NULL,
     chatbot_id UUID NOT NULL,
     instance_id UUID,
     question_number INTEGER NOT NULL,
     question_content TEXT,
     presented_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     answered_at TIMESTAMP WITH TIME ZONE,
     student_answer TEXT,
     is_correct BOOLEAN,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

2. **Track each question as it's presented**
   - When bot sends a question, insert a record
   - When student answers, update the record
   - During assessment, query this table for complete data

## Solution 3: Structured Assessment Format (Simplest)

### Enforce a rigid format:

1. **Bot Configuration**
   - Add a field: `assessment_question_count` (e.g., 10)
   - Bot must present exactly this many questions
   - Bot tracks progress: "Question 3 of 10"

2. **Update Assessment Prompt**
   ```
   Expected format:
   - The bot should have presented exactly {assessment_question_count} questions
   - Each question should be numbered (Question 1, Question 2, etc.)
   - Count how many were answered vs skipped
   ```

## Recommended Approach: Solution 1 + Solution 3

Combine metadata tracking with structured format:

1. Bot configuration includes total question count
2. Each question message includes metadata
3. Assessment process can verify:
   - Expected questions = configured count
   - Presented questions = count from metadata
   - Answered questions = count user responses
   - Score = (Correct / Expected) × 100

## Implementation Priority

1. **Quick Fix**: Update the assessment prompt to look for question patterns and penalize skipped questions
2. **Medium Term**: Add metadata to bot messages
3. **Long Term**: Implement proper question tracking table

## Example Updated Assessment Prompt

```
IMPORTANT SCORING RULES:
1. Count the total number of questions presented by the bot (look for "Question X" patterns)
2. Count how many questions the student actually answered
3. If student answered fewer questions than presented, treat unanswered questions as incorrect
4. Final score = (Correct Answers / Total Questions Presented) × 100%

Example: If 10 questions were presented, student answered 3 correctly and skipped 7:
- Score = 3/10 = 30% (NOT 3/3 = 100%)
```