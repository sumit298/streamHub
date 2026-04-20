import type { ChannelModel, Channel } from 'amqplib';
import type { Logger } from 'winston';
interface VODConversionData {
    streamId: string;
    webmPath: string;
    userId: string;
}
declare class MessageQueue {
    private logger;
    connection: ChannelModel | null;
    channel: Channel | null;
    private reconnectDelay;
    private maxReconnectAttempts;
    private reconnectAttempts;
    constructor(logger: Logger);
    connect(): Promise<void>;
    private setupExchanges;
    private setupQueues;
    private handleReconnect;
    publishStreamEvent(event: string, data: Record<string, unknown>): Promise<void>;
    publishChatMessage(data: Record<string, unknown>): Promise<void>;
    publishAnalyticsEvent(event: string, data: Record<string, unknown>): Promise<void>;
    publishUserPresence(action: string, data: Record<string, unknown>): Promise<void>;
    subscribeStreamEvents(callback: (routingKey: string, data: Record<string, unknown>) => void): Promise<void>;
    subscribeChatMessages(callback: (data: unknown) => void): Promise<void>;
    close(): Promise<void>;
    publishVODConversion(data: VODConversionData): Promise<boolean>;
}
export default MessageQueue;
