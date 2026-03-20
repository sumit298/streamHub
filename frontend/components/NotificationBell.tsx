"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/AuthContext";
import { NotificationPanel } from "./NotificationPanel";

interface Notification { _id: string; read: boolean; }

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get("/api/notifications?limit=10").then(res => res.data.notifications || []),
  });

  const unreadCount = (data || []).filter(n => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-surface rounded-lg transition-all duration-200 relative group"
      >
        <Bell className="h-5 w-5 text-text-secondary group-hover:text-white transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center animate-pulse shadow-lg shadow-red-500/50">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <NotificationPanel
          onClose={() => setIsOpen(false)}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ['notifications'] })}
        />
      )}
    </div>
  );
};
