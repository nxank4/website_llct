# Hướng Dẫn Cấu Hình Supabase Connections

Tài liệu này giải thích cách cấu hình kết nối Supabase cho 3 môi trường khác nhau trong dự án.

## Tổng Quan

Dự án sử dụng 3 loại kết nối Supabase khác nhau tùy theo môi trường:

1. **Frontend (Next.js trên Vercel)**: Supabase Client Library (Data API)
2. **Backend API Chính (FastAPI trên Render)**: Direct Connection (Port 5432)
3. **Backend AI (FastAPI trên GCP Cloud Run)**: Pooler Transaction Mode (Port 6543)

## 1. Frontend (Next.js trên Vercel) - Supabase Client Library

### Phương thức: Data API (Supabase Client Library)

### Cách dùng:
```bash
npm install @supabase/supabase-js
```

### Cấu hình:
- File: `client/src/lib/supabase.ts`
- Sử dụng `SUPABASE_URL` và `SUPABASE_ANON_KEY` từ environment variables
- Client tự động xử lý authentication và tôn trọng Row Level Security (RLS)

### Environment Variables:
```env
SUPABASE_URL=https://dcalajbubsmcujcoaiqn.supabase.co
SUPABASE_ANON_KEY=sb_publishable_eiuXYxArpNC5HSu8huYUGg_SEdhDeqw
```

### Tại sao:
- An toàn cho client-side usage
- Tự động xử lý authentication
- Tôn trọng RLS (Row Level Security)
- Được khuyến nghị cho frontend applications

### Sử dụng trong code:
```typescript
import { supabase } from '@/lib/supabase';

// Query data
const { data, error } = await supabase
  .from('users')
  .select('*');
```

## 2. Backend API Chính (Render) - Supavisor Pooler Session Mode

### Phương thức: Supavisor Pooler Session Mode (Port 5432)

### ⚠️ QUAN TRỌNG: Render chỉ hỗ trợ IPv4
- Supabase direct connection map to IPv6, không hoạt động với Render
- **Giải pháp**: Sử dụng Supavisor pooler session mode (port 5432) thay vì direct connection

### Cách lấy Connection String:
1. Vào Supabase Dashboard
2. Chọn Project Settings
3. Chọn Database
4. Chọn Connection string
5. Chọn "Connection pooling" → "Session mode" (KHÔNG chọn "Direct connection")
6. Copy connection string

### Format:
```
postgres://[db-user].[project-ref]:[db-password]@aws-0-[aws-region].pooler.supabase.com:5432/postgres
```

### Ví dụ:
```
postgres://postgres.dcalajbubsmcujcoaiqn:l5Bqyvq9f8miEbpA@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

### Cấu hình:
- File: `server/app/core/config.py`
- File: `server/render.yaml`
- File: `server/env.example`

### Environment Variables:
```env
DATABASE_URL=postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20
```

### Tại sao:
- Render chỉ accept IPv4 connections
- Supavisor pooler session mode hỗ trợ IPv4
- Server-side connection pooling via Supavisor
- Application-side connection pooling via SQLAlchemy
- Tối ưu cho long-running processes

### Lưu ý:
- Port 5432 là Session Mode (không phải Direct Connection)
- Format: `postgres://` (không phải `postgresql://`)
- Username format: `postgres.[PROJECT_REF]` (có project ref trong username)
- Cần password của user postgres từ Supabase Dashboard
- SQLAlchemy sử dụng QueuePool để quản lý connections
- Khuyến nghị: Giới hạn connections ở 40% nếu dùng REST Client, hoặc 80% nếu không

## 3. Backend AI (Cloud Run) - Pooler Transaction Mode

### Phương thức: Pooler Transaction Mode (Port 6543)

### Cách lấy Connection String:
1. Vào Supabase Dashboard
2. Chọn Project Settings
3. Chọn Database
4. Chọn Connection string
5. Chọn "Connection pooling"
6. Chọn "Transaction mode"
7. Copy connection string

### Format:
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

### Cấu hình:
- File: `ai-server/app/core/config.py`
- File: `ai-server/app/core/database.py`
- File: `ai-server/env.example`

### Environment Variables:
```env
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
GEMINI_API_KEY=your-gemini-api-key
UPSTASH_REDIS_REST_URL=https://strong-wahoo-33802.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token
```

### Tại sao:
- Cloud Run là serverless environment
- Mỗi request có thể tạo connection mới (transient connection)
- Pooler Transaction Mode xử lý nhiều transient connections hiệu quả
- Tránh làm cạn kiệt số lượng kết nối tối đa của database

### Lưu ý:
- Port 6543 là Transaction Mode (khác với Session Mode port 6544)
- Sử dụng NullPool trong SQLAlchemy (không maintain connection pool)
- Mỗi request nhận fresh connection

## So Sánh 3 Loại Kết Nối

| Môi Trường | Phương Thức | Port | Pooling | Use Case |
|------------|-------------|------|---------|----------|
| Frontend (Vercel) | Client Library | N/A | N/A | Client-side queries với RLS |
| Backend API (Render) | Supavisor Pooler Session | 5432 | Server-side (Supavisor) + Application-side (SQLAlchemy) | Persistent server, IPv4 compatible, CRUD operations |
| Backend AI (Cloud Run) | Pooler Transaction | 6543 | Server-side (Supabase Pooler) | Serverless, transient connections |

## Best Practices

### Frontend:
- Luôn sử dụng `SUPABASE_ANON_KEY` (không dùng SERVICE_ROLE_KEY)
- Client tự động xử lý authentication
- Tôn trọng RLS policies

### Backend API (Render):
- ⚠️ **QUAN TRỌNG**: Render chỉ hỗ trợ IPv4, không thể dùng Direct Connection (IPv6)
- Sử dụng Supavisor Pooler Session Mode (port 5432) thay vì Direct Connection
- Format: `postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres`
- Cấu hình connection pool phù hợp với workload (40% nếu dùng REST Client, 80% nếu không)
- Monitor connection pool usage

### Backend AI (Cloud Run):
- Sử dụng Pooler Transaction Mode (port 6543)
- Không maintain connection pool trong application
- Để Supabase Pooler xử lý connections

## Troubleshooting

### Lỗi: "could not translate host name to address" (DNS resolution)
- **Nguyên nhân**: Render chỉ hỗ trợ IPv4, nhưng Supabase direct connection map to IPv6
- **Giải pháp**: Sử dụng Supavisor Pooler Session Mode thay vì Direct Connection
- Format: `postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres`
- Lấy connection string từ: Supabase Dashboard → Connection string → "Connection pooling" → "Session mode"

### Lỗi: "Connection refused"
- Kiểm tra connection string có đúng port không (5432 cho Session Mode, 6543 cho Transaction Mode)
- Kiểm tra password có đúng không
- Kiểm tra firewall/network settings
- Kiểm tra Supabase project có active không

### Lỗi: "Too many connections"
- Backend API: Giảm `DATABASE_POOL_SIZE` hoặc `DATABASE_MAX_OVERFLOW`
- Backend AI: Đảm bảo đang dùng port 6543 (Transaction Mode)
- Khuyến nghị: Giới hạn connections ở 40% nếu dùng REST Client, hoặc 80% nếu không

### Lỗi: "Connection timeout"
- Kiểm tra network connectivity
- Kiểm tra Supabase project có active không
- Kiểm tra connection string format
- Kiểm tra IPv4/IPv6 compatibility (Render chỉ hỗ trợ IPv4)

## Tài Liệu Tham Khảo

- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Supabase Client Library](https://supabase.com/docs/reference/javascript/introduction)
- [SQLAlchemy Connection Pooling](https://docs.sqlalchemy.org/en/20/core/pooling.html)

