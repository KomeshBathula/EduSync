import mongoose from 'mongoose';
import { generateRevisionPlan } from './services/ai/smartRevisionService.js';
import User from './models/User.js';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/edusync').then(async () => {
  console.log('Connected');
  try {
    const user = await User.create({
      name: 'Test',
      email: 'test@example.com',
      passwordHash: 'password',
      role: 'STUDENT',
      weakTopics: [{ topicName: 'Math', failureCount: 2 }],
      overallRiskLevel: 'HIGH'
    });
    const result = await generateRevisionPlan({ userId: user._id, language: 'English' });
    console.log(JSON.stringify(result, null, 2));
    await User.findByIdAndDelete(user._id);
  } catch (error) {
    console.error(error);
  }
  process.exit(0);
});