#!/bin/bash

# Скрипт тестирования RTSP камеры перед добавлением в приложение

echo "🎥 Тестирование RTSP/HEVC камеры"
echo ""

# Проверка аргументов
if [ $# -eq 0 ]; then
    echo "Использование: $0 <rtsp-url>"
    echo "Пример: $0 rtsp://admin:password@192.168.1.100:554/stream1"
    exit 1
fi

RTSP_URL="$1"

echo "📹 URL камеры: $RTSP_URL"
echo ""

# Проверка 1: FFprobe (если доступен)
echo "=== Проверка 1: Информация о потоке (ffprobe) ==="
if command -v ffprobe &> /dev/null; then
    ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate -of default=noprint_wrappers=1 "$RTSP_URL" 2>&1 | head -20
    echo ""
else
    echo "⚠️  ffprobe не установлен, пропускаем"
    echo ""
fi

# Проверка 2: OpenCV test
echo "=== Проверка 2: Тест OpenCV ==="
python3 << EOF
import cv2
import sys

print("Подключение к камере...")
cap = cv2.VideoCapture('$RTSP_URL')

if not cap.isOpened():
    print("❌ Не удалось открыть поток")
    sys.exit(1)

print("✅ Поток открыт")

# Получение информации
codec = int(cap.get(cv2.CAP_PROP_FOURCC))
codec_str = "".join([chr((codec >> 8 * i) & 0xFF) for i in range(4)]).strip()
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = cap.get(cv2.CAP_PROP_FPS)

print(f"Кодек: {codec_str}")
print(f"Разрешение: {width}x{height}")
print(f"FPS: {fps}")

# Попытка чтения кадра
print("\nЧтение тестового кадра...")
ret, frame = cap.read()

if ret and frame is not None:
    print(f"✅ Кадр успешно прочитан: shape={frame.shape}")
    
    # Попытка кодирования в JPEG
    ret_encode, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
    if ret_encode:
        print(f"✅ Кадр успешно закодирован в JPEG: {len(buffer)} bytes")
    else:
        print("❌ Не удалось закодировать кадр в JPEG")
else:
    print("❌ Не удалось прочитать кадр")
    sys.exit(1)

cap.release()
print("\n✅ Камера совместима с приложением")
EOF

OPENCV_EXIT=$?
echo ""

# Проверка 3: VLC (если доступен)
echo "=== Проверка 3: VLC (ручная) ==="
if command -v vlc &> /dev/null; then
    echo "VLC установлен. Для визуальной проверки запустите:"
    echo "  vlc $RTSP_URL"
    echo ""
else
    echo "⚠️  VLC не установлен"
    echo "Установите для визуальной проверки: sudo apt install vlc"
    echo ""
fi

# Итоги
echo "=========================================="
if [ $OPENCV_EXIT -eq 0 ]; then
    echo "✅ РЕЗУЛЬТАТ: Камера готова к использованию"
    echo ""
    echo "Добавьте камеру в приложение:"
    echo "  URL: $RTSP_URL"
    echo ""
else
    echo "❌ РЕЗУЛЬТАТ: Камера имеет проблемы"
    echo ""
    echo "Возможные решения:"
    echo "1. Проверьте URL и credentials"
    echo "2. Используйте H.264 поток (stream2, substream)"
    echo "3. Измените настройки кодека камеры на H.264"
    echo ""
    echo "См. HEVC_SUPPORT.md для подробностей"
    echo ""
fi
echo "=========================================="
