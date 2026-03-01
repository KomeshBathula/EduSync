import Notification from '../models/Notification.js';
import AcademicStructure from '../models/AcademicStructure.js';

/**
 * Create a single notification for a specific user.
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.title
 * @param {string} params.message
 * @param {string} params.type - QUIZ | MATERIAL | RISK | SYSTEM | RECOMMENDATION
 * @param {string} [params.referenceId]
 */
export const createNotification = async ({ userId, title, message, type, referenceId }) => {
  try {
    return await Notification.create({ userId, title, message, type, referenceId });
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      service: 'notificationService',
      event: 'create_failed',
      userId,
      type,
      error: error.message,
    }));
  }
};

/**
 * Bulk-notify all students in an academic context (section).
 * Fire-and-forget — errors are logged but never thrown.
 * @param {Object} params
 * @param {string} params.academicContextId
 * @param {string} params.title
 * @param {string} params.message
 * @param {string} params.type
 * @param {string} [params.referenceId]
 */
export const notifyStudentsInContext = async ({ academicContextId, title, message, type, referenceId }) => {
  try {
    const structure = await AcademicStructure.findById(academicContextId).select('students').lean();
    if (!structure || !structure.students?.length) return;

    const notifications = structure.students.map(studentId => ({
      userId: studentId,
      title,
      message,
      type,
      referenceId,
      isRead: false,
    }));

    await Notification.insertMany(notifications, { ordered: false });

    console.log(JSON.stringify({
      level: 'info',
      service: 'notificationService',
      event: 'bulk_notify',
      contextId: academicContextId,
      count: notifications.length,
      type,
    }));
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      service: 'notificationService',
      event: 'bulk_notify_failed',
      academicContextId,
      error: error.message,
    }));
  }
};

/**
 * Fetch notifications for a user with pagination.
 * @param {string} userId
 * @param {Object} options
 * @param {number} [options.limit=20]
 * @param {number} [options.skip=0]
 * @param {boolean} [options.unreadOnly=false]
 */
export const getUserNotifications = async (userId, { limit = 20, skip = 0, unreadOnly = false } = {}) => {
  const filter = { userId };
  if (unreadOnly) filter.isRead = false;

  const [notifications, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ userId, isRead: false }),
  ]);

  return { notifications, unreadCount };
};

/**
 * Mark a single notification as read.
 */
export const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true },
    { new: true }
  );
  if (!notification) {
    const error = new Error('Notification not found');
    error.statusCode = 404;
    throw error;
  }
  return notification;
};

/**
 * Mark all notifications as read for a user.
 */
export const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { userId, isRead: false },
    { isRead: true }
  );
  return { modifiedCount: result.modifiedCount };
};
