"use client"
import { Sidebar } from "@/components/Sidebar"
import { Navbar } from "@/components/ui/Navbar"
import { useEffect, useState } from "react"
import { useAuth, api } from "@/lib/AuthContext"
import { useRouter } from "next/navigation"

const Profile = () => {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = async () => {
        try {
            setError(null);
            const { data } = await api.get('/api/auth/me');
            setProfile(data.user);
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            setError('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="flex">
                <Sidebar />
                <main className="flex-1">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                                <div className="space-y-3">
                                    <div className="h-4 bg-gray-700 rounded w-1/4" />
                                    <div className="h-4 bg-gray-700 rounded w-1/2" />
                                    <div className="h-4 bg-gray-700 rounded w-1/3" />
                                </div>
                            </div>
                        ) : profile ? (
                            <>
                                <div className="bg-card rounded-lg p-8 mb-6">
                                    <div className="flex items-center gap-6 mb-6">
                                        <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center text-4xl font-bold text-white">
                                            {profile.username?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <h1 className="text-3xl font-bold text-text-primary mb-2">
                                                {profile.username}
                                            </h1>
                                            <p className="text-gray-400">{profile.email}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                logout();
                                                router.push('/login');
                                            }}
                                            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
                                        >
                                            Logout
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-card rounded-lg p-8">
                                    <h2 className="text-xl font-bold text-text-primary mb-4">Account Information</h2>
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