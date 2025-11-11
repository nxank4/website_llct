# Hướng dẫn Migrate Supabase sang RS256/ES256 JWT Signing Keys

## Vấn đề hiện tại

Supabase project đang trả về **HS256 tokens** (Legacy JWT Secret) thay vì **RS256/ES256 tokens** (new JWT Signing Keys). Điều này khiến ai-server không thể verify tokens vì nó chỉ chấp nhận RS256/ES256 qua JWKS.

**Lưu ý quan trọng**: Theo [tài liệu Supabase về JWT](https://supabase.com/docs/guides/auth/jwts#introduction), nếu project vẫn có Legacy JWT Secret, Supabase sẽ tiếp tục sử dụng HS256 để ký tokens. Chỉ khi Legacy JWT Secret được revoke hoặc rotate keys, mới chuyển sang RS256/ES256.

**Trạng thái hiện tại**:

- ✅ JWKS endpoint đã trả về keys với algorithm ES256 (project đã có JWT Signing Keys mới)
- ❌ Tokens vẫn đang được ký bằng HS256 (Legacy JWT Secret vẫn đang được sử dụng)

## Giải pháp: Migrate sang RS256/ES256

### Bước 1: Kiểm tra trạng thái Migration

1. Vào **Supabase Dashboard** → **Project Settings** → **API**
2. Kéo xuống mục **JWT Settings**
3. Kiểm tra xem có thông báo "Legacy JWT secret has been migrated to new JWT Signing Keys" không

### Bước 2: Migrate JWT Secret (nếu chưa migrate)

1. Vào **Supabase Dashboard** → **Project Settings** → **API** → **JWT Settings**
2. Tìm mục **"Legacy JWT secret"**
3. Nhấn nút **"Migrate JWT secret"** (nếu có)
4. Điều này sẽ import JWT secret hiện tại vào hệ thống ký mới

### Bước 3: Rotate Keys để force RS256/ES256 tokens

**QUAN TRỌNG**: Nếu JWKS endpoint đã trả về keys (ES256/RS256) nhưng tokens vẫn là HS256, bạn cần **Rotate keys** để chuyển sang sử dụng JWT Signing Keys mới.

1. Vào **Supabase Dashboard** → **Project Settings** → **API** → **JWT Settings**
2. Tìm mục **"JWT Signing Keys"**
3. Kiểm tra xem có **"Current Key"** và **"Standby Key"** không
4. Nếu có **"Standby Key"** (RS256/ES256), nhấn nút **"Rotate keys"**
5. Điều này sẽ chuyển Standby Key thành Current Key và bắt đầu sử dụng RS256/ES256
6. **Sau khi rotate**, Supabase sẽ bắt đầu ký tokens mới bằng RS256/ES256 thay vì HS256

### Bước 4: Xác nhận Migration

Sau khi rotate keys:

1. **Đăng nhập lại** trong ứng dụng
2. Kiểm tra console logs để xem token algorithm:
   ```
   Got Supabase access token from signInWithPassword: {
     algorithm: "RS256" hoặc "ES256",  // ✅ Phải là RS256 hoặc ES256
     isRS256: true,
     isHS256: false
   }
   ```
3. Nếu token vẫn là HS256, có thể cần:
   - Đợi một vài phút để Supabase cập nhật
   - Clear browser cache và đăng nhập lại
   - Kiểm tra xem có cần revoke Legacy JWT Secret không

### Bước 5: Xóa Legacy JWT Secret (sau khi xác nhận)

Sau khi xác nhận mọi thứ hoạt động với RS256 tokens:

1. Vào **Supabase Dashboard** → **Project Settings** → **API** → **JWT Settings**
2. Tìm mục **"Legacy JWT secret"**
3. Nhấn nút **"Revoke"** để xóa Legacy JWT Secret
4. **Lưu ý**: Đảm bảo tất cả tokens cũ đã hết hạn trước khi revoke

### Bước 6: Xóa SUPABASE_JWT_SECRET khỏi code

Sau khi xác nhận migration thành công:

1. Xóa `SUPABASE_JWT_SECRET` khỏi `ai-server/.env`
2. Xóa code hỗ trợ HS256 trong `ai-server/app/middleware/auth.py`
3. Xóa `SUPABASE_JWT_SECRET` khỏi `ai-server/app/core/config.py`

## Lưu ý quan trọng

- **Rotate keys** có thể ảnh hưởng đến ứng dụng nếu bạn đang verify JWT bằng Legacy JWT Secret
- Đảm bảo tất cả tokens cũ đã hết hạn trước khi revoke Legacy JWT Secret
- Sau khi rotate, tokens mới sẽ là RS256/ES256 và có thể được verify qua JWKS

## Kiểm tra Migration thành công

Sau khi migrate, kiểm tra:

1. Token algorithm phải là **RS256** hoặc **ES256** (không phải HS256)
2. Token có **kid** (Key ID) trong header
3. Token có thể được verify qua **JWKS URL**
4. AI server không còn reject tokens

## Tài liệu tham khảo

- [Supabase JWT Documentation](https://supabase.com/docs/guides/auth/jwts#introduction) - Giải thích về HS256 vs RS256/ES256
- [Supabase JWT Signing Keys Documentation](https://supabase.com/docs/guides/auth/signing-keys)
- [Supabase Dashboard - JWT Settings](https://supabase.com/dashboard/project/_/settings/api)

## Giải thích kỹ thuật

Theo [tài liệu Supabase về JWT](https://supabase.com/docs/guides/auth/jwts#introduction):

1. **Legacy JWT Secret (HS256)**: Nếu project vẫn có Legacy JWT Secret, Supabase sẽ tiếp tục sử dụng HS256 để ký tokens. Tokens này được verify bằng shared secret.

2. **JWT Signing Keys mới (RS256/ES256)**: Nếu project đã migrate sang JWT Signing Keys mới, Supabase sẽ sử dụng asymmetric keys (RSA hoặc EC) để ký tokens. Tokens này được verify qua JWKS endpoint.

3. **JWKS Endpoint**: Endpoint `/.well-known/jwks.json` chỉ trả về keys nếu project đang sử dụng asymmetric JWT signing keys. Nếu project vẫn dùng Legacy JWT Secret, endpoint này sẽ trả về empty array.

**Trạng thái hiện tại của project**:

- ✅ JWKS endpoint trả về keys với algorithm ES256 → Project đã có JWT Signing Keys mới
- ❌ Tokens vẫn là HS256 → Legacy JWT Secret vẫn đang được sử dụng để ký tokens
- 🔧 **Giải pháp**: Rotate keys để chuyển sang sử dụng JWT Signing Keys mới (ES256)
