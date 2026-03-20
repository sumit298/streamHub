"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { Bell, Check, X } from "lucide-react";
import { useNotifications } from "@/lib/NotificationContext";
import { getAvatarUrl } from "@/lib/avatar";

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
    streamCategory?: string;
    streamerUsername?: string;
    streamerAvatar?: string;
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
  const router = useRouter();
  const { socket } = useNotifications();
  const queryClient = useQueryClient();

  const { data, isLoading: loading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get("/api/notifications?limit=10").then(res => res.data.notifications || []),
  });

  const notifications = data || [];

  useEffect(() => {
    if (!socket) return;
    socket.on("notification", () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });
    return () => { socket.off("notification"); };
  }, [socket, queryClient]);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      queryClient.setQueryData<Notification[]>(['notifications'], prev =>
        (prev || []).map((n: Notification) => n._id === id ? { ...n, read: true } : n)
      );
      onUpdate();
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch("/api/notifications/read-all");
      queryClient.setQueryData<Notification[]>(['notifications'], prev =>
        (prev || []).map((n: Notification) => ({ ...n, read: true }))
      );
      onUpdate();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.type === "stream-live" && notification.data?.streamId) {
      try {
        const { data } = await api.get(`/api/streams/${notification.data.streamId}`);
        if (data.stream?.isLive) {
          markAsRead(notification._id);
          router.push(`/watch/${notification.data.streamId}`);
          onClose();
        } else {
          alert("This stream has ended");
        }
      } catch (error) {
        console.error("Failed to check stream:", error);
        alert("Stream not found or has ended");
      }
    } else {
      markAsRead(notification._id);
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
      <div className="fixed sm:absolute top-0 sm:top-auto right-0 sm:right-0 sm:mt-2 w-full sm:w-96 h-full sm:h-auto sm:max-h-[80vh] bg-gray-900 border-l sm:border border-gray-700/60 sm:rounded-xl shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/60 bg-gray-800/80 sm:rounded-t-xl">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-emerald-400" />
            <h3 className="font-semibold text-white text-sm">Notifications</h3>
          </div>
          <div className="flex items-center gap-1">
            {notifications.some((n) => !n.read) && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition"
              >
                <Check className="h-3 w-3" />
                Mark all read
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-gray-700 rounded transition">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              <p className="text-gray-500 text-sm">Loading...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Bell className="h-10 w-10 text-gray-700" />
              <p className="text-gray-400 text-sm font-medium">No notifications</p>
              <p className="text-gray-600 text-xs">We'll let you know when something happens</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/60">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition hover:bg-gray-800/40 ${
                    !notification.read ? "bg-emerald-500/5" : ""
                  }`}
                >
                  {/* Avatar / Icon */}
                  {notification.type === "stream-live" ? (
                    <div className="relative shrink-0">
                      <img
                        src={getAvatarUrl(notification.data?.streamerAvatar, notification.data?.streamerUsername)}
                        alt={notification.data?.streamerUsername}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 text-xs">🔴</span>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-lg shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium leading-snug truncate">
                      {notification.type === "stream-live"
                        ? notification.data?.streamerUsername || notification.title
                        : notification.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                      {notification.type === "stream-live"
                        ? notification.data?.streamTitle || notification.message
                        : notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {notification.data?.streamCategory && (
                        <span className="text-xs bg-purple-600/20 text-purple-300 px-1.5 py-0.5 rounded">
                          {notification.data.streamCategory}
                        </span>
                      )}
                      <span className="text-xs text-gray-600">{getTimeAgo(notification.createdAt)}</span>
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!notification.read && (
                    <div className="w-2 h-2 bg-emerald-500 rounded-full shrink-0 mt-1.5" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
