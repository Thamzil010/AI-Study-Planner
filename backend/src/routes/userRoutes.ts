import express from 'express';
import { getPreferences, updatePreferences, updatePassword } from '../controllers/userController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);
router.put('/password', updatePassword);

export default router;
