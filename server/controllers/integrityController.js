import {
  handleViolation,
  getQuizIntegrityEvents,
  getQuizIntegritySummary,
  updateBehaviorProfile,
  checkSessionLocked,
  cleanupExamSession,
} from '../services/integrityService.js';
import { getViolationThreshold } from '../services/examSessionManager.js';
import { VIOLATION_TYPES } from '../models/IntegrityEvent.js';

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
      return res.status(400).json({
        message: `Invalid eventType. Must be one of: ${VIOLATION_TYPES.join(', ')}`,
      });
    }

    // Check if session is already locked (quiz already force-submitted)
    if (checkSessionLocked(quizId, studentId)) {
      return res.status(409).json({
        message: 'Quiz already force-submitted due to violations.',
        locked: true,
        thresholdReached: true,
      });
    }

    const result = await handleViolation(studentId, quizId, eventType, metadata || {});

    // If threshold reached, also update behavioral profile
    if (result.thresholdReached) {
      updateBehaviorProfile(studentId, quizId).catch(err =>
        console.error('Behavior profile update failed:', err.message)
      );
    }

    res.status(201).json(result);
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error', service: 'integrityController',
      event: 'report_violation_failed', error: error.message,
    }));
    res.status(error.statusCode || 500).json({ message: error.message });
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
    res.json(events);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

/**
 * @desc    Get integrity summary for a quiz (aggregated per student)
 * @route   GET /api/quiz/:id/integrity/summary
 * @access  TEACHER, ADMIN
 */
export const getIntegritySummary = async (req, res) => {
  try {
    const summary = await getQuizIntegritySummary(req.params.id);
    res.json(summary);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

/**
 * @desc    Get violation threshold configuration
 * @route   GET /api/quiz/integrity/config
 * @access  STUDENT, TEACHER, ADMIN
 */
export const getIntegrityConfig = async (req, res) => {
  try {
    const strictMode = process.env.STRICT_EXAM_MODE === 'true';
    res.json({
      violationThreshold: getViolationThreshold(),
      strictMode,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
