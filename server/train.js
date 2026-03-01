/**
 * ML Model Training Script
 *
 * Usage: npm run train-ml
 *
 * Connects to MongoDB, collects student data, trains the risk prediction model,
 * and saves it to /server/ml/model/.
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const run = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI not set. Please configure your .env file.');
      process.exit(1);
    }

    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    // Dynamic import to avoid loading TF at module level
    const { runTrainingPipeline } = await import('./ml/trainModel.js');

    const result = await runTrainingPipeline();
    console.log('Training complete:', result);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Training failed:', error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
};

run();
