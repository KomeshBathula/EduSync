import NodeCache from 'node-cache';

/**
 * Application-level cache with configurable TTL.
 * Used for dashboard analytics, ML predictions, and feature vectors.
 */

// Dashboard analytics cache (5 min TTL)
export const dashboardCache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  useClones: false,
});

// ML prediction cache (10 min TTL)
export const mlPredictionCache = new NodeCache({
  stdTTL: 600,
  checkperiod: 120,
  useClones: false,
});

/**
 * Get or compute a cached value.
 * @param {NodeCache} cache - Cache instance
 * @param {string} key - Cache key
 * @param {Function} computeFn - Async function to compute value if not cached
 * @returns {Promise<*>} Cached or computed value
 */
export const getOrCompute = async (cache, key, computeFn) => {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const value = await computeFn();
  cache.set(key, value);
  return value;
};

/**
 * Invalidate a specific cache key.
 */
export const invalidateCache = (cache, key) => {
  cache.del(key);
};

/**
 * Get cache statistics for health checks.
 */
export const getCacheStats = () => ({
  dashboard: {
    keys: dashboardCache.keys().length,
    hits: dashboardCache.getStats().hits,
    misses: dashboardCache.getStats().misses,
  },
  mlPrediction: {
    keys: mlPredictionCache.keys().length,
    hits: mlPredictionCache.getStats().hits,
    misses: mlPredictionCache.getStats().misses,
  },
});
