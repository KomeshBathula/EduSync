// Using specific path due to ESM package misconfiguration in youtube-transcript v1.3.0
import { YoutubeTranscript } from "youtube-transcript/dist/youtube-transcript.esm.js";

const transcriptCache = new Map(); // Simple in-memory cache for performance

export function extractVideoId(url) {
  if (!url) throw Object.assign(new Error("URL is required"), { statusCode: 400 });
  const regex = /(?:v=|youtu\.be\/|embed\/|v\/|shorts\/)([^&?]+)/;
  const match = url.match(regex);
  if (!match) throw Object.assign(new Error("Invalid YouTube URL"), { statusCode: 400 });
  return match[1].substring(0, 11);
}

export function cleanTranscript(text) {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 25000); // 25000 chars ~ 5000 tokens safety limit
}

export async function getTranscript(videoUrl) {
  try {
    const videoId = extractVideoId(videoUrl);

    if (transcriptCache.has(videoId)) {
      return transcriptCache.get(videoId);
    }

    const transcript = await YoutubeTranscript.fetchTranscript(videoId);

    if (!transcript || transcript.length === 0) {
      throw Object.assign(new Error("Transcript not available for this video"), { statusCode: 422 });
    }

    const fullText = transcript
      .map((item) => item.text)
      .join(" ");

    const cleaned = cleanTranscript(fullText);
    
    // Cache the result to optimize future calls
    transcriptCache.set(videoId, cleaned);
    
    // Optional: avoid unbounded memory growth
    if (transcriptCache.size > 1000) {
      const firstKey = transcriptCache.keys().next().value;
      transcriptCache.delete(firstKey);
    }

    return cleaned;

  } catch (error) {
    if (error.message && error.message.includes('Transcript is disabled')) {
      throw Object.assign(new Error("Transcript not available for this video (Disabled by creator)"), { statusCode: 422 });
    }
    if (error.statusCode) {
      throw error;
    }
    throw Object.assign(new Error("Failed to fetch transcript. The video might not have captions enabled."), { statusCode: 422 });
  }
}
