# Assessment Bot Configuration Guide

## Ensuring Fair Assessment Scoring

### The Problem
Students could previously answer only a few questions out of many and still receive high scores, as the AI only considered answered questions.

### The Solution
The assessment system now counts ALL presented questions and penalizes unanswered ones.

## Best Practices for Assessment Bot Setup

### 1. Structured Question Format
Always use clear numbering for your questions:
```
✅ Good: "Question 1 of 10: What is photosynthesis?"
✅ Good: "Here is question 3: Which organ..."
❌ Bad: "Next question: What is..."
```

### 2. Clear Assessment Instructions
In your bot's system prompt, include:
```
You will present exactly 10 questions to the student.
Number each question clearly (Question 1, Question 2, etc.)
After the final question, instruct the student to type '/assess' to submit.
```

### 3. Recommended Assessment Criteria Template
Include in your assessment criteria:
```
Completion Requirements:
- Students must attempt all 10 questions
- Unanswered questions count as incorrect
- Final grade = (Correct Answers / 10) × 100%

Grading Scale:
- 90-100%: Excellent (9-10 correct)
- 70-89%: Good (7-8 correct)
- 50-69%: Satisfactory (5-6 correct)
- Below 50%: Needs Improvement
```

### 4. Example System Prompt Structure
```
You are an assessment bot for [SUBJECT].

Your task:
1. Present exactly 10 multiple-choice questions
2. Number each question clearly (Question 1, Question 2, etc.)
3. Wait for the student's answer before proceeding
4. After each answer, provide brief feedback and move to the next question
5. After Question 10, say: "Assessment complete! Type '/assess' to submit your answers for grading."

Important: Keep track of question numbers to ensure all 10 are presented.
```

## What Teachers Will See

The assessment report now includes:
- **Questions Presented**: Total number shown to student
- **Questions Answered**: How many the student attempted
- **Questions Correct**: Number of correct answers
- **Completion Rate**: e.g., "3/10 questions answered"
- **Grade**: Based on ALL questions, not just answered ones

## Example Scenarios

### Scenario 1: Complete Assessment
- Questions presented: 10
- Questions answered: 10
- Correct answers: 8
- Grade: 80% (8/10)

### Scenario 2: Incomplete Assessment
- Questions presented: 10
- Questions answered: 3
- Correct answers: 3
- Grade: 30% (3/10) - NOT 100%!

## Tips for Teachers

1. **Be Explicit**: Tell students upfront how many questions they must answer
2. **Set Expectations**: Make it clear that skipping questions will lower their grade
3. **Monitor Patterns**: If students consistently skip questions, consider adjusting difficulty
4. **Use Welcome Messages**: Set your bot's welcome message to explain the assessment format

## Future Enhancements

We're working on:
- Automatic question tracking in the database
- Time limits for assessments
- Ability to mark "attempted but incorrect" vs "not attempted"
- Progress indicators for students