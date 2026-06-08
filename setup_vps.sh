#!/bin/bash
# Script khởi tạo cho VPS để tránh lỗi Docker mount nhầm thành thư mục

echo "Đang tạo các file dữ liệu trống..."

touch data.sqlite
touch blocked_channels.json
if [ ! -s autoresponder.json ]; then
    echo "[]" > autoresponder.json
fi

echo "Hoàn tất! Bây giờ bạn có thể chạy: docker-compose up -d"
