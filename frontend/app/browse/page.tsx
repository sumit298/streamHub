"use client"
import { Sidebar } from "@/components/Sidebar"
import { Navbar } from "@/components/ui/Navbar"
import { useEffect, useState } from "react"
import { api } from "@/lib/AuthContext"
import { io, Socket } from 'socket.io-client'

const BrowsePage = () => {
    const [allStreams, setAllStreams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewerCounts, setViewerCounts] = useState<Record<string, number>>({});
    const [socket, setSocket] = useState<Socket | null>(null);
    const [filter, setFilter] = useState<'all' | 'live' | 'past'>('all');

    const fetchStreams = async () => {
        try {
            const { data } = await api.get('/api/streams');
            setAllStreams(data.streams || []);
        } catch (error) {
            console.error('Failed to fetch streams:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStreams();
        
        // Connect to Socket.IO for real-time viewer counts
        const newSocket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001", {
            withCredentials: true,
            transports: ['websocket', 'polling']
        });

        newSocket.on('connect', () => {
            console.log('Browse page connected to socket');
        });

        newSocket.on('viewer-count', ({ streamId, count }: { streamId: string, count: number }) => {
            setViewerCounts(prev => ({ ...prev, [streamId]: count }));
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, []);

    // Subscribe to viewer count updates for live streams
    useEffect(() => {
        if (socket && allStreams.length > 0) {
            allStreams.forEach((stream: any) => {
                if (stream.isLive) {
                    socket.emit('subscribe-viewer-count', { streamId: stream.id });
                }
            });
        }
    }, [socket, allStreams]);

    const filteredStreams = allStreams.filter((stream: any) => {
        if (filter === 'live') return stream.isLive;
        if (filter === 'past') return !stream.isLive;
        return true; // 'all'
    });

    const liveCount = allStreams.filter((s: any) => s.isLive).length;
    const pastCount = allStreams.filter((s: any) => !s.isLive).length;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="flex">
                <Sidebar />
                <main className="flex-1">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        {/* Header */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-text-primary mb-2">Browse Streams</h1>
                            <p className="text-gray-400">Discover live and past streams from our community</p>
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex gap-4 mb-6 border-b border-gray-700">
                            <button
                                onClick={() => setFilter('all')}
                                className={`pb-3 px-4 font-medium transition ${
                                    filter === 'all' 
                                        ? 'text-primary border-b-2 border-primary' 
                                        : 'text-gray-400 hover:text-gray-300'
                                }`}
                            >
                                All Streams ({allStreams.length})
                            </button>
                            <button
                                onClick={() => setFilter('live')}
                                className={`pb-3 px-4 font-medium transition ${
                                    filter === 'live' 
                                        ? 'text-primary border-b-2 border-primary' 
                                        : 'text-gray-400 hover:text-gray-300'
                                }`}
                            >
                                🔴 Live Now ({liveCount})
                            </button>
                            <button
                                onClick={() => setFilter('past')}
                                className={`pb-3 px-4 font-medium transition ${
                                    filter === 'past' 
                                        ? 'text-primary border-b-2 border-primary' 
                                        : 'text-gray-400 hover:text-gray-300'
                                }`}
                            >
                                Past Streams ({pastCount})
                            </button>
                        </div>

                        {/* Streams Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {loading ? (
                                <p>Loading streams...</p>
                            ) : filteredStreams.length > 0 ? (
                                filteredStreams.map((stream: any) => (
                                    <div
                                        key={stream._id}
                                        onClick={() => stream.isLive && (window.location.href = `/watch/${stream.id}`)}
                                        className={`bg-card rounded-lg overflow-hidden hover:scale-105 transition ${
                                            stream.isLive ? 'cursor-pointer' : 'cursor-default opacity-75'
                                        }`}
                                    >
                                        <div className="aspect-video bg-black relative">
                                            {stream.thumbnailUrl ? (
                                                <img src={stream.thumbnailUrl} alt={stream.title} className="w-full h-full object-cover" />
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
                                            {stream.duration && !stream.isLive && (
                                                <span className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 text-xs rounded">
                                                    {Math.floor(stream.duration / 60000)}m
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-4">
                                            <h3 className="font-semibold truncate">{stream.title}</h3>
                                            <p className="text-sm text-gray-400">{stream.streamer?.username || 'Unknown'}</p>
                                            <div className="flex items-center justify-between mt-2">
                                                <p className="text-xs text-gray-500">
                                                    👁️ {stream.isLive 
                                                        ? (viewerCounts[stream.id] ?? stream.viewerCount ?? 0) 
                                                        : (stream.totalViews || 0)
                                                    } {stream.isLive ? 'watching' : 'views'}
                                                </p>
                                                <p className="text-xs text-gray-500">{stream.category}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-12">
                                    <p className="text-gray-500 text-lg">
                                        {filter === 'live' && 'No live streams right now'}
                                        {filter === 'past' && 'No past streams yet'}
                                        {filter === 'all' && 'No streams available'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default BrowsePage;
