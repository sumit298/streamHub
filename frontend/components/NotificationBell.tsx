"use client";

import { Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/lib/AuthContext";
import { NotificationPanel } from "./NotificationPanel";
import { useNotifications } from "@/lib/NotificationContext";

export const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [shake, setShake] = useState(false);
  const { socket } = useNotifications();

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  useEffect(()=> {
    if(!socket) return;

    const handleNotification = ()=> {
      fetchUnreadCount();

    }
    socket.on("notification", handleNotification);  
    return () => {
      socket.off("notification", handleNotification);
    } 
  }, [socket])

  const fetchUnreadCount = async () => {
    try {
      const { data } = await api.get("/api/notifications?unreadOnly=true");
      const newCount = data.unreadCount || 0;
      if (newCount > unreadCount) {
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
      setUnreadCount(newCount);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 hover:bg-surface rounded-lg transition-all duration-200 relative group ${
          shake ? "animate-shake" : ""
        }`}
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
          onUpdate={fetchUnreadCount}
        />
      )}
    </div>
  );
};
