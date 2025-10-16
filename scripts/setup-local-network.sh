#!/bin/bash

# Скрипт настройки для локальной сети

echo "🌐 Настройка системы видеонаблюдения для локальной сети"
echo ""

# Определение IP адреса
get_ip() {
    # Попытка определить основной IP
    if command -v ip &> /dev/null; then
        IP=$(ip route get 8.8.8.8 2>/dev/null | grep -oP 'src \K\S+')
    elif command -v ifconfig &> /dev/null; then
        IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
    elif command -v hostname &> /dev/null; then
        IP=$(hostname -I | awk '{print $1}')
    else
        IP="localhost"
    fi
    echo "$IP"
}

SERVER_IP=$(get_ip)

echo "📍 Обнаружен IP адрес сервера: $SERVER_IP"
echo ""

# Проверка Docker
echo "🐳 Проверка Docker..."
if command -v docker &> /dev/null; then
    echo "  ✅ Docker установлен: $(docker --version | head -1)"
else
    echo "  ❌ Docker не найден"
    echo ""
    echo "Установите Docker:"
    echo "  curl -fsSL https://get.docker.com -o get-docker.sh"
    echo "  sudo sh get-docker.sh"
    exit 1
fi

if command -v docker-compose &> /dev/null; then
    echo "  ✅ Docker Compose установлен: $(docker-compose --version | head -1)"
else
    echo "  ❌ Docker Compose не найден"
    exit 1
fi
echo ""

# Проверка портов
echo "🔍 Проверка доступности порта 8001..."
if netstat -tuln 2>/dev/null | grep -q ":8001 " || ss -tuln 2>/dev/null | grep -q ":8001 "; then
    echo "  ⚠️  Порт 8001 уже используется"
    echo "  Остановите существующий сервис или измените порт в docker-compose.yml"
else
    echo "  ✅ Порт 8001 свободен"
fi
echo ""

# Firewall проверка
echo "🔥 Проверка Firewall..."
if command -v ufw &> /dev/null; then
    if sudo ufw status | grep -q "Status: active"; then
        echo "  UFW активен"
        if sudo ufw status | grep -q "8001"; then
            echo "  ✅ Порт 8001 уже разрешен"
        else
            echo "  Разрешить порт 8001? (y/n)"
            read -r response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                sudo ufw allow 8001/tcp
                echo "  ✅ Порт 8001 разрешен в UFW"
            fi
        fi
    else
        echo "  UFW не активен"
    fi
elif command -v firewall-cmd &> /dev/null; then
    echo "  firewalld обнаружен"
    if sudo firewall-cmd --list-ports | grep -q "8001"; then
        echo "  ✅ Порт 8001 уже разрешен"
    else
        echo "  Разрешить порт 8001? (y/n)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            sudo firewall-cmd --permanent --add-port=8001/tcp
            sudo firewall-cmd --reload
            echo "  ✅ Порт 8001 разрешен в firewalld"
        fi
    fi
else
    echo "  ℹ️  Firewall не обнаружен или не поддерживается"
fi
echo ""

# Запуск Docker
echo "🚀 Запуск приложения..."
if [ -f "docker-compose.yml" ]; then
    docker-compose up -d
    echo ""
    echo "  ✅ Контейнеры запущены"
    
    # Ожидание запуска
    echo ""
    echo "⏳ Ожидание запуска сервисов (30 секунд)..."
    sleep 30
    
    # Проверка статуса
    echo ""
    echo "📊 Статус контейнеров:"
    docker-compose ps
    
else
    echo "  ❌ docker-compose.yml не найден"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ Система видеонаблюдения запущена!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📱 Доступ к приложению:"
echo ""
echo "  На этом ПК:"
echo "    http://localhost:8001"
echo ""
echo "  С других устройств в локальной сети:"
echo "    http://${SERVER_IP}:8001"
echo ""
echo "  API документация:"
echo "    http://${SERVER_IP}:8001/docs"
echo ""
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📹 Добавление камер:"
echo "  1. Откройте приложение в браузере"
echo "  2. Нажмите 'Add Camera'"
echo "  3. Введите URL камеры (например: rtsp://192.168.1.150:554/stream1)"
echo ""
echo "🔧 Управление:"
echo "  Просмотр логов:  docker-compose logs -f"
echo "  Остановка:       docker-compose down"
echo "  Перезапуск:      docker-compose restart"
echo ""
echo "📖 Подробная документация: LOCAL_NETWORK_SETUP.md"
echo ""
