# Model Update Summary

## Updated Model List
The following models are now available in the dropdown:
1. `openai/gpt-4.1-mini` - OpenAI GPT-4.1 Mini
2. `google/gemini-2.0-flash` - Gemini 2.0 Flash 
3. `x-ai/grok-3-mini-beta` - Grok 3 Mini Beta
4. `qwen/qwen3-235b-a22b` - Qwen3 235B A22B

## Files Updated

### 1. `/src/app/teacher-dashboard/chatbots/[chatbotId]/edit/page.tsx`
- Updated model dropdown options (lines 583-586)
- Changed from old models to new model list

### 2. `/src/components/teacher/ChatbotForm.tsx`
- Updated model dropdown options (lines 801-804)
- Changed display names to match consistent format

### 3. `/src/components/teacher/ChatbotList.tsx`
- Updated `getModelDisplayName` function (lines 50-59)
- Added new model display names
- Kept old model names for backwards compatibility

### 4. `/src/components/teacher/ModernChatbotCard.tsx`
- Updated `getModelDisplayName` function (lines 346-355)
- Added new model display names
- Kept old model names for backwards compatibility

### 5. `/src/app/api/chat/[roomId]/route.ts`
- Updated default model from `openai/gpt-4.1-nano` to `openai/gpt-4.1-mini` (line 870)

### 6. `/src/types/chatbot.types.ts`
- Updated model type definition to include all available models (line 12)

### 7. `/src/app/api/assessment/process/route.ts`
- Updated assessment model to use `qwen/qwen3-235b-a22b` (line 21)
- This aligns with the help text that says "Assessment evaluation will use Qwen3 235B"

## Notes
- The default model throughout the application is now `openai/gpt-4.1-mini`
- Assessment evaluations specifically use `qwen/qwen3-235b-a22b` for consistency
- Display name mappings include both old and new model names for backwards compatibility
- All model dropdowns now show the same consistent set of options