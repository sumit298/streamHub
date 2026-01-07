"use client";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/ui/Navbar";
import { useEffect, useState } from "react";
import { useAuth, api } from "@/lib/AuthContext";
import { io, Socket } from "socket.io-client";
import { useRouter } from "next/navigation";

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
        <Sidebar />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Hero Section */}
            <div className="mb-12">
              <div className="bg-linear-to-r from-accent-purple to-accent-pink rounded-2xl p-8 md:p-12 text-white mb-8">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                  Welcome back, {user?.username || "User"}!
                </h1>
                <p className="text-lg text-white/90 mb-6 max-w-2xl">
                  Discover amazing live streams, connect with creators, and join
                  a vibrant community of viewers and streamers.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={handleLogout}
                    className="bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>

            {/* Live & Pending Streams */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-text-primary">
                  Your Streams
                </h2>
                <a
                  href="/browse"
                  className="text-primary hover:underline font-medium"
                >
                  Browse all streams
                </a>
              </div>
              {error ? (
                <div className="text-center py-12">
                  <p className="text-red-500 text-lg">{error}</p>
                  <button
                    onClick={fetchStreams}
                    className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/80"
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
                          className="bg-card rounded-lg overflow-hidden hover:scale-105 transition cursor-pointer border-2 border-primary"
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
                                      stream.viewerCount ??
                                      0}{" "}
                                    viewers
                                  </>
                                ) : (
                                  <>📝 Ready to start</>
                                )}
                              </p>
                              <p className="text-xs text-gray-500">
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
