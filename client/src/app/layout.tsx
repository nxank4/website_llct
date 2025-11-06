import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/providers/AuthProvider";
import { NotificationsProvider } from "@/providers/NotificationsProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import Toast from "@/components/Toast";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

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
      <body className={`${inter.variable} antialiased bg-white text-gray-900`}>
        <AuthProvider>
          <NotificationsProvider>
            <ToastProvider>
              <Navigation key="main-navigation" />
              <main className="min-h-screen">{children}</main>
              <Footer key="main-footer" />
              <Toast />
            </ToastProvider>
          </NotificationsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
