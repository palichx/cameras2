# Архитектура Docker для Системы Видеонаблюдения

## Компоненты

### 1. Контейнер: surveillance-app (Backend + Frontend)
```
┌─────────────────────────────────────────────┐
│    surveillance-app (Port 8001)             │
├─────────────────────────────────────────────┤
│  FastAPI Backend:                           │
│  ├─ /api/cameras (CRUD)                     │
│  ├─ /api/recordings (управление)            │
│  ├─ /api/ws/camera/{id} (WebSocket)         │
│  └─ OpenCV MOG2 + FFmpeg обработка          │
│                                             │
│  Static File Server:                        │
│  ├─ / (React SPA index.html)                │
│  ├─ /static/* (JS, CSS, assets)             │
│  └─ SPA routing (все пути → index.html)     │
├─────────────────────────────────────────────┤
│  Зависимости:                               │
│  ├─ Python 3.11                             │
│  ├─ FastAPI, Uvicorn                        │
│  ├─ OpenCV (headless)                       │
│  ├─ FFmpeg                                  │
│  ├─ Motor (async MongoDB)                   │
│  └─ React build (статика)                   │
└─────────────────────────────────────────────┘
         │
         │ HTTP/WebSocket
         ▼
    localhost:8001
```

### 2. Контейнер: surveillance-mongo
```
┌─────────────────────────────────────────────┐
│    surveillance-mongo                       │
├─────────────────────────────────────────────┤
│  MongoDB 7.0                                │
│  ├─ База: surveillance_db                   │
│  ├─ Коллекция: cameras                      │
│  └─ Коллекция: recordings                   │
├─────────────────────────────────────────────┤
│  Volume: mongo_data                         │
│  └─ Persistent storage для данных           │
└─────────────────────────────────────────────┘
         ▲
         │ MongoDB protocol
         │
   mongodb://mongo:27017
```

## Процесс сборки Docker

### Stage 1: Frontend Builder (Node.js 20)
```
┌────────────────────────────────────┐
│  node:20-alpine                    │
├────────────────────────────────────┤
│  1. COPY package.json, yarn.lock   │
│  2. RUN yarn install               │
│  3. COPY frontend/src              │
│  4. RUN yarn build                 │
│  → Результат: /app/frontend/build  │
└────────────────────────────────────┘
```

### Stage 2: Production Image (Python 3.11)
```
┌────────────────────────────────────┐
│  python:3.11-slim                  │
├────────────────────────────────────┤
│  1. Install FFmpeg + libs          │
│  2. COPY requirements.txt          │
│  3. RUN pip install                │
│  4. COPY backend/                  │
│  5. COPY frontend/build (Stage 1)  │
│  6. CMD uvicorn server:app         │
└────────────────────────────────────┘
```

## Volumes и Persistence

### 1. mongo_data (Docker Volume)
- **Назначение**: Постоянное хранилище MongoDB
- **Данные**: Камеры, записи, конфигурация
- **Тип**: Named Docker volume

### 2. ./recordings (Bind Mount)
- **Назначение**: Видеозаписи с камер
- **Путь хоста**: `./recordings`
- **Путь контейнера**: `/app/backend/recordings`
- **Доступ**: Можно просматривать на хосте

## Network

```
surveillance-net (bridge)
├─ surveillance-app (app)
└─ surveillance-mongo (mongo)
```

Контейнеры общаются через внутреннюю сеть Docker.

## Environment Variables

### surveillance-app
```env
MONGO_URL=mongodb://mongo:27017    # Внутренний DNS Docker
DB_NAME=surveillance_db
CORS_ORIGINS=*
PYTHONUNBUFFERED=1
```

## Exposed Ports

```
Host          Container     Service
────────────────────────────────────
8001    →     8001         FastAPI + React
            27017         MongoDB (internal only)
```

## Проверка работы

### После запуска:
```bash
docker-compose up -d

# Проверка контейнеров
docker-compose ps

# Логи
docker-compose logs -f app
docker-compose logs -f mongo

# Проверка MongoDB
docker exec -it surveillance-mongo mongosh surveillance_db
```

### Доступ к приложению:
- **Frontend + API**: http://localhost:8001
- **API docs**: http://localhost:8001/docs (автоматически FastAPI)
- **WebSocket**: ws://localhost:8001/api/ws/camera/{id}

## Что включено в образ

### ✅ Backend компоненты:
- [x] FastAPI server
- [x] OpenCV с MOG2
- [x] FFmpeg для обработки видео
- [x] WebSocket сервер
- [x] MongoDB клиент (Motor)
- [x] Все Python зависимости

### ✅ Frontend компоненты:
- [x] React production build
- [x] Все статические файлы (JS, CSS)
- [x] Маршрутизация (React Router)
- [x] UI компоненты (Shadcn)
- [x] Все ассеты

### ✅ Инфраструктура:
- [x] MongoDB контейнер
- [x] Volumes для персистентности
- [x] Health checks
- [x] Auto-restart
- [x] Networking между контейнерами

## Что НЕ включено (правильно)

### ❌ Не в образе (собирается внутри):
- node_modules (устанавливается в builder stage)
- Python __pycache__ (генерируется при запуске)
- .env файлы (передаются через docker-compose)

### ❌ Не в volumes:
- Исходный код (только в образе)
- Временные файлы
- Логи (опционально можно добавить volume)

## Размер образа (примерно)

```
Frontend builder:  ~500MB (не входит в финальный образ)
Final image:       ~800-900MB
  - Python base:   ~150MB
  - OpenCV:        ~300MB
  - FFmpeg + libs: ~100MB
  - Dependencies:  ~200MB
  - App code:      ~50MB
```

## Команды управления

```bash
# Сборка
docker-compose build

# Запуск
docker-compose up -d

# Остановка
docker-compose down

# Перезапуск
docker-compose restart app

# Просмотр логов
docker-compose logs -f

# Удаление с volumes
docker-compose down -v

# Зайти в контейнер
docker exec -it surveillance-app bash
```

## Готово к production?

### ✅ Для локального использования: ДА
- Все компоненты упакованы
- Volumes настроены
- Restart policies установлены

### ⚠️ Для production облака:
Дополнительно нужно:
- [ ] Secrets management (не .env файлы)
- [ ] Reverse proxy (Nginx/Traefik)
- [ ] SSL/TLS сертификаты
- [ ] Мониторинг и логирование
- [ ] Backup стратегия для MongoDB
- [ ] Resource limits (CPU/Memory)
