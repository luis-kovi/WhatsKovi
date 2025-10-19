import webpush, { WebPushError } from 'web-push';
import prisma from '../config/database';

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  icon?: string;
};

const contactEmail = process.env.WEB_PUSH_CONTACT || 'mailto:contato@whatskovi.com';
const vapidPublicKey = process.env.WEB_PUSH_PUBLIC_KEY;
const vapidPrivateKey = process.env.WEB_PUSH_PRIVATE_KEY;

const pushConfigured = !!(vapidPublicKey && vapidPrivateKey);

if (pushConfigured) {
  webpush.setVapidDetails(contactEmail, vapidPublicKey!, vapidPrivateKey!);
}

export const isPushConfigured = () => pushConfigured;

export const sendPushNotification = async (userId: string, payload: PushPayload) => {
  if (!pushConfigured) {
    return { sent: false, reason: 'PUSH_NOT_CONFIGURED' as const };
  }

  const subscriptions = await prisma.notificationSubscription.findMany({
    where: { userId }
  });

  if (subscriptions.length === 0) {
    return { sent: false, reason: 'NO_SUBSCRIPTIONS' as const };
  }

  const errors: Error[] = [];

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              auth: subscription.auth,
              p256dh: subscription.p256dh
            }
          },
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            data: payload.data ?? {},
            icon: payload.icon ?? '/icons/icon-192x192.png'
          })
        );
      } catch (error) {
        const pushError = error as WebPushError;
        errors.push(pushError);
        const status = typeof pushError.statusCode === 'number' ? pushError.statusCode : undefined;
        if (status === 404 || status === 410) {
          await prisma.notificationSubscription.delete({ where: { id: subscription.id } });
        }
      }
    })
  );

  return {
    sent: errors.length !== subscriptions.length,
    errors
  };
};
