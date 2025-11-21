"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";

export default function ConditionalFooter() {
  const pathname = usePathname();

  // Ẩn footer ở các trang admin và instructor
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/instructor")) {
    return null;
  }

  return <Footer />;
}

