import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
} from '../services/notificationService.js';

// @desc    Get notifications for the logged-in user
// @route   GET /api/notifications
// @access  Authenticated
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = parseInt(req.query.skip) || 0;
    const unreadOnly = req.query.unreadOnly === 'true';

    const data = await getUserNotifications(userId, { limit, skip, unreadOnly });
    res.json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// @desc    Mark a single notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Authenticated
export const markNotificationRead = async (req, res) => {
  try {
    const notification = await markAsRead(req.params.id, req.user._id);
    res.json(notification);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Authenticated
export const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await markAllAsRead(req.user._id);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
