import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const User = (await import('./models/User.js')).default;
const AcademicStructure = (await import('./models/AcademicStructure.js')).default;

await mongoose.connect(process.env.MONGO_URI);

// Create a sample academic context
let context = await AcademicStructure.findOne({ year: 2024, branch: 'CSE' });
if (!context) {
  context = await AcademicStructure.create({
    year: 2024,
    branch: 'CSE',
    section: 'A',
    strength: 60,
  });
  console.log('✅ Academic context created: CSE-2024-A');
} else {
  console.log('✅ Academic context exists: CSE-2024-A');
}

// Create test teacher
let teacher = await User.findOne({ email: 'teacher@edusync.com' });
if (!teacher) {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('teacher@123', salt);
  teacher = await User.create({
    name: 'Test Teacher',
    email: 'teacher@edusync.com',
    passwordHash,
    role: 'TEACHER',
    academicContext: context._id,
    loginCount: 0,
  });
  console.log('✅ Teacher created:');
  console.log('   Email: teacher@edusync.com');
  console.log('   Password: teacher@123');
} else {
  console.log('✅ Teacher already exists: teacher@edusync.com');
}

// Create test student
let student = await User.findOne({ email: 'student@edusync.com' });
if (!student) {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('student@123', salt);
  student = await User.create({
    name: 'Test Student',
    email: 'student@edusync.com',
    passwordHash,
    role: 'STUDENT',
    academicContext: context._id,
    loginCount: 0,
  });
  console.log('✅ Student created:');
  console.log('   Email: student@edusync.com');
  console.log('   Password: student@123');
} else {
  console.log('✅ Student already exists: student@edusync.com');
}

// Create test admin
let admin = await User.findOne({ email: 'admin@edusync.com' });
if (!admin) {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('admin@123', salt);
  admin = await User.create({
    name: 'Admin User',
    email: 'admin@edusync.com',
    passwordHash,
    role: 'ADMIN',
    loginCount: 0,
  });
  console.log('✅ Admin created:');
  console.log('   Email: admin@edusync.com');
  console.log('   Password: admin@123');
} else {
  console.log('✅ Admin already exists: admin@edusync.com');
}

console.log('\n========================================');
console.log('✅ TEST ACCOUNTS READY');
console.log('========================================');
console.log('\nUse these credentials to test login:\n');
console.log('ADMIN:');
console.log('  Email: admin@edusync.com');
console.log('  Password: admin@123\n');
console.log('TEACHER:');
console.log('  Email: teacher@edusync.com');
console.log('  Password: teacher@123\n');
console.log('STUDENT:');
console.log('  Email: student@edusync.com');
console.log('  Password: student@123\n');

await mongoose.disconnect();
