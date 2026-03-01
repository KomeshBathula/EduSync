import User from '../models/User.js';
import AcademicStructure from '../models/AcademicStructure.js';
import generateToken from '../utils/jwt.js';
import bcrypt from 'bcryptjs';

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Authenticate a user and return token payload.
 * @param {string} email
 * @param {string} password
 * @returns {Object} { _id, name, email, role, token }
 */
export const authenticateUser = async (email, password) => {
  const user = await User.findOne({ email });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // ML Data Collection: track login metrics
  user.loginCount = (user.loginCount || 0) + 1;
  user.lastLoginAt = new Date();
  await user.save();

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken(user._id, user.role),
  };
};

/**
 * Register a new student user.
 * @param {Object} params
 * @returns {Object} { _id, name, email, role, token }
 */
export const registerStudent = async ({ name, email, password, role, academicContextId }) => {
  const userExists = await User.findOne({ email });
  if (userExists) {
    const error = new Error('User already exists');
    error.statusCode = 400;
    throw error;
  }

  const requestedRole = role || 'STUDENT';
  if (requestedRole !== 'STUDENT') {
    const error = new Error('Only student registration is allowed. Teachers and admins must be created by an administrator.');
    error.statusCode = 403;
    throw error;
  }

  let structure = null;
  if (academicContextId) {
    structure = await AcademicStructure.findById(academicContextId);
    if (!structure) {
      const error = new Error('Academic structure not found');
      error.statusCode = 404;
      throw error;
    }
  }

  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email,
    passwordHash,
    role: requestedRole,
    academicContext: structure ? structure._id : undefined,
  });

  if (!user) {
    const error = new Error('Invalid user data');
    error.statusCode = 400;
    throw error;
  }

  if (structure) {
    structure.students.push(user._id);
    await structure.save();
  }

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken(user._id, user.role),
  };
};
