import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Resend email confirmation using Supabase Auth
 * POST /api/auth/resend-confirmation
 * 
 * Body: { email: string }
 * 
 * Note: User doesn't need to be authenticated to resend confirmation email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = body.email;

    // Validate email
    if (!email) {
      return NextResponse.json(
        { error: "Email là bắt buộc" },
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

    // Resend confirmation email using Supabase Auth
    // This will send a new confirmation email to the user
    const { data, error } = await supabase.auth.resend({
      type: "signup",
      email: email,
      options: {
        emailRedirectTo: `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/auth/callback`,
      },
    });

    if (error) {
      console.error("Supabase resend error:", error);
      
      // Handle specific Supabase errors
      if (error.message.includes("already confirmed")) {
        return NextResponse.json(
          { error: "Email này đã được xác nhận rồi" },
          { status: 400 }
        );
      }
      
      if (error.message.includes("not found")) {
        return NextResponse.json(
          { error: "Không tìm thấy tài khoản với email này" },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: error.message || "Lỗi khi gửi lại email xác nhận" },
        { status: 400 }
      );
    }

    // Return success response
    return NextResponse.json(
      {
        message: "Email xác nhận đã được gửi lại thành công. Vui lòng kiểm tra hộp thư của bạn.",
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resend confirmation API error:", error);
    return NextResponse.json(
      { error: "Lỗi server khi gửi lại email xác nhận" },
      { status: 500 }
    );
  }
}

