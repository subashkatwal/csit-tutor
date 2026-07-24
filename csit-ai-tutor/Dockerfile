FROM python:3.11-slim

# Prevents Python from writing .pyc files and buffers stdout (so logs show up immediately)
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# System deps needed to build bcrypt/cryptography wheels on slim images
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first (separate layer = faster rebuilds when only code changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the app
COPY . .

EXPOSE 9010

# Change "main:app" if your entry file/app variable is named differently
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9010"]
