/**
 * Recording Configuration
 * Centralized settings for MediaRecorder quality and encoding
 */

export const RECORDING_CONFIG = {
  // Video quality settings
  video: {
    // Bitrate in bits per second
    // 480p: 500000-1000000 (0.5-1 Mbps)
    // 720p: 1500000-2500000 (1.5-2.5 Mbps)
    // 1080p: 3000000-5000000 (3-5 Mbps)
    bitrate: 2000000, // 2 Mbps for 720p quality
  },

  // Audio quality settings
  audio: {
    bitrate: 128000, // 128 kbps audio
  },

  // Chunk settings
  chunks: {
    intervalMs: 30000, // 30 seconds per chunk
  },

  // Supported MIME types (ordered by preference)
  mimeTypes: [
    'video/webm;codecs=h264,opus',
    'video/webm;codecs=vp8,opus',
  ],
} as const;

/**
 * Get the best supported MIME type for recording
 */
export function getSupportedMimeType(): string {
  for (const mimeType of RECORDING_CONFIG.mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }
  // Fallback to default
  return 'video/webm';
}

/**
 * Create MediaRecorder options
 */
export function getRecorderOptions() {
  return {
    mimeType: getSupportedMimeType(),
    videoBitsPerSecond: RECORDING_CONFIG.video.bitrate,
    audioBitsPerSecond: RECORDING_CONFIG.audio.bitrate,
  };
}
