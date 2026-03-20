"use client";
import { Navbar } from "@/components/ui/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { api } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getAvatarUrl } from "@/lib/avatar";

interface StreamUser {
  _id: string;
  id?: string;
  username: string;
  avatar?: string;
  stats?: { followers: number; following: number };
}

interface LiveStream {
  _id: string;
  title: string;
  userId: { _id: string } | string;
}

const FollowingPage = () => {
  const router = useRouter();

  const { data: me } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get("/api/auth/me").then((res) => res.data.user),
  });

  const { data: allFollowing = [], isLoading } = useQuery<StreamUser[]>({
    queryKey: ["following-all", me?._id],
    queryFn: () =>
      api
        .get(`/api/users/${me?._id || me?.id}/following`)
        .then((res) => res.data.following || []),
    enabled: !!me,
  });

  const { data: liveStreams = [] } = useQuery<LiveStream[]>({
    queryKey: ["following-live"],
    queryFn: () =>
      api
        .get("/api/users/following/live")
        .then((res) => res.data.streams || []),
    enabled: !!me,
  });

  const liveMap = new Map(
    liveStreams.map((stream: LiveStream) => [
      typeof stream.userId === "string" ? stream.userId : stream.userId._id,
      stream,
    ]),
  );

  const sorted = [...allFollowing].sort((a: StreamUser, b: StreamUser) => {
    const aLive = liveMap.has(a._id ?? a.id ?? "") ? 1 : 0;
    const bLive = liveMap.has(b._id ?? b.id ?? "") ? 1 : 0;
    return bLive - aLive;
  });

  return (
    <div className="flex flex-col h-screen bg-background">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <main className="flex-1 overflow-y-auto p-8">
          <h1 className="text-3xl font-bold text-text-primary mb-6">
            Following
          </h1>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card rounded-lg p-6 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-700 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-700 rounded w-3/4" />
                      <div className="h-3 bg-gray-700 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">
                You are not following anyone yet
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sorted.map((user: StreamUser) => {
                const liveStream = liveMap.get(user._id);
                return (
                  <div
                    key={user._id}
                    onClick={() =>
                      liveStream
                        ? router.push(`/watch/${liveStream._id}`)
                        : router.push(`/profile/${user._id}`)
                    }
                    className="bg-card rounded-lg p-6 cursor-pointer hover:scale-105 transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        {user.avatar ? (
                          <img
                            src={getAvatarUrl(user.avatar)}
                            className="w-16 h-16 rounded-full object-cover"
                            alt={user.username}
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold text-xl">
                            {user.username?.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        {liveStream && (
                          <span className="absolute -bottom-1 -right-1 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                            LIVE
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-text-primary">
                          {user.username}
                        </h3>
                        {liveStream ? (
                          <p className="text-sm text-red-400">
                            {liveStream.title}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400">
                            {user.stats?.followers || 0} followers
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default FollowingPage;
