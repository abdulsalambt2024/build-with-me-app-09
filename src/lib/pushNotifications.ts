// Push notifications are now triggered server-side via DB triggers (notifications table).
// This stub remains for backward compatibility and is a no-op for now.
interface SendNotificationParams {
  title: string;
  message: string;
  type: 'event' | 'post' | 'announcement' | 'task' | 'chat' | 'donation';
  excludeUserId?: string;
  data?: Record<string, string>;
}

export async function sendPushNotification(_params: SendNotificationParams) {
  // In-app notifications are handled by Postgres triggers on insert.
  // Browser push is handled by the user's own subscription.
  return true;
}
