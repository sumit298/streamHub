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
export declare const RTC_MIN_PORT: number;
export declare const RTC_MAX_PORT: number;
/**
 * Announced IP Configuration
 *
 * LEARNING: This is the public IP clients connect to
 * - Development: Your local IP (e.g., 192.168.1.100)
 * - Production: Server's public IP
 * - Cloud: Use provider's external hostname
 */
export declare const ANNOUNCED_IP: string;
/**
 * Worker Configuration
 *
 * LEARNING: Workers are separate processes for media handling
 * - More workers = better CPU utilization
 * - Typically 1 worker per CPU core
 * - Max 8 workers to prevent overhead
 */
export declare const MAX_WORKERS: number;
/**
 * Export configuration summary for logging
 */
export declare function getConfigSummary(): string;
