# AI Server - Gemini File Search

Simplified AI server using Gemini File Search API. No longer uses LangChain, pgvector, or Supabase for vector storage.

## Architecture

- **Platform**: Google Cloud Run (serverless)
- **AI**: Gemini 2.5 Flash/Pro with File Search tool
- **Storage**: Gemini File Search Store (managed by Google)
- **Cache**: Upstash Redis (optional)
- **Auth**: Supabase JWT (RS256/ES256 via JWKS)

## Setup

### 1. Create File Search Store

You need to create a File Search Store first. You can do this via:

**Option A: CLI helper (recommended)**

```bash
# Ensure GEMINI_API_KEY is exported
export GEMINI_API_KEY=your-api-key

# List existing stores
python scripts/manage_file_search_store.py list

# Create a new store
python scripts/manage_file_search_store.py create --display-name "LLCT Library"
```

The command outputs the store name in the format `fileSearchStores/<store-id>` which you can copy to `.env`.

**Option B: Google AI Studio**

1. Go to https://aistudio.google.com
2. Navigate to File Search section
3. Create a new File Search Store
4. Note the store name (format: `fileSearchStores/your-store-name`)

**Option C: REST API**

```bash
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/fileSearchStores?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"displayName": "my-demo-store"}'
```

### 2. Configure Environment Variables

Update `.env` file:

```env
# ai-server/.env
GEMINI_API_KEY=your-api-key-here
FILE_SEARCH_STORE_NAME=fileSearchStores/llctstore-bbmbdq42et7a  # using the actual store name
SUPABASE_JWKS_URL=https://your-project.supabase.co/auth/v1/.well-known/jwks.json
```

### 3. Upload Files

Use either the CLI helper or the upload endpoint to add files to your File Search Store:

```bash
# CLI helper (waits for operation completion)
python scripts/manage_file_search_store.py upload \
  --store fileSearchStores/your-store-id \
  --file ./docs/document.pdf \
  --display-name "My Document"

# API upload endpoint (requires JWT auth)
curl -X POST http://localhost:8001/api/v1/files/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@document.pdf" \
  -F "display_name=My Document"
```

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
  "message": "AI Server - Gemini File Search",
  "version": "2.0.0",
  "features": [
    "Gemini File Search integration",
    "Simplified architecture (no LangChain/pgvector)",
    "File upload to File Search Store",
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
  "gemini": "available",
  "file_search_store": "configured"
}
```

### 3. Chat Stream

- **POST** `/api/v1/chat/stream` or `/api/v1/chat`
- **Description**: Stream chat response using Gemini File Search
- **Auth**: Required (JWT Bearer token)
- **Request Body**:

```json
{
  "message": "Your question here",
  "type": "learning" // Optional: "learning", "debate", "qa"
}
```

- **Response**: Server-Sent Events (SSE) stream
- **Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/json`
- **Response Headers**:
  - `X-Cache: HIT` or `X-Cache: MISS`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`

### 4. Upload File

- **POST** `/api/v1/files/upload`
- **Description**: Upload file to Gemini File Search Store
- **Auth**: Required (JWT Bearer token)
- **Request**: Multipart form data
  - `file`: File to upload (PDF, DOCX, TXT, etc., max 100MB)
  - `display_name`: Optional display name
- **Response**:

```json
{
  "success": true,
  "message": "File uploaded successfully...",
  "file_name": "files/abc123",
  "operation_name": null
}
```

### 5. Get File Status

- **GET** `/api/v1/files/status/{file_name}`
- **Description**: Get status of uploaded file
- **Auth**: Required (JWT Bearer token)

## Flow

1. **Verify JWT token** - Extract user ID
2. **Check cache** (Upstash Redis) - If hit, return cached response
3. **If cache miss**:
   - Generate response using Gemini with File Search tool
   - Stream response chunks
   - Cache response while streaming
   - Stream response to client (SSE)

## Chatbot Types

- **learning** (default): Uses File Search to answer based on uploaded documents
- **qa**: Uses File Search for Q&A format
- **debate**: LLM-only, no File Search (for debate/argumentation)

## Testing

### Using Swagger UI

- Local: `http://localhost:8001/docs`
- Click "Authorize" button and enter JWT token

### Using curl

```bash
curl -X POST http://localhost:8001/api/v1/chat/stream \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"message": "Xin chào", "type": "learning"}'
```

## References

- [Gemini File Search Documentation](https://ai.google.dev/gemini-api/docs/file-search)
- [Google AI Studio](https://aistudio.google.com)
