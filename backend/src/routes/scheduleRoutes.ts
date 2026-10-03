import { Router } from 'express';
import { generateSchedule, getSchedules, completeSession, updateSessionLanguage } from '../controllers/scheduleController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.post('/generate', generateSchedule);
router.get('/', getSchedules);
router.post('/sessions/:sessionId/complete', completeSession);
router.post('/sessions/:sessionId/language', updateSessionLanguage);

export default router;
