# Payment Webhook Setup Guide

This guide explains how to configure VietQR payment gateway webhooks for automatic invoice reconciliation.

## Supported Gateways

Vully supports three Vietnamese VietQR-compatible payment gateways:

| Gateway | Website | Pricing |
|---------|---------|---------|
| PayOS | https://payos.vn | Free tier available |
| Casso | https://casso.vn | Free for ≤100 tx/month |
| SePay | https://sepay.vn | Free tier available |

## Gateway Setup

### 1. PayOS Setup

1. **Register**: Go to https://payos.vn and create an account
2. **Create App**: Navigate to Dashboard → Create New Application
3. **Get Credentials**:
   - Client ID
   - API Key
   - Checksum Key (for signature verification)
4. **Configure Webhook URL**:
   - URL: `https://your-domain.com/api/v1/payments/webhook/payos`
   - Method: POST
   - Enable: Transaction notifications

### 2. Casso Setup

1. **Register**: Go to https://casso.vn and create an account
2. **Connect Bank Account**: Link your business bank account
3. **Get API Key**: Dashboard → Settings → API Keys
4. **Configure Webhook**:
   - URL: `https://your-domain.com/api/v1/payments/webhook/casso`
   - Method: POST
   - Copy the Webhook Secret for signature verification

### 3. SePay Setup

1. **Register**: Go to https://sepay.vn and create an account
2. **Add Bank Account**: Connect your VietinBank/VCB/etc. account
3. **Get Credentials**: Settings → API Configuration
4. **Configure Webhook**:
   - URL: `https://your-domain.com/api/v1/payments/webhook/sepay`
   - Method: POST
   - Note the Webhook Secret

## Environment Variables

Add these to your `.env` file:

```env
# PayOS
PAYOS_CLIENT_ID=your-payos-client-id
PAYOS_API_KEY=your-payos-api-key
PAYOS_CHECKSUM_KEY=your-payos-checksum-key

# Casso
CASSO_API_KEY=your-casso-api-key
CASSO_WEBHOOK_SECRET=your-casso-webhook-secret

# SePay
SEPAY_API_KEY=your-sepay-api-key
SEPAY_WEBHOOK_SECRET=your-sepay-webhook-secret
```

## Payment Reference Format

For automatic matching, invoices/contracts use this payment reference format:

| Entity | Pattern | Example |
|--------|---------|---------|
| Invoice | `VULLY-INV-{6-char}` | `VULLY-INV-a1b2c3` |
| Contract | `VULLY-CTR-{6-char}` | `VULLY-CTR-d4e5f6` |

**Important**: Residents must include this reference in their bank transfer description.

### Sample Transfer Descriptions (Vietnamese)

```
VULLY-INV-a1b2c3 Thanh toan tien phong T4/2026
VULLY-CTR-d4e5f6 Tra gop can ho 901
```

## How It Works

1. **Resident transfers money** via bank app with payment reference in description
2. **Bank notifies gateway** (PayOS/Casso/SePay)
3. **Gateway sends webhook** to your server
4. **Vully processes webhook**:
   - Verifies signature
   - Extracts payment reference from description
   - Finds matching invoice/contract
   - Updates payment status (atomic transaction)
   - Sends notification to resident

## Unmatched Payments

If the payment reference is missing or incorrect, the transaction is stored in `unmatched_payments` table:

- Status: `pending`
- Accountants can manually match via Dashboard → Unmatched Payments
- Options: Match to invoice, or Reject with reason

## Manual Reconciliation

If webhooks were missed (server downtime), trigger manual sync:

```bash
# Via API (Admin/Accountant role required)
POST /api/v1/payments/reconcile
{
  "gateway": "payos",  # or "casso" / "sepay"
  "hours": 24
}
```

Scheduled job runs daily at 6 AM to catch any missed transactions.

## Security Best Practices

1. **Always verify signatures** before processing webhooks
2. **Use HTTPS** for webhook endpoints
3. **IP Whitelisting** (optional): Configure firewall to only accept from gateway IPs
4. **Rate Limiting**: Built-in at 100 req/min per IP
5. **Idempotency**: System prevents duplicate processing via `external_transaction_id`

## Testing

### Local Development

Use ngrok to expose your local server:

```bash
ngrok http 3001
# Copy the HTTPS URL and configure in gateway dashboard
```

### Mock Webhook

```bash
curl -X POST http://localhost:3001/api/v1/payments/webhook/payos \
  -H "Content-Type: application/json" \
  -H "x-payos-signature: test-signature" \
  -d '{
    "transactionId": "TXN123456",
    "amount": 5000000,
    "description": "VULLY-INV-abc123 Tien nha T4",
    "senderName": "NGUYEN VAN A",
    "transactionDate": "2026-04-15T10:30:00Z"
  }'
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Webhook not received | Check firewall, verify URL in gateway dashboard |
| Signature verification failed | Verify secret keys match, check encoding |
| Payment not matched | Check description format, view in Unmatched Payments |
| Duplicate notifications | System handles via idempotency - safe to ignore |

## Support

- PayOS: support@payos.vn
- Casso: support@casso.vn
- SePay: support@sepay.vn
