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
  const audioConsumerRef = useRef<types.Consumer | null>(null);
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
  const [recvTransport, setRecvTransport] = useState<types.Transport | null>(
    null,
  );
  const [consumedProducers, setConsumedProducers] = useState<Set<string>>(
    new Set(),
  );
  
  // Sync state to ref
  useEffect(() => {
    consumedProducersRef.current = consumedProducers;
  }, [consumedProducers]);
  const screenProducerIds = useRef<Set<string>>(new Set());
  const consumedProducersRef = useRef<Set<string>>(new Set());
  const [pipPosition, setPipPosition] = useState({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(true);

  const toggleMute = () => {
    const newMutedState = !isMuted;

    // On first unmute, add audio track to stream
    if (isMuted && audioConsumerRef.current && cameraStreamRef.current) {
      const audioTrack = audioConsumerRef.current.track;
      cameraStreamRef.current.addTrack(audioTrack);
      console.log("🔊 [UNMUTE] Audio track added to stream");
    }

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

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
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
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
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
      console.log(
        "🚀 [INIT] Starting initialization at:",
        new Date().toISOString(),
      );

      const fetchStart = performance.now();
      await fetchStreamInfo();
      console.log(
        `📊 [INIT] Stream info fetched in ${(performance.now() - fetchStart).toFixed(0)}ms`,
      );

      const socketStart = performance.now();
      const newSocket = io(
        process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001",
        {
          withCredentials: true,
          transports: ["websocket", "polling"],
        },
      );
      console.log(
        `🔌 [INIT] Socket created in ${(performance.now() - socketStart).toFixed(0)}ms`,
      );

      newSocket.on("connect", () => {
        console.log(
          "✅ [SOCKET] Connected at:",
          new Date().toISOString(),
          "Socket ID:",
          newSocket.id,
        );
        const joinStart = performance.now();
        newSocket.emit("join-stream", { streamId: params.id });
        console.log(
          `📡 [SOCKET] join-stream emitted in ${(performance.now() - joinStart).toFixed(0)}ms`,
        );
      });

      newSocket.on("viewer-count", (count: number) => {
        console.log(
          "👁️ [EVENT] viewer-count received at:",
          new Date().toISOString(),
          "Count:",
          count,
        );
        setViewerCount(count);
      });

      newSocket.on(
        "existing-producers",
        async (
          producers: Array<{
            id: string;
            kind: string;
            userId: string;
            isScreenShare?: boolean;
          }>,
        ) => {
          console.log(
            "🎬 [EVENT] existing-producers received at:",
            new Date().toISOString(),
            "Producers:",
            producers,
          );
          // Don't initialize here - let the useEffect handle it
        },
      );

      newSocket.on(
        "new-producer",
        async (data: {
          producerId: string;
          kind: string;
          userId: string;
          isScreenShare?: boolean;
        }) => {
          console.log(
            "📺 [EVENT] new-producer received at:",
            new Date().toISOString(),
            "Data:",
            data,
          );
          // If viewer hasn't initialized yet and this is a camera producer, trigger initialization
          if (!initRef.current && data.kind === "video") {
            console.log(
              "🎬 [EVENT] Camera producer available, triggering initialization",
            );
            initializeViewer();
          }
        },
      );

      newSocket.on("stream-start-time", (data) => {
        console.log(
          "⏱️ [EVENT] stream-start-time received at:",
          new Date().toISOString(),
          "Start time:",
          data.startTime,
        );
        setStreamStartTime(data.startTime);
      });

      newSocket.on("stream-ended", () => {
        console.log(
          "🛑 [EVENT] stream-ended received at:",
          new Date().toISOString(),
        );
        setStreamEnded(true);
        toast.error("Stream has ended", { position: "bottom-left" });
      });

      newSocket.on("error", (error) => {
        console.error("❌ [SOCKET] Error at:", new Date().toISOString(), error);
        toast.error("Connection error", { position: "bottom-left" });
      });

      const socketSetStart = performance.now();
      setSocket(newSocket);
      console.log(
        `🔧 [INIT] Socket state set in ${(performance.now() - socketSetStart).toFixed(0)}ms`,
      );
      console.log(
        "✅ [INIT] Initialization complete at:",
        new Date().toISOString(),
      );
    };

    init();
    return () => {
      console.log(
        "🧹 [CLEANUP] Cleaning up socket listeners at:",
        new Date().toISOString(),
      );
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
    console.log(
      "🔍 [EFFECT] useEffect triggered at:",
      new Date().toISOString(),
    );
    console.log(
      "🔍 [EFFECT] socket:",
      !!socket,
      "streamInfo:",
      !!streamInfo,
      "initRef.current:",
      initRef.current,
    );

    if (socket && streamInfo && !initRef.current) {
      console.log(
        "🚀 [EFFECT] All conditions met, calling initializeViewer at:",
        new Date().toISOString(),
      );
      initializeViewer();
    } else {
      console.log("⏸️ [EFFECT] Conditions not met - waiting...");
      if (!socket) console.log("  - Missing socket");
      if (!streamInfo) console.log("  - Missing streamInfo");
      if (initRef.current) console.log("  - Already initialized");
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
      pipVideoRef.current
        .play()
        .catch((e) => console.error("PiP play failed:", e));
    }
  }, [screenStream]);

  // Restore camera to main video when screen share ends
  useEffect(() => {
    if (!screenStream && videoRef.current && cameraStreamRef.current) {
      console.log(
        "🔄 [EFFECT] Screen share ended, restoring camera to main video",
      );
      console.log(
        "🔄 [EFFECT] Camera stream tracks:",
        cameraStreamRef.current
          .getTracks()
          .map((t) => `${t.kind}: ${t.readyState}`),
      );
      videoRef.current.srcObject = cameraStreamRef.current;
      videoRef.current.muted = isMuted;
      videoRef.current
        .play()
        .catch((e) => console.error("🔄 [EFFECT] Play failed:", e));
    }
  }, [screenStream, isMuted]);

  // Handle new producers (screen share) after device and transport are ready
  useEffect(() => {
    if (!socket || !device || !recvTransport) return;

    const handleNewProducer = async (data: {
      producerId: string;
      kind: string;
      userId: string;
      isScreenShare?: boolean;
    }) => {
      console.log("📺 New producer available (handler):", data);

      // Only handle screen share producers here
      if (!data.isScreenShare) {
        console.log("Ignoring non-screen-share producer");
        return;
      }

      if (consumedProducersRef.current.has(data.producerId)) {
        console.log("Already consumed this producer:", data.producerId);
        return;
      }

      console.log("🎬 [HANDLER] Attempting to consume screen producer:", data.producerId);

      const consumer = await consumeProducer(data.producerId, data.kind);
      if (!consumer) {
        console.error("❌ [HANDLER] Failed to consume producer:", data.producerId);
        return;
      }

      console.log("✅ [HANDLER] Successfully consumed producer:", data.producerId);
      setConsumedProducers((prev) => new Set(prev).add(data.producerId));

      if (data.kind === "video") {
        screenProducerIds.current.add(data.producerId);
        const stream = new MediaStream([consumer.track]);
        setScreenStream(stream);
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = stream;
          screenVideoRef.current.muted = isMuted;
          await screenVideoRef.current
            .play()
            .catch((e) => console.error("Play failed:", e));
        }
        toast.success("Screen sharing started", { position: "bottom-left" });
      } else if (data.kind === "audio") {
        screenProducerIds.current.add(data.producerId);
        setScreenStream((prev) => {
          if (prev && screenVideoRef.current) {
            prev.addTrack(consumer.track);
            screenVideoRef.current.srcObject = new MediaStream(
              prev.getTracks(),
            );
          }
          return prev;
        });
      }
    };

    const handleProducerClosed = (data: { producerId: string }) => {
      console.log(
        "Producer closed:",
        data.producerId,
        "Screen producers:",
        Array.from(screenProducerIds.current),
      );

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
          console.log(
            "All screen producers closed, clearing screen and restoring camera",
          );

          // First, restore camera to main video BEFORE clearing screen
          if (videoRef.current && cameraStreamRef.current) {
            console.log("Restoring camera stream to main video");
            videoRef.current.srcObject = cameraStreamRef.current;
            videoRef.current.muted = isMuted;
            videoRef.current
              .play()
              .catch((e) => console.error("Play failed:", e));
          }

          // Then clear screen stream
          setScreenStream((prev) => {
            if (prev) {
              prev.getTracks().forEach((track) => track.stop());
              if (screenVideoRef.current) {
                screenVideoRef.current.srcObject = null;
              }
            }
            return null;
          });

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
      const consumerData = await new Promise<{
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
          resolve,
        );
      });

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
          resolve,
        );
      });
      return consumer;
    } catch (error) {
      console.error("Failed to consume producer:", error);
    }
  };

  const initializeViewer = async () => {
    console.log(
      "🎯 [VIEWER] initializeViewer called at:",
      new Date().toISOString(),
    );

    if (initRef.current) {
      console.log("⚠️ [VIEWER] Already initialized, skipping");
      return;
    }

    console.log("🔒 [VIEWER] Setting initRef.current = true");
    initRef.current = true;

    try {
      const startTime = performance.now();
      console.log(
        "🎬 [VIEWER] Starting viewer initialization for stream:",
        params.id,
      );

      const t1 = performance.now();
      console.log("📡 [VIEWER] Getting router capabilities...");
      const routerCapabilities = await new Promise<types.RtpCapabilities>(
        (resolve) => {
          socket?.emit(
            "get-router-capabilities",
            { roomId: params.id },
            resolve,
          );
        },
      );
      console.log(
        `✅ [VIEWER] Got router capabilities (${(performance.now() - t1).toFixed(0)}ms)`,
      );

      const t2 = performance.now();
      console.log("🔧 [VIEWER] Loading device...");
      const newDevice = new Device();
      await newDevice.load({ routerRtpCapabilities: routerCapabilities });
      setDevice(newDevice);
      console.log(
        `✅ [VIEWER] Device loaded (${(performance.now() - t2).toFixed(0)}ms)`,
      );

      const t3 = performance.now();
      console.log("🚛 [VIEWER] Creating transport...");
      const transportInfo = await new Promise<types.TransportOptions>(
        (resolve) => {
          socket?.emit(
            "create-transport",
            { roomId: params.id, direction: "recv" },
            resolve,
          );
        },
      );
      console.log(
        `✅ [VIEWER] Transport created (${(performance.now() - t3).toFixed(0)}ms)`,
      );

      const recvTransport = newDevice.createRecvTransport(transportInfo);
      setRecvTransport(recvTransport);
      console.log("🔗 [VIEWER] Receive transport created");

      // Monitor connection state
      recvTransport.on("connectionstatechange", (state) => {
        console.log(
          `🔗 [VIEWER] Recv transport connection state: ${state} at:`,
          new Date().toISOString(),
        );
        if (state === "failed" || state === "closed") {
          console.error("❌ [VIEWER] Transport connection failed!");
          toast.error("Connection failed");
        }
      });

      recvTransport.on("connect", async ({ dtlsParameters }, callback) => {
        console.log(
          "🔌 [VIEWER] Recv transport connecting at:",
          new Date().toISOString(),
        );
        const connectStart = performance.now();
        socket?.emit(
          "connect-transport",
          {
            roomId: params.id,
            transportId: recvTransport.id,
            dtlsParameters,
          },
          () => {
            console.log(
              `✅ [VIEWER] Recv transport connected (${(performance.now() - connectStart).toFixed(0)}ms)`,
            );
            callback();
          },
        );
      });

      // Get existing producers first
      const t4 = performance.now();
      console.log("🎭 [VIEWER] Getting existing producers...");
      const producers = await new Promise<
        Array<{
          id: string;
          kind: string;
          userId: string;
          isScreenShare?: boolean;
        }>
      >((resolve) => {
        socket?.emit("get-producers", { roomId: params.id }, resolve);
      });
      console.log(
        `✅ [VIEWER] Got producers (${(performance.now() - t4).toFixed(0)}ms):`,
        producers,
      );

      if (!producers || producers.length === 0) {
        console.log(
          "⏳ [VIEWER] No producers yet, waiting for stream to start...",
        );
        initRef.current = false;
        setIsLoading(false);
        toast("Waiting for stream to start...", {
          icon: "⏳",
          position: "bottom-left",
        });
        return;
      }

      const screenProducers = producers.filter(
        (p) => p.isScreenShare === true,
      );

      console.log("🖥️ [VIEWER] Screen producers found:", screenProducers);

      // Consume screen video first
      const screenVideoProducer = screenProducers.find((p) => p.kind === "video");
      if (screenVideoProducer) {
        if (!consumedProducers.has(screenVideoProducer.id)) {
          console.log(
            "🖥️ [VIEWER] Consuming existing screen VIDEO producer:",
            screenVideoProducer.id,
          );

          const consumer = await consumeProducer(screenVideoProducer.id, screenVideoProducer.kind);
          if (consumer) {
            screenProducerIds.current.add(screenVideoProducer.id);
            setConsumedProducers((prev) => new Set(prev).add(screenVideoProducer.id));

            const stream = new MediaStream([consumer.track]);
            setScreenStream(stream);

            if (screenVideoRef.current) {
              screenVideoRef.current.srcObject = stream;
              screenVideoRef.current.muted = isMuted;
              await screenVideoRef.current.play().catch(console.error);
            }

            toast.success("Screen sharing started", { position: "bottom-left" });
          }
        }
      }

      // Then consume screen audio if available
      const screenAudioProducer = screenProducers.find((p) => p.kind === "audio");
      if (screenAudioProducer) {
        if (!consumedProducers.has(screenAudioProducer.id)) {
          console.log(
            "🖥️ [VIEWER] Consuming existing screen AUDIO producer:",
            screenAudioProducer.id,
          );

          const consumer = await consumeProducer(screenAudioProducer.id, screenAudioProducer.kind);
          if (consumer) {
            screenProducerIds.current.add(screenAudioProducer.id);
            setConsumedProducers((prev) => new Set(prev).add(screenAudioProducer.id));

            // Add audio track to existing screen stream
            setScreenStream((prev) => {
              if (prev && screenVideoRef.current) {
                prev.addTrack(consumer.track);
                screenVideoRef.current.srcObject = new MediaStream(prev.getTracks());
                console.log("🔊 [VIEWER] Screen audio track added to stream");
              }
              return prev;
            });
          }
        }
      }

      // Filter out screen share producers - only consume camera/mic initially
      const cameraProducers = producers.filter((p) => !p.isScreenShare);
      const mediaProducers = producers.filter(
        (p) => p.kind === "video" || p.kind === "audio",
      );

      if (mediaProducers.length === 0) {
        initRef.current = false;
        setIsLoading(false);
        return;
      }

      console.log("📹 [VIEWER] Camera producers to consume:", cameraProducers);

      // if (cameraProducers.length === 0) {
      //   console.log('⏳ [VIEWER] No camera producers yet, waiting for stream to start...');
      //   initRef.current = false;
      //   setIsLoading(false);
      //   toast("Waiting for stream to start...", { icon: "⏳", position: "bottom-left" });
      //   return;
      // }

      const stream = new MediaStream();
      console.log("🎵 [VIEWER] Created new MediaStream");

      // Consume audio FIRST but DON'T add to stream yet
      const audioProducer = cameraProducers.find((p) => p.kind === "audio");
      if (audioProducer) {
        const t5 = performance.now();
        console.log("🎵 [VIEWER] Consuming audio producer:", audioProducer.id);
        const audioConsumer = await new Promise<{
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
            resolve,
          );
        });
        console.log(
          `✅ [VIEWER] Audio consumer created (${(performance.now() - t5).toFixed(0)}ms):`,
          audioConsumer,
        );

        if (audioConsumer?.id) {
          const t6 = performance.now();
          const consumer = await recvTransport.consume({
            id: audioConsumer.id,
            producerId: audioConsumer.producerId,
            kind: audioConsumer.kind as types.MediaKind,
            rtpParameters: audioConsumer.rtpParameters,
          });
          console.log(
            `✅ [VIEWER] Audio consumer transport consume (${(performance.now() - t6).toFixed(0)}ms)`,
          );

          const t7 = performance.now();
          await new Promise((resolve) => {
            socket?.emit(
              "resume-consumer",
              {
                roomId: params.id,
                consumerId: consumer.id,
              },
              resolve,
            );
          });
          console.log(
            `✅ [VIEWER] Audio consumer resumed (${(performance.now() - t7).toFixed(0)}ms)`,
          );

          // Store audio consumer but DON'T add track yet
          audioConsumerRef.current = consumer;
          setConsumedProducers((prev) => new Set(prev).add(audioProducer.id));
          console.log("🎵 [VIEWER] Audio consumer stored (will add on unmute)");
        }
      }

      // Then consume video (only camera video)
      const videoProducer = cameraProducers.find(
        (p: any) => p.kind === "video",
      );
      if (!videoProducer) {
        throw new Error("No camera video producer found");
      }

      const t8 = performance.now();
      console.log("📹 [VIEWER] Consuming video producer:", videoProducer.id);
      const videoConsumer = (await new Promise((resolve) => {
        socket?.emit(
          "consume",
          {
            roomId: params.id,
            producerId: videoProducer.id,
            rtpCapabilities: newDevice.rtpCapabilities,
          },
          resolve,
        );
      })) as any;
      console.log(
        `✅ [VIEWER] Video consumer created (${(performance.now() - t8).toFixed(0)}ms):`,
        videoConsumer,
      );

      if (videoConsumer?.id) {
        const t9 = performance.now();
        const consumer = await recvTransport.consume({
          id: videoConsumer.id,
          producerId: videoConsumer.producerId,
          kind: videoConsumer.kind,
          rtpParameters: videoConsumer.rtpParameters,
        });
        console.log(
          `✅ [VIEWER] Video consumer transport consume (${(performance.now() - t9).toFixed(0)}ms)`,
        );

        // Resume consumer to start receiving media
        const t10 = performance.now();
        await new Promise((resolve) => {
          socket?.emit(
            "resume-consumer",
            {
              roomId: params.id,
              consumerId: consumer.id,
            },
            resolve,
          );
        });
        console.log(
          `✅ [VIEWER] Video consumer resumed (${(performance.now() - t10).toFixed(0)}ms)`,
        );

        stream.addTrack(consumer.track);
        setConsumedProducers((prev) => new Set(prev).add(videoProducer.id));
        console.log("📹 [VIEWER] Video track added to stream");
      }

      if (videoRef.current) {
        const video = videoRef.current;
        const t11 = performance.now();

        // CRITICAL: Set muted BEFORE setting srcObject to avoid autoplay issues
        video.muted = true;
        video.srcObject = stream;
        console.log(
          `✅ [VIEWER] Stream set to video element (${(performance.now() - t11).toFixed(0)}ms), tracks:`,
          stream.getTracks().length,
        );

        stream.getTracks().forEach((track) => {
          console.log(
            `🎬 [VIEWER] Track ${track.kind}: enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`,
          );
        });

        // Start playback immediately (muted, so no autoplay restrictions)
        console.log(
          "🚀 [VIEWER] Starting immediate playback at:",
          new Date().toISOString(),
        );
        video
          .play()
          .then(() => {
            console.log("✅ [VIEWER] Video playback started immediately");
            setIsLoading(false);
            toast.success("Connected to stream", { position: "bottom-left" });
          })
          .catch((e) => {
            console.error("❌ [VIEWER] Play failed:", e);
            setIsLoading(false);
          });

        // Store camera stream for PiP use
        cameraStreamRef.current = stream;
        setCameraStream(stream);
        console.log("📹 [VIEWER] Camera stream stored for PiP");
      } else {
        throw new Error("Video element not found");
      }

      console.log(
        `🎉 [VIEWER] Total initialization time: ${(performance.now() - startTime).toFixed(0)}ms`,
      );
    } catch (error) {
      console.error("❌ [VIEWER] Failed to initialize viewer:", error);
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
    <div className="fixed inset-0 bg-black">
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

      {/* Header - Hidden, only show meeting code */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
        {/* Stream Timer */}
        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg flex items-center gap-2 border border-white/20">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-white text-sm font-medium">{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Viewer count and participants - Top Right */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button 
          onClick={() => setShowMobileChat(true)}
          className="bg-black/50 backdrop-blur-sm p-3 rounded-lg hover:bg-black/70 transition"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
        <button className="bg-black/50 backdrop-blur-sm px-4 py-3 rounded-lg hover:bg-black/70 transition flex items-center gap-2">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
          </svg>
          <span className="text-white font-medium">{viewerCount}</span>
        </button>
      </div>

      {/* Chat Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-gray-900 shadow-2xl z-40 transition-transform duration-300 ${showMobileChat ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
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

      <div className="h-screen flex">
        {/* Main Video Area - Full Screen */}
        <div className="flex-1 relative">
          {screenStream && screenProducerIds.current.size > 0 ? (
              /* Screen Share with Camera PiP */
              <div
                ref={videoContainerRef}
                className="w-full h-full bg-black relative"
              >
                {/* Screen Share - Main */}
                <video
                  ref={screenVideoRef}
                  autoPlay
                  playsInline
                  muted={isMuted}
                  className="w-full h-full object-contain"
                />
                <div className="absolute bottom-4 left-4 bg-gray-750 px-3 py-2 rounded-lg flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-sm text-white font-medium">
                    Screen Share
                  </span>
                </div>

                {/* Camera - Picture in Picture */}
                <div
                  className={`absolute w-64 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700 shadow-xl cursor-move ${!cameraStreamRef.current ? "hidden" : ""}`}
                  style={{
                    left: `${pipPosition.x}px`,
                    top: `${pipPosition.y}px`,
                  }}
                  onMouseDown={handlePipMouseDown}
                >
                  <video
                    ref={pipVideoRef}
                    // autoPlay
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
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Camera - Full View */
              <div
                ref={videoContainerRef}
                className="w-full h-full bg-black relative"
              >
                <video
                  ref={videoRef}
                  // autoPlay
                  playsInline
                  muted={isMuted}
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
                {/* {!isLoading && isMuted && (
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
                )} */}
              </div>
            )}
          </div>

          {/* Chat Sidebar - Hidden by default, toggle with button */}
        </div>

        {/* Bottom Control Bar - Floating */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30">
          <div className="bg-black/80 backdrop-blur-lg rounded-full px-6 py-3 flex items-center gap-4 shadow-2xl">
            <button
              onClick={toggleMute}
              className={`p-3 rounded-full transition-all ${
                isMuted
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-white/20 hover:bg-white/30"
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <svg
                  className="w-6 h-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-all"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <svg
                  className="w-6 h-6 text-white"
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
              ) : (
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                </svg>
              )}
            </button>
            <button
              onClick={leaveStream}
              className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-all"
              title="Leave Stream"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    // </div>

  );
};

export default WatchPage;
