import { getActivityByActor, getActivityByContext } from '../services/activityLogService.js';

// @desc    Get activity log for the logged-in teacher/admin
// @route   GET /api/activity/my
// @access  TEACHER, ADMIN
export const getMyActivity = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = parseInt(req.query.skip) || 0;

    const logs = await getActivityByActor(req.user._id, { limit, skip });
    res.json(logs);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// @desc    Get activity log for an academic context
// @route   GET /api/activity/context/:contextId
// @access  TEACHER, ADMIN
export const getContextActivity = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = parseInt(req.query.skip) || 0;

    const logs = await getActivityByContext(req.params.contextId, { limit, skip });
    res.json(logs);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
