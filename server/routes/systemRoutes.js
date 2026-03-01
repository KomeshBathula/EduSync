import express from 'express';
import mongoose from 'mongoose';
import { getModelStatus } from '../ml/inferenceService.js';
import { getCacheStats } from '../ml/cacheService.js';

const router = express.Router();

/**
 * GET /api/system/health
 * Returns system health status including DB, ML model, and cache.
 */
router.get('/health', async (req, res) => {
  const uptime = process.uptime();

  let dbStatus = 'disconnected';
  try {
    const state = mongoose.connection.readyState;
    const stateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    dbStatus = stateMap[state] || 'unknown';
  } catch {
    dbStatus = 'error';
  }

  let mlStatus;
  try {
    mlStatus = getModelStatus();
  } catch {
    mlStatus = { loaded: false, error: 'ML service unavailable' };
  }

  const cacheStatus = getCacheStats();

  res.json({
    status: 'ok',
    dbStatus,
    mlStatus,
    cacheStatus,
    uptime: Math.round(uptime),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mlEnabled: process.env.ENABLE_ML !== 'false',
    modelVersion: process.env.MODEL_VERSION || 'v1',
  });
});

export default router;
