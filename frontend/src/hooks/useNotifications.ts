import { useCallback, useEffect, useMemo, useState } from "react";

export interface AppNotification {
  _id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string | null;
  claimId?: string;
}

const getBackendBaseUrl = () => (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");

export function useNotifications(pollMs = 10000) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem("JWT");
    const baseUrl = getBackendBaseUrl();

    if (!token || !baseUrl) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/notification`, {
        method: "GET",
        headers: { token },
      });

      if (!response.ok) {
        return;
      }

      const json = await response.json();
      setNotifications(Array.isArray(json?.data) ? json.data : []);
    } catch (error) {
      console.error("Error fetching notifications", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, pollMs);
    return () => clearInterval(interval);
  }, [fetchNotifications, pollMs]);

  const markAsRead = useCallback(async (notificationId: string) => {
    const token = localStorage.getItem("JWT");
    const baseUrl = getBackendBaseUrl();

    if (!token || !baseUrl) {
      return;
    }

    try {
      await fetch(`${baseUrl}/notification/${notificationId}/read`, {
        method: "PATCH",
        headers: { token },
      });

      setNotifications((prev) =>
        prev.map((item) => (item._id === notificationId ? { ...item, read: true } : item))
      );
    } catch (error) {
      console.error("Error marking notification as read", error);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    const token = localStorage.getItem("JWT");
    const baseUrl = getBackendBaseUrl();

    if (!token || !baseUrl) {
      return;
    }

    try {
      await fetch(`${baseUrl}/notification/${notificationId}`, {
        method: "DELETE",
        headers: { token },
      });

      setNotifications((prev) => prev.filter((item) => item._id !== notificationId));
    } catch (error) {
      console.error("Error deleting notification", error);
    }
  }, []);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    deleteNotification,
    refreshNotifications: fetchNotifications,
  };
}
