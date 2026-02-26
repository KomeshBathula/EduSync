import * as tf from '@tensorflow/tfjs';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import { extractFeatures, featuresToVector, FEATURE_COUNT } from './featureExtractor.js';

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
 * Collect training data from all students with sufficient history.
 * @returns {Promise<{features: number[][], labels: number[]}>}
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

  return { features, labels };
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
  const { features, labels } = await collectTrainingData();

  if (features.length < 10) {
    throw new Error(`Insufficient training data: only ${features.length} samples. Need at least 10.`);
  }

  console.log(`Collected ${features.length} training samples.`);

  const model = buildModel();

  const xs = tf.tensor2d(features);
  const ys = tf.tensor1d(labels, 'int32');

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

  return { model, history, trainingTimeMs, sampleCount: features.length };
};

/**
 * Save a trained model to disk.
 * @param {tf.Sequential} model
 */
export const saveModel = async (model) => {
  await fs.mkdir(MODEL_DIR, { recursive: true });
  const savePath = `file://${MODEL_DIR}`;
  await model.save(savePath);

  // Save metadata
  const metadata = {
    version: process.env.MODEL_VERSION || 'v1',
    trainedAt: new Date().toISOString(),
    featureCount: FEATURE_COUNT,
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
  const { model, history, trainingTimeMs, sampleCount } = await trainModel();
  await saveModel(model);
  console.log(`Training pipeline complete. ${sampleCount} samples, ${trainingTimeMs}ms.`);
  return { trainingTimeMs, sampleCount };
};
