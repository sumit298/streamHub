import { Logger } from "winston";
import client from "prom-client";

/**
 * MetricsService - Prometheus Metrics Collection
 *
 * Stage 1: System Health Metrics (Node.js internals)
 * Stage 2: API Health Metrics (HTTP requests)
 */
class MetricsService {
  private logger: Logger;
  public register: client.Registry;

  // Stage 2: HTTP Metrics
  public httpRequestDuration: client.Histogram;
  public httpRequestsTotal: client.Counter;
  public httpErrorsTotal: client.Counter;

  constructor(logger: Logger) {
    this.logger = logger;
    this.register = new client.Registry();

    // Stage 1: Collect default Node.js metrics
    // This includes: CPU, Memory, Heap, GC, Event Loop Lag, Process Uptime
    client.collectDefaultMetrics({
      register: this.register,
      prefix: "streamhub_",
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // GC duration buckets
    });

    // Stage 2: HTTP Request Duration Histogram
    this.httpRequestDuration = new client.Histogram({
      name: "streamhub_http_request_duration_seconds",
      help: "Duration of HTTP requests in seconds",
      labelNames: ["method", "route", "status"],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10], // Response time buckets
      registers: [this.register],
    });

    // Stage 2: HTTP Requests Total Counter
    this.httpRequestsTotal = new client.Counter({
      name: "streamhub_http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status"],
      registers: [this.register],
    });

    // Stage 2: HTTP Errors Total Counter
    this.httpErrorsTotal = new client.Counter({
      name: "streamhub_http_errors_total",
      help: "Total number of HTTP errors (4xx and 5xx)",
      labelNames: ["method", "route", "status"],
      registers: [this.register],
    });

    this.logger.info("MetricsService initialized with Stage 1 & 2 metrics");
  }

  /**
   * Get metrics in Prometheus format
   * Used by /metrics endpoint
   */
  async getMetrics(): Promise<string> {
    return await this.register.metrics();
  }

  /**
   * Get metrics content type
   */
  getContentType(): string {
    return this.register.contentType;
  }

  /**
   * Record HTTP request metrics
   * Called by metrics middleware
   */
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
  ): void {
    const status = statusCode.toString();

    // Record duration
    this.httpRequestDuration.observe(
      { method, route, status },
      durationSeconds,
    );

    // Record total requests
    this.httpRequestsTotal.inc({ method, route, status });

    // Record errors (4xx and 5xx)
    if (statusCode >= 400) {
      this.httpErrorsTotal.inc({ method, route, status });
    }
  }

  /**
   * Health check - verify metrics are being collected
   */
  async healthCheck(): Promise<boolean> {
    try {
      const metrics = await this.getMetrics();
      return metrics.length > 0;
    } catch (error) {
      this.logger.error("MetricsService health check failed:", error);
      return false;
    }
  }
}

export default MetricsService;
