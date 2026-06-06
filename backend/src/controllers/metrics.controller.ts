import type { Request, Response } from 'express';
import MetricsService from '@services/MetricsService';
import Logger from '@utils/logger';

const MetricsController = {
  /**
   * GET /metrics
   */
  getMetrics: () => async (req: Request, res: Response): Promise<void> => {
    try {
      const metricsService = MetricsService.getInstance();
      
      if (!metricsService) {
        res.status(503).json({
          success: false,
          error: 'Metrics service not initialized',
        });
        return;
      }

      res.set('Content-Type', metricsService.getContentType());
      const metrics = await metricsService.getMetrics();
      res.send(metrics);
    } catch (error) {
      Logger.error('Failed to collect metrics:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to collect metrics',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  },

  /**
   * GET /metrics/health
   */
  healthCheck: () => async (req: Request, res: Response): Promise<void> => {
    try {
      const metricsService = MetricsService.getInstance();
      
      if (!metricsService) {
        res.status(503).json({
          success: false,
          status: 'not_initialized',
        });
        return;
      }

      const isHealthy = await metricsService.healthCheck();
      
      if (isHealthy) {
        res.json({
          success: true,
          status: 'healthy',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(503).json({
          success: false,
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      Logger.error('Metrics health check failed:', error);
      res.status(503).json({
        success: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
};

export default MetricsController;
