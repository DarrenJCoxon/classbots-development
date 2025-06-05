# Assessment Question Count Solution

## Problem
When teachers configure bots with prompts like "Create 10 MCQs on photosynthesis", the system has no way to verify that exactly 10 questions were presented or to enforce that students answer all 10.

## Proposed Solution: Explicit Question Count Configuration

### 1. Database Changes

Add to `chatbots` table:
```sql
ALTER TABLE chatbots 
ADD COLUMN assessment_question_count INTEGER DEFAULT NULL;
```

### 2. UI Changes

In the assessment bot configuration:
- Add field: "Number of questions in assessment" (required for assessment bots)
- This becomes the "source of truth" for grading

### 3. System Prompt Enhancement

When a teacher sets `assessment_question_count = 10`, automatically append to their system prompt:
```
IMPORTANT INSTRUCTIONS:
- You MUST present exactly 10 questions
- Number each question clearly: "Question 1:", "Question 2:", etc.
- Keep track of questions asked
- After Question 10, instruct: "All questions complete. Type '/assess' to submit."
- Do NOT allow submission before all 10 questions are presented
```

### 4. Assessment Process Update

The assessment prompt would include:
```
CRITICAL: This assessment is configured for exactly ${chatbot.assessment_question_count} questions.
- Expected questions: ${chatbot.assessment_question_count}
- Count how many questions were actually presented
- Count how many were answered
- Grade = (Correct Answers / ${chatbot.assessment_question_count}) × 100%
```

### 5. Validation During Chat

Add logic to the chat endpoint:
```typescript
if (trimmedContent === '/assess' && chatbotConfig.assessment_question_count) {
    // Count questions in conversation history
    const questionCount = countQuestionsInHistory(messages);
    
    if (questionCount < chatbotConfig.assessment_question_count) {
        // Don't allow early submission
        return "You haven't completed all questions yet. Please answer all " + 
               chatbotConfig.assessment_question_count + " questions before submitting.";
    }
}
```

## Alternative: Message Metadata Tracking

### For Each Bot Message:
```typescript
// When bot sends a message
if (isQuestion) {
    metadata = {
        chatbotId: chatbot_id,
        isQuestion: true,
        questionNumber: currentQuestionNumber,
        totalQuestions: chatbotConfig.assessment_question_count
    };
}
```

### During Assessment:
```typescript
// Count questions from metadata
const questionsPresented = messages.filter(m => 
    m.metadata?.isQuestion === true
).length;

const expectedQuestions = chatbotConfig.assessment_question_count || questionsPresented;
```

## Implementation Priority

1. **Immediate**: Add `assessment_question_count` to bot configuration
2. **Next Sprint**: Add validation to prevent early submission
3. **Future**: Full question tracking system

## Benefits

1. **Clear Expectations**: Teachers explicitly state how many questions
2. **Fair Grading**: Students can't game the system by answering fewer questions
3. **Flexibility**: Still allows dynamic question generation
4. **Validation**: Can warn students if they try to submit early