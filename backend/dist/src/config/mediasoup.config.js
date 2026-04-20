"use strict";
/**
 * MediaSoup Configuration
 *
 * LEARNING: Centralized configuration for WebRTC settings
 * - Separates environment-specific values from code
 * - Validates configuration on startup
 * - Provides type-safe access to config values
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_WORKERS = exports.ANNOUNCED_IP = exports.RTC_MAX_PORT = exports.RTC_MIN_PORT = void 0;
exports.getConfigSummary = getConfigSummary;
/**
 * RTC Port Range Configuration
 *
 * LEARNING: Why port range matters:
 * - Each WebRTC connection needs 1-2 UDP ports
 * - Larger range = more concurrent connections
 * - Firewall rules need to allow this range
 * - Cloud providers may restrict certain ranges
 */
exports.RTC_MIN_PORT = parseInt(process.env.RTC_MIN_PORT || '40000', 10);
exports.RTC_MAX_PORT = parseInt(process.env.RTC_MAX_PORT || '49999', 10);
/**
 * Announced IP Configuration
 *
 * LEARNING: This is the public IP clients connect to
 * - Development: Your local IP (e.g., 192.168.1.100)
 * - Production: Server's public IP
 * - Cloud: Use provider's external hostname
 */
exports.ANNOUNCED_IP = process.env.ANNOUNCED_IP ||
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
exports.MAX_WORKERS = parseInt(process.env.MAX_WORKERS || '8', 10);
/**
 * Validate configuration on module load
 *
 * LEARNING: Fail fast - catch config errors at startup
 * Better to crash on startup than fail during streaming
 */
function validateConfig() {
    const errors = [];
    // Validate port range
    if (exports.RTC_MIN_PORT >= exports.RTC_MAX_PORT) {
        errors.push('RTC_MIN_PORT must be less than RTC_MAX_PORT');
    }
    if (exports.RTC_MIN_PORT < 1024 || exports.RTC_MIN_PORT > 65535) {
        errors.push('RTC_MIN_PORT must be between 1024 and 65535');
    }
    if (exports.RTC_MAX_PORT < 1024 || exports.RTC_MAX_PORT > 65535) {
        errors.push('RTC_MAX_PORT must be between 1024 and 65535');
    }
    // Validate port range size (at least 100 ports)
    if (exports.RTC_MAX_PORT - exports.RTC_MIN_PORT < 100) {
        errors.push('Port range should be at least 100 ports for proper operation');
    }
    // Validate max workers
    if (exports.MAX_WORKERS < 1 || exports.MAX_WORKERS > 32) {
        errors.push('MAX_WORKERS must be between 1 and 32');
    }
    // Validate announced IP
    if (!exports.ANNOUNCED_IP || exports.ANNOUNCED_IP === 'your-local-ip-here') {
        console.warn('⚠️  WARNING: ANNOUNCED_IP not configured. Using 127.0.0.1 (localhost only)');
    }
    if (errors.length > 0) {
        throw new Error(`MediaSoup configuration errors:\n${errors.map(e => `  - ${e}`).join('\n')}`);
    }
}
// Run validation on import
validateConfig();
/**
 * Export configuration summary for logging
 */
function getConfigSummary() {
    return `
MediaSoup Configuration:
  - RTC Port Range: ${exports.RTC_MIN_PORT}-${exports.RTC_MAX_PORT} (${exports.RTC_MAX_PORT - exports.RTC_MIN_PORT} ports)
  - Announced IP: ${exports.ANNOUNCED_IP}
  - Max Workers: ${exports.MAX_WORKERS}
  `.trim();
}
//# sourceMappingURL=mediasoup.config.js.map