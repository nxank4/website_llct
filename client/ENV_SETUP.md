# Hướng Dẫn Cấu Hình Môi Trường (Environment Setup)

## 📁 Cấu Trúc File Environment

Next.js tự động load các file `.env` theo thứ tự ưu tiên:

1. **`.env.local`** (ưu tiên cao nhất, gitignored)
   - Dùng cho secrets và local overrides
   - Không commit vào Git

2. **`.env.development`** (load khi `NODE_ENV=development`)
   - Cấu hình cho development
   - API URL: `http://localhost:8000`

3. **`.env.production`** (load khi `NODE_ENV=production`)
   - Cấu hình cho production
   - API URL: `https://your-backend.onrender.com`

4. **`.env`** (default, ưu tiên thấp nhất)
   - Cấu hình mặc định

## 🚀 Cách Sử Dụng

### Phương Pháp 1: Tự Động (Khuyến Nghị)

Next.js tự động load file `.env` dựa trên `NODE_ENV`:

```bash
# Development (tự động load .env.development)
npm run dev

# Production build (tự động load .env.production)
npm run build
```

### Phương Pháp 2: Script Chuyển Đổi Nhanh

Sử dụng script để chuyển đổi giữa dev và prod:

```bash
# Chuyển sang development
npm run env:dev

# Chuyển sang production
npm run env:prod

# Xem cấu hình hiện tại
npm run env:info
```

Script này sẽ:
- Backup `.env.local` hiện tại
- Copy từ `.env.development` hoặc `.env.production` sang `.env.local`
- Hiển thị thông tin cấu hình

### Phương Pháp 3: Tạo File .env.local Thủ Công

1. **Cho Development:**
   ```bash
   cp .env.development .env.local
   # Sau đó chỉnh sửa các giá trị trong .env.local
   ```

2. **Cho Production:**
   ```bash
   cp .env.production .env.local
   # Cập nhật NEXT_PUBLIC_API_URL với URL Render của bạn
   ```

## 📝 Cấu Hình Các Biến Quan Trọng

### 1. API Backend URL

**Development:**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Production:**
```env
NEXT_PUBLIC_API_URL=https://your-backend-service.onrender.com
```

### 2. NextAuth Configuration

```env
NEXTAUTH_URL=http://localhost:3000  # Development
NEXTAUTH_URL=https://your-domain.com  # Production
NEXTAUTH_SECRET=your-secret-key
```

### 3. Supabase (nếu sử dụng)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. OAuth Providers

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## 🔍 Kiểm Tra Environment Hiện Tại

Sử dụng utility `env.ts` trong code:

```typescript
import { getEnvInfo, logEnvInfo } from '@/lib/env';

// Trong component
useEffect(() => {
  logEnvInfo(); // Log env info trong development mode
}, []);

// Hoặc lấy thông tin
const envInfo = getEnvInfo();
console.log(envInfo);
```

Hoặc chạy script:
```bash
npm run env:info
```

## 🎯 Quy Trình Workflow

### Development (Local Testing)
1. Đảm bảo backend đang chạy tại `http://localhost:8000`
2. Chạy `npm run env:dev` hoặc copy `.env.development` sang `.env.local`
3. Cập nhật các secret keys trong `.env.local` nếu cần
4. Chạy `npm run dev`

### Production (Testing với Render)
1. Chạy `npm run env:prod`
2. Cập nhật `NEXT_PUBLIC_API_URL` trong `.env.local` với URL Render của bạn
3. Cập nhật các secret keys cho production
4. Chạy `npm run build` để build
5. Test với `npm run start`

### Deploy Production
1. Trên Vercel hoặc platform khác, set environment variables trong dashboard
2. Không cần file `.env.local` khi deploy (dùng env vars từ platform)

## ⚠️ Lưu Ý Quan Trọng

1. **Không commit `.env.local`** - File này chứa secrets và đã được gitignore
2. **Kiểm tra `.env.local`** trước khi chạy - Nó có priority cao nhất
3. **Backup trước khi switch** - Script tự động backup vào `.env-backups/`
4. **Next.js build** luôn sử dụng production env vars cho build optimization

## 🛠️ Troubleshooting

### Vấn đề: API URL không đúng
- Kiểm tra `.env.local` có override không
- Chạy `npm run env:info` để xem cấu hình hiện tại
- Đảm bảo biến `NEXT_PUBLIC_API_URL` được set đúng

### Vấn đề: Environment không chuyển đổi
- Restart dev server sau khi đổi `.env.local`
- Clear Next.js cache: `rm -rf .next`
- Kiểm tra `NODE_ENV` có đúng không

### Vấn đề: Build production nhưng vẫn dùng dev API
- Kiểm tra environment variables trên platform deploy
- Đảm bảo `.env.production` có đúng URL
- Rebuild sau khi đổi env vars

## 📚 Tài Liệu Tham Khảo

- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Next.js Environment Variables Loading Order](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables#environment-variable-load-order)

