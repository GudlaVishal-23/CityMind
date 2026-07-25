import Notification from '../models/notification.model';
import logger from '../utils/logger';

export class NotificationService {
  public static async create(
    userId: string,
    incidentId: string,
    type: 'complaint_submitted' | 'ai_verified' | 'assigned_department' | 'in_progress' | 'resolved' | 'info_requested' | 'rejected',
    message: string
  ): Promise<void> {
    try {
      await Notification.create({ userId, incidentId, type, message, read: false });
      logger.info(`[NotificationService] Created ${type} notification for user ${userId}`);
    } catch (error) {
      logger.warn(`[NotificationService] Failed to create notification: ${error}`);
    }
  }

  public static async getUserNotifications(userId: string): Promise<any[]> {
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(50);
    return notifications || [];
  }

  public static async markRead(notificationId: string): Promise<void> {
    await Notification.findByIdAndUpdate(notificationId, { read: true });
  }

  public static async markAllRead(userId: string): Promise<void> {
    // For in-memory fallback, iterate and update
    const unread = await Notification.find({ userId, read: false });
    for (const n of unread) {
      n.read = true;
      await n.save();
    }
  }

  public static async getUnreadCount(userId: string): Promise<number> {
    const unread = await Notification.find({ userId, read: false });
    return unread.length;
  }
}

export default NotificationService;
