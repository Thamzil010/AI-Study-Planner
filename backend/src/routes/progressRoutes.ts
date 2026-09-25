import { Router } from 'express';
import { getProgress, addProgress, getDashboardStats } from '../controllers/progressController';
import { protect } from '../middleware/authMiddleware';

const router = Router();
router.use(protect);

router.get('/dashboard-stats', getDashboardStats);

router.route('/')
  .get(getProgress)
  .post(addProgress);

export default router;
