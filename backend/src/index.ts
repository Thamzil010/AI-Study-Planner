import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectRedis } from './config/redis';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

import authRoutes from './routes/authRoutes';
import subjectRoutes from './routes/subjectRoutes';
import scheduleRoutes from './routes/scheduleRoutes';
import resourcesRoutes from './routes/resourcesRoutes';
import quizRoutes from './routes/quizRoutes';
import progressRoutes from './routes/progressRoutes';
import userRoutes from './routes/userRoutes';
import examReadinessRoutes from './routes/examReadinessRoutes';
import reportsRoutes from './routes/reportsRoutes';
import chatRoutes from './routes/chatRoutes';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/users', userRoutes);
app.use('/api/exam-readiness', examReadinessRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/chat', chatRoutes);

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Start Server
const startServer = async () => {
  try {
    await connectRedis();
    app.listen(port, () => {
      console.info(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
