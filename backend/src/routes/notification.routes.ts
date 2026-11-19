import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import NotificationService from '../services/notification.service';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

// GET /api/notifications — user's notifications
router.get('/', authenticateJWT, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
      return;
    }
    const notifications = await NotificationService.getUserNotifications(req.user.id);
    const unreadCount = await NotificationService.getUnreadCount(req.user.id);
    res.status(200).json({ success: true, data: { notifications, unreadCount } });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/notifications/:id/read — DEF-SEC-06 IDOR Remediation
router.patch('/:id/read', authenticateJWT, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
      return;
    }

    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: 'Bad Request: Invalid notification ID' });
      return;
    }

    const updated = await NotificationService.markRead(id, req.user.id);
    if (!updated) {
      res.status(404).json({ success: false, error: 'Notification not found or access denied' });
      return;
    }

    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', authenticateJWT, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
      return;
    }
    await NotificationService.markAllRead(req.user.id);
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

export default router;
