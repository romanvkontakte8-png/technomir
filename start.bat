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
if %errorlevel% equ 0 (
    echo [OK] Node.js найден.
    goto :START
)

:: Node.js не найден — скачиваем portable-версию
echo [!] Node.js не найден. Скачиваю portable-версию...
echo.

set NODE_VER=v22.15.0
set NODE_DIR=%~dp0node
set NODE_ZIP=%~dp0node.zip
set NODE_URL=https://nodejs.org/dist/%NODE_VER%/node-%NODE_VER%-win-x64.zip

:: Скачивание через PowerShell
echo [1/4] Скачиваю Node.js %NODE_VER%...
powershell -Command "try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%NODE_ZIP%' -UseBasicParsing } catch { Write-Host '[ОШИБКА] Не удалось скачать Node.js. Проверьте интернет.'; exit 1 }"
if not exist "%NODE_ZIP%" (
    echo [ОШИБКА] Не удалось скачать Node.js.
    echo Скачайте вручную: https://nodejs.org/
    pause
    exit /b 1
)

:: Распаковка
echo [2/4] Распаковываю...
powershell -Command "Expand-Archive -Path '%NODE_ZIP%' -DestinationPath '%~dp0' -Force"
if exist "%~dp0node-%NODE_VER%-win-x64" (
    if exist "%NODE_DIR%" rmdir /s /q "%NODE_DIR%"
    rename "%~dp0node-%NODE_VER%-win-x64" node
)
del "%NODE_ZIP%" >nul 2>&1

if not exist "%NODE_DIR%\node.exe" (
    echo [ОШИБКА] Не удалось распаковать Node.js.
    pause
    exit /b 1
)

:: Добавляем в PATH для текущей сессии
set "PATH=%NODE_DIR%;%PATH%"
echo [OK] Node.js %NODE_VER% установлен в папку node\

:START

echo.
echo [Шаг 1/3] Установка зависимостей...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ОШИБКА] Не удалось установить зависимости.
    echo Попробуйте удалить папку node_modules и запустить снова.
    pause
    exit /b 1
)

echo.
echo [Шаг 2/3] Инициализация базы данных...
call npm run init-db
if %errorlevel% neq 0 (
    echo.
    echo [ОШИБКА] Не удалось создать базу данных.
    pause
    exit /b 1
)

echo.
echo [Шаг 3/3] Запуск сервера...
echo.
echo ============================================
echo    Сайт доступен: http://localhost:3000
echo.
echo    Логин администратора: admin / password
echo    Логин клиента:        user / password
echo ============================================
echo    Для остановки закройте это окно
echo    или нажмите Ctrl+C
echo ============================================
echo.

:: Открыть браузер через 2 секунды
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

:: Запуск сервера
node server.js

:: Если сервер остановился
echo.
echo Сервер остановлен.
pause
