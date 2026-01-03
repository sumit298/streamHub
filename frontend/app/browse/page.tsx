"use client";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/ui/Navbar";
import { useEffect, useState } from "react";
import { api, useAuth } from "@/lib/AuthContext";
import { io, Socket } from "socket.io-client";
import { useRouter } from "next/navigation";

const BrowsePage = () => {
  const [allStreams, setAllStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewerCounts, setViewerCounts] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const limit = 8;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [filter, setFilter] = useState<"all" | "my" | "community">("all");
  const { user } = useAuth();
  const router = useRouter();
  const [totalStreams, setTotalStreams] = useState(0);
  const [myStreamsCount, setMyStreamsCount] = useState(0);
  const [communityStreamsCount, setCommunityStreamsCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchCounts = async () => {
    try {
      const [allRes, myRes, communityRes] = await Promise.all([
        api.get("/api/streams?limit=1"),
        api.get("/api/streams?limit=1&filter=my"),
        api.get("/api/streams?limit=1&filter=community"),
      ]);
      setTotalStreams(allRes.data.total || 0);
      setMyStreamsCount(myRes.data.total || 0);
      setCommunityStreamsCount(communityRes.data.total || 0);
    } catch (error) {
      console.error("Failed to fetch counts:", error);
    }
  };

  const formatDuration = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s
        .toString()
        .padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const fetchStreams = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const offset = (page - 1) * limit;
      const filterParam = filter !== "all" ? `&filter=${filter}` : "";
      const url = `/api/streams?limit=${limit}&offset=${offset}${filterParam}`;
      
      const { data } = await api.get(url);
      setAllStreams(data.streams || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setHasMore(data.hasMore || false);
      setCurrentPage(page);
      
      // Store current filter's total for pagination check
      if (filter === "all") setTotalStreams(data.total || 0);
      else if (filter === "my") setMyStreamsCount(data.total || 0);
      else if (filter === "community") setCommunityStreamsCount(data.total || 0);
    } catch (error) {
      console.error("Failed to fetch streams:", error);
      setError("Failed to load streams. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchStreams(1);
  }, [filter]);

  useEffect(() => {
    fetchStreams(1);
    fetchCounts();

    // Connect to Socket.IO for real-time viewer counts
    const newSocket = io(
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
      {
        withCredentials: true,
        transports: ["websocket", "polling"],
      }
    );

    newSocket.on("connect", () => {
      console.log("Browse page connected to socket");
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

  // Subscribe to viewer count updates for live streams
  useEffect(() => {
    if (socket && allStreams.length > 0) {
      allStreams.forEach((stream: any) => {
        if (stream.isLive) {
          socket.emit("subscribe-viewer-count", { streamId: stream.id });
        }
      });
    }
  }, [socket, allStreams]);



  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-text-primary mb-2">
                Browse Streams
              </h1>
              <p className="text-gray-400">
                Discover streams from our community
              </p>
            </div>

            <div className="flex gap-4 mb-6 border-b border-gray-700">
              <button
                onClick={() => setFilter("all")}
                disabled={loading}
                className={`pb-3 px-4 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  filter === "all"
                    ? "text-primary border-b-2 border-primary"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                All Streams ({totalStreams})
              </button>
              <button
                onClick={() => setFilter("my")}
                disabled={loading}
                className={`pb-3 px-4 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  filter === "my"
                    ? "text-primary border-b-2 border-primary"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                My Streams ({myStreamsCount})
              </button>
              <button
                onClick={() => setFilter("community")}
                disabled={loading}
                className={`pb-3 px-4 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  filter === "community"
                    ? "text-primary border-b-2 border-primary"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                Community Streams ({communityStreamsCount})
              </button>
            </div>

            {/* Streams Grid */}
            {error ? (
              <div className="col-span-full text-center py-12">
                <p className="text-red-500 text-lg">{error}</p>
                <button
                  onClick={() => fetchStreams(currentPage)}
                  className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/80"
                >
                  Retry
                </button>
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {loading ? (
                Array.from({ length: limit }).map((_, i) => (
                  <div key={i} className="bg-card rounded-lg overflow-hidden animate-pulse">
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
              ) : allStreams.length > 0 ? (
                allStreams.map((stream: any) => (
                  <div
                    key={stream._id}
                    onClick={() => stream.isLive && router.push(`/watch/${stream.id}`)}
                    className={`bg-card rounded-lg overflow-hidden hover:scale-105 transition ${stream.userId === user?.id ? 'border-2 border-primary' : 'border-2 border-transparent'} ${
                      stream.isLive
                        ? "cursor-pointer"
                        : "cursor-default opacity-75"
                    }`}
                  >
                    <div className="aspect-video bg-black relative ">
                      {stream.thumbnailUrl ? (
                        <img
                          src={stream.thumbnailUrl}
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
                        <span className="absolute top-2 left-2 bg-gray-600 text-white px-2 py-1 text-xs rounded">
                          Ended
                        </span>
                      )}
                      {stream.duration && !stream.isLive && (
                        <span className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 text-xs rounded">
                          ⏱️ {formatDuration(stream.duration)}
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold truncate">{stream.title}</h3>
                      <p className="text-sm text-gray-400">
                        {stream.streamer?.username || "Unknown"}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-500">
                          👁️{" "}
                          {stream.isLive
                            ? viewerCounts[stream.id] ?? stream.viewerCount ?? 0
                            : stream.totalViews || 0}{" "}
                          {stream.isLive ? "watching" : "views"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {stream.category}
                        </p>
                      </div>
                      {stream.duration && !stream.isLive && (
                        <p className="text-xs text-gray-500 mt-1">
                          Duration: {formatDuration(stream.duration)}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-500 text-lg">
                    No streams available
                  </p>
                </div>
              )}
            </div>
            )}
            {/* Pagination - only show if there are items and multiple pages */}
            {!loading && allStreams.length > 0 && (
              filter === "all" ? totalStreams > limit :
              filter === "my" ? myStreamsCount > limit :
              communityStreamsCount > limit
            ) && (
                <div className="flex justify-center mt-8 space-x-4">
                  <button
                    onClick={() => fetchStreams(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                    className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => fetchStreams(currentPage + 1)}
                    disabled={!hasMore || loading}
                    className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default BrowsePage;
