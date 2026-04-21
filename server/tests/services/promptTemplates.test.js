/**
 * Prompt Templates Tests
 *
 * Tests recommendation prompt structure.
 */
import { jest } from '@jest/globals';

const {
  buildRecommendationPrompt,
} = await import('../../services/ai/promptTemplates.js');

describe('promptTemplates', () => {
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