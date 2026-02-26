/**
 * Prompt Templates Tests
 *
 * Tests noteSize variants, YouTube quiz prompt risk-adaptive difficulty,
 * and recommendation prompt structure.
 */
import { jest } from '@jest/globals';

// promptTemplates.js is pure functions, no external deps to mock
const {
  buildYoutubeSummaryPrompt,
  buildYoutubeQuizPrompt,
  buildRecommendationPrompt,
} = await import('../../services/ai/promptTemplates.js');

describe('promptTemplates', () => {
  // ── YouTube Summary Prompt ──────────────────────────────────────
  describe('buildYoutubeSummaryPrompt', () => {
    it('should return system and user strings', () => {
      const result = buildYoutubeSummaryPrompt({
        transcript: 'Some transcript text.',
        language: 'English',
        title: 'Test Video',
      });

      expect(result.system).toBeDefined();
      expect(result.user).toBeDefined();
      expect(typeof result.system).toBe('string');
      expect(typeof result.user).toBe('string');
    });

    it('should include noteSize "Detailed" config when specified', () => {
      const result = buildYoutubeSummaryPrompt({
        transcript: 'Some transcript.',
        language: 'English',
        title: 'T',
        noteSize: 'Detailed',
      });

      // Detailed should contain more notes/questions reference
      expect(result.user).toContain('Detailed');
    });

    it('should default to Medium when noteSize is not provided', () => {
      const result = buildYoutubeSummaryPrompt({
        transcript: 'T',
        language: 'English',
        title: 'T',
      });

      // Should still produce valid prompt
      expect(result.system.length).toBeGreaterThan(50);
      expect(result.user.length).toBeGreaterThan(50);
    });
  });

  // ── YouTube Quiz Prompt ─────────────────────────────────────────
  describe('buildYoutubeQuizPrompt', () => {
    it('should return system and user prompts', () => {
      const result = buildYoutubeQuizPrompt({
        summary: 'Test summary',
        keyConcepts: ['A', 'B'],
        title: 'Test',
        riskLevel: 'LOW',
      });

      expect(result.system).toBeDefined();
      expect(result.user).toBeDefined();
    });

    it('should adapt difficulty for HIGH risk (basic to moderate)', () => {
      const result = buildYoutubeQuizPrompt({
        summary: 'Test',
        riskLevel: 'HIGH',
      });

      expect(result.system).toContain('basic to moderate');
      expect(result.user).toContain('4'); // 4 questions for HIGH risk
    });

    it('should adapt difficulty for LOW risk (moderate to challenging)', () => {
      const result = buildYoutubeQuizPrompt({
        summary: 'Test',
        riskLevel: 'LOW',
      });

      expect(result.system).toContain('moderate to challenging');
      expect(result.user).toContain('5'); // 5 questions for LOW risk
    });

    it('should adapt difficulty for MEDIUM risk', () => {
      const result = buildYoutubeQuizPrompt({
        summary: 'Test',
        riskLevel: 'MEDIUM',
      });

      // MEDIUM should have moderate difficulty
      expect(result.system.toLowerCase()).toContain('moderate');
    });

    it('should include JSON response format in user prompt', () => {
      const result = buildYoutubeQuizPrompt({
        summary: 'Test',
        riskLevel: 'LOW',
      });

      expect(result.user).toContain('JSON');
      expect(result.user).toContain('questionText');
      expect(result.user).toContain('correctOptionIndex');
    });

    it('should handle empty keyConcepts gracefully', () => {
      const result = buildYoutubeQuizPrompt({
        summary: 'Test summary',
        keyConcepts: [],
        riskLevel: 'LOW',
      });

      expect(result.user).toContain('general concepts');
    });
  });

  // ── Recommendation Prompt ───────────────────────────────────────
  describe('buildRecommendationPrompt', () => {
    it('should return system and user prompts', () => {
      const result = buildRecommendationPrompt({
        weakTopics: [{ topicName: 'Trees', failureCount: 3 }],
        riskLevel: 'HIGH',
        recentScores: [{ accuracy: 40 }],
        availableResources: [{ title: 'Trees PDF' }],
      });

      expect(result.system).toBeDefined();
      expect(result.user).toBeDefined();
    });

    it('should include weak topics in prompt', () => {
      const result = buildRecommendationPrompt({
        weakTopics: [{ topicName: 'Graphs', failureCount: 5 }],
        riskLevel: 'MEDIUM',
      });

      expect(result.user).toContain('Graphs');
      expect(result.user).toContain('5');
    });

    it('should handle empty data gracefully', () => {
      const result = buildRecommendationPrompt({});

      expect(result.user).toContain('None identified');
      expect(result.system.length).toBeGreaterThan(20);
    });

    it('should include risk level', () => {
      const result = buildRecommendationPrompt({ riskLevel: 'HIGH' });

      expect(result.user).toContain('HIGH');
    });

    it('should mention available resources when provided', () => {
      const result = buildRecommendationPrompt({
        availableResources: [{ title: 'DP Notes' }, { title: 'Graph Theory' }],
      });

      expect(result.user).toContain('DP Notes');
      expect(result.user).toContain('Graph Theory');
    });
  });
});
