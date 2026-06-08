# Sử dụng Node.js bản LTS ổn định
FROM node:20-bullseye-slim

LABEL maintainer="Legend Main Discord Bot"

# Cài đặt các thư viện hệ thống cần thiết:
# - ffmpeg: Để phát nhạc trong Voice Channel
# - python3, build-essential, libsodium-dev: Để biên dịch module native (better-sqlite3, sodium-native)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    build-essential \
    libsodium-dev \
    && rm -rf /var/lib/apt/lists/*

# Tạo thư mục làm việc trong container
WORKDIR /app

# Copy file quản lý thư viện trước để tận dụng cache của Docker
COPY package*.json ./

# Cài đặt các thư viện (npm ci nhanh và chính xác hơn npm install)
RUN npm ci --omit=dev

# Copy toàn bộ mã nguồn vào container
COPY . .

# Lệnh để chạy Bot khi container khởi động
CMD ["node", "July_bot.js"]
