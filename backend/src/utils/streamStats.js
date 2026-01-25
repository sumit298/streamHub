const { Stream } = require('../models');

/**
 * Update stream viewer stats
 */
async function updateViewerStats(streamId, currentViewers) {
  try {
    const stream = await Stream.findOne({ id: streamId });
    if (!stream) return;

    const updates = {
      'stats.viewers': currentViewers,
    };

    // Update maxViewers if current is higher
    if (currentViewers > stream.stats.maxViewers) {
      updates['stats.maxViewers'] = currentViewers;
    }

    await Stream.updateOne({ id: streamId }, { $set: updates });
  } catch (error) {
    console.error('Failed to update viewer stats:', error);
  }
}

/**
 * Increment chat message count
 */
async function incrementChatMessages(streamId) {
  try {
    await Stream.updateOne(
      { id: streamId },
      { $inc: { 'stats.chatMessages': 1 } }
    );
  } catch (error) {
    console.error('Failed to increment chat messages:', error);
  }
}

module.exports = {
  updateViewerStats,
  incrementChatMessages,
};
