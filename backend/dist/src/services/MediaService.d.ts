import type { Worker, Router, WebRtcTransport, Producer, Consumer, RtpCodecCapability, RtpCapabilities, DtlsParameters, RtpParameters, MediaKind } from "mediasoup/types";
import type { Logger } from "winston";
/**
 * LEARNING: MediaSoup uses specific types for media kinds
 * Using literal types ensures type safety
 */
type MediaKindType = "audio" | "video";
/**
 * LEARNING: Transport direction - discriminated union
 * This prevents invalid values like 'receive' or 'sending'
 */
type TransportDirection = "send" | "recv";
/**
 * LEARNING: Participant structure - represents a user in a room
 * Maps are used for O(1) lookups by ID
 */
interface Participant {
    id: string;
    transports: Map<string, WebRtcTransport>;
    producers: Map<string, Producer>;
    consumers: Map<string, Consumer>;
    joinedAt: number;
}
/**
 * LEARNING: Room structure - represents a streaming room
 * Router is the core MediaSoup object that handles media routing
 */
interface Room {
    id: string;
    router: Router;
    participants: Map<string, Participant>;
    createdAt: number;
    workerIndex: number;
}
/**
 * LEARNING: Transport data returned to client
 * These are the WebRTC connection parameters
 */
interface TransportData {
    id: string;
    iceParameters: unknown;
    iceCandidates: unknown[];
    dtlsParameters: DtlsParameters;
}
/**
 * LEARNING: Producer data returned to client
 * Producer = media source (camera, mic, screen)
 */
interface ProducerData {
    id: string;
    kind: MediaKindType;
    appData?: {
        userId: string;
        kind: MediaKindType;
        isScreenShare?: boolean;
    };
}
/**
 * LEARNING: Consumer data returned to client
 * Consumer = media sink (receives media from producer)
 */
interface ConsumerData {
    id: string;
    kind: MediaKindType;
    rtpParameters: unknown;
    producerId: string;
}
/**
 * LEARNING: Room statistics for monitoring
 */
interface RoomStats {
    id: string;
    participants: number;
    createdAt: number;
    uptime: number;
    workerIndex: number;
}
/**
 * LEARNING: Codec configuration for audio/video
 * RtpCodecCapability is MediaSoup's type for codec specs
 */
type CodecOptions = RtpCodecCapability[];
/**
 * LEARNING: Router capabilities returned to client
 * Client needs this to know what codecs/extensions are supported
 */
interface RouterCapabilities {
    codecs: CodecOptions;
    headerExtensions: Array<{
        kind: string;
        uri: string;
        preferredId: number;
        preferredEncrypt: boolean;
        direction: string;
    }>;
}
declare class MediaService {
    private readonly logger;
    /**
     * LEARNING: Workers are MediaSoup processes that handle media
     * Multiple workers = better CPU utilization across cores
     */
    private workers;
    /**
     * LEARNING: Round-robin index for load balancing across workers
     */
    private workerIndex;
    /**
     * LEARNING: Map of active rooms (roomId -> Room)
     * Map provides O(1) lookup performance
     */
    private readonly rooms;
    /**
     * Get room by ID (public accessor)
     */
    getRoom(roomId: string): Room | undefined;
    /**
     * Get all rooms (public accessor)
     */
    getRooms(): Map<string, Room>;
    /**
     * LEARNING: Limit consumers per router to prevent overload
     */
    private readonly maxConsumersPerRouter;
    /**
     * LEARNING: Codec configuration (VP8, H264, Opus)
     */
    private readonly codecOptions;
    constructor(logger: Logger);
    /**
     * Initialize MediaSoup workers
     *
     * LEARNING: Creates one worker per CPU core (max 8)
     * Workers run in separate processes for true parallelism
     */
    initialize(): Promise<void>;
    /**
     * Create a MediaSoup worker
     *
     * LEARNING: Worker configuration
     * - logLevel: 'error' = minimal logging for production
     * - rtcMinPort/rtcMaxPort: UDP port range for WebRTC
     * - appData: custom data attached to worker
     */
    createWorker(index: number): Promise<Worker>;
    /**
     * Respawn a dead worker
     *
     * LEARNING: Graceful recovery from worker crashes
     * Uses exponential backoff (5s delay) if respawn fails
     */
    respawnWorker(index: number): Promise<void>;
    /**
     * Get next available worker (round-robin)
     *
     * LEARNING: Load balancing pattern
     * - Cycles through workers in order
     * - Skips closed/dead workers
     * - Throws if no healthy workers available
     */
    getNextWorker(): Worker;
    /**
     * Get optimized codec configuration
     *
     * LEARNING: Codec selection strategy
     * - Opus: Best audio codec (low latency, high quality)
     * - VP8: Good video codec (widely supported, fast)
     * - H264: Fallback video codec (hardware acceleration)
     */
    getOptimizedCodecs(): CodecOptions;
    /**
     * Get router capabilities for client
     *
     * LEARNING: Client needs router capabilities to:
     * 1. Know what codecs are supported
     * 2. Configure its RTP parameters correctly
     * 3. Enable proper header extensions
     */
    getRouterCapabilities(): RouterCapabilities;
    /**
     * Create or get existing room
     *
     * LEARNING: Room creation pattern
     * - Check if room exists (idempotent operation)
     * - Create router on least-loaded worker
     * - Store room in Map for fast lookup
     */
    createRoom(roomId: string): Promise<Room>;
    /**
     * Create WebRTC transport for a user
     *
     * LEARNING: Transport = WebRTC connection
     * - 'send' transport: Client sends media to server
     * - 'recv' transport: Client receives media from server
     * - Each user typically has 2 transports (send + recv)
     */
    createWebRtcTransport(roomId: string, userId: string, direction: TransportDirection): Promise<TransportData>;
    /**
     * Connect a transport with DTLS parameters
     *
     * LEARNING: Two-phase transport setup
     * 1. createWebRtcTransport: Create transport, get parameters
     * 2. connectTransport: Client sends its DTLS parameters
     * This completes the WebRTC handshake
     */
    connectTransport(roomId: string, userId: string, transportId: string, dtlsParameters: DtlsParameters): Promise<void>;
    /**
     * Create a producer (media source)
     *
     * LEARNING: Producer = media stream from client
     * - kind: 'audio' or 'video'
     * - isScreenShare: true for screen sharing, false for camera
     * - rtpParameters: Codec, bitrate, etc. from client
     */
    produce(roomId: string, userId: string, transportId: string, rtpParameters: RtpParameters, kind: MediaKind, isScreenShare?: boolean): Promise<ProducerData>;
    /**
     * Create a consumer (media sink)
     *
     * LEARNING: Consumer = receive media from a producer
     * - Viewer creates consumer to watch streamer's producer
     * - Router checks if viewer's device can decode the codec
     * - Consumer starts paused, must call resumeConsumer()
     */
    consume(roomId: string, userId: string, producerId: string, rtpCapabilities: RtpCapabilities): Promise<ConsumerData>;
    /**
     * Resume a paused consumer
     *
     * LEARNING: Two-step consumer activation
     * 1. consume(): Create consumer (paused)
     * 2. resumeConsumer(): Start receiving media
     * This prevents media flowing before client is ready
     */
    resumeConsumer(roomId: string, userId: string, consumerId: string): Promise<void>;
    /**
     * Close participant and cleanup resources
     *
     * LEARNING: Graceful cleanup when user leaves
     * - Close all producers (stop sending media)
     * - Close all consumers (stop receiving media)
     * - Close all transports (close WebRTC connections)
     * - Remove participant from room
     * - Close room if empty
     */
    closeParticipant(roomId: string, userId: string): Promise<void>;
    /**
     * Cleanup all resources on shutdown
     *
     * LEARNING: Graceful shutdown pattern
     * - Close all routers (stops all media)
     * - Close all workers (stops all processes)
     * - Clear data structures
     */
    cleanup(): Promise<void>;
    /**
     * Get statistics for a room
     *
     * LEARNING: Monitoring and debugging helper
     */
    getRoomStats(roomId: string): RoomStats | null;
    getAllRoomStats(): RoomStats[];
}
export default MediaService;
