"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { Bell, Check, X, Play } from "lucide-react";
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingStreams, setCheckingStreams] = useState<Set<string>>(new Set());
  const router = useRouter();
  const { socket } = useNotifications();

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    const handleNotification = () => {
      fetchNotifications();
    };
    
    socket.on("notification", handleNotification);
    return () => {
      socket.off("notification", handleNotification);
    };
  }, [socket]);

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

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.type === "stream-live" && notification.data?.streamId) {
      setCheckingStreams(prev => new Set(prev).add(notification._id));
      
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
      } finally {
        setCheckingStreams(prev => {
          const newSet = new Set(prev);
          newSet.delete(notification._id);
          return newSet;
        });
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
      <div className="fixed inset-0 z-40 text-white" onClick={onClose} />
      <div className="absolute right-0 mt-2 w-96 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 max-h-[32rem] overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800">
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
        <div className="overflow-y-auto max-h-[28rem]">
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
            <div className="divide-y divide-gray-800">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 hover:bg-gray-800/50 cursor-pointer transition-all ${
                    !notification.read ? "bg-blue-500/5" : ""
                  }`}
                >
                  {notification.type === "stream-live" ? (
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={getAvatarUrl(notification.data?.streamerAvatar, notification.data?.streamerUsername)}
                          alt={notification.data?.streamerUsername}
                          className="w-12 h-12 rounded-full"
                        />
                        
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-white">
                            {notification.data?.streamerUsername || notification.title}
                          </p>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-400">{getTimeAgo(notification.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-300 mb-1">
                          {notification.data?.streamTitle || notification.message}
                        </p>
                        {notification.data?.streamCategory && (
                          <span className="inline-block text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded-md font-medium">
                            {notification.data.streamCategory}
                          </span>
                        )}
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center text-2xl">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-white">
                            {notification.title}
                          </p>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-400">{getTimeAgo(notification.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-300">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                      )}
                    </div>
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
