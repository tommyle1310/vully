# Zalo ZNS (Zalo Notification Service) Setup Guide

This guide explains how to configure Zalo Official Account (OA) and ZNS templates for Vietnamese user notifications.

## Overview

Zalo ZNS allows sending templated notifications to Zalo users. Unlike SMS, it's **free** once templates are approved and users follow your OA.

**Benefits**:
- Free notifications (no per-message cost)
- High open rates (Vietnamese users check Zalo frequently)
- Rich templates with buttons and images
- User opt-in via OA follow

## Prerequisites

- Zalo account (business email recommended)
- Vietnamese business registration (for template approval)
- Domain for OAuth callback

## Step 1: Create Zalo Official Account

1. Go to https://oa.zalo.me/manage/oa
2. Click **Tạo OA** (Create OA)
3. Fill in:
   - **Tên OA**: Vully Apartment (or your brand)
   - **Loại hình**: Bất động sản / Dịch vụ
   - **Địa chỉ**: Your business address
4. Upload OA avatar and cover image
5. Submit for review (takes 1-3 business days)

## Step 2: Create Zalo App

1. Go to https://developers.zalo.me/apps
2. Click **Tạo ứng dụng** (Create app)
3. Fill in:
   - **Tên ứng dụng**: Vully Platform
   - **Mô tả**: Apartment management notifications
4. Note the **App ID** and **Secret Key**

## Step 3: Link App to OA

1. In Zalo Developers → Your App → **Cài đặt**
2. Enable **Gửi tin ZNS** (ZNS messaging)
3. Link to your Official Account
4. Request ZNS access (may require business verification)

## Step 4: Register ZNS Templates

Templates must be approved before use. Submit these for Vully:

### Template 1: Payment Confirmation

```
ID: payment_confirmed
Category: Thông báo giao dịch

Title: Xác nhận thanh toán thành công

Body:
Kính gửi {customer_name},

Căn hộ {apartment_name} của bạn đã thanh toán thành công:
- Số tiền: {amount} VNĐ  
- Kỳ thanh toán: {billing_period}
- Mã giao dịch: {transaction_id}

Cảm ơn bạn đã thanh toán đúng hạn!

Button: Xem chi tiết → {invoice_url}
```

### Template 2: Payment Reminder

```
ID: payment_reminder
Category: Nhắc nhở thanh toán

Title: Nhắc nhở thanh toán tiền nhà

Body:
Kính gửi {customer_name},

Hóa đơn căn hộ {apartment_name} sắp đến hạn:
- Số tiền: {amount} VNĐ
- Hạn thanh toán: {due_date}

Vui lòng thanh toán để tránh phí trễ hạn.

Button: Thanh toán ngay → {payment_url}
```

### Template 3: Incident Update

```
ID: incident_status
Category: Cập nhật yêu cầu

Title: Cập nhật tình trạng sự cố

Body:
Kính gửi {customer_name},

Sự cố #{incident_id} của bạn đã được cập nhật:
- Trạng thái mới: {status}
- Ghi chú: {note}

Button: Xem chi tiết → {incident_url}
```

### Template 4: Building Announcement

```
ID: building_announcement
Category: Thông báo chung

Title: Thông báo từ Ban quản lý

Body:
Kính gửi cư dân {building_name},

{announcement_content}

Trân trọng,
Ban quản lý tòa nhà

Button: Xem thêm → {announcement_url}
```

**Approval Process**:
1. Submit templates via Zalo Developers portal
2. Review takes 1-5 business days
3. Each template gets a unique `template_id`
4. Save template IDs in your code

## Step 5: Configure OAuth

### Get Access Token

1. In Zalo Developers → Your App → **Xác thực**
2. Configure callback URL: `https://your-domain.com/api/v1/auth/zalo/callback`
3. Generate initial tokens via OAuth flow

### Environment Variables

```env
# Zalo App Credentials
ZALO_APP_ID=your-zalo-app-id
ZALO_APP_SECRET=your-zalo-app-secret

# OA Access Tokens (refresh weekly)
ZALO_OA_ACCESS_TOKEN=your-oa-access-token
ZALO_OA_REFRESH_TOKEN=your-oa-refresh-token
```

## Step 6: User Zalo ID Collection

Users must:
1. Follow your Official Account on Zalo
2. Link Zalo account via OAuth in Vully app

### OAuth Flow

```
1. User clicks "Link Zalo" in Vully settings
2. Redirect to: https://oauth.zaloapp.com/v4/oa/permission
   ?app_id={ZALO_APP_ID}
   &redirect_uri={callback_url}
   &state={user_session}
3. User authorizes
4. Callback receives `code`
5. Exchange code for user's `zalo_id`
6. Store `zalo_id` on user profile
```

### Backend Handler

The callback stores user's Zalo ID:

```typescript
// Already implemented in auth module
POST /api/v1/auth/zalo/callback
// Stores zalo_id and marks zalo_oa_follower=true
```

## ZNS API Usage

### Send ZNS Message

```typescript
// Backend sends via ZaloZnsAdapter
await zaloZnsAdapter.sendZNS({
  zaloId: '1234567890',
  templateId: 'payment_confirmed',
  templateData: {
    customer_name: 'Nguyễn Văn A',
    apartment_name: 'Căn 901 - Tòa A',
    amount: '5,000,000',
    billing_period: 'Tháng 4/2026',
    transaction_id: 'TXN123456',
    invoice_url: 'https://app.vully.vn/invoices/abc123'
  }
});
```

### API Endpoint

```bash
POST https://openapi.zalo.me/v3.0/oa/message/zns
Headers:
  access_token: {OA_ACCESS_TOKEN}
  
Body:
{
  "phone": "84901234567",
  "template_id": "payment_confirmed",
  "template_data": { ... }
}
```

## Token Refresh

Zalo tokens expire. Scheduled job refreshes weekly:

```typescript
// Runs every Sunday at 2 AM
@Cron('0 2 * * 0')
async refreshZaloToken() {
  // Exchange refresh_token for new access_token
  // Update environment/database
}
```

## Quotas & Limits

| Limit | Value |
|-------|-------|
| Messages per user per day | 10 |
| Messages per OA per month | Based on tier |
| Template approval time | 1-5 days |
| Token expiry | 90 days (refresh before) |

## Testing

### Test with Personal Account

1. Follow your OA from your personal Zalo
2. Link Zalo via OAuth flow
3. Trigger a test notification

### Mock Mode

In development, set:
```env
ZALO_MOCK_MODE=true
```
This logs messages instead of sending.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Template rejected | Check content policies, resubmit with changes |
| User not receiving | Verify they follow OA and linked Zalo |
| Token expired | Refresh token, update env vars |
| Rate limited | Check daily quota, implement backoff |

## Costs

ZNS is **free** for:
- OA followers receiving templates
- No per-message charges

Paid features (optional):
- Broadcast to non-followers (requires ZCA account)
- Premium OA verification badge

## Compliance

- Users can unfollow OA anytime to stop notifications
- Must have user consent before sending ZNS
- Follow Zalo's content policies (no spam, promotions without approval)

## Resources

- Zalo Developers Docs: https://developers.zalo.me/docs
- ZNS API Reference: https://developers.zalo.me/docs/api/zalo-notification-service-api
- OA Management: https://oa.zalo.me/manage/oa
