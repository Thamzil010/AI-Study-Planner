import express from 'express';
import { getResourcesForTopic } from '../controllers/resourceController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();
router.use(protect);

router.get('/topic/:subjectId', getResourcesForTopic);

export default router;
