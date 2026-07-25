// =============================================================================
// AI CITY — Neo4j Graph REST API Routes
// =============================================================================

import { Router } from 'express';
import GraphController from '../controllers/graph.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

// Department Routing Graph Traversal
router.post('/route', authenticateJWT, GraphController.route);

// Nearest Field Officer Lookup
router.get('/officers/nearest', authenticateJWT, GraphController.getNearestOfficers);

// Ward Statistics & Analytics
router.get('/wards/stats', authenticateJWT, GraphController.getWardStats);

// Complaint Spatial/Asset Clusters
router.get('/clusters', authenticateJWT, GraphController.getClusters);

export default router;
