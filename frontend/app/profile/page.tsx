"use client"
import { Sidebar } from "@/components/Sidebar"
import { Navbar } from "@/components/ui/Navbar"
import { useEffect, useState } from "react"
import { useAuth, api } from "@/lib/AuthContext"
import { useRouter } from "next/navigation"
import { getAvatarUrl } from "@/lib/avatar"

const Profile = () => {
    const { logout } = useAuth();
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({ username: '', bio: '' });
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

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

    const startEditing = () => {
        setEditForm({ username: profile.username, bio: profile.bio || '' });
        setAvatarFile(null);
        setAvatarPreview(null);
        setEditError(null);
        setEditing(true);
    };

    const cancelEditing = () => {
        setEditing(false);
        setAvatarFile(null);
        setAvatarPreview(null);
        setEditError(null);
    };

    const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const saveProfile = async () => {
        setSaving(true);
        setEditError(null);
        try {
            const formData = new FormData();
            formData.append('username', editForm.username);
            formData.append('bio', editForm.bio);
            if (avatarFile) formData.append('avatar', avatarFile);
            const { data } = await api.put('/api/auth/me', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setProfile(data.user);
            setEditing(false);
            setAvatarFile(null);
            setAvatarPreview(null);
        } catch (err: any) {
            setEditError(err?.response?.data?.error || 'Failed to save changes');
        } finally {
            setSaving(false);
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
                                            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-1">
                                                {profile.username}
                                            </h1>
                                            <p className="text-gray-400 text-sm sm:text-base">{profile.email}</p>
                                            {profile.bio && (
                                                <p className="text-gray-300 text-sm mt-1">{profile.bio}</p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={startEditing}
                                                className="w-full sm:w-auto px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition text-sm"
                                            >
                                                Edit Profile
                                            </button>
                                            <button
                                                onClick={() => { logout(); router.push('/login'); }}
                                                className="w-full sm:w-auto px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition text-sm"
                                            >
                                                Logout
                                            </button>
                                        </div>
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
                                            <label className="text-sm text-gray-400">Bio</label>
                                            <p className="text-text-primary font-medium">{profile.bio || '—'}</p>
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

            {/* Edit Profile Modal */}
            {editing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-lg font-bold text-white mb-5">Edit Profile</h2>

                        <div className="space-y-4">
                            <div className="flex flex-col items-center gap-2">
                                <div className="relative group w-20 h-20">
                                    <img
                                        src={avatarPreview || getAvatarUrl(profile.avatar, profile.username)}
                                        alt="Avatar"
                                        className="w-20 h-20 rounded-full object-cover"
                                    />
                                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
                                    </label>
                                </div>
                                <p className="text-xs text-gray-500">Click to change photo</p>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Username</label>
                                <input
                                    type="text"
                                    value={editForm.username}
                                    onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500 transition"
                                    maxLength={30}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Bio</label>
                                <textarea
                                    value={editForm.bio}
                                    onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                                    rows={3}
                                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500 transition resize-none"
                                    maxLength={500}
                                    placeholder="Tell people about yourself..."
                                />
                                <p className="text-xs text-gray-500 text-right mt-0.5">{editForm.bio.length}/500</p>
                            </div>

                            {editError && (
                                <p className="text-sm text-red-400">{editError}</p>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={cancelEditing}
                                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveProfile}
                                disabled={saving || !editForm.username.trim()}
                                className="flex-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-semibold transition"
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
