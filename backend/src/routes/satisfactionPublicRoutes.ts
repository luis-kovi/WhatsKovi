import { Router } from 'express';
import { getPublicSurvey, submitPublicSurvey } from '../controllers/satisfactionSurveyController';

const router = Router();

router.get('/:token', getPublicSurvey);
router.post('/:token', submitPublicSurvey);

export default router;
