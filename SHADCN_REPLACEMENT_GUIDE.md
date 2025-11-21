# Hướng dẫn thay thế Components bằng Shadcn UI

## Tổng quan

Tài liệu này liệt kê các components hiện tại trong codebase và các components tương ứng từ shadcn/ui có thể thay thế chúng.

## Components đã có sẵn từ Shadcn UI

✅ Các components này đã được cài đặt và đang sử dụng:

- `Button` - Đã có (`@/components/ui/Button.tsx`)
- `Input` - Đã có (`@/components/ui/input.tsx`)
- `Textarea` - Đã có (`@/components/ui/textarea.tsx`)
- `Select` - Đã có (`@/components/ui/select.tsx`)
- `Card` - Đã có (`@/components/ui/card.tsx`)
- `Dialog` - Đã có (`@/components/ui/dialog.tsx`)
- `Field` - Đã có (`@/components/ui/field.tsx`)
- `Skeleton` - Đã có (`@/components/ui/skeleton.tsx`)
- `Checkbox` - Đã có (`@/components/ui/checkbox.tsx`)
- `Switch` - Đã có (`@/components/ui/switch.tsx`)
- `Badge` - Đã có (`@/components/ui/badge.tsx`)
- `Avatar` - Đã có (`@/components/ui/avatar.tsx`)
- `Separator` - Đã có (`@/components/ui/separator.tsx`)
- `Tooltip` - Đã có (`@/components/ui/tooltip.tsx`)
- `Sonner` (Toast) - Đã có (`@/components/ui/sonner.tsx`)

## Components cần thay thế

### 1. **Spinner** → **Spinner (shadcn/ui)**

**File hiện tại:** `client/src/components/ui/Spinner.tsx`
**Thay thế bằng:** `@/components/ui/spinner` từ shadcn/ui

**Lý do:**

- Component hiện tại là custom với Loader2 icon
- Shadcn/ui có Spinner component chuẩn hóa

**Cách thay thế:**

```bash
pnpm dlx shadcn@latest add spinner
```

**Sử dụng:**

```tsx
// Cũ
import Spinner from "@/components/ui/Spinner";
<Spinner size="sm" inline />;

// Mới
import { Spinner } from "@/components/ui/spinner";
<Spinner />;
```

---

### 2. **AlertDialog (Custom)** → **Alert Dialog (shadcn/ui)**

**File hiện tại:** `client/src/components/ui/AlertDialog.tsx`
**Thay thế bằng:** `@/components/ui/alert-dialog` từ shadcn/ui

**Lý do:**

- Component hiện tại là wrapper custom của Dialog
- Shadcn/ui có Alert Dialog component chuyên dụng với API tốt hơn

**Cách thay thế:**

```bash
pnpm dlx shadcn@latest add alert-dialog
```

**Sử dụng:**

```tsx
// Cũ
import AlertDialog from "@/components/ui/AlertDialog";
<AlertDialog isOpen={open} onClose={close} message="..." />;

// Mới
import * as AlertDialog from "@/components/ui/alert-dialog";
<AlertDialog.Root open={open} onOpenChange={setOpen}>
  <AlertDialog.Trigger>Mở</AlertDialog.Trigger>
  <AlertDialog.Content>
    <AlertDialog.Title>Tiêu đề</AlertDialog.Title>
    <AlertDialog.Description>Mô tả</AlertDialog.Description>
    <AlertDialog.Action>Xác nhận</AlertDialog.Action>
    <AlertDialog.Cancel>Hủy</AlertDialog.Cancel>
  </AlertDialog.Content>
</AlertDialog.Root>;
```

**Lưu ý:** Hiện tại code đang dùng `@radix-ui/react-alert-dialog` trực tiếp, có thể giữ nguyên hoặc chuyển sang shadcn wrapper.

---

### 3. **Modal** → **Dialog hoặc Sheet (shadcn/ui)**

**File hiện tại:** `client/src/components/ui/Modal.tsx`
**Thay thế bằng:**

- `@/components/ui/dialog` - Cho modal fullscreen hoặc centered
- `@/components/ui/sheet` - Cho slide-in panels từ các cạnh

**Cách thay thế:**

```bash
# Đã có dialog, chỉ cần thêm sheet nếu cần
pnpm dlx shadcn@latest add sheet
```

---

### 4. **DataTable** → **Data Table (shadcn/ui)**

**File hiện tại:** `client/src/components/ui/DataTable.tsx`
**Thay thế bằng:** `@/components/ui/data-table` từ shadcn/ui

**Cách thay thế:**

```bash
pnpm dlx shadcn@latest add data-table
```

**Lưu ý:** Data Table của shadcn/ui sử dụng TanStack Table, cần kiểm tra compatibility.

---

### 5. **LoadingSkeleton** → **Skeleton (shadcn/ui)**

**File hiện tại:** `client/src/components/ui/LoadingSkeleton.tsx`
**Trạng thái:** ✅ Đã được cập nhật để sử dụng Skeleton từ shadcn/ui

**Lưu ý:** Component này có thể được loại bỏ hoàn toàn và thay thế trực tiếp bằng Skeleton.

---

### 6. **SearchBar** → **Command (shadcn/ui)**

**File hiện tại:** `client/src/components/ui/SearchBar.tsx`
**Thay thế bằng:** `@/components/ui/command` từ shadcn/ui

**Cách thay thế:**

```bash
pnpm dlx shadcn@latest add command
```

**Sử dụng:**

```tsx
// Cũ
import SearchBar from "@/components/ui/SearchBar";
<SearchBar onSearch={handleSearch} />;

// Mới
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
} from "@/components/ui/command";
<Command>
  <CommandInput placeholder="Tìm kiếm..." />
  <CommandList>
    <CommandItem>Kết quả 1</CommandItem>
  </CommandList>
</Command>;
```

---

### 7. **InputGroup** → **Input Group (shadcn/ui)**

**File hiện tại:** `client/src/components/ui/input-group.tsx`
**Thay thế bằng:** `@/components/ui/input-group` từ shadcn/ui

**Cách thay thế:**

```bash
pnpm dlx shadcn@latest add input-group
```

---

### 8. **TiptapEditor** → **Giữ nguyên hoặc tích hợp với Field**

**File hiện tại:** `client/src/components/ui/TiptapEditor.tsx`
**Khuyến nghị:** Giữ nguyên vì đây là component chuyên dụng cho rich text editing, không có trong shadcn/ui.

**Có thể cải thiện:** Wrap trong Field component để nhất quán:

```tsx
<Field>
  <FieldLabel>Nội dung</FieldLabel>
  <TiptapEditor onChange={handleChange} />
</Field>
```

---

### 9. **MarkdownRenderer** → **Giữ nguyên**

**File hiện tại:** `client/src/components/ui/MarkdownRenderer.tsx`
**Khuyến nghị:** Giữ nguyên vì đây là component chuyên dụng, không có trong shadcn/ui.

---

### 10. **ErrorBoundary** → **Giữ nguyên**

**File hiện tại:** `client/src/components/ui/ErrorBoundary.tsx`
**Khuyến nghị:** Giữ nguyên vì đây là React Error Boundary, không có trong shadcn/ui.

---

## Components bổ sung từ Shadcn UI nên cài đặt

### 1. **Tabs** - Cho navigation tabs ⭐ **ƯU TIÊN CAO**

**Files cần thay thế:**

- `client/src/components/auth/AuthPage.tsx` - Tab login/register (dòng 284-308)

**Cách cài đặt:**

```bash
pnpm dlx shadcn@latest add tabs
```

**Sử dụng:**

```tsx
// Cũ - AuthPage.tsx
<div className="flex w-full bg-muted rounded-[80px] p-2">
  <button onClick={() => setActiveTab("login")}>Đăng nhập</button>
  <button onClick={() => setActiveTab("register")}>Đăng ký</button>
</div>;

// Mới
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList className="w-full bg-muted rounded-[80px] p-2">
    <TabsTrigger value="login" className="flex-1">
      Đăng nhập
    </TabsTrigger>
    <TabsTrigger value="register" className="flex-1">
      Đăng ký
    </TabsTrigger>
  </TabsList>
  <TabsContent value="login">...</TabsContent>
  <TabsContent value="register">...</TabsContent>
</Tabs>;
```

---

### 2. **Dropdown Menu** - Cho context menus ⭐ **ƯU TIÊN CAO**

**Files cần thay thế:**

- `client/src/components/user/UserMenu.tsx` - Custom dropdown menu (dòng 197-358)
- `client/src/app/chatbot/page.tsx` - Model selection menu (dòng 1294-1330)

**Cách cài đặt:**

```bash
pnpm dlx shadcn@latest add dropdown-menu
```

**Sử dụng:**

```tsx
// Cũ - UserMenu.tsx
{isOpen && (
  <div className="absolute right-2 mt-2 w-72 bg-card rounded-xl shadow-xl border border-border">
    <button onClick={...}>Thông tin cá nhân</button>
    ...
  </div>
)}

// Mới
import * as DropdownMenu from "@/components/ui/dropdown-menu";
<DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
  <DropdownMenu.Trigger asChild>
    <button>User Menu</button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end" className="w-72">
    <DropdownMenu.Item onClick={...}>
      <User className="h-4 w-4" />
      <span>Thông tin cá nhân</span>
    </DropdownMenu.Item>
    ...
  </DropdownMenu.Content>
</DropdownMenu.Root>
```

**Lợi ích:**

- Tự động xử lý click outside
- Keyboard navigation
- Accessibility tốt hơn
- Animation mượt mà

---

### 3. **Table** - Cho tables đơn giản ⭐ **ƯU TIÊN CAO**

**Files cần thay thế:**

- `client/src/app/admin/products/page.tsx` - HTML table thuần (dòng 494-602)
- `client/src/app/admin/members/page.tsx` - Có thể có table
- `client/src/components/ui/DataTable.tsx` - Có thể refactor để dùng Table base

**Cách cài đặt:**

```bash
pnpm dlx shadcn@latest add table
```

**Sử dụng:**

```tsx
// Cũ - admin/products/page.tsx
<table className="min-w-full divide-y divide-border">
  <thead className="bg-muted/70">
    <tr>
      <th className="px-6 py-3">Sản phẩm</th>
      ...
    </tr>
  </thead>
  <tbody>...</tbody>
</table>;

// Mới
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Sản phẩm</TableHead>
      ...
    </TableRow>
  </TableHeader>
  <TableBody>
    {products.map((product) => (
      <TableRow key={product.id}>
        <TableCell>{product.title}</TableCell>
        ...
      </TableRow>
    ))}
  </TableBody>
</Table>;
```

**Lợi ích:**

- Styling nhất quán
- Dark mode tự động
- Responsive tốt hơn

---

### 4. **Radio Group** - Cho radio buttons ⭐ **ƯU TIÊN CAO**

**Files cần thay thế:**

- `client/src/app/exercises/[id]/attempt/page.tsx` - Radio buttons cho câu trả lời (dòng 710-723)
- `client/src/app/instructor/exercises/create/page.tsx` - Radio buttons cho đáp án đúng (dòng 490-503)
- `client/src/app/admin/tests/QuestionForm.tsx` - Có thể có radio buttons
- `client/src/app/admin/notifications/page.tsx` - Radio buttons cho người nhận

**Cách cài đặt:**

```bash
pnpm dlx shadcn@latest add radio-group
```

**Sử dụng:**

```tsx
// Cũ - exercises/[id]/attempt/page.tsx
<label>
  <input type="radio" name="question-1" value="option1" />
  <span>Option 1</span>
</label>;

// Mới
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
<RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
  {options.map((option, index) => (
    <div key={index} className="flex items-center space-x-2">
      <RadioGroupItem value={option} id={`option-${index}`} />
      <Label htmlFor={`option-${index}`}>{option}</Label>
    </div>
  ))}
</RadioGroup>;
```

**Lợi ích:**

- Accessibility tốt hơn
- Styling nhất quán
- Dễ quản lý state

---

### 5. **Progress** - Cho progress bars ⭐ **ƯU TIÊN CAO**

**Files cần thay thế:**

- `client/src/components/stats/StudentProgress.tsx` - Progress bars custom (dòng 316-335)
- Các progress bars khác trong codebase

**Cách cài đặt:**

```bash
pnpm dlx shadcn@latest add progress
```

**Sử dụng:**

```tsx
// Cũ - StudentProgress.tsx
<div className="w-full bg-muted rounded-full h-2">
  <div
    className="h-2 rounded-full bg-[hsl(var(--success))]"
    style={{ width: `${percentage}%` }}
  />
</div>;

// Mới
import { Progress } from "@/components/ui/progress";
<Progress value={percentage} className="h-2" />;
```

**Lợi ích:**

- Component đơn giản hơn
- Animation mượt mà
- Styling nhất quán

---

### 6. **Pagination** - Cho phân trang

**Files cần thay thế:**

- `client/src/app/library/[id]/page.tsx` - Custom pagination (dòng 183)
- `client/src/app/exercises/page.tsx` - Custom pagination (dòng 334, 415)
- `client/src/components/ui/DataTable.tsx` - Custom pagination (dòng 265-317)

**Cách cài đặt:**

```bash
pnpm dlx shadcn@latest add pagination
```

**Sử dụng:**

```tsx
// Cũ
<div className="flex items-center justify-between">
  <button onClick={() => setPage(page - 1)} disabled={page === 1}>
    Previous
  </button>
  <span>Page {page} of {totalPages}</span>
  <button onClick={() => setPage(page + 1)} disabled={page === totalPages}>
    Next
  </button>
</div>

// Mới
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
<Pagination>
  <PaginationContent>
    <PaginationItem>
      <PaginationPrevious href="#" onClick={...} />
    </PaginationItem>
    {[...Array(totalPages)].map((_, i) => (
      <PaginationItem key={i}>
        <PaginationLink href="#" onClick={() => setPage(i + 1)}>
          {i + 1}
        </PaginationLink>
      </PaginationItem>
    ))}
    <PaginationItem>
      <PaginationNext href="#" onClick={...} />
    </PaginationItem>
  </PaginationContent>
</Pagination>
```

---

### 7. **Popover** - Cho popover content

**Cách cài đặt:**

```bash
pnpm dlx shadcn@latest add popover
```

**Sử dụng:** Thay thế các tooltip/popover hiện tại

---

### 8. **Breadcrumb** - Cho breadcrumb navigation

**Cách cài đặt:**

```bash
pnpm dlx shadcn@latest add breadcrumb
```

**Sử dụng:** Thêm breadcrumb navigation cho các trang con

---

### 9. **Calendar** - Cho date picker

**Cách cài đặt:**

```bash
pnpm dlx shadcn@latest add calendar
```

**Sử dụng:** Thêm date picker cho forms (nếu cần chọn ngày)

---

### 10. **Date Picker** - Cho date selection

**Cách cài đặt:**

```bash
pnpm dlx shadcn@latest add date-picker
```

**Sử dụng:** Thêm date picker component hoàn chỉnh

---

## Ưu tiên thay thế (CẬP NHẬT MỚI)

### Priority 1 (Quan trọng nhất - Cải thiện UX ngay lập tức)

1. ✅ **Skeleton** - Đã hoàn thành
2. **Tabs** - Thay thế tab navigation trong AuthPage (1 file, ảnh hưởng lớn)
3. **Dropdown Menu** - Thay thế custom dropdown trong UserMenu và chatbot (2 files, UX quan trọng)
4. **Table** - Thay thế HTML tables thuần trong admin/products và các trang admin (nhiều files)
5. **Radio Group** - Thay thế radio buttons trong exercises và forms (4+ files, accessibility)

### Priority 2 (Cải thiện UX và code quality)

1. **Progress** - Thay thế progress bars custom trong StudentProgress (1 file)
2. **Spinner** - Thay thế custom Spinner (nhiều files sử dụng)
3. **Alert Dialog** - Chuẩn hóa alert dialogs (đã dùng Radix, có thể giữ nguyên)
4. **Pagination** - Thay thế custom pagination (3 files)

### Priority 3 (Bổ sung tính năng)

1. **Command** - Thay thế SearchBar (nếu cần tính năng search nâng cao)
2. **Data Table** - Nếu cần tính năng nâng cao với TanStack Table
3. **Calendar/Date Picker** - Thêm date selection (nếu cần)
4. **Breadcrumb** - Thêm breadcrumb navigation (nếu cần)
5. **Popover** - Thay thế tooltip/popover hiện tại (nếu cần)

---

## Phát hiện mới từ phân tích codebase

### Các patterns cần thay thế ngay

1. **Tab Pattern trong AuthPage** (dòng 284-308)

   - Hiện tại: Custom buttons với state management
   - Nên thay: Tabs component từ shadcn/ui
   - Lợi ích: Accessibility tốt hơn, keyboard navigation

2. **Custom Dropdown trong UserMenu** (dòng 197-358)

   - Hiện tại: Manual state management với click outside detection
   - Nên thay: Dropdown Menu component
   - Lợi ích: Tự động xử lý click outside, keyboard navigation, animation

3. **HTML Tables thuần** trong admin pages

   - Files: `admin/products/page.tsx`, `admin/members/page.tsx`, và nhiều trang khác
   - Nên thay: Table component từ shadcn/ui
   - Lợi ích: Styling nhất quán, dark mode tự động

4. **Radio Buttons thuần** trong exercises và forms

   - Files: `exercises/[id]/attempt/page.tsx`, `instructor/exercises/create/page.tsx`
   - Nên thay: Radio Group component
   - Lợi ích: Accessibility, styling nhất quán

5. **Progress Bars custom** trong StudentProgress

   - File: `components/stats/StudentProgress.tsx` (dòng 316-335)
   - Nên thay: Progress component
   - Lợi ích: Code đơn giản hơn, animation mượt mà

6. **Custom Pagination** trong nhiều pages
   - Files: `library/[id]/page.tsx`, `exercises/page.tsx`, `DataTable.tsx`
   - Nên thay: Pagination component
   - Lợi ích: UI nhất quán, accessibility tốt hơn

---

## Lưu ý khi thay thế

1. **Kiểm tra API compatibility:** Một số components có API khác nhau, cần refactor code
2. **Giữ lại custom components:** Một số components chuyên dụng (như TiptapEditor) nên giữ nguyên
3. **Testing:** Test kỹ sau khi thay thế để đảm bảo functionality không bị ảnh hưởng
4. **Dark mode:** Tất cả shadcn/ui components đã hỗ trợ dark mode tự động
5. **Accessibility:** Shadcn/ui components đã được tối ưu cho accessibility
6. **Migration strategy:** Nên thay thế từng component một, test kỹ trước khi chuyển sang component tiếp theo

---

## Tài liệu tham khảo

- [Shadcn UI Components](https://ui.shadcn.com/docs/components)
- [Shadcn UI Installation](https://ui.shadcn.com/docs/installation)
- [Radix UI Primitives](https://www.radix-ui.com/primitives) (Base của shadcn/ui)
