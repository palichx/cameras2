# Работа с HEVC (H.265) камерами

## Проблема

HEVC (H.265) кодек более эффективен чем H.264, но имеет проблемы совместимости:
- ❌ Не все браузеры поддерживают HEVC
- ❌ Safari поддерживает только на устройствах Apple
- ⚠️ OpenCV может иметь проблемы с декодированием HEVC в зависимости от сборки

## Решение в текущей реализации

### ✅ Что реализовано:

1. **Декодирование на сервере**
   - OpenCV декодирует HEVC поток
   - Кадры конвертируются в JPEG
   - JPEG отправляется браузеру через WebSocket

2. **Улучшенная обработка ошибок**
   - Проверка успешного чтения кадра
   - Проверка что кадр не пустой
   - Счетчик ошибок (макс 10 подряд)
   - Автоматическое отключение при многих ошибках

3. **Логирование**
   - Информация о кодеке при подключении
   - Предупреждения при ошибках чтения
   - Трейсы исключений

## Проверка работы с HEVC

### 1. Проверьте логи при подключении камеры:

```bash
docker-compose logs -f app | grep -i "camera\|hevc\|h265"
```

Должно быть:
```
INFO: Camera <id> connected: 1920x1080 @ 25fps, codec: hevc
INFO: Successfully read test frame from camera <id>: shape=(1080, 1920, 3)
```

### 2. Если камера не подключается:

```bash
# Проверьте что OpenCV поддерживает HEVC
docker exec -it surveillance-app python3 -c "
import cv2
cap = cv2.VideoCapture('your_rtsp_url')
ret, frame = cap.read()
print(f'Success: {ret}, Frame shape: {frame.shape if ret else None}')
cap.release()
"
```

## Альтернативные решения

### Вариант 1: Использовать H.264 поток (рекомендуется)

Многие камеры поддерживают несколько потоков:
- **Основной поток**: HEVC высокого качества для записи
- **Дополнительный поток**: H.264 низкого качества для просмотра

**Пример URL:**
```
Основной (HEVC):  rtsp://192.168.1.100:554/stream1
Дополнительный (H.264): rtsp://192.168.1.100:554/stream2
```

**Настройка в приложении:**
- Для live preview: используйте stream2 (H.264)
- Для записи: можно использовать stream1 (HEVC)

### Вариант 2: Настроить камеру на H.264

Зайдите в веб-интерфейс камеры и измените кодек основного потока на H.264:

1. Откройте веб-интерфейс камеры
2. Настройки → Видео → Кодирование
3. Измените:
   - Кодек: H.264
   - Профиль: Main или High
   - Битрейт: 2048-4096 kbps

### Вариант 3: FFmpeg транскодирование (для экспертов)

Если нужно обязательно использовать HEVC, можно добавить FFmpeg транскодирование в backend:

```python
# Вместо cv2.VideoCapture
import subprocess
import numpy as np

# FFmpeg транскодирует HEVC -> raw frames
process = subprocess.Popen([
    'ffmpeg',
    '-i', rtsp_url,
    '-f', 'image2pipe',
    '-pix_fmt', 'bgr24',
    '-vcodec', 'rawvideo',
    '-'
], stdout=subprocess.PIPE, bufsize=10**8)

# Чтение кадров
raw_frame = process.stdout.read(width*height*3)
frame = np.frombuffer(raw_frame, dtype=np.uint8).reshape((height, width, 3))
```

⚠️ **Внимание**: Это очень ресурсоемко! Не рекомендуется для множественных камер.

## Поддержка браузерами

| Браузер | HEVC поддержка |
|---------|----------------|
| Chrome  | ❌ Нет         |
| Firefox | ❌ Нет         |
| Safari  | ✅ Да (Mac/iOS)|
| Edge    | ⚠️ Частично   |

**Вывод**: Для максимальной совместимости используйте H.264.

## Текущая реализация

Приложение **автоматически** обрабатывает HEVC:

1. OpenCV читает HEVC поток
2. Декодирует в RGB кадры
3. Конвертирует в JPEG
4. Отправляет JPEG через WebSocket

**Это работает для большинства камер**, но зависит от:
- Версии OpenCV
- Доступности кодеков в системе
- Настроек камеры

## Troubleshooting

### Черный экран при HEVC:

**Проверка 1: Логи**
```bash
docker-compose logs app | grep "Failed to read"
```

Если видите много "Failed to read frame" - OpenCV не может декодировать HEVC.

**Проверка 2: Тест в VLC**
```bash
vlc rtsp://camera-url
```

Если VLC показывает видео, но приложение нет - проблема в OpenCV.

**Решение:**
1. Используйте H.264 поток камеры (stream2)
2. Или измените настройки камеры на H.264

### OpenCV не поддерживает HEVC:

Текущая сборка OpenCV в Docker может не иметь HEVC поддержки.

**Проверка:**
```bash
docker exec -it surveillance-app python3 << EOF
import cv2
print("OpenCV build info:")
print(cv2.getBuildInformation())
EOF
```

Ищите строки:
```
Video I/O:
  FFMPEG:                      YES
    codec:                     YES
```

**Если FFMPEG: NO**, тогда HEVC не поддерживается.

## Рекомендации

1. ✅ **Лучшее решение**: Используйте H.264 на камере
2. ⚠️ **Альтернатива**: Используйте дополнительный поток (substream) с H.264
3. ❌ **Не рекомендуется**: FFmpeg транскодирование (ресурсоемко)

## Примеры камер с несколькими потоками

### Hikvision:
```
Main stream (HEVC): rtsp://admin:pass@192.168.1.100:554/Streaming/Channels/101
Sub stream (H.264): rtsp://admin:pass@192.168.1.100:554/Streaming/Channels/102
```

### Dahua:
```
Main stream (HEVC): rtsp://admin:pass@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0
Sub stream (H.264): rtsp://admin:pass@192.168.1.100:554/cam/realmonitor?channel=1&subtype=1
```

### Axis:
```
Main stream: rtsp://192.168.1.100/axis-media/media.amp?videocodec=h264
```

### Общий совет:

Проверьте документацию вашей камеры для URL дополнительного потока.
Обычно: `subtype=1`, `stream=2`, или `/sub` в URL.
