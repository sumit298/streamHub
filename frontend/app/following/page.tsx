"use client";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/ui/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { api } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { set } from "zod";
const FollowingPage = () => {
  const [liveStreams, setLiveStreams] = useState([]);
  const [allFollowing, setAllFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"live" | "all">("live");
  const router = useRouter();

  const fetchFollowing = async () => {
    try {
      const { data: userData } = await api.get("/api/auth/me");
      const userId = userData.user._id || userData.user.id;
      
      const [liveRes, allRes] = await Promise.all([
        api.get("/api/users/following/live"),
        api.get(`/api/users/${userId}/following`)
      ]);
      setLiveStreams(liveRes.data.streams || []);
      setAllFollowing(allRes.data.following || []);
    } catch (error) {
      console.error("Error fetching following:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowing();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <main className="flex-1 p-8">
          <h1 className="text-3xl font-bold text-text-primary mb-6">
            Following
          </h1>

          <div className="flex gap-4 mb-6 border-b border-gray-700">
            <button
              onClick={() => setTab("live")}
              className={`pb-3 px-4 font-medium transition ${
                tab === "live"
                  ? "text-gray-300 border-b-2 border-gray-300"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Live Now ({liveStreams.length})
            </button>
            <button
              onClick={() => setTab("all")}
              className={`pb-3 px-4 font-medium transition ${
                tab === "all"
                  ? "text-gray-300 border-b-2 border-gray-300"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              All Following ({allFollowing.length})
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card rounded-lg overflow-hidden animate-pulse">
                  <div className="aspect-video bg-gray-700" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-700 rounded w-3/4" />
                    <div className="h-3 bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : tab === "live" ? (
            liveStreams.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">
                  No live streams from followed users
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveStreams.map((stream: any) => (
                  <div
                    key={stream._id}
                    onClick={() => router.push(`/watch/${stream._id}`)}
                    className="bg-card rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition"
                  >
                    <div className="aspect-video bg-gray-700 relative">
                      <span className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 text-xs font-bold rounded">
                        🔴 LIVE
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-text-primary mb-1">
                        {stream.title}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {stream.userId?.username}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {stream.category}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            allFollowing.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">
                  You are not following anyone yet
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allFollowing.map((user: any) => (
                  <div
                    key={user._id}
                    onClick={() => router.push(`/profile/${user._id}`)}
                    className="bg-card rounded-lg p-6 cursor-pointer hover:scale-105 transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold text-xl">
                        {user.username?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-text-primary">
                          {user.username}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {user.stats?.followers || 0} followers
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </main>
      </div>
    </div>
  );
};

export default FollowingPage;
