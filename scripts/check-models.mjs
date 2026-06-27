#!/usr/bin/env node
/**
 * check-models.mjs
 * -----------------
 * Проверяет, какие модели реально доступны по твоим API-ключам
 * у трёх провайдеров, которые используются в Mission Shekinah AI:
 *  - OpenRouter
 *  - Google Gemini
 *  - Cloudflare Workers AI
 *
 * Запуск:
 *   node check-models.mjs
 *
 * Зависимости:
 *   npm install dotenv
 *
 * Переменные окружения (положи в .env, НЕ в код и НЕ в git):
 *   OPENROUTER_API_KEY=sk-or-...
 *   GEMINI_API_KEY=AIzaSy...
 *   CF_API_TOKEN=...
 *   CF_ACCOUNT_ID=...
 *
 * Любой из блоков можно пропустить — скрипт просто покажет "skip",
 * если соответствующих переменных нет.
 */

import 'dotenv/config';

// --- небольшие хелперы для цветного вывода в терминале (Fish/Kitty это любят) ---
const c = {
  ok: (s) => `\x1b[32m${s}\x1b[0m`,
  err: (s) => `\x1b[31m${s}\x1b[0m`,
  skip: (s) => `\x1b[90m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

// ---------------------------------------------------------------------------
// 1. OpenRouter — отдаёт полный список моделей + цены, ключ нужен только
//    чтобы видеть лимиты/доступность, список моделей открыт даже без ключа,
//    но мы всё равно шлём ключ, чтобы быть последовательными.
// ---------------------------------------------------------------------------
async function checkOpenRouter() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { status: 'skip', reason: 'OPENROUTER_API_KEY не задан' };

  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return { status: 'error', code: res.status };

    const data = await res.json();
    const free = data.data
      .filter((m) => m.pricing?.prompt === '0' && m.pricing?.completion === '0')
      .map((m) => m.id);

    return {
      status: 'ok',
      totalModels: data.data.length,
      freeModelsCount: free.length,
      freeModels: free.slice(0, 15), // первые 15, чтобы не заваливать вывод
    };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

// ---------------------------------------------------------------------------
// 2. Google Gemini — список моделей, доступных конкретно для твоего ключа.
// ---------------------------------------------------------------------------
async function checkGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { status: 'skip', reason: 'GEMINI_API_KEY не задан' };

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
    );
    if (!res.ok) return { status: 'error', code: res.status };

    const data = await res.json();
    const models = (data.models ?? []).map((m) => ({
      name: m.name.replace('models/', ''),
      supportsGenerate: m.supportedGenerationMethods?.includes('generateContent') ?? false,
    }));

    return { status: 'ok', totalModels: models.length, models };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

// ---------------------------------------------------------------------------
// 3. Cloudflare Workers AI — список моделей, доступных на твоём аккаунте.
//    Нужен CF_API_TOKEN (Workers AI: Read) и CF_ACCOUNT_ID.
// ---------------------------------------------------------------------------
async function checkCloudflareAI() {
  const token = process.env.CF_API_TOKEN;
  const account = process.env.CF_ACCOUNT_ID;
  if (!token || !account) {
    return { status: 'skip', reason: 'CF_API_TOKEN / CF_ACCOUNT_ID не заданы' };
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${account}/ai/models/search`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return { status: 'error', code: res.status };

    const data = await res.json();
    const models = (data.result ?? []).map((m) => m.name);

    return { status: 'ok', totalModels: models.length, models: models.slice(0, 30) };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

// ---------------------------------------------------------------------------
// Запуск всех проверок параллельно и аккуратный вывод в консоль.
// ---------------------------------------------------------------------------
function printSection(title, result) {
  console.log(c.bold(`\n=== ${title} ===`));
  if (result.status === 'skip') {
    console.log(c.skip(`  пропущено: ${result.reason}`));
  } else if (result.status === 'error') {
    console.log(c.err(`  ошибка: ${result.code ?? result.message}`));
  } else {
    console.log(c.ok(`  доступно моделей: ${result.totalModels ?? result.freeModelsCount}`));
    console.log(JSON.stringify(result, null, 2));
  }
}

const [openrouter, gemini, cloudflare] = await Promise.all([
  checkOpenRouter(),
  checkGemini(),
  checkCloudflareAI(),
]);

printSection('OpenRouter', openrouter);
printSection('Google Gemini', gemini);
printSection('Cloudflare Workers AI', cloudflare);

console.log(c.bold('\nГотово. Сверь этот список с FALLBACK_MODELS в src/types.ts.'));
