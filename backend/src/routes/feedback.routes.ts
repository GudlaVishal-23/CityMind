import { Router } from 'express';
import AIFeedback from '../models/feedback.model';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';

const router = Router();

// POST /api/feedback — Submit AI confidence feedback
router.post('/', authenticateJWT, requireRole(['officer', 'admin']), async (req, res, next) => {
  try {
    const { incidentId, aiSeverity, officerSeverity, aiDepartment, officerDepartment, reason } = req.body;
    if (!reason || reason.length < 10) {
      res.status(400).json({ success: false, error: { message: 'Feedback reason must be at least 10 characters.' } });
      return;
    }

    const feedback = await AIFeedback.create({
      incidentId,
      officerId: req.user!.id,
      aiSeverity,
      officerSeverity,
      aiDepartment,
      officerDepartment,
      reason
    });

    res.status(201).json({ success: true, data: feedback });
  } catch (error) { next(error); }
});

// GET /api/feedback/stats — Get agreement/disagreement rates
router.get('/stats', authenticateJWT, requireRole(['admin']), async (_req, res, next) => {
  try {
    const allFeedback = await AIFeedback.find({});
    const total = allFeedback.length;
    const severityAgreements = allFeedback.filter((f: any) => f.aiSeverity === f.officerSeverity).length;
    const deptAgreements = allFeedback.filter((f: any) => f.aiDepartment === f.officerDepartment).length;

    res.status(200).json({
      success: true,
      data: {
        totalFeedback: total,
        severityAgreementRate: total > 0 ? Math.round((severityAgreements / total) * 100) : 100,
        departmentAgreementRate: total > 0 ? Math.round((deptAgreements / total) * 100) : 100,
        recentFeedback: allFeedback.slice(-10)
      }
    });
  } catch (error) { next(error); }
});

export default router;
