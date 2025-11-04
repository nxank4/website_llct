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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased bg-white text-gray-900`}
      >
        <AuthProvider>
          <NotificationsProvider>
            <ToastProvider>
              <Navigation key="main-navigation" />
              <main className="min-h-screen">
                {children}
              </main>
              <Footer key="main-footer" />
              <Toast />
            </ToastProvider>
          </NotificationsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
