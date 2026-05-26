# Project: Mission Shekinah AI

## 🚀 Production
- **URL:** https://ai.dessyatykh.workers.dev
- **Deploy:** Автоматически через GitHub Actions после `git push origin main`
- **CI/CD:** `.github/workflows/deploy.yml` + smoke test

---

## Stack
- Cloudflare Workers (TypeScript)
- Telegram Bot API (grammy)
- AI Providers: Cloudflare Workers AI, Google Gemini API, OpenRouter
- Frontend: Vanilla JS + TailwindCSS (Vite для бандлинга)
- React + Mantine (в процессе интеграции)

---

## 📁 Реальная структура файлов

```
/home/lev/web-dev/ai/
├── src/                                      # Worker backend (TypeScript)
│   ├── index.ts                              # Main entry point (642 строки) ⭐
│   ├── types.ts                              # TypeScript types ⭐
│   ├── telegram-bot.ts                       # Archived — логика в index.ts
│   ├── telegram-bot-llama3.3-7b.ts           # Experimental (archive)
│   ├── index-рабочий-последний.ts            # Backup version
│   ├── index-Original-Cloudflare.ts          # Original template
│   ├── index-32m-telegram-bot.ts             # Experimental
│   ├── index-32m-telegram-bot-gemini-online.ts
│   ├── index-32-Telegram-Gemini-Online-UI.ts
│   └── index-29-models.ts                    # Experimental
│
├── public/                                     # Frontend + static assets
│   ├── chat.js                               # Vanilla JS frontend (1276 строк) ⭐
│   ├── index.html                            # Main UI
│   ├── theme.js                              # Theme switcher
│   ├── styles.css                            # Main styles (Tailwind-based)
│   ├──mantine-theme.ts                       # Mantine theme config
│   ├── components/
│   │   └── ChatInterface.tsx                 # React+Mantine component (in dev)
│   └── templates/
│       └── inspiration.html / inspiration-v2.md
│
├── .github/workflows/
│   ├── deploy.yml                            # CI/CD: deploy + smoke test ⭐
│   └── commitlint.yml                        # Commit linting
│
├── wrangler.toml / wrangler.jsonc            # Cloudflare config
├── package.json                              # Dependencies + scripts ⭐
├── tsconfig.json                             # TypeScript config
├── vite.config.ts                            # Vite bundler config ⭐
├── tailwind.config.js                        # TailwindCSS config
├── postcss.config.js                         # PostCSS config
├── worker-configuration.d.ts                 # Generated types
├── .dev.vars                                 # Local env vars
├── .commitlintrc.json                        # Commit lint config
└── README.md, DEVELOPMENT.md, DEPLOY.md
```

### 📦 Основные файлы (используются в продакшене)
| Файл | Описание | Строк кода |
|------|----------|------------|
| `src/index.ts` | Main worker (routes, rate limiting, AI handlers) | 642 |
| `src/types.ts` | TypeScript types (`Env`, `ChatMessage`) | 28 |
| `public/chat.js` | Frontend chat (UI, SSE, Markdown) | 1276 |
| `public/index.html` | Main HTML page | — |
| `vite.config.ts` | Vite bundler config | 37 |
| `.github/workflows/deploy.yml` | CI/CD deployment | 37 |

### 🗂️ Архивные файлы (не используются)
- 8 экспериментальных `src/index-*.ts`
- 3 альтернативных стиля `public/styles-*.css`
- 2 альтернативных HTML `public/{chat,ai-chat}.html`

---

## 🔴 Известные проблемы (требуют исправления)

### 1. TypeError в handleChatRequest (ИСПРАВЛЕНО ✅)
```
src/index.ts(444,16): error TS2339: Property 'fallback' does not exist...
src/index.ts(445,81): error TS2339: Property 'originalModel' does not exist...
src/index.ts(451,35): error TS2339: Property 'fallback' does not exist...
```

**Решение:** Добавлен интерфейс с типами:
```typescript
interface ChatResult {
  response: string;
  model: string;
  fallback?: boolean;
  originalModel?: string;
  error?: string;
}
```

### 2. Terser не установлен (критично для `npm run build:frontend`)
**Ошибка:**
```
[vite:terser] terser not found. Since Vite v3, terser has become an optional dependency.
```

**Решения (выбрать одно):**
```bash
# Вариант 1: Установить terser
npm install --save-dev terser

# Вариант 2: Сменить minify на esbuild (встроен в Vite)
# vite.config.ts: minify: 'esbuild'
```

### 3. Vite Warnings
```
[MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of postcss.config.js is not specified
(!) The public directory feature may not work correctly. outDir and publicDir are not separate folders.
```

**Решения:**
1. Добавить `"type": "module"` в `package.json`
2. Изменить `vite.config.ts` — разделить `outDir` и `publicDir`
3. Или использовать Cloudflare Assets напрямую без Vite bundling

### 4. Vite Config Warning
```
vite.config.ts:5: line 5: Unexpected "react" import
```

**Причина:** Vite не распознаёт React plugin config (не критично, работает)

---

## 🚫 Правила деплоя

### ✅ Правильный workflow:
```bash
# 1. Внести изменения (локально)
git add .
git commit -m "feat: description"  # conventional commits

# 2. Запушить в main (автоматический деплой через GitHub Actions)
git push origin main

# 3. CI/CD автоматически:
#    - Запускает npm ci
#    - Деплоит через wrangler deploy
#    - Выполняет smoke test (HTTP 200 check)
```

### ❌ НЕ делать:
```bash
# НЕ использовать wrangler deploy напрямую!
npm run deploy  # ❌ Только для локального тестирования с --dry-run

wrangler deploy --prod  # ❌ Только в локальной разработке
```

**Почему:**
- GitHub Actions проверяет CI/CD и smoke test
- Секреты (`CLOUDFLARE_API_TOKEN`) управляются через GitHub Secrets
- Деплой без проверки — только для локального dev режима

### 🔧 Локальное тестирование:
```bash
# Проверка TypeScript
npm run check

# Dry-run деплоя (без публикации)
npm run check  # делает wrangler deploy --dry-run

# Локальный дев-сервер
npm run dev
```

---

## 🚀 GitHub Actions CI/CD Workflow

**Файл:** `.github/workflows/deploy.yml`

### Три этапа деплоя:

1. **Check-out** → `actions/checkout@v4`
2. **Install deps** → `npm ci` (репродуктивная установка)
3. **Deploy** → `npm run deploy` с секретом `CLOUDFLARE_API_TOKEN`
4. **Smoke test** → `curl https://ai.dessyatykh.workers.dev` (HTTP 200)

### Условия запуска:
- `on.push.branches: [ main ]`
- Секрет `CLOUDFLARE_API_TOKEN` должен быть в GitHub repository settings
- Smoke test необязательный (использует переменную `DEPLOY_URL`, дефолт: `https://ai.dessyatykh.workers.dev`)

### Статус деплоя:
Проверить можно по URL: https://github.com/agapelev/ai/actions

---

## 🚫 Критические запреты (читаются как контекст)
1. НИКОГДА не изменяй файлы без явного "Применяй".
2. НИКОГДА не предлагай деплой-команды.
3. НИКОГДА не делай git commit/push без команды.
4. ВСЕГДА отвечай только на русском.

---

## 🎯 Поддерживаемые AI модели

### Cloudflare Workers AI:
| Ключ | ID | Описание |
|------|-----|----------|
| `Llama-3.3-70b` | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | Default, стабильная |
| `Llama-3-8b` | `@cf/meta/llama-3-8b-instruct` | Компактная |
| `Llama-4-Scout-8b` | `@cf/meta/llama-4-scout-17b-16e-instruct` | Новая |
| `Qwen3-30b` | `@cf/qwen/qwen3-30b-a3b-fp8` | DeepSeek |
| `GPT-OSS-120b` | `@cf/openai/gpt-oss-120b` | OpenAI |
| `GPT-OSS-20b` | `@cf/openai/gpt-oss-20b` | OpenAI |
| `DeepSeek-r1-distill-qwen` | `@cf/deepseek-ai/deepseek-r1-distill-qwen-32b` | DeepSeek |
| `Mistral-7b-instruct` | `@cf/mistral/mistral-7b-instruct-v0.1` | Mistral |
| `Mistral-small-3.1-24b` | `@cf/mistralai/mistral-small-3.1-24b-instruct` | Fast |
| `IBM-Granite-4.0-h-micro` | `@cf/ibm-granite/granite-4.0-h-micro` | IBM |

### Google AI API:
| Ключ | ID | Описание |
|------|-----|----------|
| `gemini-3-flash-preview` | `gemini-3-flash-preview` | Grounding search |
| `gemini-flash-latest` | `gemini-flash-latest` | Fast |
| `gemini-2.5-flash` | `gemini-2.5-flash` | Fast |
| `gemini-2.0-flash-lite` | `gemini-2.5-flash-lite` | Lite |

### OpenRouter:
| Ключ | ID | Описание |
|------|-----|----------|
| `Qwen3-next-thinking` | `qwen/qwen3-next-80b-a3b-thinking` | Reasoning |
| `Qwen3-next-instruct` | `qwen/qwen3-next-80b-a3b-instruct` | Instruct |
| `DeepSeek-r1-qwen3` | `deepseek/deepseek-r1-0528-qwen3-8b` | Free |
| `Codellama-code` | `meta-llama/llama-3.3-70b-instruct:free` | Free code |
| `MythoMax-13b` | `gryphe/mythomax-l2-13b` | Free |

---

## 🛠️ Доступные команды

```bash
# Основные
npm run dev       # Локальный wrangler dev сервер (localhost:8787)
npm run check     # TypeScript check + wrangler dry-run
npm run deploy    # Wrangler deploy (для локального теста)
npm run dev       # wrangler dev
npm start         # alias for dev
npm run test      # Vitest

# Frontend
npm run build:frontend  # Vite build (требует terser)
npm run dev:frontend    # Vite dev server
npm run build:css       # TailwindCSS build

# Linting
npm run lint:commits    # Conventional commit check
```

---

## ✅ Текущее состояние (после исправлений)

### Исправлено:
- ✅ TypeScript errors (интерфейс `ChatResult`)
- ✅ Type narrowing для fallback/originalModel
- ✅ Worker config: 27.25 KiB upload
- ✅ All bindings: `RATE_LIMIT_KV`, `AI`, `ASSETS`

### В продакшене:
- ✅ Мультипровайдер AI (14+ моделей)
- ✅ Telegram бот (webhook `/bot-update`)
- ✅ Rate limiting (10 req/min via KV)
- ✅ Health check endpoint
- ✅ File uploads
- ✅ Chat history (localStorage)
- ✅ Markdown rendering
- ✅ Light/dark themes
- ✅ Mobile UX

### В процессе:
- ⚠️ React+Mantine интеграция
- ⚠️ Vite bundling (terser dependency)
- ⚠️ PostCSS warning

---

## 👁️‍🗨️ Rules for AI agents

### 🚫 Never do this:

1. **Never run `wrangler deploy` directly**
   - Эта команда только для локального dev режима
   - Продакшен деплой только через CI/CD

2. **Never run `npm run deploy` directly**
   - Это команда для локального тестирования
   - Продакшен деплой только через CI/CD

3. **Never commit secrets or API keys**  
   - `CLOUDFLARE_API_TOKEN` → GitHub Secrets
   - `TELEGRAM_TOKEN`, `GOOGLE_AI_API_KEY`, `OPENROUTER_API_KEY` → Cloudflare dashboard

4. **Never force-push to `main` branch**
   - `git push --force` и `git push --force-with-lease` запрещены
   - История deploys должна быть аудитируемой

### ✅ Always do this:

1. **Make changes locally:**
   ```bash
   git add .
   git commit -m "feat: brief description"
   git push origin main
   ```

2. **GitHub Actions handles deployment automatically:**
   - Trigger: `git push origin main`
   - CI: `npm ci + npm run check`
   - Deploy: `npm run deploy` (через GitHub Secrets)
   - Testing: smoke test (HTTP 200 check)
   - Status: https://github.com/agapelev/ai/actions

### 🤖 AI Agent Rules:

- Если запущен `npm run deploy` — это **только** локальное тестирование
- Официальный деплой всегда: `git add . && git commit -m "message" && git push origin main`
- CI/CD (`https://github.com/agapelev/ai/actions`) — **единственное** средство продакшен-развертывания
- Все эксперименты в `feature/` ветках, `main` — только стабильный код

### 🚫 Git Commit Rules (CRITICAL):

1. **NEVER commit automatically after tasks**
   - AI agent должен только показывать изменения (diff)
   - Никаких `git add`, `git commit`, `git push` без явной команды пользователя

2. **After completing any task:**
   - Show diff только (git diff или summary изменений)
   - Wait for user review
   - NE EVER коммить самостоятельно

3. **Only commit when user explicitly says:**
   - "коммить" или "commit" или "git push"
   - Только после прямой инструкции пользователя

4. **Workflow для AI:**
   ```
   Task completed → Show changes → Ask "Commit?" → Wait for "коммить" → Then git add/commit/push
   ```

---

## 📊 Данные о проекте

| Параметр | Значение |
|----------|----------|
| **Production URL** | https://ai.dessyatykh.workers.dev |
| **Upload size** | 27.25 KiB (7.02 KiB gzipped) |
| **Worker bindings** | `AI`, `ASSETS`, `RATE_LIMIT_KV`, `OLLAMA_ENDPOINT` |
| **AI models** | 14 Cloudflare + 4 Google + 8 OpenRouter |
| **Rate limit** | 10 requests/minute per IP |
| **Max history** | 50 messages per chat |
| **Max message length** | 10000 characters |

---

## 📝 Заметки для разработчика

- **Архивные файлы:** Все `src/index-*.ts` — экспериментальные версии, не использовать
- **Main code:** `src/index.ts` + `public/chat.js` — единственный рабочий код
- **API endpoints:** `/api/chat`, `/api/models`, `/api/health`, `/bot-update`
- **Static:** Все файлы в `public/` отдапаются как static assets через `ASSETS` binding
- **TypeScript:** Всегда запускать `npm run check` перед push в `main`
