# Website tốt nghiệp — Mừng Tbao đã tốt nghiệp

Đây là phiên bản website độc lập, đã loại bỏ các SDK nội bộ của Canva.

## 1. Chạy thử

Mở `index.html` bằng trình duyệt.

Website mặc định chạy ở **DEMO MODE**:
- giao diện hoạt động;
- có thể gửi lời chúc;
- lời chúc được lưu bằng `localStorage`;
- dữ liệu chỉ tồn tại trên từng thiết bị/trình duyệt.

Để chạy ổn định hơn khi phát triển, có thể dùng VS Code + Live Server.

## 2. Muốn mọi người cùng nhìn thấy lời chúc

Website cần một database dùng chung. Phiên bản này đã chuẩn bị sẵn để dùng Supabase.

### Tạo bảng

Trong Supabase SQL Editor, chạy:

```sql
create table public.wishes (
  id uuid primary key default gen_random_uuid(),
  sender_name text not null check (char_length(sender_name) between 1 and 60),
  message text not null check (char_length(message) between 1 and 500),
  avatar_icon text not null default '🎓',
  created_at timestamptz not null default now()
);

alter table public.wishes enable row level security;

create policy "Anyone can read wishes"
on public.wishes
for select
to anon
using (true);

create policy "Anyone can insert wishes"
on public.wishes
for insert
to anon
with check (
  char_length(sender_name) between 1 and 60
  and char_length(message) between 1 and 500
);
```

Nếu muốn cập nhật realtime, bật Realtime cho bảng `wishes` trong Supabase.

### Điền cấu hình

Mở `config.js`:

```js
window.SITE_CONFIG = {
  supabaseUrl: "https://YOUR-PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_PUBLIC_ANON_KEY"
};
```

Chỉ dùng **anon/public key** ở frontend. Không bao giờ đưa `service_role` key vào website.

## 3. Deploy

Có thể đưa nguyên thư mục này lên:
- Vercel
- Netlify
- GitHub Pages
- hosting riêng

Không cần Canva để website hoạt động.

## 4. Cấu trúc

```text
graduation-website/
├── index.html
├── style.css
├── app.js
├── config.js
├── README.md
└── images/
    └── hero.png
```

## 5. Chỉnh nội dung

Các nội dung chính nằm trong `index.html`:
- tiêu đề;
- dòng mô tả;
- tiêu đề form;
- tiêu đề bảng lưu niệm.

Màu sắc và responsive nằm trong `style.css`.

Logic gửi/lấy lời chúc nằm trong `app.js`.
