/**
 * Cache Service Tests
 */
import { jest } from '@jest/globals';

const { dashboardCache, mlPredictionCache, getOrCompute, invalidateCache, getCacheStats } =
  await import('../../ml/cacheService.js');

describe('cacheService', () => {
  beforeEach(() => {
    dashboardCache.flushAll();
    mlPredictionCache.flushAll();
  });

  describe('getOrCompute', () => {
    it('should compute and cache value on cache miss', async () => {
      const computeFn = jest.fn().mockResolvedValue({ data: 'computed' });

      const result = await getOrCompute(dashboardCache, 'testKey', computeFn);

      expect(result).toEqual({ data: 'computed' });
      expect(computeFn).toHaveBeenCalledTimes(1);
    });

    it('should return cached value on cache hit', async () => {
      const computeFn = jest.fn().mockResolvedValue({ data: 'computed' });

      // First call — cache miss
      await getOrCompute(dashboardCache, 'testKey2', computeFn);
      // Second call — cache hit
      const result = await getOrCompute(dashboardCache, 'testKey2', computeFn);

      expect(result).toEqual({ data: 'computed' });
      expect(computeFn).toHaveBeenCalledTimes(1); // Only called once
    });
  });

  describe('invalidateCache', () => {
    it('should remove a cached key', async () => {
      dashboardCache.set('toRemove', 'value');

      invalidateCache(dashboardCache, 'toRemove');

      expect(dashboardCache.get('toRemove')).toBeUndefined();
    });
  });

  describe('getCacheStats', () => {
    it('should return stats for both caches', () => {
      const stats = getCacheStats();

      expect(stats).toHaveProperty('dashboard');
      expect(stats).toHaveProperty('mlPrediction');
      expect(stats.dashboard).toHaveProperty('keys');
      expect(stats.dashboard).toHaveProperty('hits');
      expect(stats.dashboard).toHaveProperty('misses');
    });
  });

  describe('mlPredictionCache', () => {
    it('should store and retrieve ML predictions', () => {
      const prediction = {
        predictedClass: 'HIGH',
        confidence: 0.87,
      };

      mlPredictionCache.set('pred_s1', prediction);

      expect(mlPredictionCache.get('pred_s1')).toEqual(prediction);
    });
  });
});
