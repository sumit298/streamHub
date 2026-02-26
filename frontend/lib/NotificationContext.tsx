"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { io, Socket } from "socket.io-client";
import toast from "react-hot-toast";
import { Bell, X } from "lucide-react";

interface NotificationContextType {
  socket: Socket | null;
}

const NotificationContext = createContext<NotificationContextType>({
  socket: null,
});

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem("token");
    const newSocket = io(
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
      {
        withCredentials: true,
        transports: ["websocket", "polling"],
        auth: { token },
      },
    );

    newSocket.on("connect", () => {
      console.log("✅ Notification socket connected, ID:", newSocket.id);
      console.log("👤 User ID:", user._id || user.id);
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Notification socket connection error:", error);
    });

    newSocket.on("notification", (notification: any) => {
      console.log("Received notification:", notification);

      // Show animated toast notification
      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? "animate-slideInRight" : "animate-slideOutRight"
            } max-w-md w-full bg-gradient-to-r from-gray-800 to-gray-900 shadow-2xl rounded-xl pointer-events-auto flex ring-1 ring-white/10 backdrop-blur-sm overflow-hidden`}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start gap-3">
                {notification.type === "stream-live" &&
                notification.data?.streamerAvatar ? (
                  <img
                    src={
                      notification.data.streamerAvatar.startsWith("http")
                        ? notification.data.streamerAvatar
                        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${notification.data.streamerUsername}`
                    }
                    alt={notification.data.streamerUsername}
                    className="w-10 h-10 rounded-full flex-shrink-0 ring-2 ring-red-500"
                  />
                ) : (
                  <div className="flex-shrink-0 text-2xl">
                    {notification.type === "stream-live" && "🔴"}
                    {notification.type === "chat-mention" && "💬"}
                    {notification.type === "new-follower" && "👤"}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {notification.type === "stream-live" && (
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    )}
                    <p className="text-sm font-semibold text-white">
                      {notification.title}
                    </p>
                  </div>
                  <p className="text-sm text-gray-300 line-clamp-2">
                    {notification.message}
                  </p>
                  {notification.data?.streamCategory && (
                    <span className="inline-block text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full mt-1">
                      {notification.data.streamCategory}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-700">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-xl p-4 flex items-center justify-center text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ),
        {
          duration: 5000,
          position: "top-right",
          id: `notif-${notification.type}-${notification.data?.streamId || Date.now()}`,
        },
      );

      // Trigger browser notification if permission granted
      if (Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.message,
          icon: "/favicon.svg",
          badge: "/favicon.svg",
          tag: notification.type,
          requireInteraction: false,
        });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user?._id ?? user?.id]);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  return (
    <NotificationContext.Provider value={{ socket }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
