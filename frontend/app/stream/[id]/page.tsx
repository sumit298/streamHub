"use client";
import React, { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { Device, types } from "mediasoup-client";
import { io, Socket } from "socket.io-client";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/AuthContext";
import ChatPanel from "@/components/ChatPanel";
import BottomControlBar from "@/components/BottomControlBar";
import ViewerStats from "@/components/ViewerStats";

const StreamsPage = () => {
  const params = useParams();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissions, setPermissions] = useState({
    camera: false,
    microphone: false,
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [device, setDevice] = useState<Device | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [producer, setProducer] = useState<{
    video: types.Producer | null;
    audio: types.Producer | null;
  } | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<string>("disconnected");
  const [viewerCount, setViewerCount] = useState(0);
  const [duration, setDuration] = useState(0);
  const [streamStartTime, setStreamStartTime] = useState(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);
  const [streamingStatus, setStreamingStatus] = useState<
    "idle" | "connecting" | "live" | "failed"
  >("idle");
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [screenProducers, setScreenProducers] = useState<{
    video: types.Producer | null;
    audio: types.Producer | null;
  } | null>(null);
  const [sendTransport, setSendTransport] = useState<types.Transport | null>(null); //store transport for reuse
  const [isMobile, setIsMobile] = useState(false);
  const [showEndStreamModal, setShowEndStreamModal] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<{
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
  }>({ cameras: [], microphones: [] });
  const [selectedDevices, setSelectedDevices] = useState<{
    cameraId: string;
    microphoneId: string;
  }>({ cameraId: '', microphoneId: '' });
  const [streamInfo, setStreamInfo] = useState<{
    title?: string;
    category?: string;
  } | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      setIsMobile(isMobileDevice);
    };
    checkMobile();

    

    // Fetch stream info
    const fetchStreamInfo = async () => {
      try {
        const response = await fetch(
          `${
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
          }/api/streams/${params.id}`,
          {
            credentials: "include",
          }
        );
        if (response.ok) {
          const data = await response.json();
          setStreamInfo(data.stream);
        }
      } catch (error) {
        console.error("Failed to fetch stream info:", error);
      }
    };
    fetchStreamInfo();
  }, [params.id]);

  useEffect(() => {
  if (!isStreaming) return;

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = 'You are currently live. End your stream before leaving.';
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [isStreaming]);


  useEffect(() => {
    const newSocket = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001",
      {
        withCredentials: true, // Sends httpOnly cookies automatically
        transports: ["websocket", "polling"],
      }
    );
    newSocket.on("connect", () => {
      console.log("Connected to server", newSocket.id);
      setConnectionStatus("connected");
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
      setConnectionStatus("disconnected");
    });

    newSocket.on("error", (error) => {
      console.error("Socket error", error);
      setConnectionStatus("error");
    });

    setSocket(newSocket);

    return () => {
      newSocket.off("connect");
      newSocket.off("disconnect");
      newSocket.off("error");
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (socket) {
      const handleViewerCount = (count: number) => {
        console.log("🎥 STREAMER received viewer-count:", count, typeof count);
        setViewerCount(count);
      };

      const handleStreamStartTime = (data: any) => {
        console.log("⏱️ Received stream start time:", data.startTime);
        setStreamStartTime(data.startTime);
      };

      socket.on("viewer-count", handleViewerCount);
      socket.on("stream-start-time", handleStreamStartTime);

      return () => {
        socket.off("viewer-count", handleViewerCount);
        socket.off("stream-start-time", handleStreamStartTime);
      };
    }
  }, [socket]);

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
    return `${h}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  };

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks()[0].enabled = isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (stream) {
      stream.getVideoTracks()[0].enabled = isCameraOff;
      setIsCameraOff(!isCameraOff);
    }
  };

  const initializeMediaSoup = async () => {
    try {
      setIsTestingConnection(true);
      setConnectionStatus("connecting");

      console.log(
        "Testing connection to:",
        process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_SOCKET_URL
      );

      const routerCapabilities = (await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Connection timeout - server not responding")),
          10000
        );
        socket?.emit("get-router-capabilities", { roomId: params.id }, (response: any) => {
          clearTimeout(timeout);
          if (!response) {
            reject(new Error("No response from server"));
          } else {
            resolve(response);
          }
        });
      })) as any;

      console.log("Router capabilities received");

      const newDevice = new Device();
      await newDevice.load({ routerRtpCapabilities: routerCapabilities });
      setDevice(newDevice);
      setConnectionStatus("connected");
      setConnectionTested(true);
      toast.success("Connection test successful! You can now go live.", { position: "bottom-left" });
    } catch (error: any) {
      console.error("MediaSoup initialization failed:", error);
      setConnectionStatus("failed");
      // setConnectionTested(false);
      toast.error(
        error.message ||
          "Connection test failed. Please check your network and try again.",
        { position: "bottom-left" }
      );
    } finally {
      setIsTestingConnection(false);
    }
  };

  const requestPermissions = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setStream(mediaStream);
      setPermissions({ camera: true, microphone: true });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Get available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      const microphones = devices.filter(device => device.kind === 'audioinput');
      
      console.log('Available cameras:', cameras);
      console.log('Available microphones:', microphones);
      
      setAvailableDevices({ cameras, microphones });
      
      // Set default selected devices
      const videoTrack = mediaStream.getVideoTracks()[0];
      const audioTrack = mediaStream.getAudioTracks()[0];
      setSelectedDevices({
        cameraId: videoTrack.getSettings().deviceId || cameras[0]?.deviceId || '',
        microphoneId: audioTrack.getSettings().deviceId || microphones[0]?.deviceId || '',
      });
    } catch (error) {
      console.error("Permission denied:", error);
    }
  };

  const changeCamera = async (deviceId: string) => {
    if (!stream) return;
    
    try {
      const audioTrack = stream.getAudioTracks()[0];
      const audioEnabled = audioTrack?.enabled ?? true;
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: { deviceId: { exact: selectedDevices.microphoneId } },
      });
      
      // Restore audio state
      const newAudioTrack = newStream.getAudioTracks()[0];
      if (newAudioTrack) {
        newAudioTrack.enabled = audioEnabled;
      }
      
      // Stop old tracks
      stream.getTracks().forEach(track => track.stop());
      
      setStream(newStream);
      setSelectedDevices(prev => ({ ...prev, cameraId: deviceId }));
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (error) {
      console.error("Failed to change camera:", error);
      toast.error("Failed to change camera", { position: "bottom-left" });
    }
  };

  const changeMicrophone = async (deviceId: string) => {
    if (!stream) return;
    
    try {
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      const videoEnabled = videoTrack?.enabled ?? true;
      const audioEnabled = audioTrack?.enabled ?? true;
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: selectedDevices.cameraId } },
        audio: { deviceId: { exact: deviceId } },
      });
      
      // Restore track states
      const newVideoTrack = newStream.getVideoTracks()[0];
      const newAudioTrack = newStream.getAudioTracks()[0];
      if (newVideoTrack) {
        newVideoTrack.enabled = videoEnabled;
      }
      if (newAudioTrack) {
        newAudioTrack.enabled = audioEnabled;
      }
      
      // Stop old tracks
      stream.getTracks().forEach(track => track.stop());
      
      setStream(newStream);
      setSelectedDevices(prev => ({ ...prev, microphoneId: deviceId }));
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (error) {
      console.error("Failed to change microphone:", error);
      toast.error("Failed to change microphone", { position: "bottom-left" });
    }
  };

  const startStream = async () => {
    if (isStarting) return;
    
    if (!stream || !device || !socket) {
      toast.error("Please enable camera and test connection first", { position: "bottom-left" });
      return;
    }

    if (!connectionTested || connectionStatus !== "connected") {
      toast.error("Please test connection before going live", { position: "bottom-left" });
      return;
    }

    setIsStarting(true);

    try {
      const transportInfo = (await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Transport creation timeout")),
          10000
        );
        socket.emit(
          "create-transport",
          { roomId: params.id, direction: "send" },
          (response: any) => {
            clearTimeout(timeout);
            resolve(response);
          }
        );
      })) as any;

      console.log("Transport info received:", transportInfo); // Add this

      if (!transportInfo || !transportInfo.id) {
        throw new Error("Invalid transport info received");
      }

      const sendTransport = device.createSendTransport(transportInfo);
      setSendTransport(sendTransport);

      sendTransport.on(
        "connect",
        async ({ dtlsParameters }, callback, errback) => {
          try {
            console.log("🔌 Connecting transport...", {
              transportId: sendTransport.id,
              roomId: params.id,
            });

            await new Promise((resolve, reject) => {
              const timeout = setTimeout(
                () => reject(new Error("Connect transport timeout")),
                10000
              );
              socket.emit(
                "connect-transport",
                {
                  roomId: params.id,
                  transportId: sendTransport.id,
                  dtlsParameters,
                },
                (response: any) => {
                  clearTimeout(timeout);
                  if (response?.error) {
                    console.error(
                      "❌ Transport connect error:",
                      response.error
                    );
                    reject(new Error(response.error));
                  } else {
                    console.log("✅ Transport connected successfully");
                    resolve(response);
                  }
                }
              );
            });

            callback();
          } catch (error: any) {
            console.error("❌ Connect transport exception:", error);
            errback(error);
          }
        }
      );

      sendTransport.on("produce", async ({ kind, rtpParameters, appData }, callback) => {
        console.log("Producing...", { kind, rtpParameters, isScreenShare: appData?.isScreenShare });

        socket.emit(
          "produce",
          {
            transportId: sendTransport.id,
            kind,
            rtpParameters,
            roomId: params.id,
            isScreenShare: appData?.isScreenShare || false,
          },
          (response: any) => {
            console.log("Produce response:", response);

            if (response.error) {
              console.error("Produce error:", response.error);
              return; // Don't call callback on error
            }

            callback({ id: response.producerId });
          }
        );
      });

      sendTransport.on("connectionstatechange", (state) => {
        console.log("🔗 Transport connection state:", state);

        if (state === "connected") {
          console.log("✅ Transport fully connected, stream is live!");
          setStreamingStatus("live");
          toast.success("Stream is now live!", { position: "bottom-left" });
        } else if (state === "connecting") {
          setStreamingStatus("connecting");
        }
      });

      const videoTrack = stream.getVideoTracks()[0];
      const videoProducer = await sendTransport.produce({ track: videoTrack });
      console.log("video producer created", videoProducer.id);

      const audioTrack = stream.getAudioTracks()[0];
      const audioProducer = await sendTransport.produce({ track: audioTrack });

      console.log("audio producer created", audioProducer.id);
      setProducer({ video: videoProducer, audio: audioProducer });

      const patchResponse = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
        }/api/streams/${params.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isLive: true,
          }),
        }
      );

      if (!patchResponse.ok) {
        throw new Error("Failed to update stream status");
      }

      setIsStreaming(true);
      toast.success("Stream started successfully", { position: "bottom-left" });
    } catch (error) {
      console.error("Failed to start stream", error);
      setConnectionStatus("failed");
      setConnectionTested(false);
      setIsStreaming(false);
      toast.error("Failed to start stream", { position: "bottom-left" });
    } finally {
      setIsStarting(false);
    }
  };

  const stopStream = async () => {
    if (isStopping) return;
    
    setShowEndStreamModal(false);
    setIsStopping(true);
    
    try {
      if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        setIsRecording(false);
      }

      if (producer) {
        producer.video?.close();
        producer.audio?.close();
        setProducer(null);
      }

      if(isScreenSharing){
        stopScreenShare()
      }

      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
        }/api/streams/${params.id}/end`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("End stream error:", response.status, errorData);
        throw new Error(errorData.error || "Failed to end stream");
      }

      // Notify backend that stream ended
      socket?.emit("stream-ended", { streamId: params.id });

      // Fetch duration from backend response
      const data = await response.json();
      console.log("🎥 STREAMER received duration:", data.duration);
      setStreamStartTime(null);
      setIsStreaming(false);
      if (data.duration && !isNaN(data.duration)) {
        const finalDurationSeconds = data.duration
          ? Math.floor(data.duration / 1000)
          : duration;
        setDuration(finalDurationSeconds);
        toast.success(
          `Stream ended. Duration: ${formatDuration(finalDurationSeconds)}`,
          { position: "bottom-left" }
        );
      } else {
        // Fallback: use current duration state
        toast.success(`Stream ended. Duration: ${formatDuration(duration)}`, { position: "bottom-left" });
      }
    } catch (error) {
      console.error("Failed to stop stream:", error);
      toast.error("Failed to end stream", { position: "bottom-left" });
    } finally {
      setIsStopping(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      if (mediaRecorder) {
        mediaRecorder.stop();
        setMediaRecorder(null);
      }
      setIsRecording(false);
      toast.success("Recording stopped", { position: "bottom-left" });
    } else {
      startRecording();
      toast.success("Recording started", { position: "bottom-left" });
    }
  };

  const startRecording = () => {
    // Use screen stream if screen sharing is active, otherwise use camera stream
    const recordStream = isScreenSharing && screenStream ? screenStream : stream;
    if (!recordStream) return;

    const recorder = new MediaRecorder(recordStream, { 
      mimeType: "video/webm;codecs=vp8,opus",
      videoBitsPerSecond: 1000000, // 1 Mbps for 480p quality
      audioBitsPerSecond: 128000   // 128 kbps audio
    });
    recorder.ondataavailable = async (e) => {
      if (e.data.size > 0) {
        const formData = new FormData();
        formData.append('chunk', e.data);
        formData.append('streamId', params.id as string);
        
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/vods/upload-chunk`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        }).catch(err => console.error('Upload chunk failed:', err));
      }
    };

    recorder.start(90000); // 90 seconds
    setMediaRecorder(recorder);
    setIsRecording(true);
  };

  const startScreenShare = async () => {
    if (!sendTransport || !isStreaming) {
      toast.error("Please start streaming first", { position: "bottom-left" });
      return;
    }

    try {
      const screenMediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      setScreenStream(screenMediaStream);

      // Switch recording to screen share only if recording is active
      if (isRecording && mediaRecorder) {
        mediaRecorder.stop();
        const screenRecorder = new MediaRecorder(screenMediaStream, { 
          mimeType: "video/webm;codecs=vp8,opus",
          videoBitsPerSecond: 1000000, // 1 Mbps for 480p quality
          audioBitsPerSecond: 128000   // 128 kbps audio
        });
        screenRecorder.ondataavailable = async (e) => {
          if (e.data.size > 0) {
            const formData = new FormData();
            formData.append('chunk', e.data);
            formData.append('streamId', params.id as string);
            
            fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/vods/upload-chunk`, {
              method: 'POST',
              credentials: 'include',
              body: formData,
            }).catch(err => console.error('Upload chunk failed:', err));
          }
        };
        screenRecorder.start(90000); // 90 seconds
        setMediaRecorder(screenRecorder);
      }

      // produce screen video
      const screenVideoTrack = screenMediaStream.getVideoTracks()[0];
      const screenVideoProducer = await sendTransport.produce({
        track: screenVideoTrack,
        appData: { isScreenShare: true },
      });
      console.log("Screen video producer created:", screenVideoProducer.id);

      // produce system audio if available
      let screenAudioProducer = null;
      if (screenMediaStream.getAudioTracks().length > 0) {
        const screenAudioTrack = screenMediaStream.getAudioTracks()[0];
        screenAudioProducer = await sendTransport.produce({
          track: screenAudioTrack,
          appData: { isScreenShare: true },
        });
        console.log("Screen audio producer created:", screenAudioProducer.id);
      }
      setScreenProducers({
        video: screenVideoProducer,
        audio: screenAudioProducer,
      });
      setIsScreenSharing(true);

      screenVideoTrack.onended = () => {
        console.log('Screen share track ended');
        stopScreenShare();
      };
      toast.success("Screen sharing started", { position: "bottom-left" });
    } catch (error: any) {
      console.log("Screen share cancelled or failed:", error.name);
      if (error.name === "NotAllowedError") {
        toast.error("Screen sharing permission denied", { position: "bottom-left" });
      } else if (error.name === "NotFoundError") {
        toast.error("No screen available to share", { position: "bottom-left" });
      } else if (error.name !== "AbortError") {
        // AbortError means user cancelled, don't show error for that
        toast.error("Failed to start screen sharing", { position: "bottom-left" });
      }
    }
  };

  const stopScreenShare = () => {
    if (screenProducers) {
      if (screenProducers.video) {
        socket?.emit("close-producer", { roomId: params.id, producerId: screenProducers.video.id });
        screenProducers.video.close();
      }
      if (screenProducers.audio) {
        socket?.emit("close-producer", { roomId: params.id, producerId: screenProducers.audio.id });
        screenProducers.audio.close();
      }
      setScreenProducers(null);
    }

    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }

    // Switch recording back to camera only if recording is active
    if (isRecording && mediaRecorder && stream) {
      mediaRecorder.stop();
      const cameraRecorder = new MediaRecorder(stream, { 
        mimeType: "video/webm;codecs=vp8,opus",
        videoBitsPerSecond: 1000000, // 1 Mbps for 480p quality
        audioBitsPerSecond: 128000   // 128 kbps audio
      });
      cameraRecorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          const formData = new FormData();
          formData.append('chunk', e.data);
          formData.append('streamId', params.id as string);
          
          fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/vods/upload-chunk`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
          }).catch(err => console.error('Upload chunk failed:', err));
        }
      };
      cameraRecorder.start(90000); // 90 seconds
      setMediaRecorder(cameraRecorder);
    }

    setIsScreenSharing(false);
    toast.success("Screen sharing stopped", { position: "bottom-left" });
  };

  useEffect(() => {
    if (permissions.camera && socket && !connectionTested) {
      initializeMediaSoup();
    }
  }, [permissions.camera, socket]);

  const copyStreamLink = () => {
    const link = `${window.location.origin}/watch/${params.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Stream link copied to clipboard", { position: "bottom-left" });
  };

  return (
    <div className="fixed inset-0 bg-black">
      {/* End Stream Confirmation Modal */}
      {showEndStreamModal && (
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-white">End Stream?</h2>
            <p className="text-gray-400 mb-6">
              Are you sure you want to end this stream? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndStreamModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={stopStream}
                disabled={isStopping}
                className="flex-1 bg-red-650 hover:bg-red-650/80 text-white px-6 py-3 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStopping ? "Ending..." : "End Stream"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Sidebar - Mobile */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-gray-900 shadow-2xl z-40 transition-transform duration-300 lg:hidden ${showMobileChat ? 'translate-x-0' : 'translate-x-full'}`}>
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
              username={user?.username || "Streamer"}
            />
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-black/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a
              href="/dashboard"
              className="text-white hover:text-gray-400 transition flex items-center gap-2"
            >
              ← Back
            </a>
            <div>
              <h1 className="text-lg font-semibold text-white">{streamInfo?.title || "Stream Studio"}</h1>
              <p className="hidden lg:block text-xs text-gray-400">ID: {params.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isStreaming && (
              <ViewerStats 
                viewerCount={viewerCount}
                duration={formatDuration(duration)}
                isLive={isStreaming}
              />
            )}
            <button 
              onClick={() => setShowMobileChat(true)}
              className="lg:hidden bg-gray-700 hover:bg-gray-600 p-2 rounded-lg transition"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="h-[calc(100vh-64px)] flex flex-col lg:flex-row overflow-y-auto">
        <div className="flex flex-1 flex-col lg:flex-row">
          {/* Main Video Area */}
          <div className="flex-1 flex flex-col p-3 ">
            <div className="h-[80vh] lg:flex-1 bg-black rounded-2xl overflow-y-auto relative overflow-scroll">
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full h-full object-cover flip"
              />
              {!permissions.camera && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <div className="text-center">
                    <svg
                      className="w-16 h-16 mx-auto mb-4 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-gray-400 mb-4">
                      Camera preview will appear here
                    </p>
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

            {/* Bottom Controls */}
            <div className="mt-4">
              {!permissions.camera ? (
                <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6">
                  <button
                    onClick={requestPermissions}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2"
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
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Enable Camera & Microphone
                  </button>
                </div>
              ) : !isStreaming ? (
                <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-4 space-y-4">
                  {/* Device Selection */}
                  {availableDevices.cameras.length > 0 && (
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">
                        Camera
                      </label>
                      <select
                        value={selectedDevices.cameraId}
                        onChange={(e) => changeCamera(e.target.value)}
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:outline-none focus:border-emerald-500"
                      >
                        {availableDevices.cameras.map((device) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {availableDevices.microphones.length > 0 && (
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">
                        Microphone
                      </label>
                      <select
                        value={selectedDevices.microphoneId}
                        onChange={(e) => changeMicrophone(e.target.value)}
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:outline-none focus:border-emerald-500"
                      >
                        {availableDevices.microphones.map((device) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <button
                    onClick={startStream}
                    disabled={
                      !connectionTested || connectionStatus !== "connected"
                    }
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      !connectionTested ? "Please test connection first" : ""
                    }
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {!connectionTested ? "Test Connection First" : isStarting ? "Starting..." : "Go Live"}
                  </button>
                </div>
              ) : (
                <BottomControlBar
                  isMuted={isMuted}
                  isCameraOff={isCameraOff}
                  isScreenSharing={isScreenSharing}
                  isStreaming={isStreaming}
                  isRecording={isRecording}
                  onToggleMute={toggleMute}
                  onToggleCamera={toggleCamera}
                  onToggleScreenShare={isMobile ? undefined : (isScreenSharing ? stopScreenShare : startScreenShare)}
                  onToggleRecording={toggleRecording}
                  onEndStream={() => setShowEndStreamModal(true)}
                  showScreenShare={!isMobile}
                />
              )}
            </div>
          </div>

          {/* Sidebar - Hidden on mobile */}
          <div className="hidden lg:flex w-80 flex-col p-4 space-y-4 overflow-y-auto">
            {/* Chat */}
            <div className="flex-1 bg-gray-900/50 backdrop-blur-sm rounded-2xl min-h-[400px]">
              <ChatPanel
                socket={socket}
                streamId={params.id as string}
                username={user?.username || "Streamer"}
              />
            </div>

            {/* Connection Status */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-white">
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
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Connection
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      connectionStatus === "connected"
                        ? "bg-green-500"
                        : connectionStatus === "connecting" || isTestingConnection
                        ? "bg-yellow-500 animate-pulse"
                        : connectionStatus === "failed"
                        ? "bg-red-500"
                        : "bg-gray-500"
                    }`}
                  ></span>
                  <span className="text-sm capitalize text-white">
                    {isTestingConnection
                      ? "Testing..."
                      : connectionStatus === "connected"
                      ? "Connected"
                      : connectionStatus === "connecting"
                      ? "Connecting..."
                      : connectionStatus === "failed"
                      ? "Failed"
                      : "Disconnected"}
                  </span>
                </div>
                {connectionStatus === "failed" && (
                  <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded">
                    Connection test failed. Please check your network and try
                    again.
                  </div>
                )}
                {connectionTested &&
                  connectionStatus === "connected" &&
                  !isStreaming && (
                    <div className="text-xs text-green-400 bg-green-500/10 p-2 rounded">
                      ✓ Ready to go live!
                    </div>
                  )}
                {permissions.camera &&
                  !connectionTested &&
                  connectionStatus !== "connecting" && (
                    <button
                      onClick={initializeMediaSoup}
                      disabled={isTestingConnection}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50"
                    >
                      {isTestingConnection ? "Testing..." : "Test Connection"}
                    </button>
                  )}
              </div>
            </div>

            {/* Share Stream */}
            {/* <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-white">
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
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                Share
              </h3>
              <button
                onClick={copyStreamLink}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-xl transition flex items-center justify-center gap-2"
              >
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
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy Link
              </button>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamsPage;
