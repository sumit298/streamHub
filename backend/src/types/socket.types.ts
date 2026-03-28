// Payloads for socket.io events
export interface CreateStreamPayload {
    title: string;
    description?: string;
    category: string;
    tags?: string[];
    chatEnabled?: boolean;
    recordingEnabled?: boolean;
}

export interface JoinStreamPayload {
    streamId: string;
}

export interface CreateTransportPayload {
    roomId: string;
    direction: 'send' | 'recv';
}

export interface ConnectTransportPayload {
    roomId: string;
    transportId: string;
    dtlsParameters: Record<string, unknown>;
}

export interface ProducePayload {
    roomId: string;
    transportId: string;
    kind: 'audio' | 'video';
    rtpParameters: Record<string, unknown>;
}

export interface ConsumePayload {
    roomId: string;
    transportId: string;
    producerId: string;
    rtpCapabilities: Record<string, unknown>;
}

export interface SendMessagePayload {
    roomId: string;
    content: string;
    type?: 'text' | 'emoji' | 'gif' | 'sticker' | 'command';
    responseToMessageId?: string;
}

export interface ModActionPayload {
    streamId: string;
    action: 'ban' | 'timeout' | 'delete';
    targetUserId: string;
    messageId?: string;
    duration?: number; // for timeout
    reason?: string;
}

export interface RecordingChunkPayload {
  streamId: string;
  recordingId: string;
  chunk: Buffer | ArrayBuffer;
  chunkIndex: number;
}

export interface RecordingEndPayload {
  streamId: string;
  recordingId: string;
  durationMs: number;
}

// server - client events

export interface ViewerCountPayload {
    streamId: string;
    count: number;
}

export interface NewProducerPayload {
    producerId: string;
    userId: string;
    kind: 'audio' | 'video';
}

export interface ProducerClosedPayload {
    producerId: string;
}

export interface VodReadyPayload {
  streamId: string;
}