import ActivityLog from '../models/ActivityLog.js';

/**
 * Log a faculty/admin activity. Fire-and-forget — errors are logged but never thrown.
 * @param {Object} params
 * @param {string} params.actorId
 * @param {string} params.actionType
 * @param {string} [params.referenceId]
 * @param {string} [params.referenceModel]
 * @param {string} [params.academicContextId]
 * @param {string} [params.description]
 */
export const logActivity = async ({ actorId, actionType, referenceId, referenceModel, academicContextId, description }) => {
  try {
    await ActivityLog.create({
      actorId,
      actionType,
      referenceId,
      referenceModel,
      academicContextId,
      description,
    });
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      service: 'activityLog',
      event: 'log_failed',
      actorId,
      actionType,
      error: error.message,
    }));
  }
};

/**
 * Get activity logs for a specific actor (teacher/admin) with pagination.
 * @param {string} actorId
 * @param {Object} [options]
 * @param {number} [options.limit=20]
 * @param {number} [options.skip=0]
 */
export const getActivityByActor = async (actorId, { limit = 20, skip = 0 } = {}) => {
  return ActivityLog.find({ actorId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

/**
 * Get activity logs for a specific academic context with pagination.
 * @param {string} academicContextId
 * @param {Object} [options]
 * @param {number} [options.limit=20]
 * @param {number} [options.skip=0]
 */
export const getActivityByContext = async (academicContextId, { limit = 20, skip = 0 } = {}) => {
  return ActivityLog.find({ academicContextId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('actorId', 'name email role')
    .lean();
};
