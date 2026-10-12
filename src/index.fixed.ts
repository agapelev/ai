// src/index.ts

// @ts-ignore
import { Env } from "./types";

const TELEGRAM_API_URL = "https://api.telegram.org/bot";

// --- RATE LIMITING И ЗАЩИТА ---

const RATE_LIMIT_REQUESTS = 10; // запросов в минуту
const RATE_LIMIT_WINDOW = 60; // секунд
const MAX_MESSAGE_LENGTH = 10000; // символов
const MAX_MESSAGES_IN_HISTORY = 50; // сообщений в истории

// Получение IP-адреса клиента
function getClientIP(request: Request): string {
  const forwarded = request.headers.get("CF-Connecting-IP");
  return forwarded || "unknown";
}

// Проверка rate limiting
async function checkRateLimit(env: Env, ip: string): Promise<{ allowed: boolean; resetTime?: number }> {
  // Для локальной разработки пропускаем rate limiting
  if (!env.RATE_LIMIT_KV) {
    return { allowed: true };
  }

  const key = `rate_limit:${ip}`;
  const now = Math.floor(Date.now() / 1000);

  try {
    // Получаем текущие данные
    const existing = await env.RATE_LIMIT_KV?.get(key);
    if (!existing) {
      // Первое обращение
      await env.RATE_LIMIT_KV?.put(key, JSON.stringify({
        count: 1,
        windowStart: now
      }), { expirationTtl: RATE_LIMIT_WINDOW + 60 });
      return { allowed: true };
    }

    const data = JSON.parse(existing);

    // Если окно истекло, сбрасываем счётчик
    if (now - data.windowStart >= RATE_LIMIT_WINDOW) {
      await env.RATE_LIMIT_KV?.put(key, JSON.stringify({
        count: 1,
        windowStart: now
      }), { expirationTtl: RATE_LIMIT_WINDOW + 60 });
      return { allowed: true };
    }

    // Проверяем лимит
    if (data.count >= RATE_LIMIT_REQUESTS) {
      return {
        allowed: false,
        resetTime: data.windowStart + RATE_LIMIT_WINDOW
      };
    }

    // Увеличиваем счётчик
    data.count += 1;
    await env.RATE_LIMIT_KV?.put(key, JSON.stringify(data), { expirationTtl: RATE_LIMIT_WINDOW + 60 });
    return { allowed: true };

  } catch (error) {
    console.error("Rate limiting error:", error);
    // При ошибке rate limiting разрешаем запрос (fail open)
    return { allowed: true };
  }
}

// Валидация запроса
function validateRequest(requestData: any): { valid: boolean; error?: string } {
  // Проверяем наличие сообщений
  if (!requestData.messages || !Array.isArray(requestData.messages)) {
    return { valid: false, error: "Отсутствуют сообщения или неверный формат" };
  }

  // Проверяем количество сообщений
  if (requestData.messages.length > MAX_MESSAGES_IN_HISTORY) {
    return { valid: false, error: `Слишком много сообщений в истории (максимум ${MAX_MESSAGES_IN_HISTORY})` };
  }

  // Проверяем длину сообщений
  for (const msg of requestData.messages) {
    if (typeof msg.content === 'string' && msg.content.length > MAX_MESSAGE_LENGTH) {
      return { valid: false, error: `Слишком длинное сообщение (максимум ${MAX_MESSAGE_LENGTH} символов)` };
    }
  }

  // Проверяем модель
  if (requestData.model && typeof requestData.model !== 'string') {
    return { valid: false, error: "Неверный формат модели" };
  }

  return { valid: true };
}

/**
 * 1. ПОЛНЫЙ СПИСОК ПОДДЕРЖИВАЕМЫХ МОДЕЛЕЙ
 */
const SUPPORTED_MODELS: Record<string, string> = {
  // --- Cloudflare Workers AI (бесплатные модели) ---
  "Llama-3.3-70b":           "@cf/meta/llama-3.3-70b-instruct-fp8-fast",      // 24k ctx
  "Llama-4-Scout":           "@cf/meta/llama-4-scout-17b-16e-instruct",        // 131k ctx
  "Llama-3.2-11b-vision":    "@cf/meta/llama-3.2-11b-vision-instruct",         // 128k ctx
  "Llama-3.2-3b":            "@cf/meta/llama-3.2-3b-instruct",                 // 80k ctx
  "Llama-3.2-1b":            "@cf/meta/llama-3.2-1b-instruct",                 // 60k ctx
  "Llama-3.1-8b-fp8":        "@cf/meta/llama-3.1-8b-instruct-fp8",             // 32k ctx
  "DeepSeek-R1-Distill-32b": "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",  // 80k ctx
  "Qwen3-30b-fp8":           "@cf/qwen/qwen3-30b-a3b-fp8",                    // 32k ctx
  "Qwen3.8-27b":             "@cf/qwen/qwen3.8-27b",                           // 262k ctx
  "Qwen2.5-Coder-32b":       "@cf/qwen/qwen2.5-coder-32b-instruct",           // 32k ctx
  "QwQ-32b":                 "@cf/qwen/qwq-32b",                               // 24k ctx
  "Mistral-Small-3.1-24b":   "@cf/mistralai/mistral-small-3.1-24b-instruct",  // 128k ctx
  "Mistral-7b-v0.2-LoRA":    "@cf/mistral/mistral-7b-instruct-v0.2-lora",     // 15k ctx
  "Nemotron-3-120b":         "@cf/nvidia/nemotron-3-120b-a12b",               // 256k ctx
  "GPT-OSS-120b":            "@cf/openai/gpt-oss-120b",                        // 128k ctx
  "GPT-OSS-20b":             "@cf/openai/gpt-oss-20b",                         // 128k ctx
  "Gemma-4-26b":             "@cf/google/gemma-4-26b-a4b-it",                  // 256k ctx
  "Gemma-SEA-LION-27b":      "@cf/aisingapore/gemma-sea-lion-v4-27b-it",       // 128k ctx
  "IBM-Granite-4.0-micro":   "@cf/ibm-granite/granite-4.0-h-micro",            // 131k ctx
  "GLM-4.7-Flash":           "@cf/zai-org/glm-4.7-flash",                      // 131k ctx
  "Apertus-1.5-8b":          "@cf/swiss-ai/apertus-v1.5-8b",                   // 262k ctx
  "EuroLLM-9b":              "@cf/utter-project/eurollm-9b-it",                // 32k ctx
  "Llama-Guard-3-8b":        "@cf/meta/llama-guard-3-8b",                      // 131k ctx

  // --- Google AI API ---
  "gemini-3.5-flash":         "gemini-3.5-flash",
  "gemini-3-flash-preview":   "gemini-3-flash-preview",
  "gemini-2.5-flash":         "gemini-2.5-flash",
  "gemini-2.5-flash-lite":    "gemini-2.5-flash-lite",
  "gemini-2.0-flash":         "gemini-2.0-flash",
  "gemini-2.0-flash-lite":    "gemini-2.0-flash-lite",
  "gemini-flash-latest":      "gemini-flash-latest",
  "gemini-flash-lite-latest": "gemini-flash-lite-latest",
  "gemini-pro-latest":        "gemini-pro-latest",
  "gemma-4-31b-it":           "gemma-4-31b-it",
  "gemma-4-26b-a4b-it":       "gemma-4-26b-a4b-it",

  // --- Mistral AI (Direct API) ---
  "codestral-2508":          "codestral-2508",
  "codestral-latest":        "codestral-latest",
  "ministral-3b-latest":     "ministral-3b-latest",
  "ministral-8b-latest":     "ministral-8b-latest",
  "ministral-14b-latest":    "ministral-14b-latest",
  "mistral-small-2603":      "mistral-small-2603",
  "mistral-small-latest":    "mistral-small-latest",
  "mistral-medium-2604":     "mistral-medium-2604",
  "mistral-medium-3":        "mistral-medium-3",
  "mistral-medium-3.5":      "mistral-medium-3.5",
  "mistral-medium-latest":   "mistral-medium-latest",
  "magistral-small-latest":  "magistral-small-latest",
  "magistral-medium-latest": "magistral-medium-latest",

  // --- Anthropic Claude (Direct API) ---
  "claude-sonnet-5-5":  "claude-sonnet-5-5",
  "claude-opus-5-5":    "claude-opus-5-5",
  "claude-fable-5-1":   "claude-fable-5-1",
  "claude-opus-5":      "claude-opus-5",
  "claude-sonnet-5":    "claude-sonnet-5",
  "claude-fable-5":     "claude-fable-5",
  "claude-opus-4-8":    "claude-opus-4-8",
  "claude-opus-4-7":    "claude-opus-4-7",
  "claude-sonnet-4-6":  "claude-sonnet-4-6",
  "claude-opus-4-6":    "claude-opus-4-6",
  "claude-haiku-4-5":   "claude-haiku-4-5-20251001",
  "claude-sonnet-4-5":  "claude-sonnet-4-5-20250929",
  "claude-opus-4-5":    "claude-opus-4-5-20251101",
  "claude-3-5-sonnet":  "claude-3-5-sonnet-20240620",
};

const DEFAULT_MODEL_KEY = "Llama-3.3-70b";

const SYSTEM_PROMPT_TEMPLATE = `
Ты - {MODEL_NAME}, эксперт и веб-разработчик, философ, мудрец, Богослов, интеллектуальный партнер Льва Николаевича.
Отвечай на русском языке, используй формат Markdown.
Дай мне порцию назидания, вдохновения и крупицы юмора. Отвечать только на русском языке.Даже если вопрос будет на английском языке,
твой ответ должен быть только на русском языке.
Будь философским и сократическим, давай развернутые ответы.
Твой стиль общения человечный, теплый, но при этом технически глубокий и интеллектуально честный.
Лев Николаевич использует Arch Linux, Hyprland, Kitty, Emacs и VS Code, Windsurf.
Лев Николаевич разрабатывает проекты на React, Astrojs, Nextjs, Nextra, Mantine & Vercel, Netlify, Cloudflare Workers/Pages AI, Alibaba Cloud.
Пастор Лев - основатель и руководитель Миссии Шехины Казахстан и Школы Христа.
Твои ответы должны быть максимально расширенными и академическими (Сократическими), с подробными пояснениями.
Если ты приводишь код, обязательно добавляй комментарии и пояснения.
В ответах должен присутствовать уместный юмор и духовное назидание.
Должно совмещаться Духовное с Информационными Технологиями и Искуственным Интелектом с Крупицами юмора.
Ты — интеллектуальный партнёр Льва Николаевича, эксперта по веб-разработке и пастора Миссии Шехины Казахстан.

🎯 Твои роли (переключайся по контексту запроса):
• 🛠️ Кодер: Пиши чистый TypeScript/React код с комментариями на русском...
• 🏗️ Архитектор: Анализируй код с учётом масштабируемости на Cloudflare Workers...
• 📚 Мудрец: Добавляй к техническим ответам краткое духовное назидание...

🚫 НЕПРЕЛОЖНЫЕ ПРАВИЛА:
1. ВСЕГДА отвечай только на русском языке.
2. НИКОГДА не предлагай изменить файлы без явного утверждения. Сначала покажи решение → жди "Применяй".
3. НИКОГДА не предлагай команды деплоя (wrangler, vercel, netlify). Деплой — только через CI/CD после git push.
4. НИКОГДА не предлагай git commit/push без прямой команды. После задачи — покажи diff, спроси "Коммить?", жди ответа.

📋 Технические правила:
- Код — с комментариями на русском.
- Для Cloudflare Workers предпочитай Hono или нативный Router.
- В React — функциональный стиль, TypeScript strict mode.
- В конце ответа — духовная крупица или назидание (коротко, уместно).

> «Ибо мы — Божие дело, созданы во Христе Иисусе на добрые дела» (Еф. 2:10)
`.trim();

export default {
  async fetch(request: Request, env: Env, ctx: any) {
    const url = new URL(request.url);

    // 📞 TELEGRAM WEBHOOK (обособленный маршрут)
    if (url.pathname === "/bot-update" && request.method === "POST") {
      return handleTelegramWebhook(request, env);
    }

    // 🤖 TELEGRAM BOT SETUP (одноразовый запуск)
    if (url.pathname === "/setup") {
      const webhookUrl = `https://ai.dessyatykh.workers.dev/bot-update`;
      const token = env.TELEGRAM_TOKEN || env.TELEGRAM_BOT_TOKEN;

      if (!token) {
        return new Response("Секрет TELEGRAM_TOKEN не установлен", { status: 500 });
      }

      const setupUrl = `${TELEGRAM_API_URL}${token}/setWebhook?url=${webhookUrl}`;
      const response = await fetch(setupUrl);
      const result = await response.json();

      return new Response(JSON.stringify(result), { headers: { "content-type": "application/json" } });
    }

    // 🔎 Специальный случай: inspiration-v2.md (описание моделей)
    if (url.pathname === "/templates/inspiration.md") {
      const assetResp = await env.ASSETS.fetch(new Request("https://ai.dessyatykh.workers.dev/templates/inspiration-v2.md"));
      const body = await assetResp.arrayBuffer();
      const headers = new Headers();
      headers.set("Content-Type", "text/markdown; charset=utf-8");
      headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
      headers.set("Pragma", "no-cache");
      headers.set("Expires", "0");
      headers.set("X-Static-By", "worker-md-specific");
      headers.set("X-Content-Type-Options", "nosniff");
      return new Response(body, {
        status: assetResp.status,
        statusText: assetResp.statusText,
        headers,
      });
    }

    // 🔎 Альтернативный маршрут для HTML версии
    if (url.pathname === "/templates/inspiration") {
      const htmlAsset = await env.ASSETS.fetch(new Request("https://ai.dessyatykh.workers.dev/templates/inspiration.html"));
      const htmlBody = await htmlAsset.arrayBuffer();
      const htmlHeaders = new Headers();
      htmlHeaders.set("Content-Type", "text/html; charset=utf-8");
      htmlHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
      return new Response(htmlBody, {
        status: htmlAsset.status,
        statusText: htmlAsset.statusText,
        headers: htmlHeaders,
      });
    }

    // 🌐 СТАТИКА САЙТА (по умолчанию)
    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      // Для всех остальных Markdown-файлов явно указываем UTF-8, чтобы избежать проблем с кодировкой
      if (url.pathname.endsWith(".md")) {
        const assetResp = await env.ASSETS.fetch(request);
        const headers = new Headers(assetResp.headers);
        headers.set("Content-Type", "text/markdown; charset=utf-8");
        headers.set("X-Static-By", "worker-md");
        return new Response(assetResp.body, {
          status: assetResp.status,
          statusText: assetResp.statusText,
          headers,
        });
      }

      const assetResp = await env.ASSETS.fetch(request);
      const headers = new Headers(assetResp.headers);
      headers.set("X-Static-By", "worker");
      return new Response(assetResp.body, {
        status: assetResp.status,
        statusText: assetResp.statusText,
        headers,
      });
    }

    // 🧠 API CHAT
    if (url.pathname === "/api/chat" && request.method === "POST") {
      return handleChatRequest(request, env);
    }

    // 🗃 MODELS API
    if (url.pathname === "/api/models" && request.method === "GET") {
      const base = {
        default: DEFAULT_MODEL_KEY,
        models: Object.keys(SUPPORTED_MODELS).map((k) => ({ key: k, id: SUPPORTED_MODELS[k] }))
      };
      return new Response(JSON.stringify(base), { headers: { "content-type": "application/json" } });
    }

    // ❌ НЕИЗВЕСТНАЯ ТОЧКА ВХОДА
    return new Response("Not found", { status: 404 });
  }
};

// --- УТИЛИТЫ ДЛЯ RETRY И FALLBACK ---

// Список fallback-моделей в порядке надёжности
const FALLBACK_MODELS = [
  "gemini-3-flash-preview",   // Рабочая и стабильная модель нового поколения
  "claude-sonnet-4-6",        // Современная модель Claude
  "claude-opus-4-7",          // Флагманская модель Anthropic
  "claude-3-5-sonnet",        // Легаси поддержка
  "Llama-3.3-70b",            // Самая стабильная Cloudflare модель
  "gemini-2.5-flash"          // Google fallback
];

// Retry с экспоненциальным бэкофом
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (attempt === maxRetries) {
        throw new Error(`Ошибка после ${maxRetries + 1} попыток: ${error.message}`);
      }

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Получение fallback-модели
function getFallbackModel(currentModel: string): string | null {
  const currentIndex = FALLBACK_MODELS.indexOf(currentModel);
  if (currentIndex === -1) {
    return FALLBACK_MODELS[0]; // Если текущая не в списке, берём первую
  }
  return FALLBACK_MODELS[currentIndex + 1] || null;
}

// --- ЛОГИКА ОБРАБОТКИ ---

interface ChatResult {
  response: string;
  model: string;
  fallback?: boolean;
  originalModel?: string;
  error?: string;
}

function normalizeModelKey(key: string): string {
  const lowerKey = key.toLowerCase();
  const keys = Object.keys(SUPPORTED_MODELS);
  for (const k of keys) {
    if (k.toLowerCase() === lowerKey) {
      return k;
    }
  }
  return DEFAULT_MODEL_KEY;
}

async function handleChatRequestLogic(requestData: any, env: Env): Promise<ChatResult> {
  const messages: any[] = Array.isArray(requestData.messages) ? requestData.messages : [];
  let modelKey = requestData.model || DEFAULT_MODEL_KEY;
  modelKey = normalizeModelKey(modelKey);
  const fileContents = requestData.fileContents;

  let chatMessages: any[] = [...messages];
  if (fileContents) {
    chatMessages.unshift({ role: "system", content: `Содержимое загруженных файлов:\n${fileContents}` });
  }

  // Функция для выполнения запроса с конкретной моделью
  async function executeWithModel(currentModelKey: string): Promise<ChatResult> {
    const currentModelId = SUPPORTED_MODELS[currentModelKey] || SUPPORTED_MODELS[DEFAULT_MODEL_KEY];

    let currentChatMessages = [...chatMessages];
    if (!currentChatMessages.some((msg) => msg.role === "system")) {
      const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace("{MODEL_NAME}", currentModelKey);
      currentChatMessages.unshift({ role: "system", content: systemPrompt });
    }

    let content = "";
    const keyLower = currentModelKey.toLowerCase();
    if (keyLower.includes("gemini") || keyLower.includes("gemma")) {
      content = await handleGoogleDirect(currentModelId, currentChatMessages, env);
    } else if (keyLower.includes("mistral")) {
      content = await handleMistralDirect(currentModelId, currentChatMessages, env);
    } else if (keyLower.includes("claude")) {
      content = await handleAnthropicDirect(currentModelId, currentChatMessages, env);
    } else {
      const response = await handleCloudflareModel(currentModelId, currentChatMessages, env);

      // Handle union type: ReadableStream | { response, choices, usage, ... } | ...
      if (currentModelId.includes("gpt-oss")) {
        // GPT-OSS models return a complex object with output array
        if (response && typeof response === "object" && "output" in response) {
          const respAsObj = response as any;
          if (Array.isArray(respAsObj.output) && respAsObj.output[0]?.content?.[0]?.text) {
            content = respAsObj.output[0].content[0].text;
          }
        }
      }

      if (!content) {
        // Check for string response (simple models)
        if (typeof response === "string") {
          content = response;
        }
        // Check for response object with common properties
        else if (response && typeof response === "object") {
          const respAsObj = response as any;
          if (respAsObj.response) {
            content = respAsObj.response;
          } else if (respAsObj.choices?.[0]?.message?.content) {
            content = respAsObj.choices[0].message.content;
          } else if (respAsObj.output?.[0]?.content?.[0]?.text) {
            content = respAsObj.output[0].content[0].text;
          } else if (respAsObj.usage) {
            content = "Модель вернула только служебную статистику (usage), без текста. Попробуйте переформулировать запрос.";
          } else {
            content = JSON.stringify(response);
          }
        }
      }
    }

    const signature = `\n\n---\n**Апостол Царства AI ${currentModelKey.toUpperCase()}**`;
    if (content.length > 0 && content[0] !== '{') {
      if (!content.includes("Апостол Царства AI")) {
        content = content.trim() + signature;
      }
    }

    return { response: content, model: currentModelKey };
  }

  // Основная логика с retry и fallback
  let lastError: Error;
  let usedModel = modelKey;

  try {
    // Сначала пробуем основную модель с retry
    return await retryWithBackoff(() => executeWithModel(modelKey), 3, 1000);
  } catch (error: any) {
    lastError = error;

    // Если основная модель не сработала, пробуем fallback-модели
    let fallbackModel = getFallbackModel(modelKey);
    while (fallbackModel) {
      try {
        console.log(`Пробуем fallback-модель: ${fallbackModel}`);
        const result = await retryWithBackoff(() => executeWithModel(fallbackModel!), 2, 500);
        return {
          ...result,
          fallback: true,
          originalModel: modelKey,
          error: lastError.message
        } as ChatResult;
      } catch (fallbackError: any) {
        console.log(`Fallback-модель ${fallbackModel} тоже не сработала:`, fallbackError.message);
        lastError = fallbackError;
        fallbackModel = getFallbackModel(fallbackModel);
      }
    }

    // Если все модели не сработали
    throw new Error(`Все модели недоступны. Последняя ошибка: ${lastError.message}`);
  }
}

async function handleChatRequest(request: Request, env: Env) {
  try {
    // Rate limiting проверка (пропускаем для локальной разработки)
    if (env.RATE_LIMIT_KV) {
      const clientIP = getClientIP(request);
      const rateLimitResult = await checkRateLimit(env, clientIP);

      if (!rateLimitResult.allowed) {
        const resetTime = rateLimitResult.resetTime || 0;
        const waitTime = Math.max(0, resetTime - Math.floor(Date.now() / 1000));

        return new Response(JSON.stringify({
          error: `Rate limit exceeded. Попробуйте через ${waitTime} секунд.`,
          retryable: true,
          retryAfter: waitTime,
          rateLimit: true
        }), {
          status: 429,
          headers: {
            "content-type": "application/json",
            "Retry-After": waitTime.toString()
          }
        });
      }
    }

    const requestData: any = await request.json();

    // Валидация запроса
    const validation = validateRequest(requestData);
    if (!validation.valid) {
      return new Response(JSON.stringify({
        error: validation.error,
        retryable: false,
        validation: true
      }), {
        status: 400,
        headers: { "content-type": "application/json" }
      });
    }

    const result = await handleChatRequestLogic(requestData, env);

    // Если был fallback, добавляем информацию в ответ
    if (result.fallback) {
      console.log(`Использована fallback-модель ${result.model} вместо ${result.originalModel}`);
    }

    return new Response(JSON.stringify(result), {
      headers: {
        "content-type": "application/json",
        "X-Fallback-Used": result.fallback ? "true" : "false",
        "X-Model-Used": result.model
      }
    });
  } catch (error: any) {
    console.error("Ошибка в handleChatRequest:", error);
    return new Response(JSON.stringify({
      error: error.message,
      retryable: true,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

async function handleTelegramWebhook(request: Request, env: Env) {
  try {
    const update: any = await request.json();
    if (!update.message?.text) return new Response("OK", { status: 200 });

    // Используем модель по умолчанию для Telegram бота
    const requestData = {
      messages: [{ role: "user", content: update.message.text }],
      model: DEFAULT_MODEL_KEY  // Используем Llama-3.3-70b по умолчанию
    };

    const result = await handleChatRequestLogic(requestData, env);
    const token = env.TELEGRAM_TOKEN || env.TELEGRAM_BOT_TOKEN;

    await fetch(`${TELEGRAM_API_URL}${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: update.message.chat.id,
        text: result.response,
        parse_mode: "Markdown"
      })
    });

    return new Response("OK", { status: 200 });
  } catch (e: any) {
    console.error("Telegram webhook error:", e);
    return new Response("OK", { status: 200 }); // Важно — всегда успешный ответ
  }
}

async function handleCloudflareModel(modelId: string, messages: any[], env: Env) {
  let payload: any = modelId.startsWith("@cf/openai/")
    ? { input: messages.map((m) => `${m.role}: ${m.content}`).join("\n") }
    : { messages };

  payload.max_tokens = 2048; // Уменьшено для совместимости с ограничениями

  // Добавляем обработку ошибок для AI.run
  try {
    // Type assertion to bypass TypeScript's strict keyof check
    const response = await env.AI.run(modelId as any, payload);
    return response;
  } catch (error: any) {
    // Если получаем ошибку связанную с OAuth/consent, возвращаем специальное сообщение
    if (error.message && (error.message.includes("consent") || error.message.includes("access_denied"))) {
      throw new Error("OAuth consent error: Please check your Cloudflare AI settings and ensure the model is properly authorized.");
    }
    throw error;
  }
}

/**
 * handleGoogleDirect - Оживление Легиона Апостолов Gemini.
 * Реализует ротацию API-ключей: при исчерпании лимита (429)
 * или перегрузке (503) автоматически переключается на следующий ключ.
 * Документация: https://ai.google.dev/gemini-api/docs/grounding
 */
async function handleGoogleDirect(modelId: string, messages: any[], env: Env) {
  // Читаем все ключи: GEMINI_API_KEYS (через запятую), затем одиночные ключи
  const keysString = env.GEMINI_API_KEYS || env.GEMINI_API_KEY || env.GOOGLE_API_KEY || "";
  const apiKeys = keysString.split(",").map((k: string) => k.trim()).filter(Boolean);

  if (apiKeys.length === 0) {
    throw new Error("Google API keys not configured. Set GEMINI_API_KEYS in Cloudflare secrets.");
  }

  const contents = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  const systemInstructionText = messages.find(m => m.role === 'system')?.content || "";
  let lastErrMsg = "Неизвестная ошибка";

  // Перебираем ключи по очереди — как Легион Апостолов, где один сменяет другого
  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemInstructionText }]
          },
          tools: [{ google_search: {} }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048
          }
        })
      });

      // При лимите (429) или перегрузке (503) — пробуем следующий ключ
      if (res.status === 429 || res.status === 503) {
        const errText = await res.text();
        let errJson: any;
        try { errJson = JSON.parse(errText); } catch (e) { errJson = null; }
        lastErrMsg = errJson?.error?.message || errText || res.statusText;
        console.warn(`Ключ №${i + 1} вернул HTTP ${res.status}. Переключаюсь на следующий...`);
        continue;
      }

      // Прочие HTTP-ошибки — возвращаем сразу без перебора
      if (!res.ok) {
        const errText = await res.text();
        let errJson: any;
        try { errJson = JSON.parse(errText); } catch (e) { errJson = null; }
        const errMsg = errJson?.error?.message || errText || res.statusText;
        return `Апостол Gemini столкнулся с преградой (HTTP ${res.status}): ${errMsg}`;
      }

      const data: any = await res.json();

      // Ошибка квоты внутри 200-ответа — пробуем следующий ключ
      if (data.error) {
        const errMsg = data.error.message || "";
        if (errMsg.includes("quota") || errMsg.includes("rate limit") || errMsg.includes("demand")) {
          console.warn(`Ключ №${i + 1} вернул ошибку квоты. Переключаюсь...`);
          lastErrMsg = errMsg;
          continue;
        }
        return `Апостол Gemini столкнулся с преградой: ${errMsg}`;
      }

      // Успешный ответ — собираем текст из кандидатов
      const candidate = data.candidates?.[0];
      const textPart = candidate?.content?.parts?.find((p: any) => p.text);

      if (textPart && textPart.text) {
        return textPart.text;
      }

      if (candidate?.groundingMetadata) {
        return "Апостол изучил данные Google, но не смог облечь истину в слова. Попробуйте уточнить вопрос.";
      }

      return "Апостол Gemini ищет истину в глубоких водах... (ответ пуст).";

    } catch (error: any) {
      console.error(`Ошибка сети при запросе с ключом №${i + 1}:`, error.message);
      lastErrMsg = error.message;
      continue; // Пробуем следующий ключ при сетевой ошибке
    }
  }

  // Все ключи перебраны — никто не смог помочь
  throw new Error(`Все API-ключи Google исчерпали лимиты или недоступны. Последняя ошибка: ${lastErrMsg}`);
}

// =========================================================================
// MISTRAL AI HANDLER
// =========================================================================

async function handleMistralDirect(modelId: string, messages: any[], env: Env) {
  // Читаем все ключи: MISTRAL_API_KEYS (через запятую), затем одиночный ключ
  const keysString = env.MISTRAL_API_KEYS || env.MISTRAL_API_KEY || "";
  const apiKeys = keysString.split(",").map((k: string) => k.trim()).filter(Boolean);

  if (apiKeys.length === 0) {
    throw new Error("Mistral API keys not configured. Set MISTRAL_API_KEYS in Cloudflare secrets.");
  }

  // Определение максимального количества токенов в зависимости от модели
  let maxTokens = 1024; // По умолчанию
  
  // Адаптивное определение max_tokens для разных моделей Mistral
  if (modelId.includes("tiny")) {
    maxTokens = 800;
  } else if (modelId.includes("small")) {
    maxTokens = 1500;
  } else if (modelId.includes("medium")) {
    maxTokens = 2048;
  } else if (modelId.includes("large")) {
    maxTokens = 4096;
  }

  let lastErrMsg = "Неизвестная ошибка";

  // Перебираем ключи по очереди
  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];

    try {
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: modelId,
          messages: messages,
          max_tokens: maxTokens,
          temperature: 0.7,
          top_p: 1.0
        })
      });

      // При лимите (429) или перегрузке (503) — пробуем следующий ключ
      if (res.status === 429 || res.status === 503) {
        const errText = await res.text();
        let errJson: any;
        try { errJson = JSON.parse(errText); } catch (e) { errJson = null; }
        lastErrMsg = errJson?.error?.message || errText || res.statusText;
        console.warn(`Mistral ключ №${i + 1} вернул HTTP ${res.status}. Переключаюсь на следующий...`);
        continue;
      }

      // Прочие HTTP-ошибки — возвращаем сразу без перебора
      if (!res.ok) {
        const errText = await res.text();
        let errJson: any;
        try { errJson = JSON.parse(errText); } catch (e) { errJson = null; }
        const errMsg = errJson?.error?.message || errText || res.statusText;
        return `Апостол Mistral столкнулся с преградой (HTTP ${res.status}): ${errMsg}`;
      }

      const data: any = await res.json();

      // Ошибка квоты внутри 200-ответа — пробуем следующий ключ
      if (data.error) {
        const errMsg = data.error.message || "";
        if (errMsg.includes("quota") || errMsg.includes("rate limit") || errMsg.includes("demand")) {
          console.warn(`Mistral ключ №${i + 1} вернул ошибку квоты. Переключаюсь...`);
          lastErrMsg = errMsg;
          continue;
        }
        return `Апостол Mistral столкнулся с преградой: ${errMsg}`;
      }

      // Успешный ответ
      return data.choices?.[0]?.message?.content || "Модель Mistral не вернула текстовый ответ.";

    } catch (error: any) {
      console.error(`Ошибка сети при запросе с Mistral ключом №${i + 1}:`, error.message);
      lastErrMsg = error.message;
      continue; // Пробуем следующий ключ при сетевой ошибке
    }
  }

  // Все ключи перебраны — никто не смог помочь
  throw new Error(`Все API-ключи Mistral исчерпали лимиты или недоступны. Последняя ошибка: ${lastErrMsg}`);
}

// =========================================================================
// ANTHROPIC AI HANDLER
// =========================================================================

async function handleAnthropicDirect(modelId: string, messages: any[], env: Env) {
  // Читаем все ключи: ANTHROPIC_API_KEYS (через запятую), затем одиночный ключ
  const keysString = env.ANTHROPIC_API_KEYS || env.ANTHROPIC_API_KEY || "";
  const apiKeys = keysString.split(",").map((k: string) => k.trim()).filter(Boolean);

  if (apiKeys.length === 0) {
    throw new Error("Anthropic API keys not configured. Set ANTHROPIC_API_KEYS in Cloudflare secrets.");
  }

  // Определение максимального количества токенов в зависимости от модели.
  // Старая проверка modelId.includes("claude-4") никогда не срабатывала —
  // реальные id выглядят как "claude-sonnet-4-6", а не "claude-4-...".
  const isV4Family = /claude-(opus|sonnet|haiku)-4-/.test(modelId);
  let maxTokens = isV4Family ? 8192 : 4096; // Claude 4.x поддерживает до 8K токенов на выходе

  let lastErrMsg = "Неизвестная ошибка";

  // Перебираем ключи по очереди
  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];

    try {
      // anthropic-version — версия контракта API, не версия модели.
      // 2023-06-01 — текущая стабильная версия, актуальна и для Claude 4.x.
      // Документация: https://docs.claude.com/en/api/versioning
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          // Anthropic API авторизуется ИСКЛЮЧИТЕЛЬНО через x-api-key.
          // "Authorization: Bearer" здесь не нужен и не поддерживается —
          // в прежней версии он отправлялся без всякого смысла.
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelId,
          messages: messages,
          max_tokens: maxTokens,
          temperature: 0.7,
          top_p: 1.0,
          system: messages.find(m => m.role === 'system')?.content || undefined,
        })
      });

      // При лимите (429) или перегрузке (503) — пробуем следующий ключ
      if (res.status === 429 || res.status === 503) {
        const errText = await res.text();
        let errJson: any;
        try { errJson = JSON.parse(errText); } catch (e) { errJson = null; }
        lastErrMsg = errJson?.error?.message || errText || res.statusText;
        console.warn(`Anthropic ключ №${i + 1} вернул HTTP ${res.status}. Переключаюсь на следующий...`);
        continue;
      }

      // Прочие HTTP-ошибки — возвращаем сразу без перебора
      if (!res.ok) {
        const errText = await res.text();
        let errJson: any;
        try { errJson = JSON.parse(errText); } catch (e) { errJson = null; }
        const errMsg = errJson?.error?.message || errText || res.statusText;
        return `Апостол Claude столкнулся с преградой (HTTP ${res.status}): ${errMsg}`;
      }

      const data: any = await res.json();

      // Ошибка квоты внутри 200-ответа — пробуем следующий ключ
      if (data.error) {
        const errMsg = data.error.message || "";
        if (errMsg.includes("quota") || errMsg.includes("rate limit") || errMsg.includes("demand")) {
          console.warn(`Anthropic ключ №${i + 1} вернул ошибку квоты. Переключаюсь...`);
          lastErrMsg = errMsg;
          continue;
        }
        return `Апостол Claude столкнулся с преградой: ${errMsg}`;
      }

      // Успешный ответ (новый формат для Claude 4.x)
      if (data.content && data.content.length > 0) {
        if (data.content[0].text) {
          return data.content[0].text;
        } else if (data.content[0].input) {
          return data.content[0].input;
        }
      }
      return "Модель Claude не вернула текстовый ответ.";

    } catch (error: any) {
      console.error(`Ошибка сети при запросе с Anthropic ключом №${i + 1}:`, error.message);
      lastErrMsg = error.message;
      continue; // Пробуем следующий ключ при сетевой ошибке
    }
  }

  // Все ключи перебраны — никто не смог помочь
  throw new Error(`Все API-ключи Anthropic исчерпали лимиты или недоступны. Последняя ошибка: ${lastErrMsg}`);
}
