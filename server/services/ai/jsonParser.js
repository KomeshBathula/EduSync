// ─── JSON Parsing and Validation Layer ──────────────────────────────

/**
 * Strips markdown formatting and other noise from AI response text.
 */
export function cleanAIResponse(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/```(?:json)?/g, '')
    .replace(/```/g, '')
    .trim();
}

/**
 * Safely attempts to parse JSON from a raw text string.
 * Uses extraction bounds as a fallback if plain parsing fails.
 */
export function safeParseJSON(rawText) {
  try {
    return JSON.parse(rawText);
  } catch (error) {
    // If standard parsing fails, try finding { or [ boundaries
    try {
      const startObj = rawText.indexOf('{');
      const endObj = rawText.lastIndexOf('}');
      const startArr = rawText.indexOf('[');
      const endArr = rawText.lastIndexOf(']');
      
      let startIdx = -1;
      let endIdx = -1;
      
      if (startObj !== -1 && (startArr === -1 || startObj < startArr)) {
        startIdx = startObj;
        endIdx = endObj;
      } else if (startArr !== -1) {
        startIdx = startArr;
        endIdx = endArr;
      }
      
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const extracted = rawText.substring(startIdx, endIdx + 1);
        return JSON.parse(extracted);
      }
    } catch (fallbackError) {
      // both failed
    }
    return null;
  }
}

/**
 * Validates that the generated data perfectly matches the required Revision Plan schema.
 */
export function validateRevisionPlan(data) {
  if (!data || !data.days || !Array.isArray(data.days) || data.days.length !== 7) {
    return false;
  }

  return data.days.every(day =>
    day &&
    Array.isArray(day.focusTopics) && day.focusTopics.length > 0 &&
    Array.isArray(day.subtopics) && day.subtopics.length > 0 &&
    Array.isArray(day.recommendedPractice) && day.recommendedPractice.length > 0 &&
    typeof day.timeAllocation === 'string' && day.timeAllocation.trim() !== ''
  );
}
