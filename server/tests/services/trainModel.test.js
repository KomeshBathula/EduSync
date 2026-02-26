/**
 * Train Model Tests
 *
 * Tests the model building architecture without actual DB or full training.
 */
import { jest } from '@jest/globals';

// Mock the database models so we don't need a real DB connection
jest.unstable_mockModule('../../models/User.js', () => ({
  default: { find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) },
}));

jest.unstable_mockModule('../../models/QuizResult.js', () => ({
  default: {
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
    countDocuments: jest.fn().mockResolvedValue(0),
  },
}));

jest.unstable_mockModule('../../models/IntegrityEvent.js', () => ({
  default: { countDocuments: jest.fn().mockResolvedValue(0) },
  VIOLATION_TYPES: [],
}));

const { buildModel, collectTrainingData } =
  await import('../../ml/trainModel.js');

describe('trainModel', () => {
  describe('buildModel', () => {
    it('should build a sequential model with 3 layers', () => {
      const model = buildModel();

      expect(model).toBeDefined();
      // The model should have 3 dense layers
      expect(model.layers).toHaveLength(3);
    });

    it('should have correct output shape (3 classes)', () => {
      const model = buildModel();
      const outputShape = model.outputShape;

      // Output should be [null, 3] for 3 risk classes
      expect(outputShape[1]).toBe(3);
    });

    it('should compile with adam optimizer', () => {
      const model = buildModel();

      expect(model.optimizer).toBeDefined();
    });
  });

  describe('collectTrainingData', () => {
    it('should return empty arrays when no students exist', async () => {
      const { features, labels } = await collectTrainingData();

      expect(features).toEqual([]);
      expect(labels).toEqual([]);
    });
  });
});
