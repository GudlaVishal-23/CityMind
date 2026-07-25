import { Router } from 'express';
import incidentRoutes from './incident.routes';
import adminRoutes from './admin.routes';
import graphRoutes from './graph.routes';
import officerRoutes from './officer.routes';
import notificationRoutes from './notification.routes';
import feedbackRoutes from './feedback.routes';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

// User Sync API
router.post('/auth/sync', authenticateJWT, (req, res) => {
  res.status(200).json({ success: true, data: req.user });
});

// Ingestion and details queries map under /incidents
router.use('/incidents', incidentRoutes);

// Neo4j Graph REST API endpoints map under /graph
router.use('/graph', graphRoutes);

// Officer workflow endpoints map under /officer
router.use('/officer', officerRoutes);

// Notification endpoints map under /notifications
router.use('/notifications', notificationRoutes);

// AI confidence feedback endpoints map under /feedback
router.use('/feedback', feedbackRoutes);

// Admin queries map directly (preserving /analytics/health and /incidents/:id/override schemas)
router.use('/', adminRoutes);

export default router;
