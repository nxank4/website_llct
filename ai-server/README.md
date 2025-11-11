# AI Server API Endpoints

## Base URL
- Local: `http://localhost:8001` (port 8001, backend server uses port 8000)
- Production: `https://your-cloud-run-url`

## Endpoints

### 1. Root Endpoint
- **GET** `/`
- **Description**: Server information
- **Auth**: None
- **Response**:
```json
{
  "message": "AI Server - RAG & Gemini",
  "version": "1.0.0",
  "features": [
    "RAG (Retrieval-Augmented Generation)",
    "Gemini AI integration",
    "Vector search and embeddings",
    "Serverless optimized (Cloud Run)"
  ]
}
```

### 2. Health Check
- **GET** `/health`
- **Description**: Health check endpoint
- **Auth**: None
- **Response**:
```json
{
  "status": "healthy",
  "service": "ai-server",
  "database": "connected",
  "gemini": "available"
}
```

### 3. Chat Stream (RAG)
- **POST** `/api/v1/chat/stream`
- **Description**: Stream RAG chat response with caching
- **Auth**: Required (JWT Bearer token)
- **Request Body**:
```json
{
  "message": "Your question here",
  "subject_id": null
}
```
- **Response**: Streaming text/plain
- **Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/json`
- **Response Headers**:
  - `X-Cache: HIT` or `X-Cache: MISS`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`

## Flow

1. **Verify JWT token** - Extract user ID
2. **Check cache** (Upstash Redis) - If hit, return cached response
3. **If cache miss**:
   - Perform RAG query using LangChain (pgvector via Supabase)
   - Stream response from Gemini via LangChain
   - Cache response while streaming
   - Stream response to client (SSE)

## Testing

### Using Swagger UI
- Local: `http://localhost:8001/docs`
- Click "Authorize" button and enter JWT token

### Using curl
```bash
curl -X POST http://localhost:8001/api/v1/chat/stream \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"message": "Xin chào"}'
```

### Using test script
```bash
python test_api.py --jwt-token YOUR_JWT_TOKEN
```

