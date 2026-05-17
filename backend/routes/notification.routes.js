import express from "express";
import verifyAuth from "../middleware/verifyAuth.middleware.js";
import notificationController from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/", verifyAuth, notificationController.listNotifications.bind(notificationController));
router.get("/unread-count", verifyAuth, notificationController.unreadCount.bind(notificationController));
router.put("/:id/read", verifyAuth, notificationController.markRead.bind(notificationController));
router.patch("/:id/read", verifyAuth, notificationController.markRead.bind(notificationController));
router.delete("/:id", verifyAuth, notificationController.deleteNotification.bind(notificationController));

export default router;
