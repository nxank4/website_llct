# Hướng dẫn Test API Register

## Vấn đề
API register không hoàn thành call và không log output gì.

## Cách test

### 1. Test Database Connection (Trực tiếp)
Test kết nối database và các thao tác cơ bản:

```bash
cd server
python test_db_connection.py
```

Script này sẽ:
- Test engine connection
- Test session creation
- Test password hashing
- Test full registration flow (tạo user, commit, refresh)
- Hiển thị thời gian cho từng bước

### 2. Test API Register (HTTP Request)
Test API register endpoint qua HTTP:

```bash
cd server
python test_register.py
```

**Yêu cầu:**
- Server phải đang chạy trên `http://localhost:8000`
- Cài đặt `requests`: `pip install requests` hoặc `uv pip install requests`

Script này sẽ:
- Kiểm tra server có đang chạy không
- Gửi POST request đến `/api/v1/auth/register`
- Hiển thị thời gian và response chi tiết
- Timeout sau 30 giây nếu không có response

### 3. Xem Logs trong Server
Khi chạy server, bạn sẽ thấy logs chi tiết cho mỗi bước:

```bash
cd server
bash run_server.sh --reload
```

Hoặc:

```bash
cd server
uv run uvicorn app.main:app --reload
```

Logs sẽ hiển thị:
- `[X.XXXs] Request started`
- `[X.XXXs] Starting email check query`
- `[X.XXXs] Email check query completed in X.XXXs`
- `[X.XXXs] Starting username check query`
- `[X.XXXs] Username check query completed in X.XXXs`
- `[X.XXXs] Starting password hash`
- `[X.XXXs] Password hashed successfully in X.XXXs`
- `[X.XXXs] Starting database commit`
- `[X.XXXs] Database commit completed in X.XXXs`
- `[X.XXXs] Total registration time`

## Phân tích kết quả

### Nếu `test_db_connection.py` chậm hoặc lỗi:
- **Vấn đề**: Database connection hoặc query chậm
- **Giải pháp**: 
  - Kiểm tra database connection string
  - Kiểm tra network latency
  - Kiểm tra database có đang chạy không

### Nếu `test_register.py` timeout:
- **Vấn đề**: Server không phản hồi hoặc xử lý quá lâu
- **Giải pháp**:
  - Kiểm tra server logs để xem bước nào chậm
  - Kiểm tra database connection
  - Kiểm tra password hashing có quá chậm không

### Nếu không có logs:
- **Vấn đề**: Request không đến server hoặc logging không hoạt động
- **Giải pháp**:
  - Kiểm tra LOG_LEVEL trong `.env` (nên là `INFO` hoặc `DEBUG`)
  - Kiểm tra server có nhận được request không
  - Kiểm tra CORS settings

## Các bước debug

1. **Chạy `test_db_connection.py`** để xác định vấn đề có phải ở database không
2. **Chạy `test_register.py`** để xác định vấn đề có phải ở API endpoint không
3. **Xem server logs** để xác định bước nào chậm
4. **Kiểm tra database connection** nếu các query chậm
5. **Kiểm tra password hashing** nếu bước hash chậm

## Lưu ý

- Đảm bảo database đang chạy và có thể kết nối
- Đảm bảo `.env` file có cấu hình đúng
- Đảm bảo LOG_LEVEL là `INFO` hoặc `DEBUG` để thấy logs
- Nếu dùng SQLite, đảm bảo file database có quyền ghi

