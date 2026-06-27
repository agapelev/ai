#!/bin/bash

# Список твоих ключей (подставь свои реальные ключи сюда)
KEYS=(
    ""
    "AIzaSyCw8BDOBeV6XyhLmZZhwAwhjU-3IdWxrM4"
    "AIzaSyCSEubXUaPTjOYZ5fsEht8Lt1DbOHh6Wps"
    "AIzaSyBc1Oo05qBwsdsYCapykKFnh-yqiqRgr8U"
    "И_ЕЩЕ_ОДИН_КЛЮЧ"
    "И_ЕЩЕ_ОДИН_КЛЮЧ"
    "И_ЕЩЕ_ОДИН_КЛЮЧ"
    "И_ЕЩЕ_ОДИН_КЛЮЧ"
)

# Модель для проверки (Google сейчас активно использует v1beta)
MODEL="gemini-2.5-flash" # или gemini-1.5-flash, если 3.5 еще в ограниченном превью

echo "=== Запуск проверки ключей для Mission Shekinah ==="

for i in "${!KEYS[@]}"; do
    KEY="${KEYS[$i]}"
    # Берем первые 8 и последние 4 символа для безопасности в логах
    SHORT_KEY="${KEY:0:8}...${KEY: -4}"

    echo -n "Ключ №$((i+1)) ($SHORT_KEY): "

    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "Content-Type: application/json" \
         -d '{"contents":[{"parts":[{"text":"Hi"}]}]}' \
         -X POST "https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}")

    if [ "$RESPONSE" -eq 200 ]; then
        echo -e "\e[32m[РАБОТАЕТ (200 OK)]\e[0m"
    elif [ "$RESPONSE" -eq 400 ]; then
        echo -e "\e[31m[НЕВАЛИДЕН (400 Bad Request / Invalid Key)]\e[0m"
    else
        echo -e "\e[33m[ОШИБКА (HTTP $RESPONSE)]\e[0m"
    fi
done
