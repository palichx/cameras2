# Система видеонаблюдения (Video Surveillance System)

Полнофункциональная система видеонаблюдения с поддержкой RTSP/RTP/HTTP камер, детектора движения MOG2 и записью видео.

## Возможности

- ✅ Добавление камер (RTSP/RTP/HTTP)
- ✅ Авторизация на камерах (username/password)
- ✅ Одно подключение к каждой камере (singleton)
- ✅ Автоопределение формата видео (кодек/разрешение/битрейт/FPS)
- ✅ Детектор движения MOG2 с исключением зон
- ✅ Запись видео в исходном формате без конвертации
- ✅ Live preview через WebSocket
- ✅ Плеер записей с ускоренным воспроизведением (x1, x2, x4, x6, x8, x10)
- ✅ Редактор зон исключения для детектора движения
- ✅ Подсчет событий движения
- ✅ Docker упаковка для локального запуска

## Технологии

**Backend:**
- FastAPI
- OpenCV (cv2) - детектор движения MOG2
- FFmpeg - работа с видеопотоками
- WebSocket - live streaming
- MongoDB - хранение данных камер и записей
- Motor - async MongoDB driver

**Frontend:**
- React 19
- React Router
- Tailwind CSS
- Shadcn UI
- Axios
- WebSocket API

## Установка и запуск

### Docker Compose (рекомендуется)

1. Клонируйте репозиторий:
```bash
git clone <repository-url>
cd <repository-name>
```

2. Проверьте наличие всех файлов (опционально):
```bash
./scripts/check-repo.sh
```

3. Запустите приложение:
```bash
docker-compose up --build -d
```

4. Откройте браузер:
```
http://localhost:8001
```

5. Остановка:
```bash
docker-compose down
```

**Примечание**: Убедитесь, что `frontend/yarn.lock` присутствует в репозитории для воспроизводимых сборок. См. `GIT_SETUP.md` для деталей.

### Локальный запуск (для разработки)

#### Backend

1. Установите зависимости:
```bash
cd backend
pip install -r requirements.txt
```

2. Создайте файл `.env`:
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=surveillance_db
CORS_ORIGINS=*
```

3. Запустите сервер:
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

#### Frontend

1. Установите зависимости:
```bash
cd frontend
yarn install
```

2. Создайте файл `.env`:
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

3. Запустите сервер разработки:
```bash
yarn start
```

## Использование

### Добавление камеры

1. Нажмите кнопку "Add Camera"
2. Заполните форму:
   - **Camera Name**: название камеры
   - **Camera URL**: RTSP/RTP/HTTP URL
     - Примеры:
       - `rtsp://192.168.1.100:554/stream1`
       - `http://192.168.1.100:8080/video`
       - `rtsp://username:password@192.168.1.100:554/stream1` (с авторизацией в URL)
   - **Username**: (опционально) имя пользователя для авторизации
   - **Password**: (опционально) пароль для авторизации
3. Нажмите "Add Camera"

Камера будет добавлена и автоматически подключится. Система определит:
- Кодек (H.264, MJPEG и т.д.)
- Разрешение (1920x1080, 1280x720 и т.д.)
- FPS (частота кадров)
- Битрейт

### Управление камерой

- **Start Camera**: запустить подключение к камере
- **View Live**: просмотр live stream
- **Start Recording**: начать запись
- **Stop Recording**: остановить запись
- **Stop Camera**: остановить подключение

### Редактирование зон исключения

1. Откройте камеру (View Live)
2. Нажмите "Edit Exclusion Zones"
3. Нажмите "Start Drawing Zone"
4. Кликайте на canvas, чтобы создать полигон (минимум 3 точки)
5. Нажмите "Finish Zone"
6. Нажмите "Save Zones"

Зоны исключения — это области, где детектор движения будет отключен (например, деревья, флаги, дороги).

### Просмотр записей

1. Нажмите "Recordings" в главном меню
2. Выберите запись из списка
3. Нажмите "Play"
4. Выберите скорость воспроизведения (x1 - x10)
5. Или нажмите "Download" для скачивания файла

## Архитектура

```
┌─────────────────────────────────────────────────┐
│                   Frontend (React)              │
│  - Dashboard (список камер)                     │
│  - AddCamera (форма добавления)                 │
│  - CameraView (live preview + zone editor)      │
│  - RecordingsView (список и плеер)              │
└─────────────────┬───────────────────────────────┘
                  │ HTTP/WebSocket
┌─────────────────▼───────────────────────────────┐
│              Backend (FastAPI)                   │
│  - Camera Manager (singleton connections)       │
│  - Video Processor (MOG2 + exclusion zones)     │
│  - Recording Service (original format)          │
│  - Stream Service (WebSocket live preview)      │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│                MongoDB                           │
│  - cameras (конфигурация камер)                 │
│  - recordings (метаданные записей)              │
└─────────────────────────────────────────────────┘
```

## API Endpoints

### Cameras

- `POST /api/cameras` - добавить камеру
- `GET /api/cameras` - получить список камер
- `GET /api/cameras/{id}` - получить камеру
- `PUT /api/cameras/{id}` - обновить камеру (зоны исключения)
- `DELETE /api/cameras/{id}` - удалить камеру
- `POST /api/cameras/{id}/start` - запустить камеру
- `POST /api/cameras/{id}/stop` - остановить камеру
- `POST /api/cameras/{id}/record/start` - начать запись
- `POST /api/cameras/{id}/record/stop` - остановить запись

### Recordings

- `GET /api/recordings` - получить список записей
- `GET /api/recordings/{id}/download` - скачать запись
- `GET /api/recordings/{id}/stream?speed=2` - стрим записи с ускорением

### WebSocket

- `WS /api/ws/camera/{id}` - live stream камеры

## Производительность

- Live stream: ~30 FPS @ 640x360 (JPEG quality 60%)
- Запись: исходное разрешение и формат без конвертации
- MOG2 обработка: в реальном времени
- WebSocket: бинарная передача JPEG frames

## Требования

- Python 3.11+
- Node.js 18+
- MongoDB 7.0+
- FFmpeg
- OpenCV
- 2GB+ RAM (в зависимости от количества камер)

## Лицензия

MIT

## Автор

Создано с помощью Emergent AI
