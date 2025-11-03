# E-Learning Platform Backend

Backend API nâng cao cho nền tảng học trực tuyến với AI, được xây dựng với FastAPI, Supabase PostgreSQL, Redis, và Gemini AI.

## 🚀 Tính năng chính

- **AI-Powered Chat**: Chat thông minh với RAG (Retrieval-Augmented Generation)
- **Vector Search**: Tìm kiếm nội dung bằng embeddings
- **Debate Rooms**: Phòng tranh luận real-time với AI
- **Socratic Bot**: Bot hỏi đáp theo phương pháp Socrates
- **Auto Quiz Generation**: Tự động tạo câu hỏi từ tài liệu
- **RBAC**: Phân quyền theo vai trò (Admin/GV/SV) và tổ chức theo domain/class
- **Real-time Features**: SSE cho chat, WebSocket cho debate rooms
- **Rate Limiting**: Giới hạn tần suất request và AI calls
- **Background Workers**: Xử lý file upload, OCR, embedding

## 🏗️ Kiến trúc

### 4.1. API Gateway / BFF
- **FastAPI**: Một cổng vào duy nhất cho web & mobile
- **Modules**: Auth & RBAC, Content, Quiz/Assessment, Chat AI, Metrics
- **Middleware**: Rate limiting, Authentication, CORS, Logging

### 4.2. Data & Storage
- **PostgreSQL (Supabase)**: OLTP với extensions (pgvector, unaccent, pg_trgm)
- **RLS**: Row-Level Security theo domain_id/class_id và role
- **Vector Search**: pgvector cho embeddings và similarity search
- **Object Storage**: Supabase Storage cho files với CDN

### 4.3. AI Layer
- **LLM Provider**: Gemini 2.0 Flash (chat) + Pro (complex tasks)
- **RAG**: Vector search + context injection
- **Guardrails**: Content filtering, safety settings, rate limiting
- **Streaming**: SSE cho real-time responses

### 4.4. Cache & Queue
- **Redis**: Caching, rate limiting, session management
- **Background Workers**: RQ/Celery cho file processing, OCR, embedding

## 📦 Cài đặt

### 1. Prerequisites
```bash
# Python 3.8+
python --version

# PostgreSQL (hoặc sử dụng Supabase)
# Redis
# Node.js (cho frontend)
```

### 2. Setup Backend
```bash
# Clone và navigate
cd backend

# Virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# hoặc venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Environment configuration
cp env.example .env
# Chỉnh sửa .env với thông tin thực tế
```

### 3. Database Setup
```bash
# Tạo database PostgreSQL
createdb elearning

# Hoặc sử dụng Supabase:
# 1. Tạo project tại https://supabase.com
# 2. Enable extensions: vector, unaccent, pg_trgm
# 3. Cập nhật DATABASE_URL trong .env
```

### 4. Redis Setup
```bash
# Local Redis
redis-server

# Hoặc sử dụng Redis Cloud/Upstash
# Cập nhật REDIS_URL trong .env
```

## 🚀 Chạy ứng dụng

### Development
```bash
# API Server
python run.py

# Background Workers (terminal khác)
python run_worker.py

# Hoặc sử dụng uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Production
```bash
# Sử dụng gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# Workers
celery -A app.workers.celery_app worker --loglevel=info
```

## 📚 API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health
- **Metrics**: http://localhost:8000/metrics

## 🗂️ Cấu trúc dự án

```
backend/
├── app/
│   ├── api/api_v1/endpoints/     # API endpoints
│   │   ├── auth.py              # Authentication
│   │   ├── users.py             # User management
│   │   ├── courses.py           # Course management
│   │   └── chat.py              # AI Chat & Debate
│   ├── core/                    # Core functionality
│   │   ├── config.py            # Configuration
│   │   ├── database.py          # Database setup
│   │   └── security.py          # Security utilities
│   ├── models/                  # Database models
│   │   ├── user.py              # User model
│   │   ├── organization.py      # Domain/Class/Role models
│   │   ├── content.py           # Material/Project models
│   │   ├── assessment.py        # Quiz/Assessment models
│   │   └── chat.py              # Chat/Debate models
│   ├── schemas/                 # Pydantic schemas
│   ├── services/                # Business logic
│   │   └── redis_service.py     # Redis operations
│   ├── ai/                      # AI services
│   │   ├── gemini_client.py     # Gemini AI client
│   │   └── rag_service.py       # RAG implementation
│   ├── middleware/              # Middleware
│   │   ├── auth.py              # Authentication
│   │   └── rate_limiter.py      # Rate limiting
│   ├── workers/                 # Background workers
│   │   └── indexing_worker.py   # File processing
│   └── main.py                  # FastAPI app
├── requirements.txt             # Dependencies
├── env.example                  # Environment template
├── run.py                       # Server runner
└── run_worker.py               # Worker runner
```

## 🔌 API Endpoints

### Authentication & Users
- `POST /api/v1/auth/register` - Đăng ký
- `POST /api/v1/auth/login` - Đăng nhập
- `GET /api/v1/users/` - Danh sách users
- `GET /api/v1/users/{id}` - Chi tiết user

### Content Management
- `GET /api/v1/courses/` - Danh sách khóa học
- `POST /api/v1/courses/` - Tạo khóa học
- `GET /api/v1/materials/` - Tài liệu
- `POST /api/v1/materials/` - Upload tài liệu

### AI & Chat
- `POST /api/v1/chat/sessions` - Tạo chat session
- `POST /api/v1/chat/sessions/{id}/messages` - Gửi tin nhắn
- `POST /api/v1/chat/sessions/{id}/stream` - Stream response
- `GET /api/v1/chat/sessions/{id}/messages` - Lịch sử chat

### Assessment
- `GET /api/v1/assessments/` - Danh sách bài kiểm tra
- `POST /api/v1/assessments/` - Tạo bài kiểm tra
- `POST /api/v1/assessments/{id}/generate` - Tự động tạo câu hỏi

## ⚙️ Configuration

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/elearning

# AI
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL_CHAT=gemini-2.0-flash-exp

# Redis
REDIS_URL=redis://localhost:6379/0

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Rate Limiting
RATE_LIMIT_REQUESTS=100
CHAT_RATE_LIMIT=50
AI_RATE_LIMIT=20
```

### Feature Flags
```bash
ENABLE_AI_CHAT=true
ENABLE_DEBATE_ROOM=true
ENABLE_SOCRATIC_BOT=true
ENABLE_AUTO_QUIZ_GENERATION=true
```

## 🔒 Security

- **JWT Authentication**: Access + Refresh tokens
- **RBAC**: Role-based access control (Admin/GV/SV)
- **Rate Limiting**: Per-user và per-endpoint
- **Content Filtering**: AI safety settings
- **Input Validation**: Pydantic schemas
- **CORS**: Configurable origins

## 📊 Monitoring

- **Health Checks**: `/health` endpoint
- **Metrics**: `/metrics` endpoint
- **Logging**: Structured JSON logs
- **Error Tracking**: Sentry integration
- **Performance**: Request timing middleware

## 🚀 Deployment

### Docker
```bash
# Build image
docker build -t elearning-backend .

# Run container
docker run -p 8000:8000 --env-file .env elearning-backend
```

### Production Checklist
- [ ] Set strong SECRET_KEY
- [ ] Configure production database
- [ ] Setup Redis cluster
- [ ] Configure CDN for file storage
- [ ] Setup monitoring (Sentry, Prometheus)
- [ ] Configure SSL/TLS
- [ ] Setup backup strategy
- [ ] Configure log aggregation

## 🤝 Development

### Code Style
```bash
# Format code
black app/
isort app/

# Lint
flake8 app/
```

### Testing
```bash
# Run tests
pytest

# Coverage
pytest --cov=app
```

## 📈 Performance

- **Connection Pooling**: SQLAlchemy pool
- **Caching**: Redis với TTL
- **Rate Limiting**: Sliding window
- **Background Processing**: Async workers
- **Vector Search**: Optimized pgvector indexes
