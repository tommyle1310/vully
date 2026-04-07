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

export interface BankAccountInfo {
  bankCode: string;
  accountNumber: string;
  accountName: string;
}

interface IPaymentQRAdapter {
  generateQR(
    amount: number,
    reference: string,
    bankAccount?: BankAccountInfo,
  ): PaymentQRResult;
}

class VietQRAdapter implements IPaymentQRAdapter {
  constructor(
    private readonly defaultBankId: string,
    private readonly defaultAccountNo: string,
    private readonly defaultAccountName: string,
    private readonly template: string,
  ) {}

  generateQR(amount: number, reference: string, bankAccount?: BankAccountInfo): PaymentQRResult {
    // Use provided bank account or fall back to defaults
    const bankId = bankAccount?.bankCode ?? this.defaultBankId;
    const accountNo = bankAccount?.accountNumber ?? this.defaultAccountNo;
    const accountName = bankAccount?.accountName ?? this.defaultAccountName;

    const encodedName = encodeURIComponent(accountName);
    const encodedRef = encodeURIComponent(reference);
    const qrImageUrl =
      `https://img.vietqr.io/image/${bankId}-${accountNo}-${this.template}.png` +
      `?amount=${Math.round(amount)}&addInfo=${encodedRef}&accountName=${encodedName}`;

    return {
      qrImageUrl,
      bankId,
      accountNo,
      accountName,
      amount: Math.round(amount),
      addInfo: reference,
      isMock: false,
    };
  }
}

class MockQRAdapter implements IPaymentQRAdapter {
  generateQR(amount: number, reference: string, bankAccount?: BankAccountInfo): PaymentQRResult {
    // Use provided bank account info in mock mode too (for UI preview)
    const bankId = bankAccount?.bankCode ?? 'vietinbank';
    const accountNo = bankAccount?.accountNumber ?? '0000000000';
    const accountName = bankAccount?.accountName ?? 'MOCK ACCOUNT';

    return {
      qrImageUrl: `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${Math.round(amount)}&addInfo=${encodeURIComponent(reference)}&accountName=${encodeURIComponent(accountName)}`,
      bankId,
      accountNo,
      accountName,
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

  /**
   * Generate VietQR payment code
   * @param amount Payment amount in VND
   * @param reference Payment reference string
   * @param bankAccount Optional dynamic bank account (overrides default)
   */
  generateQR(amount: number, reference: string, bankAccount?: BankAccountInfo): PaymentQRResult {
    return this.adapter.generateQR(amount, reference, bankAccount);
  }
}
