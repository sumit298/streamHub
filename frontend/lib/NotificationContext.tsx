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
      }
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
            } max-w-md w-full bg-gradient-to-r from-gray-800 to-gray-900 shadow-2xl rounded-lg pointer-events-auto flex ring-1 ring-white/10 backdrop-blur-sm`}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-2xl">
                  {notification.type === "stream-live" && "🔴"}
                  {notification.type === "chat-mention" && "💬"}
                  {notification.type === "new-follower" && "👤"}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">
                    {notification.title}
                  </p>
                  <p className="mt-1 text-sm text-gray-300">
                    {notification.message}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-700">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ),
        { duration: 5000, position: "top-right" }
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
  }, [user]);

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
