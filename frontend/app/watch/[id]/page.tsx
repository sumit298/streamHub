"use client";
import React, { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { Device, types } from "mediasoup-client";
import { io, Socket } from "socket.io-client";
import toast from "react-hot-toast";
import { api, useAuth } from "@/lib/AuthContext";
import ChatPanel from "@/components/ChatPanel";

const WatchPage = () => {
  const params = useParams();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const initRef = useRef(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [streamInfo, setStreamInfo] = useState<{
    title?: string;
    category?: string;
    tags?: string[];
    description?: string;
  } | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [streamStartTime, setStreamStartTime] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [streamEnded, setStreamEnded] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const [recvTransport, setRecvTransport] = useState<types.Transport | null>(null);
  const [consumedProducers, setConsumedProducers] = useState<Set<string>>(
    new Set()
  );
  const screenProducerIds = useRef<Set<string>>(new Set());
  const [pipPosition, setPipPosition] = useState({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    // Mute/unmute main video
    if (videoRef.current) {
      videoRef.current.muted = newMutedState;
    }
    
    // Mute/unmute PiP video
    if (pipVideoRef.current) {
      pipVideoRef.current.muted = newMutedState;
    }
    
    // Mute/unmute screen share video
    if (screenVideoRef.current) {
      screenVideoRef.current.muted = newMutedState;
    }
  };

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;

    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handlePipMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - pipPosition.x,
      y: e.clientY - pipPosition.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPipPosition({
          x: e.clientX - dragStart.current.x,
          y: e.clientY - dragStart.current.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

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

      const newSocket = io(
        process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001",
        {
          withCredentials: true,
          transports: ["websocket", "polling"],
        }
      );

      newSocket.on("connect", () => {
        console.log("Viewer connected, socket ID:", newSocket.id);
        newSocket.emit("join-stream", { streamId: params.id });
      });

      newSocket.on("viewer-count", (count: number) => {
        console.log("👁️ VIEWER received viewer-count:", count, typeof count);

        setViewerCount(count);
      });

      newSocket.on("existing-producers", async (producers: Array<{id: string; kind: string; userId: string; isScreenShare?: boolean}>) => {
        console.log("👁️ VIEWER received existing producers:", producers);

        if (producers.length > 0 && !initRef.current) {
          await initializeViewer();
        }
      });

      newSocket.on("new-producer", async (data: {producerId: string; kind: string; userId: string; isScreenShare?: boolean}) => {
        console.log("📺 New producer available:", data);
        
        if (!initRef.current && socket && streamInfo) {
          await initializeViewer();
        }
      });

      newSocket.on("stream-start-time", (data) => {
        console.log("⏱️ Received stream start time:", data.startTime);
        setStreamStartTime(data.startTime);
      });

      newSocket.on("stream-ended", () => {
        console.log("🛑 Stream has ended");
        setStreamEnded(true);
        toast.error("Stream has ended", { position: "bottom-left" });
      });

      newSocket.on("error", (error) => {
        console.error("Socket error:", error);
        toast.error("Connection error", { position: "bottom-left" });
      });

      setSocket(newSocket);
    };

    init();
    return () => {
      socket?.off("connect");
      socket?.off("viewer-count");
      socket?.off("existing-producers");
      socket?.off("new-producer");
      socket?.off("stream-start-time");
      socket?.off("stream-ended");
      socket?.off("error");
      socket?.close();
    };
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

  // Set PiP video stream when screen sharing becomes active
  useEffect(() => {
    if (pipVideoRef.current && cameraStreamRef.current && screenStream) {
      pipVideoRef.current.srcObject = cameraStreamRef.current;
      pipVideoRef.current.play().catch(e => console.error('PiP play failed:', e));
    }
  }, [screenStream]);

  // Handle new producers (screen share) after device and transport are ready
  useEffect(() => {
    if (!socket || !device || !recvTransport) return;

    const handleNewProducer = async (data: {producerId: string; kind: string; userId: string; isScreenShare?: boolean}) => {
      console.log('📺 New producer available (handler):', data);
      
      // Only handle screen share producers here
      if (!data.isScreenShare) {
        console.log('Ignoring non-screen-share producer');
        return;
      }
      
      if (consumedProducers.has(data.producerId)) {
        console.log('Already consumed this producer');
        return;
      }

      const consumer = await consumeProducer(data.producerId, data.kind);
      if (!consumer) return;

      setConsumedProducers((prev) => new Set(prev).add(data.producerId));

      if (data.kind === "video") {
        screenProducerIds.current.add(data.producerId);
        const stream = new MediaStream([consumer.track]);
        setScreenStream(stream);
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = stream;
          screenVideoRef.current.play().catch(e => console.error('Play failed:', e));
        }
        toast.success("Screen sharing started", { position: "bottom-left" });
      } else if (data.kind === "audio") {
        screenProducerIds.current.add(data.producerId);
        setScreenStream((prev) => {
          if (prev && screenVideoRef.current) {
            prev.addTrack(consumer.track);
            screenVideoRef.current.srcObject = new MediaStream(prev.getTracks());
          }
          return prev;
        });
      }
    };

    const handleProducerClosed = (data: {producerId: string}) => {
      console.log('Producer closed:', data.producerId, 'Screen producers:', Array.from(screenProducerIds.current));
      
      // Only handle screen producers
      if (screenProducerIds.current.has(data.producerId)) {
        screenProducerIds.current.delete(data.producerId);
        setConsumedProducers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.producerId);
          return newSet;
        });
        
        // Clear screen only when ALL screen producers are closed
        if (screenProducerIds.current.size === 0) {
          console.log('All screen producers closed, clearing screen');
          setScreenStream((prev) => {
            if (prev) {
              prev.getTracks().forEach(track => track.stop());
              if (screenVideoRef.current) {
                screenVideoRef.current.srcObject = null;
              }
              return null;
            }
            return prev;
          });
          
          // Restore camera stream to main video when screen share ends
          if (videoRef.current && cameraStreamRef.current) {
            videoRef.current.srcObject = cameraStreamRef.current;
            videoRef.current.play().catch(e => console.error('Play failed:', e));
          }
          
          toast("Screen sharing stopped", { position: "bottom-left" });
        }
      }
    };

    socket.on("new-producer", handleNewProducer);
    socket.on("producer-closed", handleProducerClosed);

    return () => {
      socket.off("new-producer", handleNewProducer);
      socket.off("producer-closed", handleProducerClosed);
    };
  }, [socket, device, recvTransport, consumedProducers]);

  const fetchStreamInfo = async () => {
    try {
      const { data } = await api.get(`/api/streams/${params.id}`);
      setStreamInfo(data.stream);
    } catch (error) {
      console.error("Failed to fetch stream info:", error);
      toast.error("Stream not found", { position: "bottom-left" });
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  };

  const consumeProducer = async (producerId: string, kind: string) => {
    if (!socket || !device || !recvTransport) return;

    try {
      const consumerData = (await new Promise<{
        id: string;
        producerId: string;
        kind: string;
        rtpParameters: types.RtpParameters;
      }>((resolve) => {
        socket.emit(
          "consume",
          {
            roomId: params.id,
            producerId,
            rtpCapabilities: device.rtpCapabilities,
          },
          resolve
        );
      }));

      if (!consumerData?.id) return;

      const consumer = await recvTransport.consume({
        id: consumerData.id,
        producerId: consumerData.producerId,
        kind: consumerData.kind as types.MediaKind,
        rtpParameters: consumerData.rtpParameters,
      });

      await new Promise<void>((resolve) => {
        socket.emit(
          "resume-consumer",
          {
            roomId: params.id,
            consumerId: consumer.id,
          },
          resolve
        );
      });
      return consumer;
    } catch (error) {
      console.error("Failed to consume producer:", error);
    }
  };

  const initializeViewer = async () => {
    if (initRef.current) {
      console.log("Already initialized, skipping");
      return;
    }
    initRef.current = true;

    try {
      const startTime = performance.now();
      console.log("Initializing viewer for stream:", params.id);

      const t1 = performance.now();
      const routerCapabilities = (await new Promise<types.RtpCapabilities>((resolve) => {
        socket?.emit("get-router-capabilities", resolve);
      }));
      console.log(`Got router capabilities (${(performance.now() - t1).toFixed(0)}ms)`);

      const t2 = performance.now();
      const newDevice = new Device();
      await newDevice.load({ routerRtpCapabilities: routerCapabilities });
      setDevice(newDevice);
      console.log(`Device loaded (${(performance.now() - t2).toFixed(0)}ms)`);

      const t3 = performance.now();
      const transportInfo = (await new Promise<types.TransportOptions>((resolve) => {
        socket?.emit(
          "create-transport",
          { roomId: params.id, direction: "recv" },
          resolve
        );
      }));
      console.log(`Transport created (${(performance.now() - t3).toFixed(0)}ms)`);

      const recvTransport = newDevice.createRecvTransport(transportInfo);
      setRecvTransport(recvTransport);
      console.log("Receive transport created");

      // Monitor connection state
      recvTransport.on("connectionstatechange", (state) => {
        console.log(`🔗 Recv transport connection state: ${state}`);
        if (state === "failed" || state === "closed") {
          console.error("Transport connection failed!");
          toast.error("Connection failed");
        }
      });

      recvTransport.on("connect", async ({ dtlsParameters }, callback) => {
        console.log("🔌 Recv transport connecting...");
        const connectStart = performance.now();
        socket?.emit(
          "connect-transport",
          {
            roomId: params.id,
            transportId: recvTransport.id,
            dtlsParameters,
          },
          () => {
            console.log(`✅ Recv transport connected (${(performance.now() - connectStart).toFixed(0)}ms)`);
            callback();
          }
        );
      });

      // Get existing producers first
      const producers = (await new Promise<Array<{id: string; kind: string; userId: string; isScreenShare?: boolean}>>((resolve) => {
        socket?.emit("get-producers", { roomId: params.id }, resolve);
      }));
      console.log("Available producers:", producers);

      if (!producers || producers.length === 0) {
        console.log("⏳ No producers yet, waiting for stream to start...");
        initRef.current = false;
        setIsLoading(false);
        toast("Waiting for stream to start...", { icon: "⏳", position: "bottom-left" });
        return;
      }

      // Filter out screen share producers - only consume camera/mic initially
      const cameraProducers = producers.filter((p) => !p.isScreenShare);
      
      console.log("Camera producers to consume:", cameraProducers);
      
      if (cameraProducers.length === 0) {
        console.log("⏳ No camera producers yet, waiting for stream to start...");
        initRef.current = false;
        setIsLoading(false);
        toast("Waiting for stream to start...", { icon: "⏳", position: "bottom-left" });
        return;
      }

      const stream = new MediaStream();

      // Consume audio FIRST (only camera audio)
      const audioProducer = cameraProducers.find((p) => p.kind === "audio");
      if (audioProducer) {
        const audioConsumer = (await new Promise<{
          id: string;
          producerId: string;
          kind: string;
          rtpParameters: types.RtpParameters;
        }>((resolve) => {
          socket?.emit(
            "consume",
            {
              roomId: params.id,
              producerId: audioProducer.id,
              rtpCapabilities: newDevice.rtpCapabilities,
            },
            resolve
          );
        }));
        console.log("Audio consumer created:", audioConsumer);

        if (audioConsumer?.id) {
          const consumer = await recvTransport.consume({
            id: audioConsumer.id,
            producerId: audioConsumer.producerId,
            kind: audioConsumer.kind as types.MediaKind,
            rtpParameters: audioConsumer.rtpParameters,
          });

          await new Promise((resolve) => {
            socket?.emit(
              "resume-consumer",
              {
                roomId: params.id,
                consumerId: consumer.id,
              },
              resolve
            );
          });

          stream.addTrack(consumer.track);
          setConsumedProducers((prev) => new Set(prev).add(audioProducer.id));
          console.log("Audio track added to stream");
        }
      }

      // Then consume video (only camera video)
      const videoProducer = cameraProducers.find((p: any) => p.kind === "video");
      if (!videoProducer) {
        throw new Error("No camera video producer found");
      }

      const videoConsumer = (await new Promise((resolve) => {
        socket?.emit(
          "consume",
          {
            roomId: params.id,
            producerId: videoProducer.id,
            rtpCapabilities: newDevice.rtpCapabilities,
          },
          resolve
        );
      })) as any;
      console.log("Video consumer created:", videoConsumer);

      if (videoConsumer?.id) {
        const consumer = await recvTransport.consume({
          id: videoConsumer.id,
          producerId: videoConsumer.producerId,
          kind: videoConsumer.kind,
          rtpParameters: videoConsumer.rtpParameters,
        });

        // Resume consumer to start receiving media
        await new Promise((resolve) => {
          socket?.emit(
            "resume-consumer",
            {
              roomId: params.id,
              consumerId: consumer.id,
            },
            resolve
          );
        });

        stream.addTrack(consumer.track);
        setConsumedProducers((prev) => new Set(prev).add(videoProducer.id));
        console.log("Video track added to stream");
      }

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        console.log(
          "Stream set to video element, tracks:",
          stream.getTracks().length
        );

        stream.getTracks().forEach((track) => {
          console.log(
            `Track ${track.kind}: enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`
          );
        });

        const playVideo = async () => {
          try {
            await video.play();
            console.log("Video playback started");
            setIsLoading(false);
            toast.success("Connected to stream", { position: "bottom-left" });
          } catch (e) {
            console.error("Play failed:", e);
            setIsLoading(false);
          }
        };

        // Force immediate playback without waiting for loadeddata
        playVideo();
        
        // Store camera stream for PiP use
        cameraStreamRef.current = stream;
        setCameraStream(stream);
      } else {
        throw new Error("Video element not found");
      }
    } catch (error) {
      console.error("Failed to initialize viewer:", error);
      setIsLoading(false);
      initRef.current = false;
      toast.error("Failed to connect to stream", { position: "bottom-left" });
    }
  };

  const leaveStream = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    socket?.close();
    toast.success("Disconnected from stream", { position: "bottom-left" });
    window.location.href = "/dashboard";
  };

  return (
    <div className="fixed inset-0 bg-gray-800">
      {/* Stream Ended Overlay */}
      {streamEnded && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-gray-800 rounded-xl p-8 max-w-md text-center border border-gray-700">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-white">Stream Ended</h2>
            <p className="text-gray-400 mb-6">
              The streamer has ended this broadcast
            </p>
            <button
              onClick={() => (window.location.href = "/dashboard")}
              className="bg-purple-350 hover:bg-purple-350/80 text-white px-6 py-3 rounded-xl font-semibold transition w-full"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <button
                onClick={leaveStream}
                className="text-white hover:text-gray-400 transition flex items-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Leave
              </button>
              <div className="border-l border-gray-700 h-8"></div>
              <div>
                <h1 className="text-lg font-bold text-white">
                  {streamInfo?.title || "Loading..."}
                </h1>
                <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                  <span className="px-2 py-0.5 bg-gray-700 rounded capitalize text-xs">
                    {streamInfo?.category}
                  </span>
                  {streamInfo?.tags && streamInfo.tags.length > 0 && (
                    <div className="flex gap-1">
                      {streamInfo.tags
                        .slice(0, 3)
                        .map((tag: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-purple-350/20 text-purple-350 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 text-red-500 rounded-full font-medium text-sm">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                LIVE
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-750 text-white rounded-full text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path
                    fillRule="evenodd"
                    d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {viewerCount}
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-750 text-white rounded-full text-sm">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {formatDuration(duration)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="h-[calc(100vh-120px)] flex flex-col">
        <div className="flex flex-1 overflow-hidden">
          {/* Main Video Area */}
          <div className="flex-1 flex flex-col p-4">
            {screenStream && screenProducerIds.current.size > 0 ? (
              /* Screen Share with Camera PiP */
              <div ref={videoContainerRef} className="flex-1 bg-gray-800 rounded-xl overflow-hidden relative border border-gray-700">
                {/* Screen Share - Main */}
                <video
                  ref={screenVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
                <div className="absolute bottom-4 left-4 bg-gray-750 px-3 py-2 rounded-lg flex items-center gap-2">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-white font-medium">Screen Share</span>
                </div>

                {/* Camera - Picture in Picture */}
                <div 
                  className={`absolute w-64 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700 shadow-xl cursor-move ${!cameraStreamRef.current ? 'hidden' : ''}`}
                  style={{ left: `${pipPosition.x}px`, top: `${pipPosition.y}px` }}
                  onMouseDown={handlePipMouseDown}
                >
                  <video
                    ref={pipVideoRef}
                    autoPlay
                    playsInline
                    muted={isMuted}
                    className="w-full h-full object-cover"
                  />
                  {!isLoading && isMuted && (
                    <button
                      onClick={toggleMute}
                      className="absolute bottom-2 right-2 bg-white hover:bg-gray-100 text-black p-2 rounded-lg font-semibold transition shadow-lg"
                      title="Unmute"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Camera - Full View */
              <div ref={videoContainerRef} className="flex-1 bg-gray-800 rounded-xl overflow-hidden relative border border-gray-700">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted={isMuted}
                  controls
                  className="w-full h-full object-cover"
                />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="text-center">
                      <div className="w-16 h-16 border-4 border-purple-350 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-white font-medium">
                        Connecting to stream...
                      </p>
                      <p className="text-gray-400 text-sm mt-2">Please wait</p>
                    </div>
                  </div>
                )}
                {!isLoading && isMuted && (
                  <button
                    onClick={toggleMute}
                    className="absolute bottom-4 right-4 bg-white hover:bg-gray-100 text-black px-4 py-2 rounded-xl font-semibold transition flex items-center gap-2 shadow-lg"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Click to Unmute
                  </button>
                )}
              </div>
            )}


          </div>

          {/* Sidebar - Chat - Hidden on mobile */}
          <div className="hidden lg:flex w-80 flex-col p-4 max-h-full">
            <div className="flex-1 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <ChatPanel
                socket={socket}
                streamId={params.id as string}
                username={user?.username || "Anonymous"}
              />
            </div>
          </div>
        </div>

        {/* Mobile Chat Button - Only visible on mobile */}
        <button
          onClick={() => setShowMobileChat(true)}
          className="lg:hidden fixed bottom-20 right-4 bg-purple-350 hover:bg-purple-350/80 text-white p-4 rounded-full shadow-lg z-20 transition"
          title="Open Chat"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>

        {/* Mobile Chat Modal */}
        {showMobileChat && (
          <div className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end">
            <div className="bg-gray-800 w-full h-[80vh] rounded-t-2xl border-t border-gray-700 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">Chat</h3>
                <button
                  onClick={() => setShowMobileChat(false)}
                  className="text-white hover:text-gray-400 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatPanel
                  socket={socket}
                  streamId={params.id as string}
                  username={user?.username || "Anonymous"}
                />
              </div>
            </div>
          </div>
        )}

        {/* Bottom Control Bar */}
        <div className="bg-gray-800 border-t border-gray-700 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
            <button
              onClick={toggleMute}
              className={`p-2 rounded-full transition ${
                isMuted
                  ? "bg-red-650 hover:bg-red-650/80"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchPage;
