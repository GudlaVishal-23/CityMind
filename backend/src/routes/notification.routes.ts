import { Router } from 'express';
import NotificationService from '../services/notification.service';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

// GET /api/notifications — user's notifications
router.get('/', authenticateJWT, async (req, res, next) => {
  try {
    const notifications = await NotificationService.getUserNotifications(req.user!.id);
    const unreadCount = await NotificationService.getUnreadCount(req.user!.id);
    res.status(200).json({ success: true, data: { notifications, unreadCount } });
  } catch (error) { next(error); }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticateJWT, async (req, res, next) => {
  try {
    await NotificationService.markRead(req.params.id);
    res.status(200).json({ success: true });
  } catch (error) { next(error); }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', authenticateJWT, async (req, res, next) => {
  try {
    await NotificationService.markAllRead(req.user!.id);
    res.status(200).json({ success: true });
  } catch (error) { next(error); }
});

export default router;
