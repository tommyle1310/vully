import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VietQRService } from './vietqr.service';

describe('VietQRService', () => {
  describe('mock adapter', () => {
    let service: VietQRService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          VietQRService,
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue('mock') },
          },
        ],
      }).compile();

      service = module.get<VietQRService>(VietQRService);
    });

    it('should generate mock QR with correct amount', () => {
      const result = service.generateQR(19800000, 'A101_RENT_052026');

      expect(result.isMock).toBe(true);
      expect(result.amount).toBe(19800000);
      expect(result.addInfo).toBe('A101_RENT_052026');
      expect(result.qrImageUrl).toContain('amount=19800000');
      expect(result.qrImageUrl).toContain('A101_RENT_052026');
    });
  });

  describe('vietqr adapter', () => {
    let service: VietQRService;

    beforeEach(async () => {
      const configMap: Record<string, string> = {
        PAYMENT_GATEWAY: 'vietqr',
        VIETQR_BANK_ID: 'vietinbank',
        VIETQR_ACCOUNT_NO: '123456789012',
        VIETQR_ACCOUNT_NAME: 'VULLY APARTMENT',
        VIETQR_TEMPLATE: 'compact2',
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          VietQRService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, fallback?: string) => configMap[key] ?? fallback),
            },
          },
        ],
      }).compile();

      service = module.get<VietQRService>(VietQRService);
    });

    it('should generate real VietQR URL', () => {
      const result = service.generateQR(19800000, 'A101_RENT_052026');

      expect(result.isMock).toBe(false);
      expect(result.bankId).toBe('vietinbank');
      expect(result.accountNo).toBe('123456789012');
      expect(result.qrImageUrl).toContain(
        'https://img.vietqr.io/image/vietinbank-123456789012-compact2.png',
      );
      expect(result.qrImageUrl).toContain('amount=19800000');
      expect(result.qrImageUrl).toContain('addInfo=A101_RENT_052026');
      expect(result.qrImageUrl).toContain('accountName=VULLY%20APARTMENT');
    });

    it('should round fractional amounts', () => {
      const result = service.generateQR(19800000.75, 'REF');
      expect(result.amount).toBe(19800001);
    });
  });
});
