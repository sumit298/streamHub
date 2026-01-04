"use client"
import React, { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { Device } from 'mediasoup-client';
import { io, Socket } from 'socket.io-client';
import toast from "react-hot-toast";
import { api } from "@/lib/AuthContext";


const WatchPage = () => {
    const params = useParams();
    const videoRef = useRef<HTMLVideoElement>(null);
    const initRef = useRef(false);
    const [device, setDevice] = useState<Device | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [viewerCount, setViewerCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [streamInfo, setStreamInfo] = useState<any>(null);
    const [isMuted, setIsMuted] = useState(true);
    const [streamStartTime, setStreamStartTime] = useState<number | null>(null);
    const [duration, setDuration] = useState(0);

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    useEffect(() => {
        // Reset on mount
        initRef.current = false;

        return () => {
            // Reset on unmount so reload works
            initRef.current = false;
        };
    }, []);


    useEffect(() => {
        const init = async () => {
            await fetchStreamInfo();

            const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001", {
                withCredentials: true,
                transports: ['websocket', 'polling']
            });

            newSocket.on('connect', () => {
                console.log('Viewer connected, socket ID:', newSocket.id);
                newSocket.emit('join-stream', { streamId: params.id });
            });

            newSocket.on("viewer-count", (count: number) => {
                console.log("👁️ VIEWER received viewer-count:", count, typeof count);

                setViewerCount(count);
            });

            newSocket.on('existing-producers', async (producers: any[]) => {
                console.log('👁️ VIEWER received existing producers:', producers);

                if (producers.length > 0 && !initRef.current) {
                    await initializeViewer();
                }
            })

            newSocket.on("new-producer", async (data: any) => {
                console.log('📺 New producer available:', data);
                if (!initRef.current && socket && streamInfo) {
                    await initializeViewer();
                }
            })

            newSocket.on("stream-start-time", (data) => {
                console.log('⏱️ Received stream start time:', data.startTime);
                setStreamStartTime(data.startTime);
            })

            newSocket.on('error', (error) => {
                console.error('Socket error:', error);
                toast.error('Connection error');
            });

            setSocket(newSocket);
        };

        init();
        return () => { socket?.close(); };
    }, [params.id]);

    useEffect(() => {
        if (socket && streamInfo) {
            initializeViewer();
        }
    }, [socket, streamInfo]);

    useEffect(() => {
        if (!streamStartTime) return;

        const interval = setInterval(() => {
            setDuration(Math.floor((Date.now() - streamStartTime) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [streamStartTime]);

    const fetchStreamInfo = async () => {
        try {
            const { data } = await api.get(`/api/streams/${params.id}`);
            setStreamInfo(data.stream);
        } catch (error) {
            console.error('Failed to fetch stream info:', error);
            toast.error('Stream not found');
        }
    };

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };


    const initializeViewer = async () => {
        if (initRef.current) {
            console.log('Already initialized, skipping');
            return;
        }
        initRef.current = true;

        try {
            console.log('Initializing viewer for stream:', params.id);

            const routerCapabilities = await new Promise((resolve) => {
                socket?.emit("get-router-capabilities", resolve);
            }) as any;
            console.log('Got router capabilities');

            const newDevice = new Device();
            await newDevice.load({ routerRtpCapabilities: routerCapabilities });
            setDevice(newDevice);
            console.log('Device loaded');

            const transportInfo = await new Promise((resolve) => {
                socket?.emit('create-transport', { roomId: params.id, direction: "recv" }, resolve);
            }) as any;
            console.log('Transport created:', transportInfo);

            const recvTransport = newDevice.createRecvTransport(transportInfo);
            console.log('Receive transport created');

            recvTransport.on("connect", async ({ dtlsParameters }, callback) => {
                socket?.emit("connect-transport", {
                    roomId: params.id,
                    transportId: recvTransport.id,
                    dtlsParameters
                }, callback);
            });

            // Get existing producers first
            const producers = await new Promise((resolve) => {
                socket?.emit('get-producers', { roomId: params.id }, resolve);
            }) as any;
            console.log('Available producers:', producers);

            if (!producers || producers.length === 0) {
                console.log('⏳ No producers yet, waiting for stream to start...');
                initRef.current = false;
                setIsLoading(false);
                toast('Waiting for stream to start...', { icon: '⏳' });
                return;
            }

            const stream = new MediaStream();

            // Consume audio FIRST
            const audioProducer = producers.find((p: any) => p.kind === 'audio');
            if (audioProducer) {
                const audioConsumer = await new Promise((resolve) => {
                    socket?.emit("consume", {
                        roomId: params.id,
                        producerId: audioProducer.id,
                        rtpCapabilities: newDevice.rtpCapabilities
                    }, resolve);
                }) as any;
                console.log('Audio consumer created:', audioConsumer);

                if (audioConsumer?.id) {
                    const consumer = await recvTransport.consume({
                        id: audioConsumer.id,
                        producerId: audioConsumer.producerId,
                        kind: audioConsumer.kind,
                        rtpParameters: audioConsumer.rtpParameters
                    });

                    await new Promise((resolve) => {
                        socket?.emit('resume-consumer', {
                            roomId: params.id,
                            consumerId: consumer.id
                        }, resolve);
                    });

                    stream.addTrack(consumer.track);
                    console.log('Audio track added to stream');
                }
            }

            // Then consume video
            const videoProducer = producers.find((p: any) => p.kind === 'video');
            if (!videoProducer) {
                throw new Error('No video producer found');
            }

            const videoConsumer = await new Promise((resolve) => {
                socket?.emit("consume", {
                    roomId: params.id,
                    producerId: videoProducer.id,
                    rtpCapabilities: newDevice.rtpCapabilities
                }, resolve);
            }) as any;
            console.log('Video consumer created:', videoConsumer);

            if (videoConsumer?.id) {
                const consumer = await recvTransport.consume({
                    id: videoConsumer.id,
                    producerId: videoConsumer.producerId,
                    kind: videoConsumer.kind,
                    rtpParameters: videoConsumer.rtpParameters
                });

                // Resume consumer to start receiving media
                await new Promise((resolve) => {
                    socket?.emit('resume-consumer', {
                        roomId: params.id,
                        consumerId: consumer.id
                    }, resolve);
                });

                stream.addTrack(consumer.track);
                console.log('Video track added to stream');
            }



            if (videoRef.current) {
                const video = videoRef.current;
                video.srcObject = stream;
                console.log('Stream set to video element, tracks:', stream.getTracks().length);

                stream.getTracks().forEach(track => {
                    console.log(`Track ${track.kind}: enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`);
                });

                const playVideo = async () => {
                    try {
                        await video.play();
                        console.log('Video playback started');
                        setIsLoading(false);
                        toast.success("Connected to stream");
                    } catch (e) {
                        console.error('Play failed:', e);
                        setIsLoading(false);
                    }
                };

                if (video.readyState >= 2) {
                    playVideo();
                } else {
                    video.onloadeddata = playVideo;
                }
            } else {
                throw new Error('Video element not found');
            }
        } catch (error) {
            console.error("Failed to initialize viewer:", error);
            setIsLoading(false);
            initRef.current = false;
            toast.error("Failed to connect to stream");
        }
    };

    const leaveStream = () => {
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        socket?.close();
        toast.success("Disconnected from stream");
        window.location.href = "/dashboard";
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-card border-b border-gray-700 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={leaveStream}
                        className="text-gray-400 hover:text-white transition flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Leave
                    </button>
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 text-red-500 rounded-full font-medium text-sm">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            LIVE
                        </span>
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 rounded-full text-sm">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                            {viewerCount}
                        </span>
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 rounded-full text-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatDuration(duration)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Main Video Area */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted={isMuted}
                            controls
                            className="w-full h-full object-cover"
                        />
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                                <div className="text-center">
                                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                    <p className="text-white font-medium">Connecting to stream...</p>
                                    <p className="text-gray-400 text-sm mt-2">Please wait</p>
                                </div>
                            </div>
                        )}
                        {!isLoading && isMuted && (
                            <button
                                onClick={toggleMute}
                                className="absolute bottom-4 right-4 bg-white hover:bg-gray-100 text-black px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 shadow-lg"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                Click to Unmute
                            </button>
                        )}
                    </div>

                    {/* Stream Info */}
                    <div className="bg-card rounded-lg p-6">
                        <h1 className="text-2xl font-bold mb-2">{streamInfo?.title || 'Loading...'}</h1>
                        <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                            <span className="px-2 py-1 bg-gray-700 rounded capitalize">{streamInfo?.category}</span>
                            {streamInfo?.tags && streamInfo.tags.length > 0 && (
                                <div className="flex gap-2">
                                    {streamInfo.tags.slice(0, 3).map((tag: string, idx: number) => (
                                        <span key={idx} className="px-2 py-1 bg-primary/20 text-primary rounded text-xs">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        {streamInfo?.description && (
                            <p className="text-gray-300 leading-relaxed">{streamInfo.description}</p>
                        )}
                    </div>
                </div>

                {/* Sidebar - Chat placeholder */}
                <div className="space-y-4">
                    <div className="bg-card rounded-lg p-4 h-[600px] flex flex-col">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Live Chat
                        </h3>
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            <div className="text-center">
                                <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <p className="text-sm">Chat coming soon</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WatchPage;
