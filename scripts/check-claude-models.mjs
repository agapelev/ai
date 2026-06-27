#!/usr/bin/env node
/**
 * check-claude-models.mjs
 * ------------------------
 * Запрашивает у Anthropic API РЕАЛЬНЫЙ список моделей,
 * доступных по твоему ключу — это самый надёжный способ узнать
 * актуальные id, а не доверять захардкоженным строкам в коде.
 *
 * Документация эндпоинта: https://docs.claude.com/en/api/models-list
 *
 * Запуск:
 *   1) положи ключ в .env:
 *        ANTHROPIC_API_KEY=sk-ant-...
 *   2) npm install dotenv   (если ещё не установлен)
 *   3) node check-claude-models.mjs
 *
 * Можно и без .env:
 *   ANTHROPIC_API_KEY=sk-ant-... node check-claude-models.mjs
 */

import 'dotenv/config';

const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEYS?.split(',')[0]?.trim();

if (!apiKey) {
  console.error('Не найден ANTHROPIC_API_KEY (ни в .env, ни в переменных окружения).');
  process.exit(1);
}

// Anthropic API авторизуется заголовком x-api-key, НЕ через "Authorization: Bearer".
// anthropic-version фиксирует версию API-контракта (на момент написания — 2023-06-01,
// она стабильна и не привязана к датам релизов конкретных моделей).
const res = await fetch('https://api.anthropic.com/v1/models?limit=100', {
  headers: {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  },
});

if (!res.ok) {
  console.error(`Ошибка API: HTTP ${res.status}`);
  console.error(await res.text());
  process.exit(1);
}

const data = await res.json();

console.log(`\nДоступно моделей по твоему ключу: ${data.data.length}\n`);

for (const model of data.data) {
  console.log(`  id: ${model.id}`);
  console.log(`    display_name: ${model.display_name ?? '—'}`);
  console.log(`    created_at:   ${model.created_at ?? '—'}\n`);
}

console.log('Сверь эти id с SUPPORTED_MODELS в src/types.ts / src/index.ts —');
console.log('если там есть id, которых нет в этом списке, они никогда не будут работать.');
