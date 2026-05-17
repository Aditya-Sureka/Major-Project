import { Bell, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AppNotification } from "@/hooks/useNotifications";

interface NotificationPanelProps {
  notifications: AppNotification[];
  onMarkRead: (notificationId: string) => void;
  onDelete: (notificationId: string) => void;
  onNavigate?: (url: string) => void;
}

const NotificationPanel = ({
  notifications,
  onMarkRead,
  onDelete,
  onNavigate,
}: NotificationPanelProps) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Notifications
        </CardTitle>
        <CardDescription>Latest insurer updates on your claims</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <div
              key={notification._id}
              className={`p-3 rounded-lg border ${notification.read ? "bg-gray-50 border-gray-200" : "bg-blue-50 border-blue-200"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  className="text-left flex-1"
                  onClick={() => {
                    onMarkRead(notification._id);
                    if (notification.actionUrl && onNavigate) {
                      onNavigate(notification.actionUrl);
                    }
                  }}
                >
                  <p className="font-medium text-gray-900">{notification.title}</p>
                  <p className="text-sm text-gray-600">{notification.message}</p>
                </button>
                <div className="flex items-center gap-2">
                  {!notification.read && (
                    <span className="text-xs text-blue-600 font-semibold">NEW</span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(notification._id)}
                    className="h-8 w-8 p-0"
                    aria-label="Delete notification"
                  >
                    <Trash2 className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">No notifications yet.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationPanel;
