import type { Types } from "mongoose";
import MediaService from "./MediaService";
import MessageQueue from "./MessageQueue";
import CacheService from "./CacheService";
import type { Logger } from "winston";
import type { Server as SocketIOServer } from "socket.io";
import { DtlsParameters, RtpCapabilities, RtpParameters } from "mediasoup/types";
interface StreamStats {
    viewers: number;
    maxViewers: number;
    totalViews: number;
    chatMessages: number;
    likes: number;
    shares: number;
}
interface CreateStreamData {
    title: string;
    description?: string;
    category?: string;
    isPrivate?: boolean;
    chatEnabled?: boolean;
    recordingEnabled?: boolean;
    tags?: string[];
    thumbnail?: string | null;
}
interface StreamObject {
    id: string;
    userId: string | Types.ObjectId;
    streamUserName: string;
    title: string;
    description: string;
    category: string;
    isLive: boolean;
    isPending: boolean;
    isPrivate: boolean;
    chatEnabled: boolean;
    recordingEnabled: boolean;
    tags: string[];
    thumbnail: string | null;
    stats: StreamStats;
    startedAt?: Date | string | null;
    endedAt?: Date | string | null;
    duration?: number;
    maxViewers?: number;
    totalViews?: number;
    totalChatMessages?: number;
}
interface JoinStreamResult {
    stream: StreamObject;
    viewers: number;
    messages: unknown[];
    stats: {
        viewers: number;
        views: number;
        chatCount: number;
    };
}
/**
 * Transport direction - discriminated union for type safety
 */
type TransportDirection = "send" | "recv";
/**
 * WebRTC transport data returned from MediaService
 */
interface TransportData {
    id: string;
    iceParameters: unknown;
    iceCandidates: unknown[];
    dtlsParameters: unknown;
}
/**
 * Producer data returned from MediaService
 */
interface ProducerData {
    id: string;
    kind: "audio" | "video";
}
/**
 * Consumer data returned from MediaService
 */
interface ConsumerData {
    id: string;
    producerId: string;
    kind: "audio" | "video";
    rtpParameters: unknown;
}
interface StreamUpdateData {
    isLive?: boolean;
    isPending?: boolean;
    endedAt?: Date | string;
    duration?: number;
    maxViewers?: number;
    totalViews?: number;
    totalChatMessages?: number;
    title?: string;
    description?: string;
    category?: string;
    thumbnail?: string | null;
}
/**
 * Options for querying streams
 */
interface GetStreamsOptions {
    status?: "live" | "ended" | "pending";
    category?: string;
    filter?: "my" | "community";
    userId?: string;
    limit?: number;
    offset?: number;
    includeEnded?: boolean;
}
interface TransformedStream extends Partial<StreamObject> {
    streamer: {
        username: string;
    };
}
interface StreamQueryResult {
    total: number;
    streams: TransformedStream[];
}
declare class StreamService {
    private readonly mediaService;
    private readonly messageQueue;
    private readonly cacheService;
    private readonly logger;
    io: SocketIOServer | null;
    constructor(mediaService: MediaService, messageQueue: MessageQueue | null, cacheService: CacheService | null, logger: Logger);
    /**
     * Set Socket.IO instance for real-time notifications
     * Called from server.ts after initialization
     */
    setSocketIO(io: SocketIOServer): void;
    /**
     * Create a new stream
     *
     * LEARNING: Notice how we handle optional properties with || operator
     * and provide default values. TypeScript ensures all required fields exist.
     */
    createStream(userId: string, streamData: CreateStreamData): Promise<StreamObject>;
    /**
     * Join an existing stream
     *
     * LEARNING: Notice .toObject() to convert Mongoose Document to plain object
     * This is crucial for TypeScript type compatibility
     */
    joinStream(userId: string, streamId: string): Promise<JoinStreamResult>;
    /**
     * Create WebRTC transport
     *
     * LEARNING: Using discriminated union (TransportDirection) ensures
     * only valid values ('send' | 'recv') can be passed
     */
    createTransport(roomId: string, userId: string, direction: TransportDirection): Promise<TransportData>;
    /**
     * Connect WebRTC transport
     *
     * LEARNING: Promise<void> for operations that don't return data
     */
    connectTransport(roomId: string, userId: string, transportId: string, dtlsParameters: DtlsParameters): Promise<void>;
    /**
     * Produce media (audio/video/screen)
     */
    produce(roomId: string, userId: string, transportId: string, rtpParameters: RtpParameters, kind: "audio" | "video", isScreenShare?: boolean): Promise<ProducerData | null>;
    consume(roomId: string, userId: string, producerId: string, rtcCapabilities: RtpCapabilities): Promise<ConsumerData>;
    resumeConsumer(roomId: string, userId: string, consumerId: string): Promise<void>;
    endStream(streamId: string, userId: string): Promise<StreamUpdateData>;
    handleUserDisconnect(streamId: string, userId: string): Promise<void>;
    getStreamInfo(streamId: string): Promise<StreamObject | null>;
    getActiveStreams(options?: GetStreamsOptions): Promise<StreamQueryResult>;
    searchStreams(searchQuery: string, options?: GetStreamsOptions): Promise<StreamQueryResult>;
    getUserActiveStreams(userId: string): Promise<unknown>;
    updateStream(streamId: string, updateData: Partial<StreamObject>): Promise<StreamObject | null>;
    getDetailedStats(streamId: string): Promise<Record<string, unknown>>;
    getUserStreams(userId: string, options?: GetStreamsOptions): Promise<unknown>;
}
export default StreamService;
