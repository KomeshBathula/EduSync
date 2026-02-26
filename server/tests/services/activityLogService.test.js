/**
 * Activity Log Service Tests
 */
import { jest } from '@jest/globals';

const mockActivityCreate = jest.fn();
const mockActivityFind = jest.fn();

jest.unstable_mockModule('../../models/ActivityLog.js', () => ({
  default: {
    create: mockActivityCreate,
    find: mockActivityFind,
  },
}));

const { logActivity, getActivityByActor, getActivityByContext } =
  await import('../../services/activityLogService.js');

describe('activityLogService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logActivity', () => {
    it('should create an activity log entry', async () => {
      mockActivityCreate.mockResolvedValue({ _id: 'al1' });

      await logActivity({
        actorId: 'teacher1',
        actionType: 'QUIZ_CREATE',
        referenceId: 'q1',
        referenceModel: 'Quiz',
        academicContextId: 'ctx1',
        description: 'Created quiz on Trees',
      });

      expect(mockActivityCreate).toHaveBeenCalledWith({
        actorId: 'teacher1',
        actionType: 'QUIZ_CREATE',
        referenceId: 'q1',
        referenceModel: 'Quiz',
        academicContextId: 'ctx1',
        description: 'Created quiz on Trees',
      });
    });

    it('should not throw on DB error (fire-and-forget)', async () => {
      mockActivityCreate.mockRejectedValue(new Error('DB error'));

      // Should NOT throw
      await expect(logActivity({ actorId: 'a', actionType: 'MATERIAL_UPLOAD' })).resolves.toBeUndefined();
    });
  });

  describe('getActivityByActor', () => {
    it('should return activities sorted by createdAt desc', async () => {
      const mockDocs = [{ _id: 'a1' }, { _id: 'a2' }];
      mockActivityFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockDocs),
            }),
          }),
        }),
      });

      const result = await getActivityByActor('teacher1');

      expect(mockActivityFind).toHaveBeenCalledWith({ actorId: 'teacher1' });
      expect(result).toEqual(mockDocs);
    });
  });

  describe('getActivityByContext', () => {
    it('should populate actorId and return context activities', async () => {
      const mockDocs = [{ _id: 'a1', actorId: { name: 'Teacher' } }];
      mockActivityFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockDocs),
              }),
            }),
          }),
        }),
      });

      const result = await getActivityByContext('ctx1', { limit: 10 });

      expect(mockActivityFind).toHaveBeenCalledWith({ academicContextId: 'ctx1' });
      expect(result).toEqual(mockDocs);
    });
  });
});
