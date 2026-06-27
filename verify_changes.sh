#!/bin/bash

echo "🔍 Проверка изменений в файлах"
echo "=================================="
echo ""

echo "1. Проверка index.html:"
echo "   Ищем анимированные надписи..."
if grep -q "animated-text-link" public/index.html; then
    echo "   ✅ Нашли animated-text-link"
else
    echo "   ❌ Не найдено animated-text-link"
fi

if grep -q "class=\"letter\"" public/index.html; then
    echo "   ✅ Нашли обернутые буквы"
else
    echo "   ❌ Не найдено обернутые буквы"
fi

echo ""
echo "2. Проверка styles.css:"
echo "   Ищем стили для анимации..."
if grep -q "\.letter {" public/styles.css; then
    echo "   ✅ Нашли стили для .letter"
else
    echo "   ❌ Не найдено стили для .letter"
fi

echo ""
echo "3. Проверка текущих надписей:"
grep -A 2 "animated-text-link" public/index.html | head -6

echo ""
echo "4. Проверка CSS стилей:"
grep -A 5 "\.letter {" public/styles.css

echo ""
echo "📋 Сводка изменений:"
echo "   - Добавлены надписи с анимацией по буквам"
echo "   - Каждая буква обернута в span.class='letter'"
echo "   - CSS стили для плавного изменения цвета"
echo "   - Анимация подчеркивания"
echo ""
echo "💡 Совет: Если изменения не видны в браузере:"
echo "   1. Нажмите Ctrl+F5 (жесткое обновление)"
echo "   2. Или очистите кеш браузера вручную"
echo "   3. Или откройте в режиме инкогнито"
