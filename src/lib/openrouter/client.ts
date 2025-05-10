// src/lib/openrouter/client.ts
import type { ChatMessage } from '@/types/database.types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface OpenRouterConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
  usage?: {
    total_tokens: number;
  };
}

export async function sendChatCompletion(
  messages: ChatMessage[],
  config: OpenRouterConfig
): Promise<OpenRouterResponse> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
      'X-Title': 'ClassBots AI',
    },
    body: JSON.stringify({
      model: config.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: config.temperature || 0.7,
      max_tokens: config.maxTokens || 1000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('OpenRouter error details:', errorData);
    throw new Error(`OpenRouter API error: ${errorData.error?.message || response.statusText}`);
  }

  return response.json();
}