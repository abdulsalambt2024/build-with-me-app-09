import { supabase } from '@/integrations/supabase/client';

interface SendNotificationParams {
  title: string;
  message: string;
  type: 'event' | 'post' | 'announcement' | 'task' | 'chat' | 'donation';
  excludeUserId?: string;
  data?: Record<string, string>;
}

export async function sendPushNotification({ title, message, type, excludeUserId, data }: SendNotificationParams) {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-onesignal-notification', {
      body: {
        title,
        message,
        type,
        exclude_user_id: excludeUserId,
        data,
      },
    });

    if (error) {
      console.error('Push notification error:', error);
      return false;
    }

    console.log('Push notification sent:', result);
    return true;
  } catch (e) {
    console.error('Failed to send push notification:', e);
    return false;
  }
}
