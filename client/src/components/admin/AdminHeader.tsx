"use client";

import { User, Settings } from "lucide-react";
import { useSession } from "next-auth/react";
import { hasRole } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/Button";

export default function AdminHeader() {
  const { data: session } = useSession();
  const user = session?.user;
  const roleText = hasRole(
    session as {
      user?: { roles?: string[]; role?: string };
    } | null,
    "admin"
  )
    ? "Quản trị viên"
    : "Giảng viên";
  const userName =
    (
      user as {
        full_name?: string;
        username?: string;
        name?: string | null;
      }
    )?.full_name ||
    (
      user as {
        full_name?: string;
        username?: string;
        name?: string | null;
      }
    )?.username ||
    user?.name ||
    "Người dùng";

  return (
    <div className="flex items-center justify-between gap-4 md:gap-8 p-4 md:p-6 border-b border-gray-100 bg-white">
      <div className="flex items-center gap-4 md:gap-6">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 border-[#125093]/20 bg-[#125093]/10 flex items-center justify-center">
          <Avatar className="h-16 w-16 md:h-20 md:w-20 bg-[#125093]/10">
            {(user as { avatar_url?: string })?.avatar_url ? (
              <AvatarImage
                src={(user as { avatar_url?: string }).avatar_url}
                alt={userName}
              />
            ) : (
              <AvatarFallback className="bg-transparent text-[#125093]">
                <User className="w-8 h-8 md:w-10 md:h-10" />
              </AvatarFallback>
            )}
          </Avatar>
        </div>
        <div>
          <div className="mb-1">
            <span className="text-gray-900 text-base md:text-lg">
              Chào mừng,{" "}
            </span>
            <span className="text-[#125093] text-xl md:text-2xl font-bold poppins-bold">
              {userName}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-900 text-base md:text-lg font-semibold">
              {roleText}
            </span>
            <Badge
              variant="success"
              className="px-3 py-1 text-xs font-semibold uppercase tracking-wide"
            >
              Đang hoạt động
            </Badge>
          </div>
        </div>
      </div>
      <TooltipProvider>
        <div className="flex items-center gap-1 md:gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-[#125093] hover:text-[#0f4278]"
                aria-label="settings"
              >
                <Settings className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cài đặt</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
