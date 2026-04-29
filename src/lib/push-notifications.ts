import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

/**
 * OMNORA NOXIS — Push Notification Engine
 * Manages Firebase registration and alert routing.
 */

export const PushNotificationService = {
  async initialize() {
    if (Capacitor.getPlatform() === 'web') return;

    console.info('[Push] Initializing Native Notifications...');

    // Request permissions
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('[Push] User denied notification permissions.');
      return;
    }

    // Register for push
    await PushNotifications.register();

    // Listeners
    PushNotifications.addListener('registration', (token) => {
      console.info('[Push] Device registered. Token:', token.value);
      // TODO: Send token to your server to associate with user
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('[Push] Registration failed:', err.error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.info('[Push] Received:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.info('[Push] Action performed:', notification.actionId);
    });
  }
};
