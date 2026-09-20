export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationsPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    return "denied";
  }

  return Notification.requestPermission();
}

export function showLocalNotification(title: string, body: string): void {
  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return;
  }

  new Notification(title, { body });
}
