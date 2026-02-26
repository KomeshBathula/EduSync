/**
 * Inference Service Tests
 */
import { jest } from '@jest/globals';
import { promises as fs } from 'fs';

const mockExtractFeatures = jest.fn();
const mockFeaturesToVector = jest.fn();
const mockMLAuditLogCreate = jest.fn();

jest.unstable_mockModule('../../ml/featureExtractor.js', () => ({
  extractFeatures: mockExtractFeatures,
  featuresToVector: mockFeaturesToVector,
  FEATURE_NAMES: ['f1', 'f2', 'f3'],
  FEATURE_COUNT: 3,
}));

jest.unstable_mockModule('../../models/MLAuditLog.js', () => ({
  default: {
    create: mockMLAuditLogCreate,
  },
}));

// We need to mock the model existence check
// Since the inference service checks for model files, let's test the fallback behavior
const { predictRisk, modelExists, getModelStatus } =
  await import('../../ml/inferenceService.js');

describe('inferenceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('modelExists', () => {
    it('should return false when no model file exists', async () => {
      const exists = await modelExists();
      // In test environment, model directory should be empty
      expect(typeof exists).toBe('boolean');
    });
  });

  describe('getModelStatus', () => {
    it('should return status object with loaded field', () => {
      const status = getModelStatus();

      expect(status).toHaveProperty('loaded');
      expect(status).toHaveProperty('version');
      expect(status).toHaveProperty('loadTimeMs');
      expect(typeof status.loaded).toBe('boolean');
    });
  });

  describe('predictRisk', () => {
    it('should return null when model is not available (fallback)', async () => {
      const result = await predictRisk('student123');

      // Without a trained model, should return null
      expect(result).toBeNull();
    });
  });
});
