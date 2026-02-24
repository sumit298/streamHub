"use client";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/ui/Navbar";
import { useEffect, useState } from "react";
import { useAuth, api } from "@/lib/AuthContext";
import { io, Socket } from "socket.io-client";
import { useRouter } from "next/navigation";

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    gaming: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    music: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    art: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    technology: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    education: "bg-green-500/20 text-green-300 border-green-500/30",
    entertainment: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    sports: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    general: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  };
  return colors[category?.toLowerCase()] || colors.general;
};

const Dashboard = () => {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewerCounts, setViewerCounts] = useState<Record<string, number>>({});
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user, logout } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const fetchStreams = async () => {
    try {
      setError(null);
      const { data } = await api.get("/api/streams?status=pending");
      setStreams(data.streams || []);
    } catch (error) {
      console.error("Failed to fetch streams:", error);
      setError("Failed to load streams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreams();

    // Connect to Socket.IO for real-time viewer counts
    const newSocket = io(
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
      {
        withCredentials: true,
        transports: ["websocket", "polling"],
      }
    );

    newSocket.on("connect", () => {
      console.log("Dashboard connected to socket");
    });

    newSocket.on(
      "viewer-count",
      ({ streamId, count }: { streamId: string; count: number }) => {
        setViewerCounts((prev) => ({ ...prev, [streamId]: count }));
      }
    );

    // Listen for notifications to refetch streams
    newSocket.on("notification", (notification: any) => {
      console.log("Notification received:", notification);
      if (notification.type === "stream-live") {
        fetchStreams();
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Subscribe to viewer count updates for visible streams
  useEffect(() => {
    if (socket && streams.length > 0) {
      streams.forEach((stream: any) => {
        if (stream.isLive) {
          socket.emit("subscribe-viewer-count", { streamId: stream.id });
        }
      });
    }
  }, [socket, streams]);
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-text-primary mb-2">
                Welcome back, {user?.username || "User"}!
              </h1>
              <p className="text-gray-400">
                Discover live streams and connect with creators
              </p>
            </div>

            {/* Live & Pending Streams */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-text-primary">
                  Your Streams
                </h2>
                <a
                  href="/browse"
                  className="text-emerald-400 hover:text-white hover:underline font-medium"
                >
                  Browse all streams
                </a>
              </div>
              {error ? (
                <div className="text-center py-12">
                  <p className="text-red-500 text-lg">{error}</p>
                  <button
                    onClick={fetchStreams}
                    className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="bg-card rounded-lg overflow-hidden animate-pulse"
                      >
                        <div className="aspect-video bg-gray-700" />
                        <div className="p-4 space-y-3">
                          <div className="h-4 bg-gray-700 rounded w-3/4" />
                          <div className="h-3 bg-gray-700 rounded w-1/2" />
                          <div className="flex justify-between">
                            <div className="h-3 bg-gray-700 rounded w-1/4" />
                            <div className="h-3 bg-gray-700 rounded w-1/4" />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : streams.length > 0 ? (
                    streams.map((stream: any) => {
                      console.log(
                        "Stream userId:",
                        stream.userId,
                        "Current user id:",
                        user?.id
                      );
                      const isMyStream =
                        stream.userId === user?.id ||
                        stream.userId?._id === user?.id ||
                        stream.userId?.toString() === user?.id;
                      return (
                        <div
                          key={stream._id}
                          onClick={() => {
                            router.push(
                              isMyStream
                                ? `/stream/${stream.id}`
                                : `/watch/${stream.id}`
                            );
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              router.push(
                                isMyStream
                                  ? `/stream/${stream.id}`
                                  : `/watch/${stream.id}`
                              );
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          aria-label={`${stream.isLive ? 'Watch' : 'View'} stream: ${stream.title}`}
                          className="bg-card rounded-lg overflow-hidden hover:scale-105 transition cursor-pointer border-2 border-emerald-600 hover:border-emerald-500"
                        >
                          <div className="aspect-video bg-black relative">
                            {stream.thumbnail ? (
                              <img
                                src={stream.thumbnail}
                                alt={stream.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-500">
                                No Preview
                              </div>
                            )}
                            {stream.isLive ? (
                              <span className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 text-xs rounded font-semibold">
                                🔴 LIVE
                              </span>
                            ) : (
                              <span className="absolute top-2 left-2 bg-yellow-600 text-white px-2 py-1 text-xs rounded font-semibold">
                                ⏸️ PENDING
                              </span>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold truncate">
                              {stream.title}
                            </h3>
                            <p className="text-sm text-gray-400">
                              {stream.streamer?.username || "Unknown"}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-gray-500">
                                {stream.isLive ? (
                                  <>
                                    👁️{" "}
                                    {viewerCounts[stream.id] ??
                                      stream.stats?.viewers ??
                                      0}{" "}
                                    watching
                                  </>
                                ) : stream.isPending ? (
                                  <>📝 Ready to start</>
                                ) : (
                                  <>
                                    👁️ {stream.stats?.maxViewers ?? 0} views
                                  </>
                                )}
                              </p>
                              <p className={`text-xs px-2 py-0.5 rounded capitalize border ${getCategoryColor(stream.category)}`}>
                                {stream.category}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-full text-center py-12">
                      <p className="text-gray-500 text-lg">
                        No streams yet. Use the "Go Live" button in the navbar
                        to create your first stream!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
