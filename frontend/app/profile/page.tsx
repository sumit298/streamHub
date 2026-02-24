"use client"
import { Sidebar } from "@/components/Sidebar"
import { Navbar } from "@/components/ui/Navbar"
import { useEffect, useState } from "react"
import { useAuth, api } from "@/lib/AuthContext"
import { useRouter } from "next/navigation"
import { getAvatarUrl } from "@/lib/avatar"

const Profile = () => {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = async () => {
        try {
            setError(null);
            const [profileRes, statsRes] = await Promise.all([
                api.get('/api/auth/me'),
                api.get('/api/auth/me/stats')
            ]);
            setProfile(profileRes.data.user);
            setStats(statsRes.data.stats);
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            setError('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (ms: number) => {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    return (
        <div className="flex flex-col h-screen bg-background">
            <Navbar />
            <div className="flex flex-1 overflow-hidden">
                <div className="hidden lg:block">
                    <Sidebar />
                </div>
                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        {error ? (
                            <div className="text-center py-12">
                                <p className="text-red-500 text-lg">{error}</p>
                                <button
                                    onClick={fetchProfile}
                                    className="mt-4 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : loading ? (
                            <div className="animate-pulse space-y-6">
                                <div className="h-32 bg-gray-700 rounded-lg" />
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="h-24 bg-gray-700 rounded-lg" />
                                    <div className="h-24 bg-gray-700 rounded-lg" />
                                    <div className="h-24 bg-gray-700 rounded-lg" />
                                    <div className="h-24 bg-gray-700 rounded-lg" />
                                </div>
                            </div>
                        ) : profile ? (
                            <>
                                <div className="bg-card rounded-lg p-4 sm:p-8 mb-6">
                                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-6">
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
                                        <button
                                            onClick={() => {
                                                logout();
                                                router.push('/login');
                                            }}
                                            className="w-full sm:w-auto px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
                                        >
                                            Logout
                                        </button>
                                    </div>
                                </div>

                                {stats && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
                                        <div className="bg-card rounded-lg p-4 sm:p-6 border border-gray-700">
                                            <div className="text-2xl sm:text-3xl font-bold text-emerald-400 mb-1">{stats.totalStreams}</div>
                                            <div className="text-xs sm:text-sm text-gray-400">Total Streams</div>
                                        </div>
                                        <div className="bg-card rounded-lg p-4 sm:p-6 border border-gray-700">
                                            <div className="text-2xl sm:text-3xl font-bold text-blue-400 mb-1">{stats.totalViews}</div>
                                            <div className="text-xs sm:text-sm text-gray-400">Total Views</div>
                                        </div>
                                        <div className="bg-card rounded-lg p-4 sm:p-6 border border-gray-700">
                                            <div className="text-2xl sm:text-3xl font-bold text-purple-400 mb-1">{formatDuration(stats.totalStreamTime)}</div>
                                            <div className="text-xs sm:text-sm text-gray-400">Time Streamed</div>
                                        </div>
                                        <div className="bg-card rounded-lg p-4 sm:p-6 border border-gray-700">
                                            <div className="text-2xl sm:text-3xl font-bold text-pink-400 mb-1">{stats.totalChatMessages}</div>
                                            <div className="text-xs sm:text-sm text-gray-400">Chat Messages</div>
                                        </div>
                                        <div className="bg-card rounded-lg p-4 sm:p-6 border border-gray-700">
                                            <div className="text-2xl sm:text-3xl font-bold text-cyan-400 mb-1">{profile.stats?.followers || 0}</div>
                                            <div className="text-xs sm:text-sm text-gray-400">Followers</div>
                                        </div>
                                        <div className="bg-card rounded-lg p-4 sm:p-6 border border-gray-700">
                                            <div className="text-2xl sm:text-3xl font-bold text-orange-400 mb-1">{profile.stats?.following || 0}</div>
                                            <div className="text-xs sm:text-sm text-gray-400">Following</div>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-card rounded-lg p-4 sm:p-8">
                                    <h2 className="text-lg sm:text-xl font-bold text-text-primary mb-4">Account Information</h2>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm text-gray-400">Username</label>
                                            <p className="text-text-primary font-medium">{profile.username}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm text-gray-400">Email</label>
                                            <p className="text-text-primary font-medium">{profile.email}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm text-gray-400">Role</label>
                                            <p className="text-text-primary font-medium capitalize">{profile.role || 'user'}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm text-gray-400">Member Since</label>
                                            <p className="text-text-primary font-medium">
                                                {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Profile;