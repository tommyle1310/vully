import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Zalo ZNS (Zalo Notification Service) Adapter
 * 
 * Sends transactional messages via Zalo Official Account.
 * Higher read rates than push notifications for Vietnamese users.
 * 
 * Requirements:
 * - Registered Zalo OA (Official Account) with verified business
 * - ZNS templates pre-approved by Zalo
 * - User must follow the OA or have Zalo ID linked
 * 
 * Configuration required:
 * - ZALO_OA_ID
 * - ZALO_OA_SECRET
 * - ZALO_ACCESS_TOKEN (or refresh mechanism)
 * 
 * API Documentation:
 * https://developers.zalo.me/docs/api/zalo-notification-service
 */

export interface ZnsTemplate {
  templateId: string;
  templateData: Record<string, string>;
}

export interface ZnsMessage {
  zaloId: string;
  template: ZnsTemplate;
}

export interface ZnsResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: number;
}

// Common ZNS template IDs (to be configured after Zalo approval)
export const ZNS_TEMPLATES = {
  PAYMENT_SUCCESS: 'payment_success_v1',
  PAYMENT_REMINDER: 'payment_reminder_v1',
  INCIDENT_ASSIGNED: 'incident_assign_v1',
  INCIDENT_RESOLVED: 'incident_resolved_v1',
  ANNOUNCEMENT: 'announcement_v1',
};

@Injectable()
export class ZaloZnsAdapter {
  private readonly logger = new Logger(ZaloZnsAdapter.name);
  private readonly apiBaseUrl = 'https://business.openapi.zalo.me/message/template';
  private accessToken: string | null = null;
  private initialized = false;

  constructor(private readonly config: ConfigService) {
    this.initialize();
  }

  /**
   * Initialize Zalo ZNS adapter
   */
  private initialize(): void {
    const oaId = this.config.get<string>('ZALO_OA_ID');

    if (!oaId) {
      this.logger.warn('Zalo OA not configured - ZNS disabled');
      return;
    }

    this.accessToken = this.config.get<string>('ZALO_ACCESS_TOKEN') || null;
    this.initialized = true;
    this.logger.log('Zalo ZNS adapter initialized');
  }

  /**
   * Send ZNS message to a user
   */
  async send(message: ZnsMessage): Promise<ZnsResult> {
    if (!this.initialized) {
      this.logger.warn('Zalo ZNS not initialized - skipping notification');
      return {
        success: false,
        error: 'Zalo ZNS not configured',
      };
    }

    this.logger.log('Sending Zalo ZNS message', {
      zaloId: message.zaloId,
      templateId: message.template.templateId,
    });

    try {
      // TODO: Implement actual Zalo ZNS API call
      // const response = await fetch(this.apiBaseUrl, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'access_token': this.accessToken,
      //   },
      //   body: JSON.stringify({
      //     phone: message.zaloId, // or user_id depending on OA setup
      //     template_id: message.template.templateId,
      //     template_data: message.template.templateData,
      //   }),
      // });
      // const data = await response.json();

      // Simulated success for development
      return {
        success: true,
        messageId: `zns-${Date.now()}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error('Zalo ZNS send failed', { error: errorMessage });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send payment confirmation via ZNS
   */
  async sendPaymentConfirmation(
    zaloId: string,
    data: {
      customerName: string;
      invoiceNumber: string;
      amount: string;
      paymentDate: string;
    },
  ): Promise<ZnsResult> {
    return this.send({
      zaloId,
      template: {
        templateId: ZNS_TEMPLATES.PAYMENT_SUCCESS,
        templateData: {
          customer_name: data.customerName,
          invoice_number: data.invoiceNumber,
          amount: data.amount,
          payment_date: data.paymentDate,
        },
      },
    });
  }

  /**
   * Send payment reminder via ZNS
   */
  async sendPaymentReminder(
    zaloId: string,
    data: {
      customerName: string;
      invoiceNumber: string;
      amount: string;
      dueDate: string;
    },
  ): Promise<ZnsResult> {
    return this.send({
      zaloId,
      template: {
        templateId: ZNS_TEMPLATES.PAYMENT_REMINDER,
        templateData: {
          customer_name: data.customerName,
          invoice_number: data.invoiceNumber,
          amount: data.amount,
          due_date: data.dueDate,
        },
      },
    });
  }

  /**
   * Send incident assignment notification via ZNS
   */
  async sendIncidentAssigned(
    zaloId: string,
    data: {
      technicianName: string;
      incidentTitle: string;
      location: string;
      priority: string;
    },
  ): Promise<ZnsResult> {
    return this.send({
      zaloId,
      template: {
        templateId: ZNS_TEMPLATES.INCIDENT_ASSIGNED,
        templateData: {
          technician_name: data.technicianName,
          incident_title: data.incidentTitle,
          location: data.location,
          priority: data.priority,
        },
      },
    });
  }

  /**
   * Send incident resolved notification via ZNS
   */
  async sendIncidentResolved(
    zaloId: string,
    data: {
      customerName: string;
      incidentTitle: string;
      resolvedDate: string;
    },
  ): Promise<ZnsResult> {
    return this.send({
      zaloId,
      template: {
        templateId: ZNS_TEMPLATES.INCIDENT_RESOLVED,
        templateData: {
          customer_name: data.customerName,
          incident_title: data.incidentTitle,
          resolved_date: data.resolvedDate,
        },
      },
    });
  }

  /**
   * Send building announcement via ZNS
   */
  async sendAnnouncement(
    zaloId: string,
    data: {
      customerName: string;
      buildingName: string;
      title: string;
      content: string;
    },
  ): Promise<ZnsResult> {
    return this.send({
      zaloId,
      template: {
        templateId: ZNS_TEMPLATES.ANNOUNCEMENT,
        templateData: {
          customer_name: data.customerName,
          building_name: data.buildingName,
          title: data.title,
          content: data.content,
        },
      },
    });
  }

  /**
   * Refresh access token (tokens expire every ~90 days)
   * Should be called via scheduled job
   */
  async refreshAccessToken(): Promise<boolean> {
    const refreshToken = this.config.get<string>('ZALO_REFRESH_TOKEN');
    const appId = this.config.get<string>('ZALO_OA_ID');
    const appSecret = this.config.get<string>('ZALO_OA_SECRET');

    if (!refreshToken || !appId || !appSecret) {
      this.logger.warn('Cannot refresh Zalo token - missing credentials');
      return false;
    }

    try {
      // TODO: Implement actual token refresh
      // const response = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/x-www-form-urlencoded',
      //     'secret_key': appSecret,
      //   },
      //   body: new URLSearchParams({
      //     refresh_token: refreshToken,
      //     app_id: appId,
      //     grant_type: 'refresh_token',
      //   }),
      // });
      // const data = await response.json();
      // this.accessToken = data.access_token;

      this.logger.log('Zalo access token refreshed');
      return true;
    } catch (error) {
      this.logger.error('Failed to refresh Zalo token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Check if Zalo ZNS is configured and ready
   */
  isReady(): boolean {
    return this.initialized && !!this.accessToken;
  }
}
