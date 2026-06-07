import { Logger } from "winston";
import client from "prom-client";

/**
 * MetricsService - Prometheus Metrics Collection
 *
 * Stage 1: System Health Metrics (Node.js internals)
 * Stage 2: API Health Metrics (HTTP requests)
 */
class MetricsService {
  private static instance: MetricsService | null = null;
  private logger: Logger;
  public register: client.Registry;
  private pushInterval?: NodeJS.Timeout;
  private isPushInFlight = false;

  // Stage 2: HTTP Metrics
  public httpRequestDuration: client.Histogram;
  public httpRequestsTotal: client.Counter;
  public httpErrorsTotal: client.Counter;

  constructor(logger: Logger) {
    this.logger = logger;
    this.register = new client.Registry();
    // Stage 1: Collect default Node.js metrics
    client.collectDefaultMetrics({
      register: this.register,
      prefix: "streamhub_",
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    });

    // Stage 2: HTTP Request Duration Histogram
    this.httpRequestDuration = new client.Histogram({
      name: "streamhub_http_request_duration_seconds",
      help: "Duration of HTTP requests in seconds",
      labelNames: ["method", "route", "status"],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
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

    // Store singleton instance
    MetricsService.instance = this;

     if(process.env.GRAFANA_CLOUD_PUSH === "true") {
      this.setupGrafanaCloudPush();
    }

    this.logger.info("Initializing MetricsService with Prometheus client");

  }

  /**
   * Setup push to Grafana Cloud for production deployment
   * Used when self-hosted Prometheus can't run (e.g., 1GB Oracle VM)
   */
  private setupGrafanaCloudPush(): void {
    const url = process.env.GRAFANA_CLOUD_URL;
    const username = process.env.GRAFANA_CLOUD_USERNAME;
    const password = process.env.GRAFANA_CLOUD_PASSWORD;

    if (!url || !username || !password) {
      this.logger.warn(
        "Grafana Cloud push enabled but configuration is missing",
      );
      return;
    }

    this.logger.info("Setting up Grafana Cloud push for metrics");

    this.pushInterval = setInterval(async () => {
      // Prevent overlapping pushes if Grafana Cloud is slow
      if (this.isPushInFlight) {
        this.logger.debug("Previous push still in progress, skipping");
        return;
      }

      this.isPushInFlight = true;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      try {
        const metrics = await this.register.metrics();
        const auth = Buffer.from(`${username}:${password}`).toString("base64");

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain",
            Authorization: `Basic ${auth}`,
          },
          body: metrics,
          signal: controller.signal,
        });

        if (!response.ok) {
          const text = await response.text();
          this.logger.error(
            `Failed to push metrics to Grafana Cloud: ${response.status} ${response.statusText} - ${text}`,
          );
        } else {
          this.logger.debug("Successfully pushed metrics to Grafana Cloud");
        }
      } catch (error: any) {
        if (error.name === "AbortError") {
          this.logger.error("Grafana Cloud push timed out after 10s");
        } else {
          this.logger.error("Error pushing metrics to Grafana Cloud:", error);
        }
      } finally {
        clearTimeout(timeout);
        this.isPushInFlight = false;
      }
    }, 15000); // Push every 15 seconds
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MetricsService | null {
    return MetricsService.instance;
  }

  /**
   * Get metrics in Prometheus format
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
   */
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
  ): void {
    const status = statusCode.toString();

    this.httpRequestDuration.observe(
      { method, route, status },
      durationSeconds,
    );

    this.httpRequestsTotal.inc({ method, route, status });

    if (statusCode >= 400) {
      this.httpErrorsTotal.inc({ method, route, status });
    }
  }

  /**
   * Health check
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

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.pushInterval) {
      clearInterval(this.pushInterval);
      this.logger.info("Cleared Grafana Cloud push interval");
    }
    MetricsService.instance = null;
  }
}

export default MetricsService;
