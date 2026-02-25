import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const httpServer = createServer(app);

// Socket.io for Real-Time Analytics and Leaderboards
export const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(express.json());
app.use(cors());

// Routes
import authRoutes from './routes/authRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);

// Basic Route
app.get('/', (req, res) => {
    res.send('EduSync AI API is running...');
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
