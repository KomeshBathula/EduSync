export const evaluateAssignment = async (score, maxScore) => {
    if (maxScore === 0) return 0;

    const accuracy = (score / maxScore);
    const assignedMarks = Math.round(accuracy * 5 * 10) / 10; // Yields /5 e.g. 4.5/5

    return assignedMarks;
};
