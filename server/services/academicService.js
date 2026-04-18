import AcademicStructure from '../models/AcademicStructure.js';
import Material from '../models/Material.js';
import Quiz from '../models/Quiz.js';
import QuizResult from '../models/QuizResult.js';
import User from '../models/User.js';

const buildRadarData = (topicTotals) => {
    const baseScore = 150;

    const computeScore = (fails) => {
        const penalty = Math.min(fails * 10, baseScore - 10);
        return baseScore - penalty;
    };

    // Build radar data purely from actual quiz topics — no hardcoded defaults
    const subjects = Object.keys(topicTotals);
    if (subjects.length === 0) return [];

    return subjects.map((subject) => ({
        subject,
        A: computeScore(topicTotals[subject]),
        fullMark: baseScore
    }));
};

const mapRiskScore = (avgAccuracy, riskLevel) => {
    if (riskLevel === 'HIGH') {
        return Math.max(75, 100 - Math.round(avgAccuracy || 0));
    }
    if (riskLevel === 'MEDIUM') {
        return Math.max(45, 80 - Math.round(avgAccuracy || 0));
    }
    return Math.max(15, 50 - Math.round(avgAccuracy || 0));
};

export const listPublicAcademicStructures = async () => {
    return AcademicStructure.find({})
        .sort({ year: 1, branch: 1, section: 1 })
        .collation({ locale: 'en_US', numericOrdering: true });
};

export const getAcademicAnalytics = async (structureId) => {
    let students = [];
    if (structureId === 'all') {
        students = await User.find({ role: 'STUDENT' })
            .select('name email rollNumber overallRiskLevel weakTopics academicContext');
    } else {
        const structure = await AcademicStructure.findById(structureId)
            .populate('students', 'name email rollNumber overallRiskLevel weakTopics academicContext');
        if (!structure) {
            const error = new Error('Structure not found');
            error.statusCode = 404;
            throw error;
        }
        students = structure.students || [];
    }

    const studentIds = students.map((s) => s._id);
    const totalStudents = students.length;

    const highRiskStudents = students.filter((s) => s.overallRiskLevel === 'HIGH');
    const highRiskCount = highRiskStudents.length;

    const accuracyAgg = await QuizResult.aggregate([
        { $match: { studentId: { $in: studentIds } } },
        {
            $group: {
                _id: null,
                avgAccuracy: { $avg: '$accuracyPercentage' },
                totalQuizzes: { $sum: 1 }
            }
        }
    ]);

    const avgAccuracy = accuracyAgg.length > 0 ? Math.round(accuracyAgg[0].avgAccuracy) : 0;
    const totalQuizzes = accuracyAgg.length > 0 ? accuracyAgg[0].totalQuizzes : 0;

    let activeQuizzesQuery = {};
    if (structureId !== 'all') {
        activeQuizzesQuery = {
            $or: [{ targetAudience: structureId }, { targetAudience: { $exists: false } }]
        };
    }

    const recentQuizzes = await Quiz.find(activeQuizzesQuery)
        .sort({ createdAt: -1 })
        .limit(6)
        .select('title topicName baseDifficulty questions createdAt');

    const activeQuizzes = await Quiz.countDocuments(activeQuizzesQuery);

    let activeMaterialsQuery = {};
    if (structureId !== 'all') {
        activeMaterialsQuery = { academicContext: structureId };
    }

    const recentMaterials = await Material.find(activeMaterialsQuery)
        .sort({ createdAt: -1 })
        .limit(6)
        .select('title mimetype originalFileName createdAt');

    const topicAgg = await User.aggregate([
        { $match: { _id: { $in: studentIds } } },
        { $unwind: { path: '$weakTopics', preserveNullAndEmptyArrays: true } },
        {
            $group: {
                _id: '$weakTopics.topicName',
                totalFailures: { $sum: '$weakTopics.failureCount' }
            }
        }
    ]);

    const topicTotals = {};
    topicAgg.forEach((row) => {
        if (row._id) {
            topicTotals[row._id] = row.totalFailures;
        }
    });

    const radarData = buildRadarData(topicTotals);

    const quizResults = await QuizResult.aggregate([
        { $match: { studentId: { $in: studentIds } } },
        {
            $group: {
                _id: '$studentId',
                avgAccuracy: { $avg: '$accuracyPercentage' }
            }
        }
    ]);

    const accuracyMap = new Map();
    quizResults.forEach((row) => {
        accuracyMap.set(String(row._id), row.avgAccuracy);
    });

    const allStudents = students.map((student) => {
        const avgStudentAccuracy = accuracyMap.get(String(student._id)) || 0;
        return {
            _id: student._id,
            name: student.name,
            rollNumber: student.rollNumber,
            riskLevel: student.overallRiskLevel || 'LOW',
            avgAccuracy: Math.round(avgStudentAccuracy),
            weakness: student.weakTopics && student.weakTopics.length > 0
                ? student.weakTopics[0].topicName
                : 'None'
        };
    });

    const highRiskStudentsData = highRiskStudents.map((student) => {
        const avgStudentAccuracy = accuracyMap.get(String(student._id)) || 0;
        const riskVal = mapRiskScore(avgStudentAccuracy, student.overallRiskLevel || 'HIGH');
        return {
            _id: student._id,
            name: student.name,
            riskVal,
            failedTopic: student.weakTopics && student.weakTopics.length > 0
                ? student.weakTopics[0].topicName
                : 'N/A'
        };
    });

    return {
        totalStudents,
        activeQuizzes,
        recentQuizzes,
        recentMaterials,
        highRiskCount,
        avgAccuracy: totalQuizzes > 0 ? avgAccuracy : 0,
        radarData,
        highRiskStudents: highRiskStudentsData,
        allStudents,
        teachingInsights: buildTeachingInsights(topicTotals, totalStudents, totalQuizzes > 0 ? avgAccuracy : 0),
    };
};

/**
 * Build teaching focus insights from topic failure data.
 * Phrased constructively — highlights opportunity areas, not blame.
 */
function buildTeachingInsights(topicTotals, totalStudents, avgAccuracy) {
    const topics = Object.entries(topicTotals)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]);

    // No topic data yet — return null so the UI can show an appropriate empty state
    if (topics.length === 0) {
        return null;
    }

    const focusAreas = topics.slice(0, 4).map(([topic, failCount]) => {
        const pct = totalStudents > 0 ? Math.round((failCount / totalStudents) * 100) : 0;
        let suggestion = '';
        if (pct > 50) suggestion = `A significant number of students find ${topic} challenging — a dedicated revision class could be very helpful`;
        else if (pct > 25) suggestion = `Some students could benefit from extra practice problems and worked examples in ${topic}`;
        else suggestion = `A few students may need one-on-one support or additional resources for ${topic}`;
        return { topic, studentsStruggling: failCount, suggestion };
    });

    const classHealth = avgAccuracy >= 70 ? 'excellent' : avgAccuracy >= 50 ? 'good' : 'needs-attention';

    return {
        focusAreas,
        summary: avgAccuracy >= 70
            ? 'The class is performing well overall. A few targeted interventions can help remaining students catch up.'
            : avgAccuracy >= 50
                ? 'Most students are on track. The topics below could use some reinforcement to lift class performance.'
                : 'Some foundational topics need attention. Focused revision sessions on the areas below can help students build confidence.',
        classHealth,
    };
}
