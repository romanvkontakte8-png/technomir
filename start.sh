#!/bin/bash

echo "============================================"
echo "   ТехноМир — Система сравнения товаров"
echo "   Дипломный проект — Григорьев Я.М."
echo "============================================"
echo ""

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "[ОШИБКА] Node.js не найден!"
    echo "Установите Node.js: https://nodejs.org/"
    echo "Или: brew install node (macOS) / sudo apt install nodejs npm (Linux)"
    exit 1
fi

echo "[1/3] Установка зависимостей..."
npm install --silent
if [ $? -ne 0 ]; then
    echo "[ОШИБКА] Не удалось установить зависимости."
    exit 1
fi

echo "[2/3] Инициализация базы данных..."
npm run init-db
if [ $? -ne 0 ]; then
    echo "[ОШИБКА] Не удалось создать базу данных."
    exit 1
fi

echo "[3/3] Запуск сервера..."
echo ""
echo "============================================"
echo "   Сайт доступен: http://localhost:3000"
echo "   Админ:  admin / password"
echo "   Клиент: user / password"
echo "============================================"
echo "   Для остановки нажмите Ctrl+C"
echo "============================================"
echo ""

# Открыть браузер
(sleep 2 && \
  if command -v xdg-open &> /dev/null; then xdg-open http://localhost:3000; \
  elif command -v open &> /dev/null; then open http://localhost:3000; \
  fi) &

# Запуск сервера
node server.js
