import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import QuizResult from './models/QuizResult.js';

async function runTest() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/edusync-ai');
  console.log('Connected to DB');
  
  await QuizResult.init(); // Wait for indexes to build
  console.log('Indexes synced');
  
  const studentId = new mongoose.Types.ObjectId();
  const quizId = new mongoose.Types.ObjectId();
  
  console.log('Simulating 50 concurrent exact-same submissions (duplicate exploit)...');
  
  const promises = [];
  let successCount = 0;
  let failCount = 0;
  
  const start = Date.now();
  for(let i=0; i<50; i++) {
     promises.push(
         QuizResult.create({
            studentId, quizId,
            totalScore: 10, correctAnswers: 2, totalQuestions: 5,
            percentage: 40, score: 20, timeTakenSeconds: 100,
            accuracyPercentage: 40, marksAssigned: 2,
            questionMetrics: []
         }).then(() => successCount++)
           .catch(e => failCount++)
     );
  }
  
  await Promise.all(promises);
  const latency = Date.now() - start;
  
  console.log(`Test finished in ${latency}ms`);
  console.log(`Successes: ${successCount}`);
  console.log(`Failures (11000 Duplicate Key): ${failCount}`);
  
  if (successCount !== 1) {
     console.error('FAILED: More than one submission succeeded!');
  } else {
     console.log('PASSED: DB correctly blocked race condition.');
  }
  
  process.exit(0);
}

runTest();
