// ─── Centralized Prompt Templates for EduSync AI ──────────────────
// All prompts enforce structured JSON output, academic tone,
// grade-level adaptation, and anti-hallucination directives.

const SUPPORTED_LANGUAGES = ['English', 'Hindi', 'Telugu', 'Tamil', 'Spanish'];

const validateLanguage = (lang) => {
  if (!lang || !SUPPORTED_LANGUAGES.includes(lang)) return 'English';
  return lang;
};

// ─── System Preamble ──────────────────────────────────────────────
const SYSTEM_PREAMBLE = `You are an expert educational AI assistant for the EduSync learning platform.
You MUST respond strictly in valid JSON format. Do not include any text, explanation, or commentary outside the JSON object.
Maintain a professional academic tone at all times.
Only provide factually accurate information. If uncertain, state it explicitly within your structured response.
Never fabricate citations, statistics, or references.`;

// ─── Doubt Solver ─────────────────────────────────────────────────
export const buildDoubtSolverPrompt = ({ question, weakTopics = [], gradeContext = '', recentPerformance = '' }) => {
  const weaknessStr = weakTopics.length > 0
    ? `Known weak topics: ${weakTopics.join(', ')}.`
    : 'No specific weak topics identified.';

  const gradeStr = gradeContext ? `Academic context: ${gradeContext}.` : '';
  const perfStr = recentPerformance ? `Recent performance: ${recentPerformance}.` : '';

  return {
    system: `${SYSTEM_PREAMBLE}
You are a patient, step-by-step academic tutor. You explain concepts thoroughly, adapting to the student's level.
${gradeStr}
${weaknessStr}
${perfStr}
Tailor your explanation considering the student's known weaknesses.
Always encourage understanding over memorization.`,
    user: `Student's question: "${question}"

Respond STRICTLY in this JSON format. No extra text outside JSON:
{
  "answer": "A clear, comprehensive answer to the question (2-4 sentences)",
  "explanationSteps": [
    "Step 1: ...",
    "Step 2: ...",
    "Step 3: ..."
  ],
  "relatedConcepts": [
    {
      "concept": "Related concept name",
      "relevance": "Why this is relevant to the question"
    }
  ],
  "suggestedPractice": [
    "A practice exercise or question to reinforce understanding"
  ]
}

Rules:
- Provide 3-5 explanation steps
- Provide 2-4 related concepts
- Provide 2-3 suggested practice items
- Be accurate and educational
- Do NOT hallucinate facts
- If you don't know something, say so in the answer field`
  };
};

// ─── Smart Revision Planner ───────────────────────────────────────
export const buildSmartRevisionPrompt = ({ weakTopics = [], riskLevel = 'LOW', recentQuizScores = [], language = 'English' }) => {
  const lang = validateLanguage(language);
  const langDirective = lang !== 'English'
    ? `\nGenerate the entire response in ${lang}. Maintain academic terminology accurately. Ensure JSON keys remain in English.`
    : '';

  // PERFORMANCE: Trim weak topics to avoid massive token bloat
  const trimmedTopics = weakTopics.slice(0, 5);
  const topicsStr = trimmedTopics.length > 0
    ? trimmedTopics.map(t => `${t.topicName} (failed ${t.failureCount} times)`).join(', ')
    : 'General review needed';

  return {
    system: `${SYSTEM_PREAMBLE}
You are an academic planning assistant.

Generate a STRICT 7-day revision plan.

Respond ONLY in valid JSON.

DO NOT include:
- Markdown
- Explanations outside JSON
- Extra text${langDirective}`,
    user: `Create a personalized 7-day revision plan for a student.

Weak Topics: ${topicsStr}
Risk Level: ${riskLevel}

JSON FORMAT:

{
  "overview": "string",
  "days": [
    {
      "day": 1,
      "focusTopics": ["string"],
      "subtopics": ["string"],
      "recommendedPractice": ["string"],
      "timeAllocation": "string"
    }
  ],
  "revisionStrategy": "string"
}

Rules:
- Exactly 7 days
- All fields must exist
- Arrays must not be empty
- No extra keys
- No trailing commas
- Output must be parseable JSON`
  };
};

// ─── Quiz Explanation (Future-Proof) ──────────────────────────────
export const buildQuizExplanationPrompt = ({ question, options, correctIndex, studentAnswer }) => {
  return {
    system: `${SYSTEM_PREAMBLE}
You explain quiz answers clearly and educationally.`,
    user: `Explain this quiz question result:

Question: ${question}
Options: ${JSON.stringify(options)}
Correct Answer: Option ${correctIndex + 1} (${options[correctIndex]})
Student's Answer: Option ${studentAnswer + 1} (${options[studentAnswer]})

Respond STRICTLY in this JSON format:
{
  "explanation": "Clear explanation of the correct answer",
  "whyCorrect": "Why the correct option is right",
  "whyWrong": "Why the student's choice was incorrect (skip if they got it right)",
  "conceptToReview": "The key concept to review"
}`
  };
};

// ─── Multilingual Wrapper ─────────────────────────────────────────
export const wrapMultilingual = (prompt, language) => {
  const lang = validateLanguage(language);
  if (lang === 'English') return prompt;
  return `${prompt}\n\nIMPORTANT: Generate the entire response in ${lang}. Maintain academic terminology with accurate translations. Ensure all JSON keys remain in English.`;
};

export { SUPPORTED_LANGUAGES, validateLanguage };

// ─── Adaptive Recommendation Engine Prompt ────────────────────────
export const buildRecommendationPrompt = ({ weakTopics = [], riskLevel = 'LOW', recentScores = [], availableResources = [], personalization = null }) => {
  const topicsStr = weakTopics.length > 0
    ? weakTopics.map(t => `${t.topicName} (failed ${t.failureCount} times)`).join(', ')
    : 'None identified';

  const scoresStr = recentScores.length > 0
    ? recentScores.map(s => `${s.accuracy}%`).join(', ')
    : 'No recent data';

  const resourcesStr = availableResources.length > 0
    ? availableResources.map(r => `"${r.title}"`).join(', ')
    : 'No specific materials available';

  const personalizationStr = personalization
    ? `\nPersonalization Context:
- Quiz Difficulty Target: ${personalization.quizDifficulty}
- Revision Intensity: ${personalization.revisionIntensity}
- Study Plan Style: ${personalization.studyPlanDetail}
- Question Style: ${personalization.questionStyle}`
    : '';

  return {
    system: `${SYSTEM_PREAMBLE}
You are a learning path advisor that provides actionable study recommendations.`,
    user: `Provide adaptive learning recommendations for a student:

Weak Topics: ${topicsStr}
Risk Level: ${riskLevel}
Recent Quiz Scores: ${scoresStr}
Available Materials: ${resourcesStr}${personalizationStr}

Respond STRICTLY in this JSON format:
{
  "priorityTopics": [
    "Topic name that should be prioritized"
  ],
  "studyPlan": [
    "A specific actionable study task with estimated time"
  ],
  "motivationalNote": "A brief encouraging message based on their situation"
}

Rules:
- List 2-4 priority topics
- Provide 3-5 study plan actions
- Be specific and actionable, not vague
- HIGH risk students need more structured, basic plans
- LOW risk students benefit from advanced challenges`
  };
};
