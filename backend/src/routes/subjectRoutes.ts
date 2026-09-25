import { Router } from 'express';
import { getSubjects, createSubject, updateSubject, deleteSubject } from '../controllers/subjectController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect); // Protect all subject routes

router.route('/')
  .get(getSubjects)
  .post(createSubject);

router.route('/:id')
  .put(updateSubject)
  .delete(deleteSubject);

export default router;
