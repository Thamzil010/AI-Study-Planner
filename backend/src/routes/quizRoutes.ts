import express from 'express';
import { generateQuiz, submitQuiz, getQuizById, getQuizzes } from '../controllers/quizController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();
router.use(protect);

router.get('/', getQuizzes);
router.post('/generate', generateQuiz);
router.get('/:id', getQuizById);
router.post('/:id/submit', submitQuiz);

export default router;
