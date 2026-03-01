import Material from '../models/Material.js';
import Quiz from '../models/Quiz.js';
import QuizResult from '../models/QuizResult.js';
import User from '../models/User.js';

const getRiskMetrics = (overallRiskLevel) => {
    if (overallRiskLevel === 'HIGH') {
        return { score: 85, label: 'HIGH' };
    }
    if (overallRiskLevel === 'MEDIUM') {
        return { score: 55, label: 'MEDIUM' };
    }
    return { score: 20, label: 'LOW' };
};

export const getStudentDashboard = async (userId) => {
    const user = await User.findById(userId).populate('academicContext');
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    const quizResults = await QuizResult.find({ studentId: userId })
        .sort({ createdAt: 1 })
        .populate('quizId', 'title');

    const progressionResults = quizResults.slice(-5);
    const progressionData = progressionResults.map((qr, index) => ({
        name: `Quiz ${index + 1}`,
        score: qr.accuracyPercentage
    }));

    const quizHistory = quizResults.slice(-10).reverse().map((qr) => ({
        id: qr._id,
        title: qr.quizId ? qr.quizId.title : 'AI Quiz',
        score: qr.accuracyPercentage,
        date: qr.createdAt
    }));

    const attemptedQuizIds = quizResults
        .map((qr) => (qr.quizId ? qr.quizId._id : null))
        .filter(Boolean);

    if (progressionData.length === 0) {
        progressionData.push({ name: 'Start Learning', score: 0 });
    }

    let availableQuizzesQuery = {
        status: 'PUBLISHED',
        _id: { $nin: attemptedQuizIds }
    };

    if (user.academicContext) {
        availableQuizzesQuery = {
            ...availableQuizzesQuery,
            $or: [{ targetAudience: user.academicContext._id }, { targetAudience: { $exists: false } }]
        };
    }

    const availableQuizzes = await Quiz.find(availableQuizzesQuery)
        .select('title baseDifficulty')
        .limit(5);

    let recommendedResources = [];
    if (user.academicContext) {
        recommendedResources = await Material.find({ academicContext: user.academicContext._id })
            .select('-fileData')
            .sort({ createdAt: -1 })
            .limit(6);
    }

    const sortedWeakTopics = [...(user.weakTopics || [])].sort((a, b) => (b.failureCount || 0) - (a.failureCount || 0));
    const topWeakness = sortedWeakTopics.length > 0 ? sortedWeakTopics[0].topicName : 'None detected yet';

    return {
        user: {
            name: user.name,
            role: user.role,
            riskLevel: user.overallRiskLevel || 'LOW',
            topWeakness,
            contextString: user.academicContext
                ? `${user.academicContext.branch} • Year ${user.academicContext.year} • Sec ${user.academicContext.section}`
                : 'Unassigned'
        },
        progressionData,
        availableQuizzes,
        riskMetrics: getRiskMetrics(user.overallRiskLevel),
        recommendedResources: recommendedResources.map((res) => ({
            id: res._id,
            title: res.title,
            type: res.originalFileName.split('.').pop() || 'File',
            url: `/api/materials/download/${res._id}`
        })),
        quizHistory
    };
};
