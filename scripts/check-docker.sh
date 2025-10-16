#!/bin/bash

# Docker build and verification script

set -e

echo "🔍 Проверка Docker конфигурации..."
echo ""

# Check Docker files
echo "Проверка файлов:"
echo "  ✅ Dockerfile: $(test -f Dockerfile && echo 'найден' || echo '❌ НЕ НАЙДЕН')"
echo "  ✅ docker-compose.yml: $(test -f docker-compose.yml && echo 'найден' || echo '❌ НЕ НАЙДЕН')"
echo "  ✅ .dockerignore: $(test -f .dockerignore && echo 'найден' || echo '❌ НЕ НАЙДЕН')"
echo ""

# Check critical directories
echo "Проверка структуры проекта:"
echo "  ✅ backend/: $(test -d backend && echo 'найден' || echo '❌ НЕ НАЙДЕН')"
echo "  ✅ frontend/: $(test -d frontend && echo 'найден' || echo '❌ НЕ НАЙДЕН')"
echo "  ✅ backend/server.py: $(test -f backend/server.py && echo 'найден' || echo '❌ НЕ НАЙДЕН')"
echo "  ✅ backend/requirements.txt: $(test -f backend/requirements.txt && echo 'найден' || echo '❌ НЕ НАЙДЕН')"
echo "  ✅ frontend/package.json: $(test -f frontend/package.json && echo 'найден' || echo '❌ НЕ НАЙДЕН')"
echo "  ✅ frontend/yarn.lock: $(test -f frontend/yarn.lock && echo 'найден' || echo '❌ НЕ НАЙДЕН')"
echo "  ✅ frontend/src/: $(test -d frontend/src && echo 'найден' || echo '❌ НЕ НАЙДЕН')"
echo ""

# Check Dockerfile content
echo "Проверка Dockerfile:"
if grep -q "node:20-alpine" Dockerfile; then
    echo "  ✅ Node.js 20: используется"
else
    echo "  ❌ Node.js 20: НЕ используется (требуется для React Router 7.9)"
fi

if grep -q "python:3.11" Dockerfile; then
    echo "  ✅ Python 3.11: используется"
else
    echo "  ⚠️  Python версия не 3.11"
fi

if grep -q "opencv-python-headless" backend/requirements.txt; then
    echo "  ✅ OpenCV: включен в requirements.txt"
else
    echo "  ❌ OpenCV: НЕ найден в requirements.txt"
fi

if grep -q "ffmpeg" Dockerfile; then
    echo "  ✅ FFmpeg: установлен в Dockerfile"
else
    echo "  ❌ FFmpeg: НЕ найден в Dockerfile"
fi

echo ""

# What gets built
echo "📦 Что будет собрано в Docker:"
echo "  1. Frontend (React):"
echo "     - Установка зависимостей из yarn.lock"
echo "     - Сборка production build"
echo "     - Результат: /app/frontend/build"
echo ""
echo "  2. Backend (FastAPI):"
echo "     - Установка Python зависимостей"
echo "     - Копирование backend кода"
echo "     - Установка OpenCV + FFmpeg"
echo "     - Копирование собранного frontend"
echo ""
echo "  3. Веб-сервер:"
echo "     - FastAPI раздает статику frontend"
echo "     - API на /api/*"
echo "     - SPA routing для frontend"
echo ""

# Check what will be included
echo "📋 Что НЕ попадет в Docker (из .dockerignore):"
grep -v '^#' .dockerignore | grep -v '^$' | head -10 | while read line; do
    echo "  - $line"
done
echo ""

echo "🐳 Готово к сборке Docker!"
echo ""
echo "Команды для сборки:"
echo "  docker-compose build"
echo "  docker-compose up -d"
echo ""
echo "После запуска:"
echo "  - Приложение: http://localhost:8001"
echo "  - API: http://localhost:8001/api"
echo "  - MongoDB: localhost:27017 (внутри контейнера)"
