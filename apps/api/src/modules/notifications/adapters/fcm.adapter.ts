import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

/**
 * FCM Push Notification Adapter
 * 
 * Handles push notification delivery via Firebase Cloud Messaging.
 * 
 * Configuration required:
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_PRIVATE_KEY
 * - FIREBASE_CLIENT_EMAIL
 */

export interface FcmMessage {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export interface FcmResult {
  success: boolean;
  messageId?: string;
  error?: string;
  invalidToken?: boolean;
}

@Injectable()
export class FcmAdapter implements OnModuleInit {
  private readonly logger = new Logger(FcmAdapter.name);
  private initialized = false;

  constructor(private readonly config: ConfigService) {}

  /**
   * Initialize Firebase Admin SDK on module init
   */
  onModuleInit(): void {
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn('Firebase not configured - FCM disabled. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
      return;
    }

    try {
      // Check if already initialized (for hot reload)
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        });
      }
      
      this.initialized = true;
      this.logger.log('FCM adapter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin', error);
    }
  }

  /**
   * Send push notification to a single device
   */
  async sendToDevice(message: FcmMessage): Promise<FcmResult> {
    if (!this.initialized) {
      this.logger.warn('FCM not initialized - skipping notification');
      return {
        success: false,
        error: 'FCM not configured',
      };
    }

    this.logger.log('Sending FCM notification', {
      tokenPrefix: message.token.slice(0, 20),
      title: message.title,
    });

    try {
      const fcmMessage: admin.messaging.Message = {
        token: message.token,
        notification: {
          title: message.title,
          body: message.body,
          imageUrl: message.imageUrl,
        },
        data: message.data,
        android: {
          priority: 'high',
          notification: {
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
        webpush: {
          notification: {
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
          },
        },
      };

      const response = await admin.messaging().send(fcmMessage);
      
      this.logger.log('FCM notification sent', { messageId: response });
      
      return {
        success: true,
        messageId: response,
      };
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      const errorCode = error?.code || '';

      // Check for invalid token errors
      const invalidToken =
        errorCode === 'messaging/registration-token-not-registered' ||
        errorCode === 'messaging/invalid-registration-token' ||
        errorMessage.includes('registration-token-not-registered') ||
        errorMessage.includes('invalid-registration-token');

      this.logger.error('FCM send failed', {
        error: errorMessage,
        code: errorCode,
        invalidToken,
      });

      return {
        success: false,
        error: errorMessage,
        invalidToken,
      };
    }
  }

  /**
   * Send push notification to multiple devices
   */
  async sendToDevices(tokens: string[], message: Omit<FcmMessage, 'token'>): Promise<FcmResult[]> {
    const results: FcmResult[] = [];

    for (const token of tokens) {
      const result = await this.sendToDevice({ ...message, token });
      results.push(result);
    }

    return results;
  }

  /**
   * Send notification to a topic (for broadcasts)
   */
  async sendToTopic(topic: string, message: Omit<FcmMessage, 'token'>): Promise<FcmResult> {
    if (!this.initialized) {
      return {
        success: false,
        error: 'FCM not configured',
      };
    }

    this.logger.log('Sending FCM topic notification', {
      topic,
      title: message.title,
    });

    try {
      const fcmMessage: admin.messaging.Message = {
        topic,
        notification: {
          title: message.title,
          body: message.body,
        },
        data: message.data,
      };

      const response = await admin.messaging().send(fcmMessage);

      return {
        success: true,
        messageId: response,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Unknown error',
      };
    }
  }

  /**
   * Check if FCM is configured and ready
   */
  isReady(): boolean {
    return this.initialized;
  }
}
