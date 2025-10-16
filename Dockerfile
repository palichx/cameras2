# Multi-stage Dockerfile for Video Surveillance System

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package.json ./
COPY frontend/yarn.lock* ./

# Install dependencies (works with or without yarn.lock)
RUN yarn install --frozen-lockfile 2>/dev/null || yarn install

COPY frontend/ ./
RUN yarn build

# Stage 2: Backend with OpenCV
FROM python:3.11-slim

# Install system dependencies for OpenCV and FFmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Create recordings directory
RUN mkdir -p /app/backend/recordings

# Expose ports
EXPOSE 8001 3000

# Environment variables
ENV MONGO_URL="mongodb://mongo:27017"
ENV DB_NAME="surveillance_db"
ENV PYTHONUNBUFFERED=1

# Start backend server
WORKDIR /app/backend
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
