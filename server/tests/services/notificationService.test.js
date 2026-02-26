/**
 * Notification Service Tests
 *
 * Tests for createNotification, notifyStudentsInContext,
 * getUserNotifications, markAsRead, markAllAsRead.
 *
 * Uses manual mocks — no DB connection needed.
 */
import { jest } from '@jest/globals';

// ─── Mock Mongoose Models ──────────────────────────────────────────

const mockNotificationCreate = jest.fn();
const mockNotificationInsertMany = jest.fn();
const mockNotificationFind = jest.fn();
const mockNotificationCountDocuments = jest.fn();
const mockNotificationFindOneAndUpdate = jest.fn();
const mockNotificationUpdateMany = jest.fn();
const mockAcademicFindById = jest.fn();

jest.unstable_mockModule('../../models/Notification.js', () => ({
  default: {
    create: mockNotificationCreate,
    insertMany: mockNotificationInsertMany,
    find: mockNotificationFind,
    countDocuments: mockNotificationCountDocuments,
    findOneAndUpdate: mockNotificationFindOneAndUpdate,
    updateMany: mockNotificationUpdateMany,
  },
}));

jest.unstable_mockModule('../../models/AcademicStructure.js', () => ({
  default: {
    findById: mockAcademicFindById,
  },
}));

// ─── Import after mocks ────────────────────────────────────────────
const { createNotification, notifyStudentsInContext, getUserNotifications, markAsRead, markAllAsRead } =
  await import('../../services/notificationService.js');

// ─── Tests ─────────────────────────────────────────────────────────
describe('notificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── createNotification ──────────────────────────────────────────
  describe('createNotification', () => {
    it('should create a notification with all required fields', async () => {
      const data = {
        userId: 'user123',
        title: 'New Quiz',
        message: 'A new quiz has been assigned.',
        type: 'QUIZ',
        referenceId: 'quiz456',
      };
      const expected = { _id: 'nid1', ...data, isRead: false };
      mockNotificationCreate.mockResolvedValue(expected);

      const result = await createNotification(data);

      expect(mockNotificationCreate).toHaveBeenCalledWith(data);
      expect(result).toEqual(expected);
    });

    it('should not throw on DB error (fire-and-forget)', async () => {
      mockNotificationCreate.mockRejectedValue(new Error('DB down'));

      // Should NOT throw
      const result = await createNotification({ userId: 'u1', title: 't', message: 'm', type: 'SYSTEM' });
      expect(result).toBeUndefined();
    });
  });

  // ── notifyStudentsInContext ──────────────────────────────────────
  describe('notifyStudentsInContext', () => {
    it('should bulk insert notifications for all students in a section', async () => {
      mockAcademicFindById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ students: ['s1', 's2', 's3'] }),
        }),
      });
      mockNotificationInsertMany.mockResolvedValue([]);

      await notifyStudentsInContext({
        academicContextId: 'ctx1',
        title: 'New Material',
        message: 'Teacher uploaded notes.',
        type: 'MATERIAL',
        referenceId: 'mat1',
      });

      expect(mockNotificationInsertMany).toHaveBeenCalledTimes(1);
      const insertedDocs = mockNotificationInsertMany.mock.calls[0][0];
      expect(insertedDocs).toHaveLength(3);
      expect(insertedDocs[0].userId).toBe('s1');
      expect(insertedDocs[0].type).toBe('MATERIAL');
      expect(insertedDocs[0].isRead).toBe(false);
    });

    it('should do nothing when structure has no students', async () => {
      mockAcademicFindById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ students: [] }),
        }),
      });

      await notifyStudentsInContext({
        academicContextId: 'ctx1',
        title: 'T',
        message: 'M',
        type: 'QUIZ',
      });

      expect(mockNotificationInsertMany).not.toHaveBeenCalled();
    });

    it('should not throw when structure not found', async () => {
      mockAcademicFindById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      // Should NOT throw
      await notifyStudentsInContext({
        academicContextId: 'missing',
        title: 'T',
        message: 'M',
        type: 'SYSTEM',
      });
    });
  });

  // ── getUserNotifications ────────────────────────────────────────
  describe('getUserNotifications', () => {
    it('should return notifications and unread count with defaults', async () => {
      const mockDocs = [{ _id: '1', title: 'A' }, { _id: '2', title: 'B' }];
      mockNotificationFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockDocs),
            }),
          }),
        }),
      });
      mockNotificationCountDocuments.mockResolvedValue(5);

      const result = await getUserNotifications('user1');

      expect(result.notifications).toEqual(mockDocs);
      expect(result.unreadCount).toBe(5);
    });

    it('should filter by unreadOnly when specified', async () => {
      mockNotificationFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      mockNotificationCountDocuments.mockResolvedValue(0);

      await getUserNotifications('user1', { unreadOnly: true });

      // It should have called find with isRead: false
      const findArg = mockNotificationFind.mock.calls[0][0];
      expect(findArg.isRead).toBe(false);
    });
  });

  // ── markAsRead ──────────────────────────────────────────────────
  describe('markAsRead', () => {
    it('should update notification to isRead=true', async () => {
      const expected = { _id: 'n1', userId: 'u1', isRead: true };
      mockNotificationFindOneAndUpdate.mockResolvedValue(expected);

      const result = await markAsRead('n1', 'u1');

      expect(mockNotificationFindOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'n1', userId: 'u1' },
        { isRead: true },
        { new: true },
      );
      expect(result.isRead).toBe(true);
    });

    it('should throw 404 when notification not found', async () => {
      mockNotificationFindOneAndUpdate.mockResolvedValue(null);

      await expect(markAsRead('missing', 'u1')).rejects.toMatchObject({
        message: 'Notification not found',
        statusCode: 404,
      });
    });
  });

  // ── markAllAsRead ───────────────────────────────────────────────
  describe('markAllAsRead', () => {
    it('should update all unread notifications for user', async () => {
      mockNotificationUpdateMany.mockResolvedValue({ modifiedCount: 7 });

      const result = await markAllAsRead('u1');

      expect(mockNotificationUpdateMany).toHaveBeenCalledWith(
        { userId: 'u1', isRead: false },
        { isRead: true },
      );
      expect(result.modifiedCount).toBe(7);
    });
  });
});
