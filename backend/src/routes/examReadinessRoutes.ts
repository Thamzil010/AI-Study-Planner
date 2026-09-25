import { Router } from 'express';
import { getExamReadiness } from '../controllers/examReadinessController';
import { protect } from '../middleware/authMiddleware';

const router = Router();
router.use(protect);
router.get('/', getExamReadiness);

export default router;
