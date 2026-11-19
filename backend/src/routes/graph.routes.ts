// =============================================================================
// AI CITY — Neo4j Graph REST API Routes
// =============================================================================

import { Router } from 'express';
import GraphController from '../controllers/graph.controller';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Department Routing Graph Traversal (Restricted to Municipal Officers and Admins)
router.post('/route', authenticateJWT, requireRole(['admin', 'officer']), GraphController.route);

// Nearest Field Officer Lookup (DEF-SEC-07: Restricted to Admin/Officer to prevent PII harvesting)
router.get('/officers/nearest', authenticateJWT, requireRole(['admin', 'officer']), GraphController.getNearestOfficers);

// Ward Statistics & Analytics
router.get('/wards/stats', authenticateJWT, GraphController.getWardStats);

// Complaint Spatial/Asset Clusters
router.get('/clusters', authenticateJWT, GraphController.getClusters);

export default router;
