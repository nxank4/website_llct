"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLoading(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams?.toString()]);

  if (!loading) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[9999]">
      <div className="relative h-1 w-full overflow-hidden bg-primary/15">
        <div className="animate-progress-bar absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-primary to-transparent" />
      </div>
    </div>
  );
}
