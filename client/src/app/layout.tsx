import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/providers/AuthProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import SessionProvider from "@/providers/SessionProvider";
import Toast from "@/components/Toast";
import EmailConfirmationGuard from "@/components/EmailConfirmationGuard";
import GoogleOAuthHandler from "@/components/GoogleOAuthHandler";
import TopProgressBar from "@/components/TopProgressBar";
import ReactQueryProvider from "@/providers/ReactQueryProvider";


export const metadata: Metadata = {
  title: "E-Learning Platform",
  description: "Nền tảng học tập trực tuyến toàn diện",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    other: [{ rel: "manifest", url: "/site.webmanifest" }],
  },
};

// Force all pages to be dynamic (disable static generation globally)
// This prevents prerender errors with client components and event handlers
export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="antialiased bg-white text-gray-900 font-sans">
        <SessionProvider>
          <AuthProvider>
              <ToastProvider>
                <EmailConfirmationGuard>
                  <ReactQueryProvider>
                    <GoogleOAuthHandler />
                    <TopProgressBar />
                    <Navigation key="main-navigation" />
                    <main className="min-h-screen">{children}</main>
                    <Footer key="main-footer" />
                    <Toast />
                  </ReactQueryProvider>
                </EmailConfirmationGuard>
              </ToastProvider>
          </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
