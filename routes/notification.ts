import { Router } from "express";
import {
  clearReadNotifications,
  deleteNotification,
  getNotifications,
  getUnreadCount,
  markAllRead,
  markOneRead,
} from "../controller/notificationController";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/",                    getNotifications);
router.get("/unread-count",        getUnreadCount);
router.patch("/mark-all-read",     markAllRead);
router.delete("/clear-read",       clearReadNotifications);
router.patch("/:id/read",          markOneRead);
router.delete("/:id",              deleteNotification);

export default router;
