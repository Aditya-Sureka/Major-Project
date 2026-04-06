import Notification from "../models/notification.model.js";

class NotificationController {
  async listNotifications(req, res) {
    try {
      const firebaseUid = req.user?.firebaseUid;
      if (!firebaseUid) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const notifications = await Notification.find({ userFirebaseUid: firebaseUid })
        .sort({ createdAt: -1 })
        .limit(50);

      return res.status(200).json({
        message: "Notifications fetched successfully",
        data: notifications,
      });
    } catch (err) {
      console.error("listNotifications error:", err);
      return res.status(500).json({
        message: "Failed to fetch notifications",
        error: err.message,
      });
    }
  }

  async markRead(req, res) {
    try {
      const firebaseUid = req.user?.firebaseUid;
      const { id } = req.params;

      if (!firebaseUid) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const notification = await Notification.findOneAndUpdate(
        { _id: id, userFirebaseUid: firebaseUid },
        { $set: { read: true, updatedAt: new Date() } },
        { new: true }
      );

      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      return res.status(200).json({ message: "Notification marked as read", data: notification });
    } catch (err) {
      console.error("markRead error:", err);
      return res.status(500).json({
        message: "Failed to update notification",
        error: err.message,
      });
    }
  }
}

const notificationController = new NotificationController();
export default notificationController;
