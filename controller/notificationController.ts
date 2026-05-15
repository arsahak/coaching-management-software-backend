import { Request, Response } from "express";
import Notification from "../modal/notification";

/** GET /api/notifications?limit=20&page=1&unreadOnly=true */
export const getNotifications = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page       = Math.max(1, parseInt(String(req.query.page ?? 1)));
    const limit      = Math.min(100, parseInt(String(req.query.limit ?? 20)));
    const unreadOnly = req.query.unreadOnly === "true";
    const type       = req.query.type as string | undefined;

    const filter: Record<string, any> = {};
    if (unreadOnly) filter.isRead = false;
    if (type)       filter.type   = type;

    const [total, notifications] = await Promise.all([
      Notification.countDocuments(filter),
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    const unreadCount = await Notification.countDocuments({ isRead: false });

    res.json({
      success: true,
      data: notifications,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      unreadCount,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load notifications" });
  }
};

/** GET /api/notifications/unread-count */
export const getUnreadCount = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const count = await Notification.countDocuments({ isRead: false });
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to get unread count" });
  }
};

/** PATCH /api/notifications/:id/read — mark one as read */
export const markOneRead = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to mark as read" });
  }
};

/** PATCH /api/notifications/mark-all-read — mark all as read */
export const markAllRead = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to mark all as read" });
  }
};

/** DELETE /api/notifications/:id */
export const deleteNotification = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete notification" });
  }
};

/** DELETE /api/notifications/clear-read — delete all read notifications */
export const clearReadNotifications = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    await Notification.deleteMany({ isRead: true });
    res.json({ success: true, message: "Read notifications cleared" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to clear notifications" });
  }
};
