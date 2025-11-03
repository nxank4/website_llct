## E‑Learning Platform

Nền tảng e‑learning với Frontend Next.js (Vercel), xác thực NextAuth.js (Auth.js) dùng Supabase Adapter, cơ sở dữ liệu và lưu trữ trên Supabase, và dịch vụ AI (RAG + Gemini) chạy bằng FastAPI trên Google Cloud Run.

### Demo (local)

- Frontend: `http://localhost:3000`
- Backend AI API: `http://localhost:8000`
- API Docs (AI Backend): `http://localhost:8000/docs`

---

### Tech Stack

- **Frontend**: Next.js (App Router), TypeScript, React; UI: Tailwind CSS
- **Authentication**: NextAuth.js (Auth.js) + `@next-auth/supabase-adapter`
- **Database & Storage**: Supabase (PostgreSQL + Supabase Storage)
- **AI Backend**: FastAPI (Python) + RAG (LangChain/LlamaIndex tuỳ chọn), Gemini API
- **Deploy**: Frontend trên Vercel; AI Backend đóng gói Docker và chạy trên Google Cloud Run

---

### Kiến trúc triển khai

1. Frontend (Giao diện người dùng)

- **Công nghệ**: Next.js
- **Nền tảng Deploy**: Vercel
- **Vai trò**: Xử lý toàn bộ giao diện (các trang khoá học, bài tập, chatbot, admin...)
- **Lý do chọn**: Vercel tối ưu cho Next.js, CI/CD tự động khi git push, tốc độ nhanh, free tier mạnh

2. Authentication (Xác thực)

- **Công nghệ**: NextAuth.js (Auth.js)
- **Nền tảng Deploy**: Chạy dạng serverless trên Vercel (API Routes)
- **Vai trò**: Đăng nhập/đăng ký, phiên (session), bảo mật
- **Tích hợp**: Dùng `@next-auth/supabase-adapter` để đồng bộ user vào bảng `auth.users` của Supabase, giúp áp dụng RLS chính xác

3. Database & File Storage (Lưu trữ)

- **Công nghệ**: Supabase (PaaS)
- **Vai trò**:
  - PostgreSQL: Lưu user, môn học, bài tập, kết quả, bài đăng...
  - Supabase Storage: Lưu giáo trình/tài liệu PDF, video... (tệp tĩnh)
- **Lý do chọn**: Một nguồn dữ liệu user duy nhất, RLS mạnh mẽ, không cần tự vận hành DB

4. AI Chatbot Backend (Bộ não AI)

- **Công nghệ**: Python (FastAPI) + RAG (LangChain/LlamaIndex tuỳ chọn)
- **Nền tảng Deploy**: Google Cloud Run (Docker)
- **Vai trò**: Máy chủ trung gian, bảo mật để xử lý chatbot/RAG
- **Luồng hoạt động**:
  - Frontend trên Vercel không gọi Gemini trực tiếp
  - Frontend gọi API của Cloud Run
  - Cloud Run thực hiện RAG (truy vấn tài liệu từ Supabase Storage/Vector DB), gọi Gemini bằng API Key an toàn, trả kết quả cho Frontend
- **Lý do chọn**: Bảo mật khoá API, phù hợp tác vụ AI nặng, tránh timeout serverless, autoscale về 0 (tối ưu chi phí)

---

### Cấu trúc thư mục (rút gọn)

```
├── src/                      # Frontend (Next.js)
│   ├── app/                  # App Router pages
│   └── components/           # UI components
└── server/                   # AI Backend (FastAPI)
    ├── app/
    │   ├── ai/               # Gemini client, RAG service
    │   ├── api/              # API endpoints
    │   ├── core/             # Config, DB/Redis/Mongo adapters (nếu dùng)
    │   └── main.py           # FastAPI app (SQL/Redis)
    │       main_mongodb.py   # FastAPI app (MongoDB)
    ├── requirements.txt
    ├── run.py                # Chạy uvicorn (mặc định app.main)
    └── run_server.sh         # Script bash tiện chạy (sql|mongo)
```

---

### Quick Start (local)

1. Frontend (Vercel local dev)

```bash
cd src
npm install
npm run dev
# Mở http://localhost:3000
```

2. AI Backend (FastAPI)

```bash
cd server
bash run_server.sh sql --reload
# hoặc MongoDB
bash run_server.sh mongo --reload
# Mở http://localhost:8000/docs
```

3. Biến môi trường quan trọng

- Next.js (Vercel): cấu hình NextAuth (providers, secret), Supabase URL/keys
- Server (Cloud Run/local): `GEMINI_API_KEY`, cấu hình RAG/DB/Storage

---

### Deploy

- **Frontend** (Next.js): Push lên Git → Vercel tự build/deploy
- **AI Backend** (FastAPI): Build Docker image và deploy Cloud Run
  - Lợi ích: giữ an toàn `GEMINI_API_KEY`, xử lý RAG nặng, autoscale

---

### Tài liệu API (AI Backend)

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Health: `http://localhost:8000/health`
