import { Router } from 'express';
import { generateSchedule, getSchedules, completeSession } from '../controllers/scheduleController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.post('/generate', generateSchedule);
router.get('/', getSchedules);
router.post('/sessions/:sessionId/complete', completeSession);

export default router;
