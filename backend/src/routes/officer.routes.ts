import { Router } from 'express';
import OfficerController from '../controllers/officer.controller';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.post('/incidents/:id/accept', authenticateJWT, requireRole(['officer', 'admin']), OfficerController.acceptIncident);
router.post('/incidents/:id/reject', authenticateJWT, requireRole(['officer', 'admin']), OfficerController.rejectIncident);
router.post('/incidents/:id/request-info', authenticateJWT, requireRole(['officer', 'admin']), OfficerController.requestInfo);
router.patch('/incidents/:id/status', authenticateJWT, requireRole(['officer', 'admin']), OfficerController.updateStatus);
router.post('/incidents/:id/close', authenticateJWT, requireRole(['officer', 'admin']), OfficerController.closeIncident);

export default router;
