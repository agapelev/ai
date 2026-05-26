# Shekinah Mission AI Chat

Интерактивный AI‑чат для «Миссии Шехины» и проектов Царства Божьего в цифровую эпоху. Основа — Cloudflare Workers AI, расширенная поддержкой нескольких провайдеров (Cloudflare, Hugging Face, Ollama), богато оформленным Markdown‑интерфейсом и духовно‑тематическими системными промптами.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/llm-chat-app-template)

## 🚀 Live Demo

**🌐 [ai.dessyatykh.workers.dev](https://ai.dessyatykh.workers.dev)**

Функциональный AI-чат с продвинутыми возможностями:
- 🛡️ Защита от спама и rate limiting
- 📱 Мобильный UX с адаптивным дизайном
- ⚡ Оптимизация производительности
- 📊 Прогресс-бары для долгих запросов
- 💾 Сохранение истории чата
- 🧠 Сворачиваемые размышления моделей

<!-- dash-content-start -->

## ✨ Ключевые возможности

### 🤖 AI-функциональность
- **Мультипровайдер:** Cloudflare Workers AI, Hugging Face, Ollama
- **Потоковые ответы:** Real-time SSE для мгновенного отображения
- **Fallback модели:** Автоматическое переключение при ошибках
- **Retry логика:** Повторные запросы с экспоненциальным backoff
- **Rate limiting:** 10 запросов/минуту для защиты от спама

### 🎨 Пользовательский интерфейс
- **Адаптивный дизайн:** Полная поддержка мобильных устройств
- **Сворачиваемая панель:** Автоматическое скрытие ввода на мобильных
- **Прогресс-бары:** Визуальный индикатор долгих запросов
- **Virtual scrolling:** Оптимизация для больших чатов (>50 сообщений)
- **Темы оформления:** Светлая/тёмная с плавными переходами

### ⚡ Оптимизации
- **Кэширование моделей:** 24 часа в localStorage
- **Debouncing:** 300ms задержка для ввода
- **Lazy loading:** Изображения загружаются по мере необходимости
- **DocumentFragment:** Оптимизированный DOM-рендеринг

### 💾 UX-улучшения
- **История чата:** Автоматическое сохранение в localStorage
- **Очистка истории:** С подтверждением и уведомлениями
- **Кнопки прокрутки:** Быстрая навигация по чату
- **Обработка ошибок:** Понятные сообщения с кнопками повтора

- 💬 Simple and responsive chat interface
- ⚡ Server-Sent Events (SSE) for streaming responses
- 🧠 Powered by Cloudflare Workers AI LLMs
- 🛠️ Built with TypeScript and Cloudflare Workers
- 📱 Mobile-friendly design
- 🔄 Maintains chat history on the client
- 🔎 Built-in Observability logging
<!-- dash-content-end -->

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- A Cloudflare account with Workers AI access

### Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/cloudflare/templates.git
   cd templates/llm-chat-app
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Generate Worker type definitions:
   ```bash
   npm run cf-typegen
   ```

### Development

Start a local development server:

```bash
npm run dev
```

This will start a local server at http://localhost:8787.

Note: Using Workers AI accesses your Cloudflare account even during local development, which will incur usage charges.

## Деплой и CI (подробно) 🚀

### Ручной деплой (быстрый)

Команда для локального деплоя с помощью Wrangler (необходима авторизация через `wrangler login`):

```bash
npm run deploy
```

Этот способ удобен для быстрого обновления и проверки изменений локально.

### Автоматический деплой с GitHub Actions (рекомендуется)

- В репозитории присутствует workflow: `.github/workflows/deploy.yml`.
- Поведение: при пуше в ветку `main` workflow выполняет `npm ci` и затем `npm run deploy`.
- Перед включением убедитесь, что в GitHub настроен секрет `CLOUDFLARE_API_TOKEN` (Settings → Secrets and variables → Actions → New repository secret). Это токен Cloudflare с правом **Workers: Edit** (и, при необходимости, **AI: Write**, **Pages: Edit**).

Дополнительно: workflow теперь содержит шаг `Smoke test`, который делает простую проверку: посылает `curl` на публичный URL (https://ai.dessyatykh.workers.dev) и завершает работу с ошибкой, если статус ответа не `200`.

---

## Подробная инструкция для разработчика (шаг за шагом) 🧭

### 1) Клонирование и установка

```bash
git clone git@github.com:agapelev/ai.git
cd ai
npm ci
```

Используйте `npm ci` для воспроизводимых установок (используется `package-lock.json`).


```bash
npm start
# или
npm run dev
```

- Генерация типов (если нужно):

```bash
npm run cf-typegen
```

### 3) Стратегия ветвления и коммитов (рекомендации)

- `main` — всегда в рабочем состоянии, автоматически деплоится.
- `feature/<name>` — новые фичи, открывайте PR в `main`.
- `fix/<issue>` — быстрые исправления (через PR или прямой merge при urgent).
- Формат сообщений: `type(scope): short summary` — например: `feat(ui): add dark theme toggle`.

Коммиты можно делать в одном из стилей:
- Малые исправления — отдельный коммит `fix:` и PR.
- Набор изменений — использовать `feature/` ветку, squash-merge.

### 4) Pull Request (code review)

- Создайте PR из `feature/*` в `main`.
- Обязательное правило: как минимум один ревьюер (по соглашению команды).

### 5) Деплой (автоматический)

После мерджа в `main` GitHub Actions запустит workflow и попытается выполнить деплой. Если деплой прошёл успешно и smoke-test вернул HTTP 200, ваш сайт автоматически обновится.

### 6) Откат и аварийные случаи

- Если нужно откатить до состояния до очищения истории: используйте резервную ветку `backup/before-cleanup`.
- Чтобы откатить на конкретный коммит: `git revert <commit>` или `git reset --hard <commit>` (local, осторожно с `--hard`).

---

## Проверка и отладка деплоя

- Просмотр логов развернутого воркера: `npm wrangler tail` (или `wrangler tail`).
- Если workflow падал — зайдите в GitHub → Actions → откройте лог запуска и скопируйте последние строки ошибки (я помогу анализировать).

## Безопасность и секреты 🔐

- Никогда не коммитьте секреты в репозиторий.
- Используйте GitHub Secrets для `CLOUDFLARE_API_TOKEN`.
- При случайной утечке токена — немедленно **revoke**/удалите его и создайте новый.

## Восстановление окружения после переустановки ОС

1. Клонировать репозиторий: `git clone git@github.com:agapelev/ai.git`.
2. Установить Node.js (рекомендуется LTS) и Wrangler.
3. `npm ci` для установки зависимостей.
4. `wrangler login` для авторизации или добавьте `CLOUDFLARE_API_TOKEN` в среду.

## Полезные команды

- Локальный dev сервер: `npm start`
- Проверка типов: `npm run check`
- Ручной деплой: `npm run deploy`
- Проверка статуса воркера: `curl -I https://ai.dessyatykh.workers.dev`

---

## Дополнительно — структура проекта

```
/
├── public/             # Статические файлы (index.html, chat.js, styles.css)
├── src/                # Worker (TypeScript)
├── .github/workflows/  # CI workflows (deploy)
├── wrangler.jsonc      # Конфигурация Cloudflare Workers
└── README.md           # Документация
```

Если нужно, я могу дополнительно добавить:
- примеры PR шаблонов, шаблоны сообщений коммитов,
- автоматическое тестирование интеграционных шагов,
- и visual regression tests для внешнего UI.

---

### Что нового (нововведения) ✅

- **Селектор моделей** — теперь в шапке есть выпадающий список для выбора модели (`Модель:`). Ваш выбор сохраняется в `localStorage`.
- **Индикатор доступности** — рядом с селектором добавлена цветная точка: зелёная = модель доступна в вашем аккаунте, красная = модель не найдена в списке доступных моделей. Индикатор обновляется динамически.
- **Дружественные имена моделей** — пользователи видят понятные имена (как возвращает `env.AI.models()`), а не только технические ключи.
- **Нечёткое сопоставление идентификаторов** — UI использует нечёткий матч между SUPPORTED_MODELS и списком `env.AI.models()` чтобы избежать ложных меток `(недоступна)` при незначительных вариациях идентификаторов.
- **Нормализация ответов от моделей** — воркер приводил ответы в единый формат `{ "response": "..." }`, а фронтенд корректно распаковывает вложенные структуры, поэтому в чат теперь приходит человекочитаемый текст, а не сырые JSON-объекты.

- **Пер‑модельный системный промпт** — для каждой модели вставляется системная инструкция (по шаблону, который вы указали) с заменой имени `Gemini` на имя модели; также воркер фильтрует и удаляет служебные англоязычные фрагменты (`reasoning_text`, «The user says:», и т.п.), чтобы в чат попадал только чистый русский ответ。

---

### Развертывание / релиз (быстро) 🚀

1. Убедитесь, что в репозитории настроен `CLOUDFLARE_API_TOKEN` в GitHub Secrets (Actions → Secrets) если хотите автоматические деплои из `main`。
2. Локальная проверка и ручной деплой:
   - `npm ci` — установить зависимости
   - `npm run check` — проверить типы и dry-run
   - `npm run deploy` — ручной деплой через `wrangler` (потребует авторизации `wrangler login` или `CLOUDFLARE_API_TOKEN` в окружении)
3. Smoke-test: `curl -I ${DEPLOY_URL:-https://ai.dessyatykh.workers.dev}` — ожидаемый HTTP 200

---

## Процесс разработки

### Рекомендованный workflow:

1. **Локальная разработка:**
   ```bash
   npm run dev
   # Протестируйте функциональность полностью
   npm run check
   ```

2. **Когда всё готово и протестировано:**
   ```bash
   git add .
   git commit -m "feat: your detailed description"
   git push origin main
   ```

3. **Cloudflare автоматически деплоит** через GitHub Actions

⚠️ **Важно:** Всегда проверяйте проект локально и подтверждайте перед коммитом!  
Автоматический деплой через CI/CD — **единственный** способ продакшн-развертывания.

---

## Автоматический деплой из GitHub

- A GitHub Actions workflow is included at `.github/workflows/deploy.yml` that runs `npm run deploy` on push to `main`.
- To enable it you must add a GitHub secret `CLOUDFLARE_API_TOKEN` (Settings → Secrets → Actions) with an API Token that has permissions to edit Workers and related resources.
- Note: GitHub requires pushes that create or update workflow files to be authenticated with a Personal Access Token that includes the `workflow` scope, or pushed via SSH. If you see a push rejection mentioning `workflow scope`, push using an SSH key or a PAT that includes `workflow` scope.

Local development and rebuild after OS reinstall

- Clone: `git clone https://github.com/<your-user>/ai.git`
- Install dependencies reproducibly: `npm ci`
- Start local dev server: `npm start` (uses `wrangler dev`)
- Deploy manually: `npm run deploy` (requires wrangler authentication via `wrangler login` or `CLOUDFLARE_API_TOKEN` in env)


### Monitor

View real-time logs associated with any deployed Worker:

```bash
npm wrangler tail
```

## Project Structure

```
/
├── public/             # Static assets
│   ├── index.html      # Chat UI HTML
│   └── chat.js         # Chat UI frontend script
├── src/
│   ├── index.ts        # Main Worker entry point
│   └── types.ts        # TypeScript type definitions
├── test/               # Test files
├── wrangler.jsonc      # Cloudflare Worker configuration
├── tsconfig.json       # TypeScript configuration
└── README.md           # This documentation
```

## How It Works

### Backend

The backend is built with Cloudflare Workers and uses the Workers AI platform to generate responses. The main components are:

1. **API Endpoint** (`/api/chat`): Accepts POST requests with chat messages and streams responses
2. **Streaming**: Uses Server-Sent Events (SSE) for real-time streaming of AI responses
3. **Workers AI Binding**: Connects to Cloudflare's AI service via the Workers AI binding

### Frontend

The frontend is a simple HTML/CSS/JavaScript application that:

1. Presents a chat interface
2. Sends user messages to the API
3. Processes streaming responses in real-time
4. Maintains chat history on the client side

## Customization

### Changing the Model

To use a different AI model, update the `MODEL_ID` constant in `src/index.ts`. You can find available models in the [Cloudflare Workers AI documentation](https://developers.cloudflare.com/workers-ai/models/).

### Using AI Gateway

The template includes commented code for AI Gateway integration, which provides additional capabilities like rate limiting, caching, and analytics.

To enable AI Gateway:

1. [Create an AI Gateway](https://dash.cloudflare.com/?to=/:account/ai/ai-gateway) in your Cloudflare dashboard
2. Uncomment the gateway configuration in `src/index.ts`
3. Replace `YOUR_GATEWAY_ID` with your actual AI Gateway ID
4. Configure other gateway options as needed:
   - `skipCache`: Set to `true` to bypass gateway caching
   - `cacheTtl`: Set the cache time-to-live in seconds

Learn more about [AI Gateway](https://developers.cloudflare.com/ai-gateway/).

### Modifying the System Prompt

The default system prompt can be changed by updating the `SYSTEM_PROMPT` constant in `src/index.ts`.

### Styling

The UI styling is contained in the `<style>` section of `public/index.html`. You can modify the CSS variables at the top to quickly change the color scheme.

## Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare Workers AI Documentation](https://developers.cloudflare.com/workers-ai/)
- [Workers AI Models](https://developers.cloudflare.com/workers-ai/models/)

---

## Подробное описание изменений и операционный runbook (рус.)

### Ключевые изменения и зачем они нужны
- **Вынесение стилей** в `public/styles.css` и установка темной темы по умолчанию — улучшает поддержку тем и упрощает дальнейшую работу с UI (переключатели, кастомизация, тестирование контраста).
- **Переключатель темы** (`public/theme.js`) — позволяет пользователю выбрать светлую/тёмную тему и сохраняет выбор в `localStorage` (пользовательский UX).
- **Удаление больших файлов** из истории (очистка node_modules) — необходимо для корректной работы `git push` в GitHub (избежание ограничений на размер файлов и ошибок pre-receive)。
- **CI workflow** (`.github/workflows/deploy.yml`) — автоматизирует деплой через `wrangler` при пуше в `main` и добавляет smoke-test для быстрой проверки успешности развертывания。

### Когда делать ручной деплой, а когда полагаться на CI
- **Ручной деплой (`npm run deploy`)**: при быстром локальном тестировании, срочных исправлениях или когда нужны дополнительные проверки перед пушем.
- **CI-деплой (GitHub Actions)**: для стабильных релизов — делайте PR, проверяйте CI и мержите в `main`. Плюсы: единообразие, автоматические smoke-тесты, сохранение истории изменений。

### Пошаговый runbook (операционные сценарии)
1) Подготовка (один раз на машине новичка):
   - Установите Node.js (рекомендуемый LTS)。
   - Установите Wrangler: `npm i -g wrangler`。
   - Сгенерируйте SSH-ключ и добавьте в GitHub (если вы предпочитаете SSH push): `ssh-keygen -t ed25519 -C "you@domain"` → добавить `~/.ssh/id_ed25519.pub` в GitHub Settings → SSH and GPG keys。

2) Клонирование + запуск:
   - `git clone git@github.com:agapelev/ai.git`
   - `cd ai && npm ci`
   - `npm start` — локальный dev сервер

3) Добавление токенов/секретов в GitHub (Operations):
   - `CLOUDFLARE_API_TOKEN` — Cloudflare API token с правом **Workers: Edit** (и AI/Pages при необходимости). Добавьте в Settings → Secrets and variables → Actions → New repository secret。
   - (Опционально) `DEPLOY_URL` — кастомный URL для smoke-test (если вы используете нестандартный домен)。

4) Деплой через PR (recommended):
   - Создайте ветку `feature/*`, подготовьте изменения и создайте PR в `main`。
   - После мерджа GitHub Actions запустит workflow: `npm ci`, `npm run deploy`, smoke-test。

5) Что делать, если smoke-test падает:
   - Откройте GitHub → Actions → нужный запуск → `Smoke test` шаг → прочитайте логи (будет показан HTTP статус и возможная причина)。
   - Можете воспроизвести локально: `npm run deploy` (с тем же CLOUDFLARE_API_TOKEN) и выполнить `curl -I $DEPLOY_URL`。
   - Частые причины: секрет не установлен, воркер не запущен, assets не загружены, ошибки сборки。

6) Откат и аварийные операции:
   - Откатить отдельный коммит: `git revert <commit>`。
   - Восстановить прежнюю очищённую историю: `git checkout backup/before-cleanup` (эта ветка сохранена как резерв)。

### Local testing during development
- Можно вручную выполнить `curl -X POST http://localhost:8787/api/chat -H 'Content-Type: application/json' -d '{"messages":[{"role":"user","content":"Привет"}],"model":"gpt-oss-120b","max_tokens":64}'` и проверить JSON-ответ `{ "response": "..." }`。
- Endpoint `GET /api/models?available=1` вернёт список моделей, доступных в аккаунте，что помогает диагностировать，какие id поддерживаются。

### Интеграция Ollama и OpenRouter
Ollama: обычно Ollama запускается локально и предоставляет HTTP API (например `http://localhost:11434/api/generate`) — Cloudflare Workers не имеет доступа к localhost вашей машины。Чтобы использовать Ollama с этим воркером，вам нужно：
   1. Запустить Ollama на публичном хосте (виртуальная машина, VPS) или использовать туннель (ngrok) для доступа извне; либо
   2. Написать небольшой прокси-сервер (например，на Heroku，Vercel или любой облачной платформе) который пересылает запросы от воркера к вашему Ollama-инстансу; храните ключи/URL в GitHub Secrets и wrangler секрете при деплое。
   3. Обновить `SUPPORTED_MODELS` или добавить отдельную логику в `src/index.ts` чтобы для ключа `ollama/<name>` воркер делал `fetch()` на ваш Ollama API и возвращал ответ в формате `{ response: "..." }`。

OpenRouter: OpenRouter предоставляет облачную платформу и API для хостинга моделей (включая модели，совместимые с OpenAI API)。Для интеграции：
   1. Зарегистрируйтесь в OpenRouter и получите API ключ (сохраните в GitHub Secrets и/или wrangler secret)。
   2. Добавьте в воркер обработчик，который при выборе `openrouter/<model>` будет делать `fetch()` на endpoint OpenRouter с нужной формой запроса и заголовком `Authorization: Bearer <OPENROUTER_KEY>`。
   3. Преобразуйте ответ OpenRouter в единый JSON `{ "response": "..." }` для фронтенда。

Замечания по затратам и безопасности: оба подхода (Ollama публичный，OpenRouter) требуют хранения секретов и контроля доступа; OpenRouter — готовый облачный вариант и проще для быстрого включения，Ollama — удобен для полностью локального управления，но требует публичной доступности или прокси。

### Безопасность
- Сразу **revoke** (отозвать) любой токен，который был случайно опубликован。Создайте новый и обновите GitHub Secret。
- Не храните секреты в репозитории или в открытом чате。

### Полезные команды и сценарии быстрого восстановления
- Проверить，что воркер отвечает: `curl -I ${DEPLOY_URL:-https://ai.dessyatykh.workers.dev}`
- Смотреть логи в реальном времени: `wrangler tail` или `npm wrangler tail`。
- Принудительно развернуть текущую ветку: `npm run deploy` (локально，с авторизацией wrangler)。
