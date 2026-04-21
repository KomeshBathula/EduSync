import User from '../../models/User.js';
import QuizResult from '../../models/QuizResult.js';
import { createNotification } from '../notificationService.js';
import { predictRisk } from '../../ml/inferenceService.js';
import MLAuditLog from '../../models/MLAuditLog.js';

const ML_CONFIDENCE_THRESHOLD = parseFloat(process.env.ML_CONFIDENCE_THRESHOLD) || 0.65;
const ENABLE_ML = process.env.ENABLE_ML !== 'false';

/**
 * Rule-based risk evaluation (fallback).
 * @param {object} student - User document
 * @param {object[]} recentResults - Last 3 quiz results
 * @returns {string} Risk level: LOW | MEDIUM | HIGH
 */
export const evaluateRiskRuleBased = (student, recentResults) => {
    let baseRisk = 0;

    // 1. Trend Accuracy
    if (recentResults.length >= 2) {
        const avgAccuracy = recentResults.reduce((acc, curr) => acc + curr.accuracyPercentage, 0) / recentResults.length;
        if (avgAccuracy < 50) {
            baseRisk += 40;
        } else if (avgAccuracy < 70) {
            baseRisk += 20;
        }
    }

    // 2. Engagement
    const totalInteractions = (student.aiDoubtUsageCount || 0) +
        (student.revisionPlanCount || 0) +
        (student.materialViewCount || 0);
    const engagementScore = Math.min(totalInteractions * 10, 100);
    if (engagementScore < 30) {
        baseRisk += 30;
    }

    // 3. Weakness Density
    const weakTopics = student.weakTopics || [];
    const criticalWeaknesses = weakTopics.filter(t => t.failureCount >= 2).length;
    if (criticalWeaknesses > 1) {
        baseRisk += 30;
    }

    if (baseRisk >= 75) return 'HIGH';
    if (baseRisk >= 40) return 'MEDIUM';
    return 'LOW';
};

/**
 * Hybrid risk evaluation: uses ML prediction when available and confident,
 * falls back to rule-based scoring otherwise.
 *
 * Stores both ML and rule predictions for analysis.
 *
 * @param {string} studentId
 * @returns {Promise<string>} Risk level: LOW | MEDIUM | HIGH
 */
export const evaluateRisk = async (studentId) => {
    try {
        const student = await User.findById(studentId);
        if (!student) throw new Error('Student not found');

        // Fetch recent results for rule-based engine
        const recentResults = await QuizResult.find({ studentId })
            .sort({ createdAt: -1 })
            .limit(3);

        // Rule-based prediction (always computed for comparison)
        const rulePrediction = evaluateRiskRuleBased(student, recentResults);

        let overallRiskLevel = rulePrediction;
        let predictionSource = 'RULE';
        let mlResult = null;

        // Try ML prediction if enabled
        if (ENABLE_ML) {
            try {
                mlResult = await predictRisk(studentId);
            } catch {
                // ML failed silently, use rule-based
            }
        }

        // Use ML prediction if confidence exceeds threshold
        if (mlResult && mlResult.confidence > ML_CONFIDENCE_THRESHOLD) {
            overallRiskLevel = mlResult.predictedClass;
            predictionSource = 'ML';
        }

        // Update user with prediction details
        const previousRisk = student.overallRiskLevel || 'LOW';
        student.overallRiskLevel = overallRiskLevel;
        student.lastRulePrediction = rulePrediction;
        if (mlResult) {
            student.lastMLPrediction = mlResult.predictedClass;
            student.predictionConfidence = mlResult.confidence;
        }
        await student.save();

        // Log rule-based prediction for audit if ML was not used or was overridden
        if (predictionSource === 'RULE') {
            MLAuditLog.create({
                studentId,
                featuresSnapshot: { source: 'rule-based' },
                predictedClass: rulePrediction,
                confidence: 1.0,
                predictionSource: 'RULE',
                modelVersion: 'rule',
            }).catch(() => {});
        }

        // Notify student if risk level changed
        if (previousRisk !== overallRiskLevel) {
            const riskMessages = {
                HIGH: 'Your academic risk level has increased to HIGH. Consider using Smart Revision and AI Doubt Solver to improve.',
                MEDIUM: `Your academic risk level is now MEDIUM${previousRisk === 'HIGH' ? ' (improved!)' : ''}. Keep practicing to stay on track.`,
                LOW: 'Great news! Your academic risk level has dropped to LOW. Keep up the excellent work!',
            };
            createNotification({
                userId: studentId,
                title: 'Risk Level Updated',
                message: riskMessages[overallRiskLevel],
                type: 'RISK',
            }).catch(() => {}); // fire-and-forget
        }

        console.log(`[${predictionSource}] Evaluated ${overallRiskLevel} risk for student ${studentId}` +
            (mlResult ? ` (ML: ${mlResult.predictedClass}@${(mlResult.confidence * 100).toFixed(1)}%, Rule: ${rulePrediction})` : ` (Rule: ${rulePrediction})`));

        return overallRiskLevel;

    } catch (error) {
        console.error('Error calculating prediction risk:', error.message);
    }
};
