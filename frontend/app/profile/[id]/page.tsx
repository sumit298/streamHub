"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, useAuth } from "@/lib/AuthContext";
import { Navbar } from "@/components/ui/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { getAvatarUrl } from "@/lib/avatar";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get(`/api/users/${params.id}`);
        setProfile(data.user);
        
        if (currentUser) {
          const { data: followData } = await api.get(`/api/users/${params.id}/is-following`);
          setIsFollowing(followData.isFollowing);
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [params.id, currentUser]);

  const handleFollow = async () => {
    if (!currentUser) {
      router.push("/login");
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await api.delete(`/api/users/${params.id}/follow`);
        setIsFollowing(false);
      } else {
        await api.post(`/api/users/${params.id}/follow`);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error("Follow action failed:", error);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex">
          <div className="hidden lg:block">
            <Sidebar />
          </div>
          <main className="flex-1 p-4 sm:p-6 md:p-8">
            <div className="animate-pulse space-y-4 sm:space-y-6">
              <div className="h-24 sm:h-32 bg-gray-700 rounded-lg" />
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="h-20 sm:h-24 bg-gray-700 rounded-lg" />
                <div className="h-20 sm:h-24 bg-gray-700 rounded-lg" />
                <div className="h-20 sm:h-24 bg-gray-700 rounded-lg" />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex">
          <div className="hidden lg:block">
            <Sidebar />
          </div>
          <main className="flex-1 p-4 sm:p-6 md:p-8">
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">User not found</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === params.id;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="bg-card rounded-lg p-4 sm:p-6 md:p-8 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-4 sm:mb-6">
                <img
                  src={getAvatarUrl(profile.avatar, profile.username)}
                  alt={profile.username}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-700"
                />
                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
                    {profile.username}
                  </h1>
                  <p className="text-gray-400 text-sm sm:text-base">{profile.email}</p>
                </div>
                {!isOwnProfile && currentUser && (
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`w-full sm:w-auto px-4 sm:px-6 py-2 rounded-lg font-medium transition disabled:opacity-50 text-sm sm:text-base ${
                      isFollowing
                        ? "bg-gray-700 hover:bg-gray-600 text-white"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    {followLoading ? "..." : isFollowing ? "Unfollow" : "Follow"}
                  </button>
                )}
                {isOwnProfile && (
                  <button
                    onClick={() => router.push("/profile")}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition text-sm sm:text-base"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div className="bg-card rounded-lg p-3 sm:p-4 md:p-6 border border-gray-700">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-cyan-400 mb-1">
                  {profile.stats?.followers || 0}
                </div>
                <div className="text-xs sm:text-sm text-gray-400">Followers</div>
              </div>
              <div className="bg-card rounded-lg p-3 sm:p-4 md:p-6 border border-gray-700">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-400 mb-1">
                  {profile.stats?.following || 0}
                </div>
                <div className="text-xs sm:text-sm text-gray-400">Following</div>
              </div>
              <div className="bg-card rounded-lg p-3 sm:p-4 md:p-6 border border-gray-700">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-400 mb-1">
                  {profile.stats?.totalStreams || 0}
                </div>
                <div className="text-xs sm:text-sm text-gray-400">Streams</div>
              </div>
            </div>

            <div className="bg-card rounded-lg p-4 sm:p-6 md:p-8">
              <h2 className="text-lg sm:text-xl font-bold text-text-primary mb-4">
                About
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400">Member Since</label>
                  <p className="text-text-primary font-medium">
                    {profile.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
