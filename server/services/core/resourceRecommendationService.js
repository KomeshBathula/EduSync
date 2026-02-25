/**
 * Suggests external resources based on identified weak paths.
 * @param {Array<string>} weakTopics 
 */
export const getRecommendations = async (weakTopics) => {
    // Mock external API integrations (e.g., YouTube Data API or scraping GFG meta data)
    const recommendations = weakTopics.map(topic => {
        // Return predefined structure
        return {
            topic,
            suggestedVideo: `https://youtube.com/results?search_query=${encodeURIComponent(topic + ' explanation in 5 minutes')}`,
            suggestedArticle: `https://www.geeksforgeeks.org/search/?q=${encodeURIComponent(topic)}`
        };
    });

    return recommendations;
};
