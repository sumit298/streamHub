import express from 'express';
import MetricsController from '@controllers/metrics.controller';

/**
 * Metrics Routes
 */
const metricsRouter = express.Router();

metricsRouter.get('/', MetricsController.getMetrics());
metricsRouter.get('/health', MetricsController.healthCheck());

export default metricsRouter;