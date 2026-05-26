const { GoogleGenerativeAI } = require("@google/generative-ai");

// Получаем API ключ из переменной окружения или аргументов
const args = process.argv.slice(2);
const keyArg = args.find(a => a.startsWith('--key='));
const API_KEY = keyArg ? keyArg.split('=')[1] : process.env.GOOGLE_API_KEY;

if (!API_KEY) {
    console.error("\x1b[31m%s\x1b[0m", "❌ Ошибка: API ключ не найден!");
    console.log("\nИспользование:");
    console.log("  node scripts/list-models.js --key=ВАШ_КЛЮЧ");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

async function listAllModels() {
    try {
        console.log("🔍 Начинаю поиск доступных моделей в чертогах Google...\n");

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const data = await response.json();

        if (data.models) {
            console.log("✅ Найдены следующие модели:");
            console.table(data.models.map(m => ({
                Имя: m.name.replace('models/', ''),
                Описание: m.description,
                Методы: m.supportedGenerationMethods.join(', ')
            })));

            const hasFlash = data.models.find(m => m.name.includes("flash"));
            if (hasFlash) {
                console.log(`\n💡 Рекомендую использовать: ${hasFlash.name.replace('models/', '')}`);
            }
        } else {
            console.log("❌ Модели не найдены. Проверь API-ключ или ограничения аккаунта.");
            console.log("Ответ сервера:", data);
        }

    } catch (error) {
        console.error("❌ Ошибка при поиске моделей:", error.message);
    }
}

listAllModels();
