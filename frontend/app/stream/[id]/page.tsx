"use client"
import React, { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { Device } from 'mediasoup-client';
import { io, Socket } from 'socket.io-client';
import toast from "react-hot-toast";
import { useAuth } from "@/lib/AuthContext";
import ChatPanel from "@/components/ChatPanel";

const StreamsPage = () => {
    const params = useParams();
    const { user } = useAuth();
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
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [connectionTested, setConnectionTested] = useState(false);
    const [streamingStatus, setStreamingStatus] = useState<'idle' | 'connecting' | 'live' | 'failed'>('idle');




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
            setIsTestingConnection(true);
            setConnectionStatus('connecting');
            
            console.log('Testing connection to:', process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_SOCKET_URL);
            
            const routerCapabilities = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Connection timeout - server not responding')), 10000);
                socket?.emit("get-router-capabilities", (response: any) => {
                    clearTimeout(timeout);
                    if (!response) {
                        reject(new Error('No response from server'));
                    } else {
                        resolve(response);
                    }
                });
            }) as any;

            console.log('Router capabilities received');
            
            const newDevice = new Device();
            await newDevice.load({ routerRtpCapabilities: routerCapabilities });
            setDevice(newDevice);
            setConnectionStatus('connected');
            setConnectionTested(true);
            toast.success('Connection test successful! You can now go live.');
        } catch (error: any) {
            console.error("MediaSoup initialization failed:", error);
            setConnectionStatus('failed');
            setConnectionTested(false);
            toast.error(error.message || 'Connection test failed. Please check your network and try again.');
        } finally {
            setIsTestingConnection(false);
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
        if (!stream || !device || !socket) {
            toast.error('Please enable camera and test connection first');
            return;
        }
        
        if (!connectionTested || connectionStatus !== 'connected') {
            toast.error('Please test connection before going live');
            return;
        }
        
        try {
            const transportInfo = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Transport creation timeout')), 10000);
                socket.emit('create-transport', { roomId: params.id, direction: "send" }, (response: any) => {
                    clearTimeout(timeout);
                    resolve(response);
                });
            }) as any

            console.log('Transport info received:', transportInfo); // Add this

            if (!transportInfo || !transportInfo.id) {
                throw new Error('Invalid transport info received');
            }


            const sendTransport = device.createSendTransport(transportInfo);

            sendTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
                try {
                    console.log('🔌 Connecting transport...', {
                        transportId: sendTransport.id,
                        roomId: params.id
                    });
                    
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => reject(new Error('Connect transport timeout')), 10000);
                        socket.emit("connect-transport", { 
                            roomId: params.id, 
                            transportId: sendTransport.id, 
                            dtlsParameters 
                        }, (response: any) => {
                            clearTimeout(timeout);
                            if (response?.error) {
                                console.error('❌ Transport connect error:', response.error);
                                reject(new Error(response.error));
                            } else {
                                console.log('✅ Transport connected successfully');
                                resolve(response);
                            }
                        });
                    });
                    
                    callback();
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
                
                if (state === 'connected') {
                    console.log('✅ Transport fully connected, stream is live!');
                    setStreamingStatus('live');
                    toast.success('Stream is now live!');
                } else if (state === 'connecting') {
                    setStreamingStatus('connecting');
                } else if (state === 'failed' || state === 'closed') {
                    console.error('❌ Transport connection failed or closed');
                    setStreamingStatus('failed');
                    setConnectionStatus('failed');
                    setConnectionTested(false);
                    toast.error('Stream connection lost. Ending stream...');
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
            setConnectionTested(false);
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
        if (permissions.camera && socket && !connectionTested) {
            initializeMediaSoup()
        }
    }, [permissions.camera, socket])

    const copyStreamLink = () => {
        const link = `${window.location.origin}/watch/${params.id}`;
        navigator.clipboard.writeText(link)
        toast.success("Stream link copied to clipboard")
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-card border-b border-gray-700 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <a href="/dashboard" className="text-gray-900 hover:text-gray-400 transition">
                            ← Back
                        </a>
                        <div>
                            <h1 className="text-lg font-semibold">Stream Studio</h1>
                            <p className="text-xs text-gray-400">ID: {params.id}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {isStreaming && (
                            <>
                                <div className="flex items-center gap-3 text-sm">
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 text-red-500 rounded-full font-medium">
                                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                        LIVE
                                    </span>
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 rounded-full">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                        </svg>
                                        {viewerCount}
                                    </span>
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 rounded-full">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {formatDuration(duration)}
                                    </span>
                                </div>
                            </>
                        )}
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
                            muted
                            className="w-full h-full object-cover"
                        />
                        {!permissions.camera && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                                <div className="text-center">
                                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-gray-400 mb-4">Camera preview will appear here</p>
                                </div>
                            </div>
                        )}
                        {isStreaming && (
                            <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2">
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                LIVE
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="bg-card rounded-lg p-4">
                        <div className="flex flex-wrap gap-3">
                            {!permissions.camera ? (
                                <button
                                    onClick={requestPermissions}
                                    className="flex-1 bg-primary hover:bg-primary/80 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Enable Camera & Microphone
                                </button>
                            ) : (
                                <>
                                    {!isStreaming ? (
                                        <button
                                            onClick={startStream}
                                            disabled={!connectionTested || connectionStatus !== 'connected'}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            title={!connectionTested ? 'Please test connection first' : ''}
                                        >
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                            </svg>
                                            {!connectionTested ? 'Test Connection First' : 'Go Live'}
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={toggleMute}
                                                className={`px-4 py-3 rounded-lg font-medium transition ${
                                                    isMuted ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'
                                                }`}
                                            >
                                                {isMuted ? '🔇' : '🔊'}
                                            </button>
                                            <button
                                                onClick={toggleCamera}
                                                className={`px-4 py-3 rounded-lg font-medium transition ${
                                                    isCameraOff ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'
                                                }`}
                                            >
                                                {isCameraOff ? '📷' : '📹'}
                                            </button>
                                            <button
                                                onClick={stopStream}
                                                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                                                </svg>
                                                End Stream
                                            </button>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    {/* Chat */}
                    <div className="bg-card rounded-lg h-[400px]">
                        <ChatPanel socket={socket} streamId={params.id as string} username={user?.username || 'Streamer'} />
                    </div>

                    {/* Connection Status */}
                    <div className="bg-card rounded-lg p-4">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Connection Status
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${
                                    connectionStatus === 'connected' ? 'bg-green-500' :
                                    connectionStatus === 'connecting' || isTestingConnection ? 'bg-yellow-500 animate-pulse' :
                                    connectionStatus === 'failed' ? 'bg-red-500' :
                                    'bg-gray-500'
                                }`}></span>
                                <span className="text-sm capitalize">
                                    {isTestingConnection ? 'Testing...' :
                                     connectionStatus === 'connected' ? 'Connected' :
                                     connectionStatus === 'connecting' ? 'Connecting...' :
                                     connectionStatus === 'failed' ? 'Failed' :
                                     'Disconnected'}
                                </span>
                            </div>
                            {connectionStatus === 'failed' && (
                                <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded">
                                    Connection test failed. Please check your network and try again.
                                </div>
                            )}
                            {connectionTested && connectionStatus === 'connected' && !isStreaming && (
                                <div className="text-xs text-green-400 bg-green-500/10 p-2 rounded">
                                    ✓ Ready to go live!
                                </div>
                            )}
                            {permissions.camera && !connectionTested && connectionStatus !== 'connecting' && (
                                <button
                                    onClick={initializeMediaSoup}
                                    disabled={isTestingConnection}
                                    className="w-full bg-primary hover:bg-primary/80 text-white px-3 py-2 rounded text-sm font-medium transition disabled:opacity-50"
                                >
                                    {isTestingConnection ? 'Testing...' : 'Test Connection'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Share Stream */}
                    <div className="bg-card rounded-lg p-4">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            Share Stream
                        </h3>
                        <button
                            onClick={copyStreamLink}
                            className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy Link
                        </button>
                    </div>

                    {/* Quick Tips */}
                    <div className="bg-card rounded-lg p-4">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Quick Tips
                        </h3>
                        <ul className="text-sm text-gray-400 space-y-2">
                            <li className="flex items-start gap-2">
                                <span className="text-primary mt-0.5">•</span>
                                <span>Test your camera and mic before going live</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-primary mt-0.5">•</span>
                                <span>Share your stream link with viewers</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-primary mt-0.5">•</span>
                                <span>Monitor viewer count in real-time</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StreamsPage;
