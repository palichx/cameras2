# Git Setup для системы видеонаблюдения

## Важные файлы для коммита

### Обязательно включить в git:
- ✅ `frontend/yarn.lock` - для воспроизводимых сборок
- ✅ `frontend/package.json` - зависимости frontend
- ✅ `backend/requirements.txt` - зависимости backend
- ✅ `Dockerfile` - для сборки Docker образа
- ✅ `docker-compose.yml` - для запуска контейнеров

### Не включать в git (уже в .gitignore):
- ❌ `node_modules/` - зависимости устанавливаются при сборке
- ❌ `frontend/build/` - генерируется при сборке
- ❌ `backend/__pycache__/` - Python кэш
- ❌ `*.env` файлы - содержат секреты
- ❌ `backend/recordings/` - видеозаписи

## Проверка перед коммитом

```bash
# Убедитесь, что yarn.lock присутствует
git ls-files | grep yarn.lock

# Должно вывести:
# frontend/yarn.lock

# Проверка структуры репозитория
git ls-files | grep -E "(package.json|requirements.txt|Dockerfile|docker-compose)"

# Должно вывести:
# Dockerfile
# docker-compose.yml
# backend/requirements.txt
# frontend/package.json
```

## Первоначальная настройка git

```bash
cd /app

# Инициализация git (если не сделано)
git init

# Добавить все файлы
git add .

# Проверить статус
git status

# Убедиться что yarn.lock в списке
git add frontend/yarn.lock -f

# Создать коммит
git commit -m "Initial commit: Video Surveillance System"
```

## Сборка Docker образа

После клонирования репозитория:

```bash
# Клонировать репозиторий
git clone <your-repo-url>
cd <repo-name>

# Убедиться что yarn.lock присутствует
ls -la frontend/yarn.lock

# Сборка и запуск
docker-compose up --build -d
```

## Решение проблем

### Если yarn.lock отсутствует после клонирования:

```bash
cd frontend
yarn install
# Это создаст новый yarn.lock
git add yarn.lock
git commit -m "Add yarn.lock"
git push
```

### Если Docker сборка падает с ошибкой "yarn.lock not found":

1. Проверьте .gitignore - убедитесь что yarn.lock НЕ игнорируется
2. Dockerfile теперь работает и без yarn.lock (fallback к yarn install)
3. Но рекомендуется включить yarn.lock для воспроизводимости

## Обновление .gitignore

Текущий `/app/.gitignore` настроен правильно:

```gitignore
# Keep lock files for reproducible builds
!yarn.lock
!package-lock.json
```

Это гарантирует, что yarn.lock будет включен в репозиторий.
