"use client";
import { useParams, useRouter } from "next/navigation";
import { api, useAuth } from "@/lib/AuthContext";
import { Navbar } from "@/components/ui/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { getAvatarUrl } from "@/lib/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface UserProfile {
  _id: string;
  username: string;
  avatar?: string;
  bio: string;
  stats?: {
    followers: number;
    following: number;
    totalStreams: number;
    totalViews: number;
  };
  createdAt?: string;
  email: string;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading: loading } = useQuery<UserProfile>({
    queryKey: ["user-profile", params.id],
    queryFn: () =>
      api.get(`/api/users/${params.id}`).then((res) => res.data.user),
  });

  const { data: followData } = useQuery<{ isFollowing: boolean }>({
    queryKey: ["is-following", params.id],
    queryFn: () =>
      api.get(`/api/users/${params.id}/is-following`).then((res) => res.data),
    enabled: !!currentUser,
  });

  const isFollowing = followData?.isFollowing ?? false;
  const { mutate: toggleFollow, isPending: followLoading } = useMutation({
    mutationFn: () =>
      isFollowing
        ? api.delete(`/api/users/${params.id}/follow`)
        : api.post(`/api/users/${params.id}/follow`),
    onSuccess: () => {
      queryClient.setQueryData(["is-following", params.id], {
        isFollowing: !isFollowing,
      });
    },
  });

  const handleFollow = () => {
    if (!currentUser) {
      router.push("/login");
      return;
    }
    toggleFollow();
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
            <div className="space-y-4 sm:space-y-6">
              <div className="h-24 sm:h-32 shimmer rounded-xl" />
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="h-20 sm:h-24 shimmer rounded-xl" />
                <div className="h-20 sm:h-24 shimmer rounded-xl" />
                <div className="h-20 sm:h-24 shimmer rounded-xl" />
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
              <p className="text-text-tertiary text-lg">User not found</p>
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
            <div className="bg-surface border border-border rounded-xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-4 sm:mb-6">
                <img
                  src={getAvatarUrl(profile.avatar, profile.username)}
                  alt={profile.username}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-elevated border-2 border-border"
                />
                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary mb-2">
                    {profile.username}
                  </h1>
                  {isOwnProfile && (
                    <p className="text-text-tertiary text-sm sm:text-base">
                      {profile.email}
                    </p>
                  )}
                </div>
                {!isOwnProfile && currentUser && (
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`w-full sm:w-auto px-4 sm:px-6 py-2.5 rounded-lg font-semibold transition disabled:opacity-50 text-sm sm:text-base ${
                      isFollowing
                        ? "bg-surface border border-border hover:bg-elevated hover:border-border-hover text-text-primary"
                        : "btn-primary"
                    }`}
                  >
                    {followLoading
                      ? "..."
                      : isFollowing
                        ? "Unfollow"
                        : "Follow"}
                  </button>
                )}
                {isOwnProfile && (
                  <button
                    onClick={() => router.push("/profile")}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2.5 bg-surface border border-border hover:bg-elevated hover:border-border-hover text-text-primary rounded-lg font-semibold transition text-sm sm:text-base"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div className="bg-surface rounded-xl p-3 sm:p-4 md:p-6 border border-border card-hover">
                <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-cyan-400 mb-1">
                  {profile.stats?.followers || 0}
                </div>
                <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-text-muted">
                  Followers
                </div>
              </div>
              <div className="bg-surface rounded-xl p-3 sm:p-4 md:p-6 border border-border card-hover">
                <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-orange-400 mb-1">
                  {profile.stats?.following || 0}
                </div>
                <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-text-muted">
                  Following
                </div>
              </div>
              <div className="bg-surface rounded-xl p-3 sm:p-4 md:p-6 border border-border card-hover">
                <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-emerald-400 mb-1">
                  {profile.stats?.totalStreams || 0}
                </div>
                <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-text-muted">
                  Streams
                </div>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-4 sm:p-6 md:p-8">
              <h2 className="text-lg sm:text-xl font-bold text-text-primary mb-4">
                About
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-text-tertiary">
                    Member Since
                  </label>
                  <p className="text-text-primary font-semibold">
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
