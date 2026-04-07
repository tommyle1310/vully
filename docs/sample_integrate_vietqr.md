Kiến trúc được chọn (Strategy Pattern – chuẩn enterprise)
TypeScriptPaymentGatewayService (NestJS)
├── IPaymentGatewayAdapter
│   ├── VietQRAdapter (hiện tại – free, zero cost)
│   ├── MockAdapter (dev/test – simulate transfer)
│   ├── StripeAdapter (future)
│   ├── VNPayAdapter (future)
│   └── MoMoAdapter (future)

Free 100%: Dùng public Quick Link https://img.vietqr.io/image/... (không cần API key, không rate limit công khai).
Mock chuyển tiền: Dùng env PAYMENT_GATEWAY=mock → có nút “Giả lập thanh toán thành công” (dev only).
Thay env = transaction chính xác: PAYMENT_GATEWAY=vietqr (prod) hoặc mock.
QR navigate app:
QR chính = VietQR (scan bằng app ngân hàng để chuyển khoản).
QR phụ (tùy chọn) = Deep link đến trang invoice trong Vully app (dùng qrcode lib generate URL https://app.vully.vn/invoices/{id} hoặc custom scheme nếu sau này có mobile app).

Future-proof: Chỉ cần inject adapter mới là hỗ trợ Stripe/MoMo/VNPay ngay.

1. Backend – Các file cần tạo/thay đổi
1.1. Env variables (.env & docker-compose.yml)
env# Payment Gateway
PAYMENT_GATEWAY=vietqr          # hoặc "mock" khi dev/test
VIETQR_BANK_ID=vietinbank       # hoặc BIN: 970415, ICB...
VIETQR_ACCOUNT_NO=123456789012
VIETQR_ACCOUNT_NAME=VULLY%20APARTMENT%20MANAGEMENT
VIETQR_TEMPLATE=compact2        # compact2 | compact | qr_only
1.2. Shared types (apps/shared-types/src/payment.ts)
TypeScriptexport enum PaymentProvider {
  VIETQR = 'vietqr',
  STRIPE = 'stripe',
  VNPAY = 'vnpay',
  MOMO = 'momo',
  MOCK = 'mock',
}

export interface VietQRData {
  qrImageUrl: string;
  deepLinkUrl?: string;        // navigate đến invoice trong app
  payload: string;
  amount: number;
  description: string;
  expiresAt: Date;
}
1.3. Tạo module mới (khuyến nghị đặt trong payments)
Bashapps/api/src/modules/payments/payment-gateway/
├── payment-gateway.module.ts
├── payment-gateway.service.ts
├── adapters/
│   ├── base.adapter.ts
│   ├── vietqr.adapter.ts
│   └── mock.adapter.ts
├── dto/
│   └── generate-payment-qr.dto.ts
└── payment-gateway.controller.ts   # optional, hoặc expose qua PaymentController
base.adapter.ts
TypeScriptimport { PaymentProvider, VietQRData } from '@vully/shared-types';

export interface IPaymentGatewayAdapter {
  generateQR(data: GeneratePaymentQRDto): Promise<VietQRData>;
  confirmPayment?(invoiceId: string, payload: any): Promise<void>; // mock hoặc webhook
}

export abstract class BasePaymentGatewayAdapter implements IPaymentGatewayAdapter {
  abstract generateQR(data: GeneratePaymentQRDto): Promise<VietQRData>;
}
vietqr.adapter.ts (clean & zero dependency ngoài config)
TypeScriptimport { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BasePaymentGatewayAdapter } from './base.adapter';
import { GeneratePaymentQRDto } from '../dto/generate-payment-qr.dto';
import { VietQRData } from '@vully/shared-types';

@Injectable()
export class VietQRAdapter extends BasePaymentGatewayAdapter {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async generateQR(dto: GeneratePaymentQRDto): Promise<VietQRData> {
    const bankId = this.configService.get<string>('VIETQR_BANK_ID');
    const accountNo = this.configService.get<string>('VIETQR_ACCOUNT_NO');
    const accountName = this.configService.get<string>('VIETQR_ACCOUNT_NAME');
    const template = this.configService.get<string>('VIETQR_TEMPLATE', 'compact2');

    const description = encodeURIComponent(
      dto.description || `Thanh toan HD #${dto.invoiceId}`,
    );

    const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${dto.amount}&addInfo=${description}&accountName=${accountName}`;

    // QR navigate app (deep link đến trang invoice)
    const appDeepLink = `https://app.vully.vn/invoices/${dto.invoiceId}`;

    return {
      qrImageUrl: qrUrl,
      deepLinkUrl: appDeepLink,
      payload: qrUrl,
      amount: dto.amount,
      description: dto.description,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    };
  }
}
mock.adapter.ts
TypeScript@Injectable()
export class MockAdapter extends BasePaymentGatewayAdapter {
  async generateQR(dto: GeneratePaymentQRDto): Promise<VietQRData> {
    return {
      qrImageUrl: 'https://placehold.co/600x600/png?text=MOCK+VIETQR',
      deepLinkUrl: `https://app.vully.vn/invoices/${dto.invoiceId}`,
      payload: 'MOCK_PAYLOAD',
      amount: dto.amount,
      description: dto.description,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 phút
    };
  }

  async confirmPayment(invoiceId: string): Promise<void> {
    // Giả lập chuyển tiền thành công → gọi service tạo payment record
    console.log(`[MOCK] Payment for invoice ${invoiceId} confirmed`);
  }
}
payment-gateway.service.ts
TypeScript@Injectable()
export class PaymentGatewayService {
  private readonly adapter: IPaymentGatewayAdapter;

  constructor(
    private readonly configService: ConfigService,
    private readonly vietQRAdapter: VietQRAdapter,
    private readonly mockAdapter: MockAdapter,
    // future: stripeAdapter, vnpayAdapter...
  ) {
    const provider = this.configService.get<PaymentProvider>('PAYMENT_GATEWAY', PaymentProvider.VIETQR);
    this.adapter = provider === PaymentProvider.MOCK ? this.mockAdapter : this.vietQRAdapter;
  }

  generateQR(dto: GeneratePaymentQRDto) {
    return this.adapter.generateQR(dto);
  }

  // future webhook / manual confirm
  confirmPayment(invoiceId: string, provider: PaymentProvider) {
    if (this.adapter.confirmPayment) return this.adapter.confirmPayment(invoiceId);
  }
}
Đăng ký module & providers (payment-gateway.module.ts + import vào PaymentsModule).
Swagger + DTO (đã chuẩn với @ApiTags, class-validator).
2. Frontend Integration (Next.js 15 + Shadcn)
Thêm vào trang invoices/[id] (hoặc contracts/[id]):

Sử dụng custom hook usePaymentQR (theo pattern use-invoices.ts).
Component VietQRPaymentCard (Shadcn + Framer Motion).
Skeleton loader, CLS=0.
Nút “Giả lập thanh toán” chỉ hiện khi PAYMENT_GATEWAY=mock.

Custom hook (apps/web/src/hooks/use-payment-qr.ts)
TypeScriptexport const usePaymentQR = (invoiceId: string) => {
  return useQuery({
    queryKey: ['payment-qr', invoiceId],
    queryFn: () => api.get(`/invoices/${invoiceId}/vietqr`),
    staleTime: 5 * 60 * 1000, // 5 phút
  });
};
Component (đặt trong payments/ folder):

Card với image QR (lớn, copyable).
QR phụ (deep link) → scan mở ngay trang invoice trong app.
Button “Tôi đã chuyển khoản” → gọi mutation confirm (mock hoặc real).

3. Cách test & deploy

PAYMENT_GATEWAY=mock → thấy mock QR + nút giả lập.
Đổi thành vietqr → QR thật từ img.vietqr.io.
Sau này chỉ cần thêm adapter mới + config env là hỗ trợ Stripe/MoMo/VNPay ngay (không chạm code cũ).