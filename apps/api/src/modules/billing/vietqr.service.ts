import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PaymentQRResult {
  qrImageUrl: string;
  bankId: string;
  accountNo: string;
  accountName: string;
  amount: number;
  addInfo: string;
  isMock: boolean;
}

interface IPaymentQRAdapter {
  generateQR(
    amount: number,
    reference: string,
  ): PaymentQRResult;
}

class VietQRAdapter implements IPaymentQRAdapter {
  constructor(
    private readonly bankId: string,
    private readonly accountNo: string,
    private readonly accountName: string,
    private readonly template: string,
  ) {}

  generateQR(amount: number, reference: string): PaymentQRResult {
    const encodedName = encodeURIComponent(this.accountName);
    const encodedRef = encodeURIComponent(reference);
    const qrImageUrl =
      `https://img.vietqr.io/image/${this.bankId}-${this.accountNo}-${this.template}.png` +
      `?amount=${Math.round(amount)}&addInfo=${encodedRef}&accountName=${encodedName}`;

    return {
      qrImageUrl,
      bankId: this.bankId,
      accountNo: this.accountNo,
      accountName: this.accountName,
      amount: Math.round(amount),
      addInfo: reference,
      isMock: false,
    };
  }
}

class MockQRAdapter implements IPaymentQRAdapter {
  generateQR(amount: number, reference: string): PaymentQRResult {
    return {
      qrImageUrl: `https://img.vietqr.io/image/vietinbank-0000000000-compact2.png?amount=${Math.round(amount)}&addInfo=${encodeURIComponent(reference)}&accountName=MOCK`,
      bankId: 'mock',
      accountNo: '0000000000',
      accountName: 'MOCK ACCOUNT',
      amount: Math.round(amount),
      addInfo: reference,
      isMock: true,
    };
  }
}

@Injectable()
export class VietQRService {
  private readonly logger = new Logger(VietQRService.name);
  private readonly adapter: IPaymentQRAdapter;

  constructor(private readonly configService: ConfigService) {
    const gateway = this.configService.get<string>('PAYMENT_GATEWAY', 'mock');

    if (gateway === 'vietqr') {
      this.adapter = new VietQRAdapter(
        this.configService.get<string>('VIETQR_BANK_ID', 'vietinbank'),
        this.configService.get<string>('VIETQR_ACCOUNT_NO', ''),
        this.configService.get<string>('VIETQR_ACCOUNT_NAME', 'VULLY'),
        this.configService.get<string>('VIETQR_TEMPLATE', 'compact2'),
      );
      this.logger.log('VietQR adapter initialized (production mode)');
    } else {
      this.adapter = new MockQRAdapter();
      this.logger.log('Mock QR adapter initialized (development mode)');
    }
  }

  generateQR(amount: number, reference: string): PaymentQRResult {
    return this.adapter.generateQR(amount, reference);
  }
}
