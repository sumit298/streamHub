"use client"
import React, { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { Device } from 'mediasoup-client';
import { io, Socket } from 'socket.io-client';
import toast from "react-hot-toast";

const StreamsPage = () => {
    const params = useParams();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [permissions, setPermissions] = useState({
        camera: false,
        microphone: false
    });
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [device, setDevice] = useState<Device | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [producer, setProducer] = useState<any>(null)
    const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
    const [viewerCount, setViewerCount] = useState(0);
    const [duration, setDuration] = useState(0);
    const [streamStartTime, setStreamStartTime] = useState(null);




    useEffect(() => {
        const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001", {
            withCredentials: true, // Sends httpOnly cookies automatically
            transports: ['websocket', 'polling']
        });
        newSocket.on('connect', () => {
            console.log('Connected to server', newSocket.id);
            setConnectionStatus('connected');
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from server');
            setConnectionStatus('disconnected');
        })

        newSocket.on("error", (error) => {
            console.error('Socket error', error)
            setConnectionStatus('error');
        })

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, []);

    useEffect(() => {
        if (socket) {
            socket.on("viewer-count", (count: number) => {
                console.log("🎥 STREAMER received viewer-count:", count, typeof count);
                setViewerCount(count);
            })
            socket.on("stream-start-time", (data) => {
                console.log('⏱️ Received stream start time:', data.startTime);
                setStreamStartTime(data.startTime);
            })
        }
    }, [socket])

    useEffect(() => {
        if (!streamStartTime) {
            setDuration(0);
            return;
        }

        const interval = setInterval(() => {
            setDuration(Math.floor((Date.now() - streamStartTime) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [streamStartTime]);


    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const toggleMute = () => {
        if (stream) {
            stream.getAudioTracks()[0].enabled = !isMuted
            setIsMuted(!isMuted)
        }
    }

    const toggleCamera = () => {
        if (stream) {
            stream.getVideoTracks()[0].enabled = !isCameraOff
            setIsCameraOff(!isCameraOff)
        }
    }

    const initializeMediaSoup = async () => {
        try {
            const routerCapabilities = await new Promise((resolve) => {
                socket?.emit("get-router-capabilities", resolve);
            }) as any; // Type assertion to bypass TypeScript error

            const newDevice = new Device();
            await newDevice.load({ routerRtpCapabilities: routerCapabilities });
            setDevice(newDevice);
        } catch (error) {
            console.error("MediaSoup initialization failed:", error);
        }
    }


    const requestPermissions = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            setStream(mediaStream);
            setPermissions({ camera: true, microphone: true });

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (error) {
            console.error('Permission denied:', error);
            // Handle specific permission errors
        }
    };

    const startStream = async () => {
        if (!stream || !device || !socket) return;
        try {
            const transportInfo = await new Promise((resolve) => {
                socket.emit('create-transport', { roomId: params.id, direction: "send" }, resolve);

            }) as any

            console.log('Transport info received:', transportInfo); // Add this

            if (!transportInfo || !transportInfo.id) {
                throw new Error('Invalid transport info received');
            }


            const sendTransport = device.createSendTransport(transportInfo);

            sendTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
                try {
                    console.log('🔌 Connecting transport...');
                    socket.emit("connect-transport", { 
                        roomId: params.id, 
                        transportId: sendTransport.id, 
                        dtlsParameters 
                    }, (response: any) => {
                        if (response?.error) {
                            console.error('❌ Transport connect error:', response.error);
                            errback(new Error(response.error));
                        } else {
                            console.log('✅ Transport connected successfully');
                            callback();
                        }
                    });
                } catch (error) {
                    console.error('❌ Connect transport exception:', error);
                    errback(error);
                }
            })

            sendTransport.on("produce", async ({ kind, rtpParameters }, callback) => {
                console.log("Producing...", { kind, rtpParameters });

                socket.emit("produce", {
                    transportId: sendTransport.id,
                    kind,
                    rtpParameters,
                    roomId: params.id
                }, (response: any) => {
                    console.log("Produce response:", response);

                    if (response.error) {
                        console.error("Produce error:", response.error);
                        return; // Don't call callback on error
                    }

                    callback({ id: response.producerId });
                });
            });


            sendTransport.on('connectionstatechange', (state) => {
                console.log('🔗 Transport connection state:', state);
                setConnectionStatus(state);
                
                if (state === 'failed' || state === 'closed') {
                    console.error('❌ Transport connection failed or closed');
                    toast.error('Connection failed. Please try again.');
                    setIsStreaming(false);
                }
            });

            sendTransport.on('icestatechange', (state) => {
                console.log('🧊 ICE state:', state);
            });

            sendTransport.on('iceconnectionstatechange', (state) => {
                console.log('🧊 ICE connection state:', state);
            });

            const videoTrack = stream.getVideoTracks()[0];
            const videoProducer = await sendTransport.produce({ track: videoTrack });
            console.log("video producer created", videoProducer.id)

            const audioTrack = stream.getAudioTracks()[0];
            const audioProducer = await sendTransport.produce({ track: audioTrack });

            console.log("audio producer created", audioProducer.id)
            setProducer({ video: videoProducer, audio: audioProducer })

            const patchResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/streams/${params.id}`, {
                method: "PATCH",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    isLive: true
                })
            })

            if (!patchResponse.ok) {
                throw new Error('Failed to update stream status');
            }

            setIsStreaming(true);
            toast.success("Stream started successfully");

        } catch (error) {
            console.error("Failed to start stream", error);
            setConnectionStatus("failed")
            setIsStreaming(false);
            toast.error("Failed to start stream");
        }
    }

    const stopStream = async () => {
        try {

            if (producer) {
                producer.video?.close();
                producer.audio?.close();
                setProducer(null);
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/streams/${params.id}/end`, {
                method: "POST",
                credentials: "include"
            });

            if (!response.ok) {
                throw new Error('Failed to end stream');
            }

            // Fetch duration from backend response
            const data = await response.json();
            console.log("🎥 STREAMER received duration:", data.duration);
            setStreamStartTime(null);
            setIsStreaming(false);
            if (data.duration && !isNaN(data.duration)) {
                const finalDurationSeconds = data.duration ? Math.floor(data.duration / 1000) : duration;
                setDuration(finalDurationSeconds);
                toast.success(`Stream ended. Duration: ${formatDuration(finalDurationSeconds)}`);
            } else {
                // Fallback: use current duration state
                toast.success(`Stream ended. Duration: ${formatDuration(duration)}`);
            }

        } catch (error) {
            console.error("Failed to stop stream:", error);
            toast.error("Failed to end stream");
        }
    };


    useEffect(() => {
        if (permissions.camera && socket) {
            initializeMediaSoup()
        }
    }, [permissions.camera, socket])

    const copyStreamLink = () => {
        const link = `${window.location.origin}/watch/${params.id}`;
        navigator.clipboard.writeText(link)
        toast.success("Stream link copied to clipboard")
    }

    return (
        <div className="min-h-screen bg-background p-4">
            <div className="max-w-6xl mx-auto">
                {/* Video Preview */}
                <div className="aspect-video bg-black rounded-lg mb-4">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        className="w-full h-full object-cover rounded-lg"
                    />
                </div>

                {/* Controls */}
                <div className="flex gap-4 mb-4">
                    {!permissions.camera ? (
                        <button
                            onClick={requestPermissions}
                            className="bg-blue-600 text-white px-4 py-2 rounded"
                        >
                            Enable Camera & Mic
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={startStream}
                                disabled={isStreaming}
                                className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
                            >
                                {isStreaming ? '🔴 Live' : 'Start Stream'}
                            </button>
                            {isStreaming && (
                                <>
                                    <button
                                        onClick={toggleMute}
                                        className="bg-gray-600 text-white px-4 py-2 rounded"
                                    >
                                        {isMuted ? 'Unmute' : 'Mute'}
                                    </button>

                                    <button
                                        onClick={toggleCamera}
                                        className="bg-gray-600 text-white px-4 py-2 rounded"
                                    >
                                        {isCameraOff ? '📷 Camera On' : '📹 Camera Off'}
                                    </button>

                                </>
                            )}
                            <button
                                onClick={stopStream}
                                className="bg-red-600 text-white px-4 py-2 rounded"
                            >
                                Stop Stream
                            </button>
                        </>
                    )}
                </div>

                {/* Stream Info */}
                <div className="bg-card p-4 rounded-lg">
                    <h1 className="text-xl font-bold mb-2">Stream ID: {params.id}</h1>
                    <div className="flex gap-4 text-sm">
                        <p>Status: {isStreaming ? '🔴 Live' : '⚫ Offline'}</p>
                        {isStreaming && (
                            <>
                                <p>👁️ {viewerCount} viewers</p>
                                <p>⏱️ {formatDuration(duration)}</p>
                            </>
                        )}
                    </div>
                    <p className="text-xs mt-2">
                        Connection: 
                        <span className={`ml-1 font-medium ${
                            connectionStatus === 'connected' ? 'text-green-500' :
                            connectionStatus === 'connecting' ? 'text-yellow-500' :
                            connectionStatus === 'failed' || connectionStatus === 'error' ? 'text-red-500' :
                            'text-gray-500'
                        }`}>
                            {connectionStatus === 'connected' ? '✓ Connected' :
                             connectionStatus === 'connecting' ? '⟳ Connecting...' :
                             connectionStatus === 'failed' ? '✗ Failed' :
                             connectionStatus === 'error' ? '✗ Error' :
                             connectionStatus === 'disconnected' ? '○ Disconnected' :
                             connectionStatus}
                        </span>
                    </p>
                </div>
                <div className="mt-4">
                    <button
                        onClick={copyStreamLink}
                        className="bg-primary text-white px-4 py-2 rounded"
                    >
                        📋 Copy Stream Link
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StreamsPage;
