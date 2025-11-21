<!-- 2d37a789-2641-4cc7-91db-87682f21be83 9842ce45-25e5-4936-966f-894d2609bbfb -->
# Unify Dark Mode Across Components

## 1. Chuẩn hóa nền tảng theming

- Xác nhận `components.json` bật `tailwind.cssVariables = true` và kiểm tra `globals.css` đã khai báo đầy đủ biến `--background`, `--foreground`, `--card`, `--border`, v.v.
- Đảm bảo `ThemeProvider` gắn `light`/`dark` trên `document.documentElement` (đã có).

## 2. Audit & phân nhóm component

- Dò toàn codebase (client) để tìm những chỗ hard-code màu (`bg-white`, `text-gray-900`, `border-gray-200`, …) mà chưa có `dark:`.
- Phân nhóm: (a) layout/core (body, sections, cards), (b) form controls, (c) content blocks (cards, modals), (d) bất cứ component custom quan trọng.

## 3. Refactor sang biến màu chuẩn

- Với mỗi nhóm, thay thế class màu bằng biến chuẩn: `bg-background`, `text-foreground`, `bg-card`, `text-card-foreground`, `border-border`, `bg-muted`,… đúng như guide shadcn.
- Nếu cần màu nhấn, dùng `bg-primary`, `text-primary-foreground`, `bg-secondary`, thay vì mã màu cụ thể.
- Component thuần CSS: đổi sang `var(--background)` / `var(--foreground)` tương ứng.

## 4. Giữ utility dark: cho trường hợp đặc biệt

- Những nơi buộc phải có gradient hay màu bespoke có thể giữ `dark:` nhưng đảm bảo fallback hợp lý và (nếu được) dùng custom CSS variable riêng.

## 5. Kiểm tra & QA

- Test manual: chuyển light/dark trong settings, duyệt qua các trang chính (dashboard, news, profile, chatbot…) để đảm bảo toàn bộ đổi màu đúng.
- Nếu cần, viết danh sách component đã xử lý và liệt kê chỗ còn lại (nếu quá nhỏ) để team follow-up.

## Files/Areas likely touched

- `client/app/globals.css`, `components.json` (chỉ xác nhận, không nhất thiết sửa nếu đã đúng)
- Nhiều component custom trong `client/src/components` và các page.
- Tài liệu/cmt hướng dẫn dev khác dùng biến màu khi code mới.

### To-dos

- [ ] Xác nhận cấu hình theming (components.json, globals.css)
- [ ] Dò component/page chưa dùng biến màu
- [ ] Thay class màu bằng biến CSS chuẩn
- [ ] Xử lý gradient/màu custom với dark mode
- [ ] Test chuyển dark/light trên các page chính