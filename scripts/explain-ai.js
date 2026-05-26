const { GoogleGenerativeAI } = require("@google/generative-ai");

// Получаем API ключ из переменной окружения или аргументов
const args = process.argv.slice(2);
const keyArg = args.find(a => a.startsWith('--key='));
const API_KEY = keyArg ? keyArg.split('=')[1] : process.env.GOOGLE_API_KEY;

if (!API_KEY) {
    console.error("\x1b[31m%s\x1b[0m", "❌ Ошибка: API ключ не найден!");
    console.log("\nИспользование:");
    console.log("  node scripts/explain-ai.js --key=ВАШ_КЛЮЧ");
    console.log("\nИли установи переменную окружения:");
    console.log("  export GOOGLE_API_KEY='ВАШ_КЛЮЧ'");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

async function run() {
    try {
        const prompt = "Расскажи о важности духовного трезвения в эпоху искусственного интеллекта.";
        console.log("📡 Соединение с Gemini 3 установлено. Ожидаю слово...");

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("\n📖 ОТКРОВЕНИЕ МОДЕЛИ:");
        console.log("-----------------------------------");
        console.log(text);
        console.log("-----------------------------------");
    } catch (error) {
        console.error("❌ Ошибка в чертогах:");
        console.error(error.message);
    }
}

run();
