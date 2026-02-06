"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { Bell, Check, X } from "lucide-react";

interface Notification {
  _id: string;
  type: "stream-live" | "chat-mention" | "new-follower";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: {
    streamId?: string;
    streamTitle?: string;
    followerId?: string;
    followerUsername?: string;
  };
}

export const NotificationPanel = ({
  onClose,
  onUpdate,
}: {
  onClose: () => void;
  onUpdate: () => void;
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get("/api/notifications?limit=10");
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      onUpdate();
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch("/api/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      onUpdate();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification._id);
    if (notification.data?.streamId) {
      router.push(`/watch/${notification.data.streamId}`);
      onClose();
    }
  };

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor(
      (new Date().getTime() - new Date(date).getTime()) / 1000
    );
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "stream-live":
        return "🔴";
      case "chat-mention":
        return "💬";
      case "new-follower":
        return "👤";
      default:
        return "🔔";
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 mt-2 w-96 bg-card border border-gray-700 rounded-lg shadow-2xl z-50 max-h-[32rem] overflow-hidden animate-slideDown">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gradient-to-r from-gray-800 to-gray-900">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-400" />
            <h3 className="font-semibold text-white">Notifications</h3>
          </div>
          <div className="flex items-center gap-2">
            {notifications.some((n) => !n.read) && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-700"
              >
                <Check className="h-3 w-3" />
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto max-h-[28rem] custom-scrollbar">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
              <p className="mt-2 text-gray-400 text-sm">Loading...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No notifications yet</p>
              <p className="text-gray-500 text-xs mt-1">
                We'll notify you when something happens
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {notifications.map((notification, index) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 hover:bg-gray-800/50 cursor-pointer transition-all duration-200 transform hover:scale-[1.02] ${
                    !notification.read
                      ? "bg-blue-900/10 border-l-2 border-blue-500"
                      : ""
                  } animate-fadeIn`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <span>{getTimeAgo(notification.createdAt)}</span>
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0 animate-pulse" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
