/**
 * Type definitions for the LLM chat application.
 * Mission Shekinah | School of Christ Kazakhstan
 */
export interface Env {
  // Cloudflare bindings
  AI: Ai;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  RATE_LIMIT_KV: KVNamespace;

  // API ключи
  GEMINI_API_KEY: string;
  GOOGLE_API_KEY: string;
  OPENROUTER_API_KEY: string;

  // Telegram
  TELEGRAM_TOKEN: string;
  TELEGRAM_BOT_TOKEN: string;
}

/**
 * Represents a chat message.
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Result of a chat request.
 */
export interface ChatResult {
  response: string;
  model: string;
  fallback?: boolean;
  originalModel?: string;
  error?: string;
}
