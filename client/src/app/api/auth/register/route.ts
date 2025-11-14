import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { formatFullName } from "@/lib/formatName";

/**
 * Register new user with Supabase Auth
 * POST /api/auth/register
 * 
 * Body: { email: string, password: string, full_name: string, username: string, student_code?: string }
 * 
 * Supabase will automatically:
 * - Create user in auth.users
 * - Set email_confirmed_at = NULL
 * - Send confirmation email
 * - Store full_name, username, student_code, and avatar_url in user_metadata (accessible by database triggers)
 * 
 * Avatar placeholder is automatically generated using ui-avatars.com (optimized approach:
 * we don't store image files, just the URL). Database triggers can read this URL and
 * save it to public.profiles. Users can later upload their own avatar to Supabase Storage.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, full_name, username, student_code } = body;

    const rawEmail = typeof email === "string" ? email.trim() : "";
    const rawPassword = typeof password === "string" ? password : "";
    const rawFullName = typeof full_name === "string" ? full_name : "";
    const rawUsername = typeof username === "string" ? username : "";
    const rawStudentCode =
      typeof student_code === "string" ? student_code.trim() : "";

    // Validate required fields (after trimming whitespace)
    if (!rawEmail || !rawPassword || !rawFullName.trim() || !rawUsername.trim()) {
      return NextResponse.json(
        { error: "Email, mật khẩu, họ tên, và tên đăng nhập là bắt buộc" },
        { status: 400 }
      );
    }

    const normalizedEmail = rawEmail.toLowerCase();
    const formattedFullName = formatFullName(rawFullName);
    const sanitizedUsername = rawUsername.trim();
    const sanitizedStudentCode = rawStudentCode || null;

    if (!formattedFullName) {
      return NextResponse.json(
        {
          error:
            "Họ và tên không hợp lệ. Vui lòng nhập đầy đủ họ tên bằng chữ cái.",
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Email không hợp lệ" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (rawPassword.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu phải có ít nhất 6 ký tự" },
        { status: 400 }
      );
    }

    // Get Supabase configuration
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase configuration is missing");
      return NextResponse.json(
        { error: "Cấu hình Supabase chưa được thiết lập" },
        { status: 500 }
      );
    }

    // Create Supabase Admin Client (server-side)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Sign up user with Supabase Auth
    // This will automatically:
    // 1. Create user in auth.users
    // 2. Set email_confirmed_at = NULL
    // 3. Send confirmation email (if enabled in Supabase Dashboard)
    // 4. Inject full_name, username, and avatar_url into user_metadata for database triggers

    // Generate avatar placeholder URL using ui-avatars.com
    // This is optimized: we don't store the image file, just the URL
    // Documentation: https://ui-avatars.com/
    // Features: rounded circle, random background, bold text, 256px size
    // Use formatted name for avatar (consistent display)
    const displayName = formattedFullName || normalizedEmail.split("@")[0];
    const avatar_placeholder = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff&size=256&rounded=true&bold=true&format=png`;

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: rawPassword,
      options: {
        emailRedirectTo: `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/auth/callback`,
        data: {
          full_name: formattedFullName, // ✅ Use formatted name (Title Case)
          username: sanitizedUsername,
          student_code: sanitizedStudentCode, // MSSV có thể không bắt buộc
          avatar_url: avatar_placeholder, // Placeholder URL for database trigger
        },
      },
    });

    if (error) {
      console.error("Supabase signUp error:", error);

      // Handle specific Supabase errors
      if (error.message.includes("already registered")) {
        return NextResponse.json(
          { error: "Email này đã được sử dụng trong hệ thống. Vui lòng sử dụng email khác." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: error.message || "Lỗi khi đăng ký tài khoản" },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: "Không thể tạo tài khoản" },
        { status: 500 }
      );
    }

    // Return success response
    // Note: User is created but email_confirmed_at is NULL
    // User needs to click confirmation link in email
    return NextResponse.json(
      {
        message: "Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.",
        user: {
          id: data.user.id,
          email: data.user.email,
          email_confirmed_at: data.user.email_confirmed_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register API error:", error);
    return NextResponse.json(
      { error: "Lỗi server khi đăng ký tài khoản" },
      { status: 500 }
    );
  }
}

