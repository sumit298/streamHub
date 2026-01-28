"use client";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/ui/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { api } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { set } from "zod";
const FollowingPage = () => {
  const [liveStreams, setLiveStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchLiveFollowing = async () => {
    try {
      const { data } = await api.get("/api/users/following/live");
      setLiveStreams(data.streams);
    } catch (error) {
      console.error("Error fetching live following streams:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveFollowing();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <h1 className="text-3xl font-bold text-text-primary mb-6">
            Following
          </h1>

          {loading ? (
            <div className="text-gray-400">Loading...</div>
          ) : liveStreams.length === 0 ? (
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
                      LIVE
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
          )}
        </main>
      </div>
    </div>
  );
};

export default FollowingPage;
