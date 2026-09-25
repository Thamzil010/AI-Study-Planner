import { Router } from 'express';
import { getReports } from '../controllers/reportsController';
import { protect } from '../middleware/authMiddleware';

const router = Router();
router.use(protect);
router.get('/', getReports);

export default router;
