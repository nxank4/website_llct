"use client";

import Image from "next/image";
import { User, Edit, Bell, Settings } from "lucide-react";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminHeader() {
  const { user, hasRole } = useAuth();
  const roleText = hasRole("admin") ? "Quản trị viên" : "Giảng viên";
  const userName = user?.full_name || user?.username || "Người dùng";

  return (
    <div className="flex items-center justify-between gap-4 md:gap-8 p-4 md:p-6 border-b border-gray-100 bg-white">
      <div className="flex items-center gap-4 md:gap-6">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 border-[#125093]/20 bg-[#125093]/10 flex items-center justify-center">
          {user?.avatar_url ? (
            <Avatar
              alt={userName}
              src={user.avatar_url}
              sx={{ width: 80, height: 80 }}
            />
          ) : (
            <Avatar
              sx={{ width: 80, height: 80 }}
              className="bg-[#125093]/10 text-[#125093]"
            >
              <User className="w-8 h-8 md:w-10 md:h-10" />
            </Avatar>
          )}
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
            <Chip
              label="Đang hoạt động"
              size="small"
              className="bg-[#00cbb8] text-white"
              sx={{ height: 22, "& .MuiChip-label": { px: 1 } }}
            />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 md:gap-2">
        <Tooltip title="Cài đặt">
          <IconButton
            size="small"
            className="text-[#125093]"
            aria-label="settings"
          >
            <Settings className="w-5 h-5" />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
}
