import Stream from "@models/Stream";

/**
 * Update stream viewer stats
 */
export async function updateViewerStats(
  streamId: string,
  currentViewers: number,
): Promise<void> {
  try {
    const stream = await Stream.findOne({ id: streamId });
    if (!stream) return;

    const updates: Record<string, number> = {
      "stats.viewers": currentViewers,
    };

    // Update maxViewers if current is higher
    if (currentViewers > stream.stats.maxViewers) {
      updates["stats.maxViewers"] = currentViewers;
    }

    await Stream.updateOne({ id: streamId }, { $set: updates });
  } catch (error) {
    console.error("Failed to update viewer stats:", error);
  }
}

/**
 * Increment chat message count
 */
export async function incrementChatMessages(streamId: string): Promise<void> {
  try {
    await Stream.updateOne(
      { id: streamId },
      { $inc: { "stats.chatMessages": 1 } },
    );
  } catch (error) {
    console.error("Failed to increment chat messages:", error);
  }
}
