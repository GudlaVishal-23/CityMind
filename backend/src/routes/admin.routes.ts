import { Router } from 'express';
import { z } from 'zod';
import AdminController from '../controllers/admin.controller';
import Incident from '../models/incident.model';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';

const router = Router();

// Zod validation schema for admin overrides
const overrideSchema = z.object({
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  department: z.enum(['PWD', 'ELECTRICITY', 'WATER_BOARD', 'SANITATION']).optional(),
  reason: z.string().min(15, 'Override explanation must be at least 15 characters long.')
}).refine(
  (data) => data.severity || data.department,
  {
    message: 'Must provide at least one override target (severity or department).',
    path: ['severity']
  }
);

// Bind routes
router.patch(
  '/incidents/:id/override',
  authenticateJWT,
  requireRole(['admin']),
  validateBody(overrideSchema),
  AdminController.applyOverride
);

router.patch(
  '/incidents/:id/status',
  authenticateJWT,
  requireRole(['admin']),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['Submitted', 'AI_Assigned', 'In_Progress', 'Resolved'].includes(status)) {
        res.status(400).json({ success: false, error: { message: 'Invalid status value.' } });
        return;
      }

      const incident = await Incident.findById(id);
      if (!incident) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Incident with ID [${id}] does not exist.` }
        });
        return;
      }

      incident.status = status;
      await incident.save();

      res.status(200).json({
        success: true,
        data: incident
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/incidents/:id/audit',
  authenticateJWT,
  requireRole(['admin']),
  AdminController.getAuditLog
);

router.get(
  '/incidents/:id/audit/pdf',
  authenticateJWT,
  requireRole(['admin']),
  AdminController.exportAuditPdf
);

router.get(
  '/analytics/health',
  authenticateJWT,
  requireRole(['admin']),
  AdminController.getHealthAnalytics
);

export default router;
