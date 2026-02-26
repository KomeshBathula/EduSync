import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';

dotenv.config();

// ─── Environment Validation ──────────────────────────────────────
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'GROQ_API_KEY'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`[FATAL] Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Please check your .env file.');
  process.exit(1);
}

// Connect to MongoDB
connectDB();

const app = express();
const httpServer = createServer(app);

// Trust proxy (required for Render, Railway, etc. behind reverse proxies)
app.set('trust proxy', 1);

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

// Socket.io for Real-Time Analytics and Leaderboards
export const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
}));

// File downloads are served via /api/materials/download/:id route (stored in MongoDB)

// Routes
import authRoutes from './routes/authRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import academicRoutes from './routes/academicRoutes.js';
import materialRoutes from './routes/materialRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import activityRoutes from './routes/activityRoutes.js';

app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity', activityRoutes);

// Health check endpoint (used by deployment platforms)
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'EduSync AI API',
        timestamp: new Date().toISOString(),
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// 404 handler for unmatched routes
app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(JSON.stringify({
        level: 'error',
        event: 'unhandled_error',
        method: req.method,
        url: req.originalUrl,
        error: err.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    }));
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        message: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message,
    });
});

// Socket.io connection
io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Real-time leaderboard updates
    socket.on('join_quiz_room', (quizId) => {
        socket.join(quizId);
        console.log(`User mapped to quiz room: ${quizId}`);
    });

    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Graceful Shutdown
const shutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    httpServer.close(() => {
        console.log('HTTP server closed');
        mongoose.connection.close(false).then(() => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
    // Force exit after 10 seconds
    setTimeout(() => {
        console.error('Forcing shutdown...');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
