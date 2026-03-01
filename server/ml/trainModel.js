import * as tf from '@tensorflow/tfjs';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import { extractFeatures, featuresToVector, FEATURE_COUNT, FEATURE_NAMES } from './featureExtractor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODEL_DIR = path.join(__dirname, 'model');

/**
 * Risk label to numeric class mapping.
 */
const RISK_LABELS = { LOW: 0, MEDIUM: 1, HIGH: 2 };

/**
 * Build the neural network model architecture.
 * @returns {tf.Sequential}
 */
export const buildModel = () => {
  const model = tf.sequential();

  model.add(tf.layers.dense({
    inputShape: [FEATURE_COUNT],
    units: 16,
    activation: 'relu',
  }));

  model.add(tf.layers.dense({
    units: 8,
    activation: 'relu',
  }));

  model.add(tf.layers.dense({
    units: 3,
    activation: 'softmax',
  }));

  model.compile({
    optimizer: 'adam',
    loss: 'sparseCategoricalCrossentropy',
    metrics: ['accuracy'],
  });

  return model;
};

/**
 * Generate a label for a student based on current rule-based risk level.
 * @param {string} riskLevel
 * @returns {number}
 */
const riskToLabel = (riskLevel) => {
  return RISK_LABELS[riskLevel] ?? 0;
};

/**
 * Generate a random float in [min, max].
 */
const randRange = (min, max) => min + Math.random() * (max - min);

/**
 * Generate synthetic training samples with realistic feature distributions
 * per risk class. Used when real student data is insufficient (<10 samples).
 *
 * Feature order: avgAccuracy3, avgAccuracy5, engagementScore, weakTopicCount,
 * integrityScore, violationRate, loginFrequency, materialEngagement,
 * youtubeQuizPerformance, aiUsageIntensity, trendSlope, timeConsistency
 *
 * @param {number} samplesPerClass - Number of synthetic samples per risk class
 * @returns {{features: number[][], labels: number[]}}
 */
export const generateSyntheticData = (samplesPerClass = 40) => {
  const features = [];
  const labels = [];

  // Distribution parameters per risk class [mean, spread]
  const distributions = {
    // LOW risk: high accuracy, high engagement, high integrity, positive trend
    LOW: {
      avgAccuracy3:           [0.80, 0.12],
      avgAccuracy5:           [0.78, 0.12],
      engagementScore:        [0.75, 0.15],
      weakTopicCount:         [0.10, 0.10],
      integrityScore:         [0.92, 0.06],
      violationRate:          [0.02, 0.03],
      loginFrequency:         [0.70, 0.15],
      materialEngagement:     [0.65, 0.20],
      youtubeQuizPerformance: [0.60, 0.20],
      aiUsageIntensity:       [0.50, 0.20],
      trendSlope:             [0.65, 0.10],
      timeConsistency:        [0.80, 0.12],
    },
    // MEDIUM risk: moderate accuracy, moderate engagement
    MEDIUM: {
      avgAccuracy3:           [0.55, 0.12],
      avgAccuracy5:           [0.52, 0.12],
      engagementScore:        [0.45, 0.15],
      weakTopicCount:         [0.35, 0.15],
      integrityScore:         [0.78, 0.10],
      violationRate:          [0.15, 0.10],
      loginFrequency:         [0.45, 0.15],
      materialEngagement:     [0.35, 0.15],
      youtubeQuizPerformance: [0.35, 0.15],
      aiUsageIntensity:       [0.30, 0.15],
      trendSlope:             [0.48, 0.10],
      timeConsistency:        [0.60, 0.15],
    },
    // HIGH risk: low accuracy, low engagement, low integrity, negative trend
    HIGH: {
      avgAccuracy3:           [0.25, 0.12],
      avgAccuracy5:           [0.28, 0.12],
      engagementScore:        [0.15, 0.10],
      weakTopicCount:         [0.65, 0.15],
      integrityScore:         [0.55, 0.15],
      violationRate:          [0.45, 0.20],
      loginFrequency:         [0.20, 0.12],
      materialEngagement:     [0.10, 0.10],
      youtubeQuizPerformance: [0.12, 0.10],
      aiUsageIntensity:       [0.10, 0.10],
      trendSlope:             [0.30, 0.12],
      timeConsistency:        [0.35, 0.18],
    },
  };

  for (const [riskLevel, featureDists] of Object.entries(distributions)) {
    for (let i = 0; i < samplesPerClass; i++) {
      const vector = FEATURE_NAMES.map(name => {
        const [mean, spread] = featureDists[name];
        // Gaussian-like sampling using Box-Muller, clamped to [0, 1]
        const u1 = Math.random() || 0.0001;
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return Math.max(0, Math.min(1, mean + z * spread));
      });
      features.push(vector);
      labels.push(riskToLabel(riskLevel));
    }
  }

  return { features, labels };
};

/**
 * Collect training data from all students with sufficient history.
 * Falls back to synthetic data generation when real data is insufficient.
 * @returns {Promise<{features: number[][], labels: number[], synthetic: boolean}>}
 */
export const collectTrainingData = async () => {
  const students = await User.find({ role: 'STUDENT' }).lean();
  const features = [];
  const labels = [];

  for (const student of students) {
    try {
      const featureObj = await extractFeatures(student._id.toString());
      const vector = featuresToVector(featureObj);
      features.push(vector);
      labels.push(riskToLabel(student.overallRiskLevel || 'LOW'));
    } catch (err) {
      // Skip students with insufficient data
      console.warn(`Skipping student ${student._id}: ${err.message}`);
    }
  }

  // If insufficient real data, augment with synthetic samples
  if (features.length < 10) {
    console.log(`Only ${features.length} real samples found. Augmenting with synthetic data...`);
    const synthetic = generateSyntheticData(40);
    // Prepend real data so it's included in training
    const allFeatures = [...features, ...synthetic.features];
    const allLabels = [...labels, ...synthetic.labels];
    console.log(`Training set: ${features.length} real + ${synthetic.features.length} synthetic = ${allFeatures.length} total`);
    return { features: allFeatures, labels: allLabels, synthetic: true };
  }

  return { features, labels, synthetic: false };
};

/**
 * Train the ML risk prediction model on historical student data.
 * @param {object} [options]
 * @param {number} [options.epochs=50]
 * @param {number} [options.batchSize=16]
 * @param {number} [options.validationSplit=0.2]
 * @returns {Promise<{model: tf.Sequential, history: object}>}
 */
export const trainModel = async (options = {}) => {
  const {
    epochs = 50,
    batchSize = 16,
    validationSplit = 0.2,
  } = options;

  console.log('Collecting training data...');
  const { features, labels, synthetic } = await collectTrainingData();

  if (features.length < 10) {
    throw new Error(`Insufficient training data: only ${features.length} samples. Need at least 10.`);
  }

  console.log(`Collected ${features.length} training samples${synthetic ? ' (includes synthetic augmentation)' : ''}.`);

  const model = buildModel();

  const xs = tf.tensor2d(features);
  const ys = tf.tensor1d(labels, 'float32');

  console.log('Starting model training...');
  const startTime = Date.now();

  // Early stopping callback
  let bestValLoss = Infinity;
  let patience = 5;
  let patienceCounter = 0;

  const history = await model.fit(xs, ys, {
    epochs,
    batchSize: Math.min(batchSize, features.length),
    validationSplit,
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if (epoch % 10 === 0) {
          console.log(`Epoch ${epoch}: loss=${logs.loss.toFixed(4)}, accuracy=${logs.acc.toFixed(4)}`);
        }
        // Manual early stopping
        const valLoss = logs.val_loss ?? logs.loss;
        if (valLoss < bestValLoss) {
          bestValLoss = valLoss;
          patienceCounter = 0;
        } else {
          patienceCounter++;
          if (patienceCounter >= patience) {
            console.log(`Early stopping at epoch ${epoch}`);
            model.stopTraining = true;
          }
        }
      },
    },
  });

  const trainingTimeMs = Date.now() - startTime;
  console.log(`Training completed in ${trainingTimeMs}ms`);

  // Clean up tensors
  xs.dispose();
  ys.dispose();

  return { model, history, trainingTimeMs, sampleCount: features.length, synthetic };
};

/**
 * Save a trained model to disk.
 * Uses manual JSON serialization since @tensorflow/tfjs (non-node)
 * doesn't support the file:// save handler.
 * @param {tf.Sequential} model
 * @param {object} [extra] - Extra metadata to save
 */
export const saveModel = async (model, extra = {}) => {
  await fs.mkdir(MODEL_DIR, { recursive: true });

  // Use custom IOHandler for pure tfjs (no tfjs-node)
  const saveResult = await model.save(tf.io.withSaveHandler(async (artifacts) => {
    // Save model topology
    const modelJSON = {
      modelTopology: artifacts.modelTopology,
      weightsManifest: [{
        paths: ['weights.bin'],
        weights: artifacts.weightSpecs,
      }],
    };
    await fs.writeFile(
      path.join(MODEL_DIR, 'model.json'),
      JSON.stringify(modelJSON),
    );

    // Save weight data
    const weightData = Buffer.from(artifacts.weightData);
    await fs.writeFile(path.join(MODEL_DIR, 'weights.bin'), weightData);

    return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' } };
  }));

  // Save metadata
  const metadata = {
    version: process.env.MODEL_VERSION || 'v1',
    trainedAt: new Date().toISOString(),
    featureCount: FEATURE_COUNT,
    ...extra,
  };
  await fs.writeFile(
    path.join(MODEL_DIR, 'metadata.json'),
    JSON.stringify(metadata, null, 2),
  );

  console.log(`Model saved to ${MODEL_DIR}`);
};

/**
 * Full training pipeline: collect data, train, save.
 */
export const runTrainingPipeline = async () => {
  const { model, history, trainingTimeMs, sampleCount, synthetic } = await trainModel();
  await saveModel(model, { sampleCount, syntheticAugmented: synthetic });
  console.log(`Training pipeline complete. ${sampleCount} samples${synthetic ? ' (synthetic augmented)' : ''}, ${trainingTimeMs}ms.`);
  return { trainingTimeMs, sampleCount, synthetic };
};
