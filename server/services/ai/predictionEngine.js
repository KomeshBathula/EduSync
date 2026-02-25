import User from '../../models/User.js';
import QuizResult from '../../models/QuizResult.js';

/**
 * Calculates a student's risk level using:
 * - Trend accuracy (last 3 quizzes)
 * - Engagement score
 * - Weakness density
 */
export const evaluateRisk = async (studentId) => {
    try {
        const student = await User.findById(studentId);
        if (!student) throw new Error('Student not found');

        let baseRisk = 0;

        // 1. Trend Accuracy: Fetch last 3 quiz results
        const recentResults = await QuizResult.find({ studentId })
            .sort({ createdAt: -1 })
            .limit(3);

        if (recentResults.length >= 2) {
            const avgAccuracy = recentResults.reduce((acc, curr) => acc + curr.accuracyPercentage, 0) / recentResults.length;
            if (avgAccuracy < 50) { // If less than 50% avg over last 3
                baseRisk += 40;
            } else if (avgAccuracy < 70) {
                baseRisk += 20;
            }
        }

        // 2. Engagement (Mocked based on active time/login count logic)
        const engagementScore = 60; // Mock average engagement %
        if (engagementScore < 30) {
            baseRisk += 30;
        }

        // 3. Weakness Density
        const criticalWeaknesses = student.weakTopics.filter(t => t.failureCount >= 2).length;
        if (criticalWeaknesses > 1) {
            baseRisk += 30;
        }

        let overallRiskLevel = 'LOW';
        if (baseRisk >= 75) overallRiskLevel = 'HIGH';
        else if (baseRisk >= 40) overallRiskLevel = 'MEDIUM';

        student.overallRiskLevel = overallRiskLevel;
        await student.save();

        console.log(`Evaluated ${overallRiskLevel} risk for student ${studentId} (Score: ${baseRisk})`);
        return overallRiskLevel;

    } catch (error) {
        console.error('Error calculating prediction risk:', error.message);
    }
};
