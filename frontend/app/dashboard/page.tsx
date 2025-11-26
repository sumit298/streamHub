"use client"
import { Sidebar } from "@/components/Sidebar"
import { Navbar } from "@/components/ui/Navbar"
import { useEffect, useState } from "react"
import { useAuth, api } from "@/lib/AuthContext"

const Dashboard = () => {
    const [streams, setStreams] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user, logout } = useAuth();
    console.log("user", user)

    const handleLogout = async () => {
        await logout();
        window.location.href = '/login';
    };

    const testAuth = async () => {
        console.log('Making test API call...');
        const { data } = await api.get('/api/auth/me');
        console.log('Response:', data);
    };

    const fetchStreams = async () => {
        try {
            const { data } = await api.get('/api/streams');
            setStreams(data.streams || []);
        } catch (error) {
            console.error('Failed to fetch streams:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStreams();
    }, []);
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="flex">
                <Sidebar />
                <main className="flex-1">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        {/* Hero Section */}
                        <div className="mb-12">
                            <div className="bg-gradient-to-r from-accent-purple to-accent-pink rounded-2xl p-8 md:p-12 text-white mb-8">
                                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                                    Welcome back, {user?.username || 'User'}!
                                </h1>
                                <p className="text-lg text-white/90 mb-6 max-w-2xl">
                                    Discover amazing live streams, connect with creators, and join a
                                    vibrant community of viewers and streamers.
                                </p>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={testAuth}
                                        className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
                                    >
                                        Test Refresh Token
                                    </button>
                                    <button 
                                        onClick={handleLogout}
                                        className="bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition"
                                    >
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </div>

                      

                        {/* Live Streams */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-text-primary">
                                    Live Streams
                                </h2>
                                <a
                                    href="/browse"
                                    className="text-primary hover:underline font-medium"
                                >
                                    View all
                                </a>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {loading ? (
                                    <p>Loading streams...</p>
                                ) : streams.length > 0 ? (
                                    streams.map((stream: any) => (
                                        <div 
                                            key={stream._id} 
                                            onClick={() => stream.isLive && (window.location.href = `/watch/${stream._id}`)}
                                            className={`bg-card rounded-lg overflow-hidden hover:scale-105 transition ${
                                                stream.isLive ? 'cursor-pointer' : 'cursor-default opacity-60'
                                            }`}
                                        >
                                            <div className="aspect-video bg-black relative">
                                                {stream.thumbnailUrl ? (
                                                    <img src={stream.thumbnailUrl} alt={stream.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-500">No Preview</div>
                                                )}
                                                {stream.isLive && (
                                                    <span className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 text-xs rounded font-semibold">🔴 LIVE</span>
                                                )}
                                                {!stream.isLive && (
                                                    <span className="absolute top-2 left-2 bg-gray-600 text-white px-2 py-1 text-xs rounded">Offline</span>
                                                )}
                                            </div>
                                            <div className="p-4">
                                                <h3 className="font-semibold truncate">{stream.title}</h3>
                                                <p className="text-sm text-gray-400">{stream.streamer?.username || 'Unknown'}</p>
                                                <div className="flex items-center justify-between mt-2">
                                                    <p className="text-xs text-gray-500">👁️ {stream.viewerCount || 0} viewers</p>
                                                    <p className="text-xs text-gray-500">{stream.category}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500">No streams yet. Create your first stream!</p>
                                )}
                            </div>
                        </div>

                        
                    </div>
                </main>
            </div>
        </div>
    );


}

export default Dashboard