/**
 * ML Tracking Service Tests
 *
 * Tests for incrementUserMetric fire-and-forget behavior.
 */
import { jest } from '@jest/globals';

const mockFindByIdAndUpdate = jest.fn();

jest.unstable_mockModule('../../models/User.js', () => ({
  default: {
    findByIdAndUpdate: mockFindByIdAndUpdate,
  },
}));

const { incrementUserMetric } = await import('../../services/mlTrackingService.js');

describe('mlTrackingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('incrementUserMetric', () => {
    it('should call $inc on the correct field with default amount of 1', async () => {
      mockFindByIdAndUpdate.mockResolvedValue({});

      await incrementUserMetric('user1', 'youtubeQuizAttempts');

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        'user1',
        { $inc: { youtubeQuizAttempts: 1 } },
      );
    });

    it('should respect custom amount', async () => {
      mockFindByIdAndUpdate.mockResolvedValue({});

      await incrementUserMetric('user1', 'materialViewCount', 5);

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        'user1',
        { $inc: { materialViewCount: 5 } },
      );
    });

    it('should not call DB when userId is missing', async () => {
      await incrementUserMetric(null, 'aiDoubtUsageCount');

      expect(mockFindByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should not call DB when field is missing', async () => {
      await incrementUserMetric('user1', '');

      expect(mockFindByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should not throw on DB error (fire-and-forget)', async () => {
      mockFindByIdAndUpdate.mockRejectedValue(new Error('DB timeout'));

      // Should NOT throw
      await expect(incrementUserMetric('u1', 'revisionPlanCount')).resolves.toBeUndefined();
    });
  });
});
