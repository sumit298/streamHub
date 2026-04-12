/**
 * MediaSoup Configuration
 * 
 * LEARNING: Centralized configuration for WebRTC settings
 * - Separates environment-specific values from code
 * - Validates configuration on startup
 * - Provides type-safe access to config values
 */

/**
 * RTC Port Range Configuration
 * 
 * LEARNING: Why port range matters:
 * - Each WebRTC connection needs 1-2 UDP ports
 * - Larger range = more concurrent connections
 * - Firewall rules need to allow this range
 * - Cloud providers may restrict certain ranges
 */
export const RTC_MIN_PORT = parseInt(process.env.RTC_MIN_PORT || '40000', 10);
export const RTC_MAX_PORT = parseInt(process.env.RTC_MAX_PORT || '49999', 10);

/**
 * Announced IP Configuration
 * 
 * LEARNING: This is the public IP clients connect to
 * - Development: Your local IP (e.g., 192.168.1.100)
 * - Production: Server's public IP
 * - Cloud: Use provider's external hostname
 */
export const ANNOUNCED_IP = 
  process.env.ANNOUNCED_IP || 
  process.env.RENDER_EXTERNAL_HOSTNAME || 
  '127.0.0.1';

/**
 * Worker Configuration
 * 
 * LEARNING: Workers are separate processes for media handling
 * - More workers = better CPU utilization
 * - Typically 1 worker per CPU core
 * - Max 8 workers to prevent overhead
 */
export const MAX_WORKERS = parseInt(process.env.MAX_WORKERS || '8', 10);

/**
 * Validate configuration on module load
 * 
 * LEARNING: Fail fast - catch config errors at startup
 * Better to crash on startup than fail during streaming
 */
function validateConfig(): void {
  const errors: string[] = [];

  // Validate port range
  if (RTC_MIN_PORT >= RTC_MAX_PORT) {
    errors.push('RTC_MIN_PORT must be less than RTC_MAX_PORT');
  }

  if (RTC_MIN_PORT < 1024 || RTC_MIN_PORT > 65535) {
    errors.push('RTC_MIN_PORT must be between 1024 and 65535');
  }

  if (RTC_MAX_PORT < 1024 || RTC_MAX_PORT > 65535) {
    errors.push('RTC_MAX_PORT must be between 1024 and 65535');
  }

  // Validate port range size (at least 100 ports)
  if (RTC_MAX_PORT - RTC_MIN_PORT < 100) {
    errors.push('Port range should be at least 100 ports for proper operation');
  }

  // Validate max workers
  if (MAX_WORKERS < 1 || MAX_WORKERS > 32) {
    errors.push('MAX_WORKERS must be between 1 and 32');
  }

  // Validate announced IP
  if (!ANNOUNCED_IP || ANNOUNCED_IP === 'your-local-ip-here') {
    console.warn(
      '⚠️  WARNING: ANNOUNCED_IP not configured. Using 127.0.0.1 (localhost only)'
    );
  }

  if (errors.length > 0) {
    throw new Error(
      `MediaSoup configuration errors:\n${errors.map(e => `  - ${e}`).join('\n')}`
    );
  }
}

// Run validation on import
validateConfig();

/**
 * Export configuration summary for logging
 */
export function getConfigSummary(): string {
  return `
MediaSoup Configuration:
  - RTC Port Range: ${RTC_MIN_PORT}-${RTC_MAX_PORT} (${RTC_MAX_PORT - RTC_MIN_PORT} ports)
  - Announced IP: ${ANNOUNCED_IP}
  - Max Workers: ${MAX_WORKERS}
  `.trim();
}
