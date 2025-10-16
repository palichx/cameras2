#!/bin/bash

# Pre-commit check script for Video Surveillance System

echo "🔍 Checking repository structure..."

# Check critical files
CRITICAL_FILES=(
    "frontend/yarn.lock"
    "frontend/package.json"
    "backend/requirements.txt"
    "Dockerfile"
    "docker-compose.yml"
    "README.md"
)

MISSING_FILES=()

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - MISSING!"
        MISSING_FILES+=("$file")
    fi
done

echo ""

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
    echo "✅ All critical files present!"
    echo ""
    echo "📦 Ready to commit and build Docker image"
    echo ""
    echo "Next steps:"
    echo "  1. git add ."
    echo "  2. git commit -m 'Your message'"
    echo "  3. git push"
    echo "  4. docker-compose up --build -d"
    exit 0
else
    echo "❌ Missing ${#MISSING_FILES[@]} critical file(s)"
    echo ""
    echo "Please ensure all files are present before committing"
    exit 1
fi
