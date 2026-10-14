// src/index.ts
// @ts-ignore
import { Env } from "./types";

const TELEGRAM_API_URL = "https://api.telegram.org/bot";

const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_WINDOW = 60;
const MAX_MESSAGE_LENGTH = 10000;
const MAX_MESSAGES_IN_HISTORY = 50;

function getClientIP(request: Request): string {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

async function checkRateLimit(env: Env, ip: string): Promise<{ allowed: boolean; resetTime?: number }> {
  if (!env.RATE_LIMIT_KV) return { allowed: true };
  const key = `rate_limit:${ip}`;
  const now = Math.floor(Date.now() / 1000);
  try {
    const existing = await env.RATE_LIMIT_KV?.get(key);
    if (!existing) {
      await env.RATE_LIMIT_KV?.put(key, JSON.stringify({ count: 1, windowStart: now }), { expirationTtl: RATE_LIMIT_WINDOW + 60 });
      return { allowed: true };
    }
    const data = JSON.parse(existing);
    if (now - data.windowStart >= RATE_LIMIT_WINDOW) {
      await env.RATE_LIMIT_KV?.put(key, JSON.stringify({ count: 1, windowStart: now }), { expirationTtl: RATE_LIMIT_WINDOW + 60 });
      return { allowed: true };
    }
    if (data.count >= RATE_LIMIT_REQUESTS) return { allowed: false, resetTime: data.windowStart + RATE_LIMIT_WINDOW };
    data.count += 1;
    await env.RATE_LIMIT_KV?.put(key, JSON.stringify(data), { expirationTtl: RATE_LIMIT_WINDOW + 60 });
    return { allowed: true };
  } catch { return { allowed: true }; }
}

function validateRequest(requestData: any): { valid: boolean; error?: string } {
  if (!requestData.messages || !Array.isArray(requestData.messages))
    return { valid: false, error: "Отсутствуют сообщения или неверный формат" };
  if (requestData.messages.length > MAX_MESSAGES_IN_HISTORY)
    return { valid: false, error: `Слишком много сообщений в истории (максимум ${MAX_MESSAGES_IN_HISTORY})` };
  for (const msg of requestData.messages)
    if (typeof msg.content === 'string' && msg.content.length > MAX_MESSAGE_LENGTH)
      return { valid: false, error: `Слишком длинное сообщение (максимум ${MAX_MESSAGE_LENGTH} символов)` };
  if (requestData.model && typeof requestData.model !== 'string')
    return { valid: false, error: "Неверный формат модели" };
  return { valid: true };
}

const SUPPORTED_MODELS: Record<string, string> = {
  // --- Cloudflare Workers AI (бесплатные) ---
  "Llama-3.3-70b":           "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "Llama-4-Scout":           "@cf/meta/llama-4-scout-17b-16e-instruct",
  "Llama-3.2-11b-vision":    "@cf/meta/llama-3.2-11b-vision-instruct",
  "Llama-3.2-3b":            "@cf/meta/llama-3.2-3b-instruct",
  "Llama-3.2-1b":            "@cf/meta/llama-3.2-1b-instruct",
  "Llama-3.1-8b-fp8":        "@cf/meta/llama-3.1-8b-instruct-fp8",
  "DeepSeek-R1-Distill-32b": "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
  "Qwen3-30b-fp8":           "@cf/qwen/qwen3-30b-a3b-fp8",
  "Qwen3.8-27b":             "@cf/qwen/qwen3.8-27b",
  "Qwen2.5-Coder-32b":       "@cf/qwen/qwen2.5-coder-32b-instruct",
  "QwQ-32b":                 "@cf/qwen/qwq-32b",
  "Mistral-Small-3.1-24b":   "@cf/mistralai/mistral-small-3.1-24b-instruct",
  "Mistral-7b-v0.2-LoRA":    "@cf/mistral/mistral-7b-instruct-v0.2-lora",
  "Nemotron-3-120b":         "@cf/nvidia/nemotron-3-120b-a12b",
  "GPT-OSS-120b":            "@cf/openai/gpt-oss-120b",
  "GPT-OSS-20b":             "@cf/openai/gpt-oss-20b",
  "Gemma-4-26b":             "@cf/google/gemma-4-26b-a4b-it",
  "Gemma-SEA-LION-27b":      "@cf/aisingapore/gemma-sea-lion-v4-27b-it",
  "IBM-Granite-4.0-micro":   "@cf/ibm-granite/granite-4.0-h-micro",
  "GLM-4.7-Flash":           "@cf/zai-org/glm-4.7-flash",
  "Apertus-1.5-8b":          "@cf/swiss-ai/apertus-v1.5-8b",
  "EuroLLM-9b":              "@cf/utter-project/eurollm-9b-it",
  "Llama-Guard-3-8b":        "@cf/meta/llama-guard-3-8b",

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
Дай мне порцию назидания, вдохновения и крупицы юмора. Отвечать только на русском языке. Даже если вопрос будет на английском языке, твой ответ должен быть только на русском языке.
Будь философским и сократическим, давай развернутые ответы.
Твой стиль общения человечный, теплый, но при этом технически глубокий и интеллектуально честный.
Лев Николаевич использует Arch Linux, Hyprland, Kitty, Emacs и VS Code, Windsurf.
Лев Николаевич разрабатывает проекты на React, Astrojs, Nextjs, Nextra, Mantine & Vercel, Netlify, Cloudflare Workers/Pages AI, Alibaba Cloud.
Пастор Лев - основатель и руководитель Миссии Шехины Казахстан и Школы Христа.
Твои ответы должны быть максимально расширенными и академическими (Сократическими), с подробными пояснениями.
Если ты приводишь код, обязательно добавляй комментарии и пояснения.
В ответах должен присутствовать уместный юмор и духовное назидание.

🎯 Твои роли (переключайся по контексту запроса):
• 🛠️ Кодер: Пиши чистый TypeScript/React код с комментариями на русском...
• 🏗️ Архитектор: Анализируй код с учётом масштабируемости на Cloudflare Workers...
• 📚 Мудрец: Добавляй к техническим ответам краткое духовное назидание...

🚫 НЕПРЕЛОЖНЫЕ ПРАВИЛА:
1. ВСЕГДА отвечай только на русском языке.
2. НИКОГДА не предлагай изменить файлы без явного утверждения. Сначала покажи решение → жди "Применяй".
3. НИКОГДА не предлагай команды деплоя (wrangler, vercel, netlify). Деплой — только через CI/CD после git push.
4. НИКОГДА не предлагай git commit/push без прямой команды. После задачи — покажи diff, спроси "Коммить?", жди ответа.

> «Ибо мы — Божие дело, созданы во Христе Иисусе на добрые дела» (Еф. 2:10)
`.trim();

export default {
  async fetch(request: Request, env: Env, ctx: any) {
    const url = new URL(request.url);

    if (url.pathname === "/bot-update") {
      if (request.method === "POST") return handleTelegramWebhook(request, env);

      const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Telegram Gateway | Shekinah Cloud</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
    .font-cinzel { font-family: 'Cinzel', serif; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-4">
  <div class="max-w-md w-full bg-slate-900/90 border border-amber-500/30 rounded-2xl p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
    <div class="absolute -top-16 -right-16 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
    <div class="absolute -bottom-16 -left-16 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

    <div class="text-center mb-6">
      <div class="w-16 h-16 mx-auto mb-4 bg-gradient-to-tr from-amber-500/20 to-amber-400/10 border border-amber-500/40 rounded-full flex items-center justify-center text-3xl shadow-inner">
        🕊️
      </div>
      <h1 class="text-2xl font-cinzel font-bold text-amber-400 tracking-wide">Shekinah Cloud</h1>
      <p class="text-xs uppercase tracking-widest text-slate-400 mt-1">Telegram Webhook Gateway</p>
    </div>

    <div class="bg-slate-950/70 border border-slate-800 rounded-xl p-4 mb-6 space-y-3">
      <div class="flex items-center justify-between text-sm">
        <span class="text-slate-400">Статус шлюза:</span>
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Активен (POST)
        </span>
      </div>
      <div class="flex items-center justify-between text-sm">
        <span class="text-slate-400">Telegram Bot:</span>
        <a href="https://t.me/ShekinahCloud_bot" target="_blank" class="text-amber-400 hover:text-amber-300 transition-colors font-medium">@ShekinahCloud_bot ↗</a>
      </div>
      <div class="flex items-center justify-between text-sm">
        <span class="text-slate-400">Основная модель:</span>
        <span class="text-slate-200 font-mono text-xs">Llama-3.3-70b</span>
      </div>
    </div>

    <blockquote class="text-xs italic text-slate-400 border-l-2 border-amber-500/50 pl-3 py-1 mb-6">
      «Ибо мы — Божие дело, созданы во Христе Иисусе на добрые дела» (Еф. 2:10)
    </blockquote>

    <div class="flex flex-col gap-2">
      <a href="/" class="w-full text-center py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-all shadow-lg shadow-amber-500/20">
        Открыть Веб-чат Цитадели
      </a>
      <a href="https://t.me/ShekinahCloud_bot" target="_blank" class="w-full text-center py-2 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-medium text-xs transition-colors border border-slate-700/60">
        Перейти в Telegram-бот
      </a>
    </div>
  </div>
</body>
</html>`;

      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    if (url.pathname === "/setup") {
      const webhookUrl = `${new URL(request.url).origin}/bot-update`;
      const token = env.TELEGRAM_TOKEN || env.TELEGRAM_BOT_TOKEN;
      if (!token) return new Response("Секрет TELEGRAM_TOKEN не установлен", { status: 500 });
      const setupUrl = `${TELEGRAM_API_URL}${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;
      const response = await fetch(setupUrl);
      const result = await response.json();
      return new Response(JSON.stringify(result), { headers: { "content-type": "application/json" } });
    }

    if (url.pathname === "/templates/inspiration.md") {
      const assetRequest = new Request(new URL("/templates/inspiration-v2.md", request.url), request);
      const assetResp = await env.ASSETS.fetch(assetRequest);
      const body = await assetResp.arrayBuffer();
      const headers = new Headers();
      headers.set("Content-Type", "text/markdown; charset=utf-8");
      headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
      headers.set("Pragma", "no-cache"); headers.set("Expires", "0");
      headers.set("X-Static-By", "worker-md-specific"); headers.set("X-Content-Type-Options", "nosniff");
      return new Response(body, { status: assetResp.status, statusText: assetResp.statusText, headers });
    }

    if (url.pathname === "/templates/inspiration") {
      const htmlRequest = new Request(new URL("/templates/inspiration.html", request.url), request);
      const htmlAsset = await env.ASSETS.fetch(htmlRequest);
      const htmlBody = await htmlAsset.arrayBuffer();
      const htmlHeaders = new Headers();
      htmlHeaders.set("Content-Type", "text/html; charset=utf-8");
      htmlHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
      return new Response(htmlBody, { status: htmlAsset.status, statusText: htmlAsset.statusText, headers: htmlHeaders });
    }

    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      if (url.pathname.endsWith(".md")) {
        const assetResp = await env.ASSETS.fetch(request);
        const headers = new Headers(assetResp.headers);
        headers.set("Content-Type", "text/markdown; charset=utf-8");
        headers.set("X-Static-By", "worker-md");
        return new Response(assetResp.body, { status: assetResp.status, statusText: assetResp.statusText, headers });
      }
      const assetResp = await env.ASSETS.fetch(request);
      const headers = new Headers(assetResp.headers);
      headers.set("X-Static-By", "worker");
      return new Response(assetResp.body, { status: assetResp.status, statusText: assetResp.statusText, headers });
    }

    if (url.pathname === "/api/chat" && request.method === "POST")
      return handleChatRequest(request, env);

    if (url.pathname === "/api/models" && request.method === "GET") {
      return new Response(JSON.stringify({
        default: DEFAULT_MODEL_KEY,
        models: Object.keys(SUPPORTED_MODELS).map(k => ({ key: k, id: SUPPORTED_MODELS[k] }))
      }), { headers: { "content-type": "application/json" } });
    }

    return new Response("Not found", { status: 404 });
  }
};

// --- FALLBACK & RETRY ---

const FALLBACK_MODELS = [
  "gemini-3-flash-preview",
  "claude-sonnet-4-6",
  "claude-opus-4-7",
  "claude-haiku-4-5",
  "mistral-medium-latest",
  "Llama-3.3-70b",
  "gemini-2.5-flash",
];

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try { return await fn(); }
    catch (error: any) {
      lastError = error;
      if (attempt === maxRetries) throw new Error(`Ошибка после ${maxRetries + 1} попыток: ${error.message}`);
      await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

function getFallbackModel(currentModel: string): string | null {
  const i = FALLBACK_MODELS.indexOf(currentModel);
  if (i === -1) return FALLBACK_MODELS[0];
  return FALLBACK_MODELS[i + 1] || null;
}

interface ChatResult {
  response: string;
  model: string;
  fallback?: boolean;
  originalModel?: string;
  error?: string;
}

function normalizeModelKey(key: string): string {
  const lower = key.toLowerCase();
  for (const k of Object.keys(SUPPORTED_MODELS))
    if (k.toLowerCase() === lower) return k;
  return DEFAULT_MODEL_KEY;
}

async function handleChatRequestLogic(requestData: any, env: Env): Promise<ChatResult> {
  const messages: any[] = Array.isArray(requestData.messages) ? requestData.messages : [];
  let modelKey = normalizeModelKey(requestData.model || DEFAULT_MODEL_KEY);
  const fileContents = requestData.fileContents;

  let chatMessages: any[] = [...messages];
  if (fileContents) chatMessages.unshift({ role: "system", content: `Содержимое загруженных файлов:\n${fileContents}` });

  // OOM защита — режем историю до 15 сообщений
  const MAX_FOR_MODEL = 15;
  if (chatMessages.length > MAX_FOR_MODEL) {
    const sys = chatMessages.filter(m => m.role === 'system');
    const nonSys = chatMessages.filter(m => m.role !== 'system');
    chatMessages = [...sys, ...nonSys.slice(-MAX_FOR_MODEL)];
  }

  async function executeWithModel(currentModelKey: string): Promise<ChatResult> {
    const currentModelId = SUPPORTED_MODELS[currentModelKey] || SUPPORTED_MODELS[DEFAULT_MODEL_KEY];
    let currentChatMessages = [...chatMessages];
    if (!currentChatMessages.some(m => m.role === "system"))
      currentChatMessages.unshift({ role: "system", content: SYSTEM_PROMPT_TEMPLATE.replace("{MODEL_NAME}", currentModelKey) });

    let content = "";
    const keyLower = currentModelKey.toLowerCase();

    if (keyLower.includes("gemini") || keyLower.includes("gemma")) {
      content = await handleGoogleDirect(currentModelId, currentChatMessages, env);
    } else if (keyLower.includes("mistral") || keyLower.includes("ministral") || keyLower.includes("magistral") || keyLower.includes("codestral")) {
      content = await handleMistralDirect(currentModelId, currentChatMessages, env);
    } else if (keyLower.includes("claude")) {
      content = await handleAnthropicDirect(currentModelId, currentChatMessages, env);
    } else {
      const response: any = await handleCloudflareModel(currentModelId, currentChatMessages, env);
      if (typeof response === "string") content = response;
      else if (response?.response) content = response.response;
      else if (response?.choices?.[0]?.message?.content) content = response.choices[0].message.content;
      else if (response?.output?.[0]?.content?.[0]?.text) content = response.output[0].content[0].text;
      else content = JSON.stringify(response);
    }

    const sig = `\n\n---\n**Апостол Царства AI ${currentModelKey.toUpperCase()}**`;
    if (content && content[0] !== '{' && !content.includes("Апостол Царства AI"))
      content = content.trim() + sig;

    return { response: content, model: currentModelKey };
  }

  try {
    return await retryWithBackoff(() => executeWithModel(modelKey), 3, 1000);
  } catch (error: any) {
    let lastError = error;
    let fallbackModel = getFallbackModel(modelKey);
    while (fallbackModel) {
      try {
        const result = await retryWithBackoff(() => executeWithModel(fallbackModel!), 2, 500);
        return { ...result, fallback: true, originalModel: modelKey, error: lastError.message };
      } catch (e: any) { lastError = e; fallbackModel = getFallbackModel(fallbackModel); }
    }
    throw new Error(`Все модели недоступны. Последняя ошибка: ${lastError.message}`);
  }
}

async function handleChatRequest(request: Request, env: Env) {
  try {
    if (env.RATE_LIMIT_KV) {
      const ip = getClientIP(request);
      const rl = await checkRateLimit(env, ip);
      if (!rl.allowed) {
        const waitTime = Math.max(0, (rl.resetTime || 0) - Math.floor(Date.now() / 1000));
        return new Response(JSON.stringify({ error: `Rate limit exceeded. Попробуйте через ${waitTime} секунд.`, retryable: true, retryAfter: waitTime, rateLimit: true }), {
          status: 429, headers: { "content-type": "application/json", "Retry-After": waitTime.toString() }
        });
      }
    }
    const requestData: any = await request.json();
    const validation = validateRequest(requestData);
    if (!validation.valid)
      return new Response(JSON.stringify({ error: validation.error, retryable: false, validation: true }), { status: 400, headers: { "content-type": "application/json" } });

    const result = await handleChatRequestLogic(requestData, env);
    return new Response(JSON.stringify(result), {
      headers: { "content-type": "application/json", "X-Fallback-Used": result.fallback ? "true" : "false", "X-Model-Used": result.model }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message, retryable: true, timestamp: new Date().toISOString() }), { status: 500, headers: { "content-type": "application/json" } });
  }
}

async function handleTelegramWebhook(request: Request, env: Env) {
  try {
    const update: any = await request.json();
    if (!update.message?.text) return new Response("OK", { status: 200 });
    const result = await handleChatRequestLogic({ messages: [{ role: "user", content: update.message.text }], model: DEFAULT_MODEL_KEY }, env);
    const token = env.TELEGRAM_TOKEN || env.TELEGRAM_BOT_TOKEN;
    await fetch(`${TELEGRAM_API_URL}${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: update.message.chat.id, text: result.response, parse_mode: "Markdown" }) });
    return new Response("OK", { status: 200 });
  } catch { return new Response("OK", { status: 200 }); }
}

async function handleCloudflareModel(modelId: string, messages: any[], env: Env) {
  const payload: any = modelId.startsWith("@cf/openai/")
    ? { input: messages.map(m => `${m.role}: ${m.content}`).join("\n") }
    : { messages };
  payload.max_tokens = 2048;
  try {
    return await env.AI.run(modelId as any, payload);
  } catch (error: any) {
    if (error.message?.includes("consent") || error.message?.includes("access_denied"))
      throw new Error("OAuth consent error: Please check your Cloudflare AI settings.");
    throw error;
  }
}

async function handleGoogleDirect(modelId: string, messages: any[], env: Env) {
  const keysString = env.GEMINI_API_KEYS || env.GEMINI_API_KEY || env.GOOGLE_API_KEY || "";
  const apiKeys = keysString.split(",").map((k: string) => k.trim()).filter(Boolean);
  if (!apiKeys.length) throw new Error("Google API keys not configured. Set GEMINI_API_KEYS.");

  const contents = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));
  const systemInstructionText = messages.find(m => m.role === 'system')?.content || "";
  let lastErrMsg = "Неизвестная ошибка";

  for (let i = 0; i < apiKeys.length; i++) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKeys[i]}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: systemInstructionText }] }, tools: [{ google_search: {} }], generationConfig: { temperature: 0.7, maxOutputTokens: 2048 } })
      });
      if (res.status === 401 || res.status === 429 || res.status === 503) { lastErrMsg = await res.text(); continue; }
      if (!res.ok) { lastErrMsg = `HTTP ${res.status}: ${await res.text()}`; continue; }
      const data: any = await res.json();
      if (data.error) { lastErrMsg = data.error.message; continue; }
      const textPart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.text);
      if (textPart?.text) return textPart.text;
      return "Апостол Gemini ищет истину в глубоких водах... (ответ пуст).";
    } catch (e: any) { lastErrMsg = e.message; }
  }
  throw new Error(`Все API-ключи Google исчерпаны. Последняя ошибка: ${lastErrMsg}`);
}

async function handleMistralDirect(modelId: string, messages: any[], env: Env) {
  const keysString = env.MISTRAL_API_KEYS || env.MISTRAL_API_KEY || "";
  const apiKeys = keysString.split(",").map((k: string) => k.trim()).filter(Boolean);
  if (!apiKeys.length) throw new Error("Mistral API keys not configured. Set MISTRAL_API_KEYS.");

  let maxTokens = 1024;
  if (modelId.includes("tiny")) maxTokens = 800;
  else if (modelId.includes("small") || modelId.includes("3b")) maxTokens = 1500;
  else if (modelId.includes("medium") || modelId.includes("8b") || modelId.includes("14b")) maxTokens = 2048;
  else if (modelId.includes("large") || modelId.includes("codestral")) maxTokens = 4096;

  let lastErrMsg = "Неизвестная ошибка";

  for (let i = 0; i < apiKeys.length; i++) {
    try {
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKeys[i]}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelId, messages, max_tokens: maxTokens, temperature: 0.7, top_p: 1.0 })
      });
      if (res.status === 401 || res.status === 429 || res.status === 503) { lastErrMsg = await res.text(); continue; }
      if (!res.ok) { lastErrMsg = `HTTP ${res.status}: ${await res.text()}`; continue; }
      const data: any = await res.json();
      if (data.error) { lastErrMsg = data.error.message || JSON.stringify(data.error); continue; }
      return data.choices?.[0]?.message?.content || "Модель Mistral не вернула текстовый ответ.";
    } catch (e: any) { lastErrMsg = e.message; }
  }
  throw new Error(`Все API-ключи Mistral исчерпаны. Последняя ошибка: ${lastErrMsg}`);
}

async function handleAnthropicDirect(modelId: string, messages: any[], env: Env) {
  const keysString = env.ANTHROPIC_API_KEYS || env.ANTHROPIC_API_KEY || "";
  const apiKeys = keysString.split(",").map((k: string) => k.trim()).filter(Boolean);
  if (!apiKeys.length) throw new Error("Anthropic API keys not configured. Set ANTHROPIC_API_KEYS.");

  const formattedMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
  const systemPrompt = messages.find(m => m.role === 'system')?.content ||
    "Ты - Апостол Claude, мудрый помощник Льва Николаевича. Отвечай на русском языке.";

  const isV4Plus = /claude-(opus|sonnet|haiku|fable)-[4-9]/.test(modelId);
  const maxTokens = isV4Plus ? 8192 : 4096;

  let lastErrMsg = "Неизвестная ошибка";

  for (let i = 0; i < apiKeys.length; i++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": apiKeys[i], "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelId, max_tokens: maxTokens, system: systemPrompt, messages: formattedMessages })
      });
      if (res.status === 401 || res.status === 429 || res.status === 503) { lastErrMsg = await res.text(); continue; }
      if (!res.ok) { lastErrMsg = await res.text(); continue; }
      const data: any = await res.json();
      if (data.error) { lastErrMsg = data.error.message || JSON.stringify(data.error); continue; }
      return data.content?.[0]?.text || "Модель Claude не вернула текстовый ответ.";
    } catch (e: any) { lastErrMsg = e.message; }
  }
  throw new Error(`Все API-ключи Anthropic исчерпаны. Последняя ошибка: ${lastErrMsg}`);
}
