# SaleZalo - Hệ Thống Quản Lý & Tiếp Thị Zalo Tự Động Qua n8n

[![Domain](https://img.shields.io/badge/Domain-salezalo.qmath.io.vn-blue?style=for-the-badge&logo=googlechrome)](https://salezalo.qmath.io.vn)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![SQLite](https://img.shields.io/badge/SQLite-node%3Asqlite-003B57?style=for-the-badge&logo=sqlite)](https://nodejs.org/docs/latest/api/sqlite.html)
[![n8n](https://img.shields.io/badge/n8n-Automations-EA4B71?style=for-the-badge&logo=n8n)](https://n8n.io/)

Ứng dụng Web App quản lý, bóc tách danh sách thành viên nhóm Zalo, tự động lọc sạch Trưởng/Phó nhóm, quản lý đa tài khoản Zalo với Webhook n8n riêng biệt, và thực hiện các chiến dịch tiếp thị nhắn tin tự động chống spam.

---

## 🚀 Tính Năng Nổi Bật

1. **Cào Thành Viên Tự Động Từ UID & Link Mời Nhóm**:
   - Hỗ trợ nhập trực tiếp UID nhóm hoặc Link mời `https://zalo.me/g/...`.
   - Nút **"Bắt đầu cào"** tự động lưu thông tin nhóm và kích hoạt ngay webhook n8n tương ứng.

2. **Thuật Toán Lọc Trưởng / Phó Nhóm Tự Động**:
   - Tự động cách ly `creatorId` (Trưởng nhóm) và toàn bộ `adminIds` (Phó nhóm).
   - Chỉ lưu trữ thành viên thường (`role = 'member'`), đảm bảo danh sách khách hàng tiềm năng sạch 100%.

3. **Quản Lý Đa Tài Khoản Zalo (Multi-Account)**:
   - Thêm không giới hạn các số điện thoại Zalo.
   - Mỗi SĐT đi kèm **1 Link Webhook n8n Cào** và **1 Link Webhook n8n Gửi Tin** độc lập.

4. **Khu Vực Nhóm Mở Rộng & Bộ Lọc Nhanh**:
   - Danh bạ nhóm dạng dọc bên trái có ô tìm kiếm nhanh (dễ dàng quản lý hàng trăm nhóm).
   - Lọc 1 chạm: Bấm vào nhóm để xem thành viên nhóm đó, hoặc bấm "Tất cả các nhóm" để xem tổng thể.

5. **Icon Trạng Thái Thành Viên Trực Quan**:
   - ✉️ **Trạng thái nhận tin**: Đã nhận tin chiến dịch / Chưa từng nhận.
   - 🤝 **Trạng thái bạn bè**: Đã là bạn / Chưa kết bạn (cho phép bấm click để đổi nhanh).
   - 🛡️ **Trạng thái chặn tin lạ**: Đang chặn / Cho phép nhận tin.

6. **Chiến Dịch Tiếp Thị Chống Spam Thông Minh**:
   - **Giới hạn số người gửi mỗi đợt (`max_recipients`)**.
   - **Loại trừ người đã nhận tin trong X ngày gần nhất (`cooldown_days`)** tránh gửi trùng lặp.
   - **Tùy chọn tự động kết bạn trước khi gửi tin (`auto_friend_first`)** để gửi cho người chặn tin lạ.
   - **Giãn cách delay giữa các tin (`delay_seconds`)** tránh bị Zalo khóa tài khoản.
   - Hỗ trợ đầy đủ chức năng **Tạo, Sửa và Xóa** chiến dịch.

7. **Tin Nhắn Đa Phương Tiện (Rich Media) & Live Preview**:
   - Chèn biến cá nhân hóa `{name}` tự động điền tên người nhận.
   - Đính kèm link Hình ảnh, link Video clip, và link nút kêu gọi hành động (CTA URL).
   - Khung xem trước mô phỏng tin nhắn Zalo theo thời gian thực.

8. **Cơ Sở Dữ Liệu SQLite Cục Bộ Siêu Tốc**:
   - Sử dụng Node.js built-in `node:sqlite` ở chế độ WAL (Write-Ahead Logging) siêu nhẹ, không phụ thuộc máy chủ DB bên ngoài.

---

## 📂 Cấu Trúc Dự Án

```
├── data/                       # Thư mục lưu trữ SQLite database (zalo_manager.db)
├── n8n/
│   └── Tool_Zalo_Workflow_Completed.json  # Workflow n8n mẫu hoàn chỉnh 19 nodes
├── public/                     # Static assets
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── accounts/       # API quản lý SĐT Zalo & Webhooks
│   │   │   ├── campaigns/      # API tạo, sửa, xóa, kích hoạt chiến dịch
│   │   │   ├── groups/         # API quản lý nhóm & kích hoạt cào
│   │   │   ├── members/        # API bộ lọc, tìm kiếm, cập nhật thành viên
│   │   │   ├── settings/       # API cài đặt webhook hệ thống
│   │   │   ├── stats/          # API thống kê tổng quan
│   │   │   └── webhooks/zalo/  # Endpoint nhận dữ liệu từ n8n
│   │   ├── page.tsx            # Toàn bộ giao diện người dùng (Dashboard, Groups, Campaigns...)
│   │   └── layout.tsx
│   └── lib/
│       ├── db.ts               # Schema SQLite & migrations
│       └── zalo-processor.ts   # Thuật toán lọc Trưởng/Phó nhóm
├── Dockerfile                  # Dockerfile build production
├── docker-compose.yml          # Triển khai Docker 1 lệnh
└── README.md
```

---

## 🛠️ Hướng Dẫn Cài Đặt & Chạy Cục Bộ

### Yêu cầu:
- Node.js >= 22.5.0 (khuyên dùng Node.js 22 LTS hoặc Node.js 24)
- npm hoặc pnpm

```bash
# 1. Cài đặt dependencies
npm install

# 2. Chạy môi trường phát triển
npm run dev

# 3. Mở trình duyệt
# Truy cập: http://localhost:3000
```

---

## 🌐 Triển Khai Lên Server Với Tên Miền `salezalo.qmath.io.vn`

### Cách 1: Chạy Bằng Docker & Docker Compose (Khuyên dùng trên VPS)

1. Clone dự án về VPS:
   ```bash
   git clone https://github.com/PhamDinhQuang0911/salezalo.git
   cd salezalo
   ```

2. Khởi chạy ứng dụng:
   ```bash
   docker compose up -d --build
   ```
   Ứng dụng sẽ chạy tại cổng `3000` với dữ liệu SQLite được lưu cố định tại thư mục `./data`.

3. Cấu hình Reverse Proxy Nginx (hoặc Caddy/Cloudflare) cho tên miền `salezalo.qmath.io.vn`:
   ```nginx
   server {
       server_name salezalo.qmath.io.vn;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

### Cách 2: Chạy Trực Tiếp Với PM2 Trên VPS

```bash
npm install
npm run build
pm2 start npm --name "salezalo" -- run start
pm2 save
```

---

## 📡 Cấu Hình Tên Miền DNS: `salezalo.qmath.io.vn`

Vào trang quản trị DNS của domain `qmath.io.vn` (Cloudflare hoặc nhà đăng ký tên miền):
- **Loại (Type)**: `A`
- **Tên (Name)**: `salezalo`
- **Giá trị (Value / Target)**: Nhập địa chỉ IP máy chủ VPS của bạn (IP đang chạy web app này)
- **TTL**: Tự động hoặc 3600

---

## 🔄 Tích Hợp n8n Workflow

Trong thư mục `n8n/` có sẵn file:
👉 **`n8n/Tool_Zalo_Workflow_Completed.json`**

1. Mở n8n (`https://n8n.qmath.io.vn/`).
2. Vào menu `...` $\rightarrow$ chọn **Import from File** $\rightarrow$ chọn file trên.
3. Kích hoạt (Publish) workflow.
4. Copy Webhook URL từ n8n dán vào tab "Tài Khoản SĐT Cào" trên giao diện SaleZalo.

---

## 📄 Bản Quyền

Dự án được xây dựng phục vụ nhu cầu cá nhân và tự động hóa hệ thống tiếp thị giáo dục QMath.
