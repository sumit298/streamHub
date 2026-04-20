/**
 * Update stream viewer stats
 */
export declare function updateViewerStats(streamId: string, currentViewers: number): Promise<void>;
/**
 * Increment chat message count
 */
export declare function incrementChatMessages(streamId: string): Promise<void>;
