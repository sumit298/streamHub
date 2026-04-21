"use client";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/ui/Navbar";
import { useEffect, useState, useRef } from "react";
import { api, useAuth } from "@/lib/AuthContext";
import { io, Socket } from "socket.io-client";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

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

const BrowsePage = () => {
  const [viewerCounts, setViewerCounts] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 8;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [filter, setFilter] = useState<"all" | "my" | "community">("all");
  const { user, getSocketAuth } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const socketInitialized = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const { data: streamsData, isLoading: loading, error: streamError, refetch } = useQuery({
    queryKey: ['streams', filter, currentPage, debouncedSearch, selectedCategory],
    queryFn: ()=> {
      const offset = (currentPage - 1) * limit;
      const filterParam = filter!== "all" ? `&filter=${filter}` : ""
      const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : "";
      const categoryParam = selectedCategory ? `&category=${selectedCategory}` : "";
      return api.get(`/api/streams?limit=${limit}&offset=${offset}${filterParam}${searchParam}${categoryParam}`).then(res=> res.data);
    }
  })

  const { data: countsData} = useQuery({
    queryKey: ['stream-counts'],
    queryFn: ()=> Promise.all([
      api.get("/api/streams?limit=1" ),
      api.get("/api/streams?limit=1&filter=my"),
      api.get("/api/streams?limit=1&filter=community"),
    ]).then(([all, my, community]) => ({
      total: all.data.total || 0,
      my: my.data.total || 0,
      community: community.data.total || 0,
    }))
  })

  const allStreams = streamsData?.streams || [];
  const totalPages = streamsData?.pagination?.totalPages || 1;
  const totalStreams = countsData?.total || 0;
  const myStreamCount = countsData?.my || 0;
  const communityStreamsCount = countsData?.community || 0;
  const error = streamError ? "Failed to load streams. Please try again." : null

 
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

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  useEffect(() => {
    if (socketInitialized.current) {
      console.log('[BROWSE] Socket already initialized, skipping');
      return;
    }
    
    const authData = getSocketAuth();
    
    // Wait for token to be available before connecting
    if (!authData.token) {
      console.log('[BROWSE] No token yet, will retry when user is loaded');
      return;
    }
    
    socketInitialized.current = true;

    // Connect to Socket.IO for real-time viewer counts
    const newSocket = io(
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
      {
        withCredentials: true,
        transports: ["websocket", "polling"],
        auth: authData,
      },
    );

    newSocket.on("connect", () => {
      console.log("Browse page connected to socket");
    });

    newSocket.on(
      "viewer-count",
      ({ streamId, count }: { streamId: string; count: number }) => {
        setViewerCounts((prev) => ({ ...prev, [streamId]: count }));
      },
    );

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user]);

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
    <div className="flex flex-col h-screen bg-background">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-text-primary mb-2">
                Browse Streams
              </h1>
              <p className="text-gray-400">
                Discover streams from our community
              </p>
            </div>

            <div className="flex w-full gap-4">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mb-6 w-full">
              <div className="relative max-w-2xl">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search streams by title, category, or streamer..."
                  className="w-full px-4 py-3 pl-12 pr-24 bg-card border border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-text-primary placeholder-gray-500"
                />
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-24 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition"
                    title="Clear search"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-gray-700 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 transition"
                >
                  {loading ? "..." : "Search"}
                </button>
              </div>
            </form>

            <div className="mb-6">
              <select
                value={selectedCategory || ""}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="px-6 py-3 bg-card border border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-text-primary cursor-pointer"
              >
                <option value="">All Categories</option>
                <option value="gaming">🎮 Gaming</option>
                <option value="music">🎵 Music</option>
                <option value="art">🎨 Art</option>
                <option value="technology">💻 Technology</option>
                <option value="education">📚 Education</option>
                <option value="entertainment">🎬 Entertainment</option>
                <option value="sports">⚽ Sports</option>
                <option value="general">📺 General</option>
              </select>
            </div>
            </div>

            <div className="flex gap-4 mb-6 border-b border-gray-700">
              <button
                onClick={() => setFilter("all")}
                disabled={loading}
                className={`pb-3 px-4 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  filter === "all"
                    ? "text-gray-300 border-b-2 border-gray-300"
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
                    ? "text-gray-300 border-b-2 border-gray-300"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                My Streams ({myStreamCount})
              </button>
              <button
                onClick={() => setFilter("community")}
                disabled={loading}
                className={`pb-3 px-4 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  filter === "community"
                    ? "text-gray-300 border-b-2 border-gray-300"
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
                  onClick={() => refetch()}
                  className="mt-4 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading ? (
                  Array.from({ length: limit }).map((_, i) => (
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
                ) : allStreams.length > 0 ? (
                  allStreams.map((stream: any) => (
                    <div
                      key={stream._id}
                      onClick={() =>
                        stream.isLive && router.push(`/watch/${stream.id}`)
                      }
                      className={`bg-card rounded-lg overflow-hidden hover:scale-105 transition border ${stream.userId === user?.id ? "border-gray-600" : "border-gray-700"} ${
                        stream.isLive
                          ? "cursor-pointer"
                          : "cursor-default opacity-75"
                      }`}
                    >
                      <div className="aspect-video bg-black relative ">
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
                          <span className="absolute top-2 left-2 bg-gray-600 text-white px-2 py-1 text-xs rounded">
                            Ended
                          </span>
                        )}
                        {!!stream.duration && !stream.isLive && (
                          <span className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 text-xs rounded">
                            ⏱️ {formatDuration(stream.duration)}
                          </span>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-base text-text-primary mb-1 line-clamp-2 leading-tight">
                          {stream.title}
                        </h3>
                        <p className="text-sm text-gray-400 mb-3">
                          {stream.streamer?.username || "Unknown"}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path
                                fillRule="evenodd"
                                d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {stream.isLive
                              ? `${viewerCounts[stream.id] ?? stream.stats?.viewers ?? 0} watching`
                              : `${stream.stats?.maxViewers ?? 0} views`}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs capitalize border ${getCategoryColor(stream.category)}`}
                          >
                            {stream.category}
                          </span>
                        </div>
                        {stream.tags && stream.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {stream.tags
                              .slice(0, 3)
                              .map((tag: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-gray-700/50 text-gray-300 text-xs rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                          </div>
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
            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-card border border-gray-700 text-gray-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-700 transition text-sm"
                >
                  ← Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "..." ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-gray-500 text-sm">…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setCurrentPage(item as number)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                          currentPage === item
                            ? "bg-gray-600 text-white border border-gray-500"
                            : "bg-card border border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                <button
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 bg-card border border-gray-700 text-gray-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-700 transition text-sm"
                >
                  Next →
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
