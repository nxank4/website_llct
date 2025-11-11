import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Register new user with Supabase Auth
 * POST /api/auth/register
 * 
 * Body: { email: string, password: string }
 * 
 * Supabase will automatically:
 * - Create user in auth.users
 * - Set email_confirmed_at = NULL
 * - Send confirmation email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email và mật khẩu là bắt buộc" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Email không hợp lệ" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/auth/callback`,
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

