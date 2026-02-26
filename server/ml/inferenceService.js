import * as tf from '@tensorflow/tfjs';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractFeatures, featuresToVector, FEATURE_NAMES } from './featureExtractor.js';
import { mlPredictionCache, getOrCompute } from './cacheService.js';
import MLAuditLog from '../models/MLAuditLog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODEL_DIR = path.join(__dirname, 'model');

const RISK_CLASSES = ['LOW', 'MEDIUM', 'HIGH'];

/** Maximum time (ms) allowed for feature extraction before timeout. */
const FEATURE_EXTRACTION_TIMEOUT_MS = 5000;

/**
 * Singleton model cache to avoid reloading on every prediction.
 */
let cachedModel = null;
let modelLoadTimeMs = 0;
let modelMetadata = null;

/**
 * Check if a trained model exists on disk.
 * @returns {Promise<boolean>}
 */
export const modelExists = async () => {
  try {
    await fs.access(path.join(MODEL_DIR, 'model.json'));
    return true;
  } catch {
    return false;
  }
};

/**
 * Load the trained model into memory (cached singleton).
 * @returns {Promise<tf.LayersModel|null>}
 */
export const loadModel = async () => {
  if (cachedModel) return cachedModel;

  const exists = await modelExists();
  if (!exists) {
    console.warn('ML model not found. Using rule-based fallback.');
    return null;
  }

  try {
    const startTime = Date.now();
    const modelPath = `file://${MODEL_DIR}/model.json`;
    cachedModel = await tf.loadLayersModel(modelPath);
    modelLoadTimeMs = Date.now() - startTime;

    // Load metadata
    try {
      const metadataRaw = await fs.readFile(path.join(MODEL_DIR, 'metadata.json'), 'utf-8');
      modelMetadata = JSON.parse(metadataRaw);
    } catch {
      modelMetadata = { version: 'unknown' };
    }

    console.log(`ML model loaded in ${modelLoadTimeMs}ms (version: ${modelMetadata.version})`);
    return cachedModel;
  } catch (err) {
    console.error('Failed to load ML model:', err.message);
    cachedModel = null;
    return null;
  }
};

/**
 * Get model status information for health checks.
 */
export const getModelStatus = () => ({
  loaded: cachedModel !== null,
  loadTimeMs: modelLoadTimeMs,
  version: modelMetadata?.version || 'none',
  trainedAt: modelMetadata?.trainedAt || null,
});

/**
 * Predict student risk using the ML model.
 * Falls back to null if model unavailable.
 *
 * @param {string} studentId
 * @returns {Promise<{predictedClass: string, confidence: number, probabilityDistribution: object, features: object, source: string}|null>}
 */
export const predictRisk = async (studentId) => {
  // Check cache first
  const cacheKey = `ml_prediction_${studentId}`;
  const cached = mlPredictionCache.get(cacheKey);
  if (cached) return cached;

  const model = await loadModel();
  if (!model) return null;

  const startTime = Date.now();

  try {
    // Extract features with timeout protection
    const featurePromise = extractFeatures(studentId);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Feature extraction timeout')), FEATURE_EXTRACTION_TIMEOUT_MS),
    );
    const features = await Promise.race([featurePromise, timeoutPromise]);
    const vector = featuresToVector(features);

    // Run inference
    const inputTensor = tf.tensor2d([vector]);
    const prediction = model.predict(inputTensor);
    const probabilities = await prediction.data();
    inputTensor.dispose();
    prediction.dispose();

    // Find predicted class
    let maxIdx = 0;
    let maxProb = probabilities[0];
    for (let i = 1; i < probabilities.length; i++) {
      if (probabilities[i] > maxProb) {
        maxProb = probabilities[i];
        maxIdx = i;
      }
    }

    const predictionTimeMs = Date.now() - startTime;

    const result = {
      predictedClass: RISK_CLASSES[maxIdx],
      confidence: maxProb,
      probabilityDistribution: {
        LOW: probabilities[0],
        MEDIUM: probabilities[1],
        HIGH: probabilities[2],
      },
      features,
      source: 'ML',
      predictionTimeMs,
      modelVersion: modelMetadata?.version || 'unknown',
    };

    // Cache the prediction
    mlPredictionCache.set(cacheKey, result);

    // Log for audit (fire-and-forget)
    MLAuditLog.create({
      studentId,
      featuresSnapshot: features,
      predictedClass: result.predictedClass,
      confidence: result.confidence,
      predictionSource: 'ML',
      modelVersion: result.modelVersion,
      predictionTimeMs,
    }).catch((err) => {
      console.error('Failed to log ML audit:', err.message);
    });

    return result;
  } catch (err) {
    console.error(`ML prediction failed for student ${studentId}:`, err.message);
    return null;
  }
};
