import User from '../../models/User.js';

/**
 * Updates the student's concept graph/weak areas based on failed questions.
 * @param {string} studentId - The user ID of the student.
 * @param {Array<string>} weakNodes - Array of topic tags the student failed.
 */
export const updateStudentGraph = async (studentId, weakNodes) => {
    try {
        const student = await User.findById(studentId);
        if (!student) throw new Error('Student not found');

        const updatedWeakTopics = [...student.weakTopics];

        weakNodes.forEach(topic => {
            const existingIndex = updatedWeakTopics.findIndex(wt => wt.topicName === topic);
            if (existingIndex >= 0) {
                updatedWeakTopics[existingIndex].failureCount += 1;
            } else {
                updatedWeakTopics.push({ topicName: topic, failureCount: 1 });
            }
        });

        student.weakTopics = updatedWeakTopics;
        await student.save();

        console.log(`Updated concept graph for student ${studentId}`);
        return student.weakTopics;
    } catch (error) {
        console.error('Error in weakAreaDetector:', error.message);
    }
};
