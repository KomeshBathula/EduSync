import {
  handleViolation,
  getQuizIntegrityEvents,
  getQuizIntegritySummary,
  updateBehaviorProfile,
  checkSessionLocked,
} from '../services/integrityService.js';
import { getViolationThreshold } from '../services/examSessionManager.js';
import { VIOLATION_TYPES } from '../models/IntegrityEvent.js';
import { sendSuccess, sendError, sendCatchError } from '../utils/apiResponse.js';

/**
 * @desc    Report a violation during a quiz
 * @route   POST /api/quiz/:id/violation
 * @access  STUDENT
 */
export const reportViolation = async (req, res) => {
  try {
    const quizId = req.params.id;
    const studentId = req.user._id;
    const { eventType, metadata } = req.body;

    if (!eventType || !VIOLATION_TYPES.includes(eventType)) {
      return sendError(res, {
        status: 400,
        message: `Invalid eventType. Must be one of: ${VIOLATION_TYPES.join(', ')}`,
        error: 'VALIDATION_ERROR',
      });
    }

    if (checkSessionLocked(quizId, studentId)) {
      return sendError(res, {
        status: 409,
        message: 'Quiz already force-submitted due to violations.',
        error: 'SESSION_LOCKED',
      });
    }

    const result = await handleViolation(studentId, quizId, eventType, metadata || {});

    if (result.thresholdReached) {
      updateBehaviorProfile(studentId, quizId).catch((err) =>
        console.error('Behavior profile update failed:', err.message)
      );
    }

    return sendSuccess(res, {
      status: 201,
      message: 'Violation recorded',
      data: {
        violationCount: result.violationCount ?? 0,
        threshold: result.threshold ?? 3,
        thresholdReached: result.thresholdReached ?? false,
        warning: result.warning ?? null,
        locked: result.locked ?? false,
        forcedResult: result.forcedResult ?? null,
      },
    });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', service: 'integrityController', event: 'report_violation_failed', error: error.message }));
    return sendCatchError(res, error, 'Failed to record violation');
  }
};

/**
 * @desc    Get integrity events for a quiz (teacher view)
 * @route   GET /api/quiz/:id/integrity
 * @access  TEACHER, ADMIN
 */
export const getIntegrityEvents = async (req, res) => {
  try {
    const events = await getQuizIntegrityEvents(req.params.id);
    return sendSuccess(res, { message: 'Integrity events fetched', data: { events: events ?? [] } });
  } catch (error) {
    return sendCatchError(res, error, 'Failed to fetch integrity events');
  }
};

/**
 * @desc    Get integrity summary per student for a quiz
 * @route   GET /api/quiz/:id/integrity/summary
 * @access  TEACHER, ADMIN
 */
export const getIntegritySummary = async (req, res) => {
  try {
    const summary = await getQuizIntegritySummary(req.params.id);
    return sendSuccess(res, { message: 'Integrity summary fetched', data: { summary: summary ?? [] } });
  } catch (error) {
    return sendCatchError(res, error, 'Failed to fetch integrity summary');
  }
};

/**
 * @desc    Get violation threshold configuration
 * @route   GET /api/quiz/integrity/config
 * @access  All authenticated
 */
export const getIntegrityConfig = async (req, res) => {
  try {
    const strictMode = process.env.STRICT_EXAM_MODE === 'true';
    return sendSuccess(res, {
      message: 'Integrity config fetched',
      data: { violationThreshold: getViolationThreshold(), strictMode },
    });
  } catch (error) {
    return sendCatchError(res, error, 'Failed to fetch integrity config');
  }
};
