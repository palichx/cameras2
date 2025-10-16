# Исправление ошибки Node.js версии

## Проблема
```
error react-router-dom@7.9.4: The engine "node" is incompatible with this module. 
Expected version ">=20.0.0". Got "18.20.8"
```

## Причина
React Router DOM 7.9.4 требует Node.js версии 20 или выше.

## Решение

### В Dockerfile (уже исправлено)
Изменено с `node:18-alpine` на `node:20-alpine`:

```dockerfile
FROM node:20-alpine AS frontend-builder
```

### Для локальной разработки

Если у вас установлен Node.js 18, обновите до версии 20:

#### Ubuntu/Debian:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Должно быть >= 20.0.0
```

#### macOS (через Homebrew):
```bash
brew install node@20
brew link node@20
node --version
```

#### Windows (через nvm-windows):
```bash
nvm install 20
nvm use 20
node --version
```

#### Альтернатива: используйте nvm (Node Version Manager)
```bash
# Установка nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Установка Node.js 20
nvm install 20
nvm use 20
nvm alias default 20
```

### Проверка
```bash
node --version
# Вывод: v20.x.x

# Для Docker (используется автоматически)
docker-compose up --build -d
```

## Требования проекта

- **Node.js**: >= 20.0.0 (для React Router DOM 7.9)
- **Python**: >= 3.11
- **MongoDB**: >= 7.0
- **Docker**: >= 20.10 (опционально)

## Примечание

Docker автоматически использует правильную версию Node.js (20), поэтому если вы используете только Docker для сборки, локальная версия Node.js не имеет значения.
