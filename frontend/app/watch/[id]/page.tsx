"use client"
import React, { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { Device } from 'mediasoup-client';
import { io, Socket } from 'socket.io-client';
import toast from "react-hot-toast";


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

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    useEffect(() => {
        const init = async () => {
            await fetchStreamInfo();
            
            const newSocket = io("http://localhost:3001", {
                withCredentials: true,
                transports: ['websocket', 'polling']
            });

            newSocket.on('connect', () => {
                console.log('Viewer connected, socket ID:', newSocket.id);
                newSocket.emit('join-stream', { streamId: params.id });
            });

            newSocket.on("viewer-count", (count: number) => {
                setViewerCount(count);
            });

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

    const fetchStreamInfo = async () => {
        try {
            const response = await fetch(`http://localhost:3001/api/streams/${params.id}`);
            const data = await response.json();
            setStreamInfo(data.stream);
        } catch (error) {
            console.error('Failed to fetch stream info:', error);
            toast.error('Stream not found');
        }
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
                throw new Error('No active producers found. Stream may not have started yet.');
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

    return (
        <div className="min-h-screen bg-background p-4">
            <div className="max-w-6xl mx-auto">
                <div className="aspect-video bg-black rounded-lg mb-4 relative">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted={isMuted}
                        controls
                        className="w-full h-full object-cover rounded-lg"
                    />
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-white">Loading stream...</p>
                        </div>
                    )}
                    {!isLoading && isMuted && (
                        <button
                            onClick={toggleMute}
                            className="absolute bottom-4 right-4 bg-white text-black px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition flex items-center gap-2"
                        >
                            🔇 Click to Unmute
                        </button>
                    )}
                </div>
                
                <div className="bg-card p-4 rounded-lg">
                    <h1 className="text-2xl font-bold mb-2">{streamInfo?.title || 'Loading...'}</h1>
                    <div className="flex gap-4 text-sm text-gray-400">
                        <p>🔴 Live</p>
                        <p>👁️ {viewerCount} viewers</p>
                        <p>📁 {streamInfo?.category}</p>
                    </div>
                    {streamInfo?.description && (
                        <p className="mt-4 text-gray-300">{streamInfo.description}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WatchPage;
