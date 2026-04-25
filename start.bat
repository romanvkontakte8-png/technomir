@echo off
chcp 65001 >nul 2>&1
title ТехноМир — Запуск сервера

echo ============================================
echo    ТехноМир — Система сравнения товаров
echo    Дипломный проект — Григорьев Я.М.
echo ============================================
echo.

:: Проверка Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не найден!
    echo Скачайте и установите Node.js: https://nodejs.org/
    echo После установки перезапустите этот файл.
    echo.
    pause
    exit /b 1
)

echo [1/3] Установка зависимостей...
call npm install --silent
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось установить зависимости.
    pause
    exit /b 1
)

echo [2/3] Инициализация базы данных...
call npm run init-db
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось создать базу данных.
    pause
    exit /b 1
)

echo [3/3] Запуск сервера...
echo.
echo ============================================
echo    Сайт доступен: http://localhost:3000
echo    Админ:  admin / password
echo    Клиент: user / password
echo ============================================
echo    Для остановки нажмите Ctrl+C
echo ============================================
echo.

:: Открыть браузер через 2 секунды
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

:: Запуск сервера
node server.js
