import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceCalculatorService } from './invoice-calculator.service';
import { PrismaService } from '../../common/prisma/prisma.service';

const mockPrismaService = {
  meter_readings: { findMany: jest.fn() },
  utility_types: { findMany: jest.fn() },
  utility_tiers: { findMany: jest.fn() },
  management_fee_configs: { findFirst: jest.fn() },
  apartments: { findUnique: jest.fn() },
  contract_payment_schedules: { findMany: jest.fn() },
  contracts: { findUnique: jest.fn() },
  invoices: { findFirst: jest.fn(), count: jest.fn() },
};

describe('InvoiceCalculatorService', () => {
  let service: InvoiceCalculatorService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceCalculatorService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<InvoiceCalculatorService>(InvoiceCalculatorService);
    prisma = module.get<typeof mockPrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('calculateTieredAmount', () => {
    it('should calculate two-tier electricity correctly (EVN style)', async () => {
      prisma.utility_tiers.findMany.mockResolvedValue([
        { tier_number: 1, min_usage: 0, max_usage: 200, unit_price: 1866 },
        { tier_number: 2, min_usage: 200, max_usage: null, unit_price: 2500 },
      ]);

      const result = await service.calculateTieredAmount(
        'utility-id',
        'building-id',
        440,
        '2026-05',
      );

      // Tier 1: 200 × 1866 = 373,200
      // Tier 2: 240 × 2500 = 600,000
      expect(result.amount).toBe(973200);
      const tiers = (result.breakdown as { tiers: Array<{ qty: number; price: number; amount: number }> }).tiers;
      expect(tiers).toHaveLength(2);
      expect(tiers[0]).toEqual({ tier: 1, qty: 200, price: 1866, amount: 373200 });
      expect(tiers[1]).toEqual({ tier: 2, qty: 240, price: 2500, amount: 600000 });
    });

    it('should use flat rate when no tiers exist', async () => {
      prisma.utility_tiers.findMany.mockResolvedValue([]);

      const result = await service.calculateTieredAmount(
        'utility-id',
        'building-id',
        100,
        '2026-05',
      );

      expect(result.amount).toBe(100 * 3000); // DEFAULT_UTILITY_RATE
      expect(result.breakdown).toEqual({ flatRate: true, usage: 100, unitPrice: 3000 });
    });

    it('should handle three-tier water pricing', async () => {
      prisma.utility_tiers.findMany.mockResolvedValue([
        { tier_number: 1, min_usage: 0, max_usage: 10, unit_price: 5000 },
        { tier_number: 2, min_usage: 10, max_usage: 20, unit_price: 7000 },
        { tier_number: 3, min_usage: 20, max_usage: null, unit_price: 10000 },
      ]);

      const result = await service.calculateTieredAmount(
        'water-id',
        'building-id',
        25,
        '2026-05',
      );

      // Tier 1: 10 × 5000 = 50,000
      // Tier 2: 10 × 7000 = 70,000
      // Tier 3: 5 × 10000 = 50,000
      expect(result.amount).toBe(170000);
    });
  });

  describe('calculateInvoice - rental', () => {
    it('should build rent line item with 10% VAT', async () => {
      prisma.meter_readings.findMany.mockResolvedValue([]);
      prisma.management_fee_configs.findFirst.mockResolvedValue(null);

      const result = await service.calculateInvoice(
        'contract-id',
        'apartment-id',
        'building-id',
        '2026-05',
        18000000,
        ['rent'],
        'rental',
        'A101',
      );

      expect(result.lineItems).toHaveLength(1);
      const rent = result.lineItems[0];
      expect(rent.category).toBe('rent');
      expect(rent.unitPrice).toBe(18000000);
      expect(rent.vatRate).toBe(0.10);
      expect(rent.vatAmount).toBe(1800000);
      expect(rent.amount).toBe(19800000);
      expect(result.paymentReference).toBe('A101_RENT_202605');
    });

    it('should include management fee when available', async () => {
      prisma.meter_readings.findMany.mockResolvedValue([]);
      prisma.management_fee_configs.findFirst.mockResolvedValue({
        id: 'config-id',
        building_id: 'building-id',
        price_per_sqm: 15000,
        effective_from: new Date('2026-01-01'),
        effective_to: null,
      });
      prisma.apartments.findUnique.mockResolvedValue({
        gross_area: 82.5,
        net_area: null,
      });

      const result = await service.calculateInvoice(
        'contract-id',
        'apartment-id',
        'building-id',
        '2026-05',
        18000000,
        undefined, // includeAll
        'rental',
        'A101',
      );

      const mgmt = result.lineItems.find((i) => i.category === 'management_fee');
      expect(mgmt).toBeDefined();
      expect(mgmt!.quantity).toBe(82.5);
      expect(mgmt!.unitPrice).toBe(15000);
      // Base: 82.5 × 15000 = 1,237,500; VAT: 123,750; Total: 1,361,250
      expect(mgmt!.vatRate).toBe(0.10);
      expect(mgmt!.vatAmount).toBeCloseTo(123750);
      expect(mgmt!.amount).toBeCloseTo(1361250);
    });
  });

  describe('calculateInvoice - utility', () => {
    it('should apply 0% VAT for electricity (thu hộ)', async () => {
      prisma.meter_readings.findMany.mockResolvedValue([
        {
          id: 'reading-1',
          apartment_id: 'apt-1',
          utility_type_id: 'elec-id',
          current_value: 12890,
          previous_value: 12450,
          billing_period: '2026-04',
          utility_types: { id: 'elec-id', code: 'electric', name: 'Electricity', unit: 'kWh' },
        },
      ]);
      prisma.utility_tiers.findMany.mockResolvedValue([
        { tier_number: 1, min_usage: 0, max_usage: 200, unit_price: 1866 },
        { tier_number: 2, min_usage: 200, max_usage: null, unit_price: 2500 },
      ]);
      prisma.management_fee_configs.findFirst.mockResolvedValue(null);

      const result = await service.calculateInvoice(
        'contract-id',
        'apt-1',
        'building-id',
        '2026-04',
        0,
        ['electric'],
        'rental',
      );

      const elec = result.lineItems.find((i) => i.category === 'utility_electric');
      expect(elec).toBeDefined();
      expect(elec!.quantity).toBe(440);
      expect(elec!.vatRate).toBe(0);
      expect(elec!.vatAmount).toBe(0);
      expect(elec!.environmentFee).toBe(0);
      expect(elec!.amount).toBe(973200); // tiered total only, no VAT
    });

    it('should apply 10% environment fee for water', async () => {
      prisma.meter_readings.findMany.mockResolvedValue([
        {
          id: 'reading-w',
          apartment_id: 'apt-1',
          utility_type_id: 'water-id',
          current_value: 125,
          previous_value: 100,
          billing_period: '2026-05',
          utility_types: { id: 'water-id', code: 'water', name: 'Water', unit: 'm³' },
        },
      ]);
      prisma.utility_tiers.findMany.mockResolvedValue([
        { tier_number: 1, min_usage: 0, max_usage: null, unit_price: 10000 },
      ]);
      prisma.management_fee_configs.findFirst.mockResolvedValue(null);

      const result = await service.calculateInvoice(
        'contract-id',
        'apt-1',
        'building-id',
        '2026-05',
        0,
        ['water'],
        'rental',
      );

      const water = result.lineItems.find((i) => i.category === 'utility_water');
      expect(water).toBeDefined();
      // 25 m³ × 10,000 = 250,000 base
      // Environment fee: 250,000 × 0.10 = 25,000
      // VAT: 0 (thu hộ)
      expect(water!.environmentFee).toBe(25000);
      expect(water!.vatAmount).toBe(0);
      expect(water!.amount).toBe(275000); // base + env fee
    });
  });

  describe('calculateInvoice - purchase milestones', () => {
    it('should include milestone with 10% VAT when due in period', async () => {
      prisma.contract_payment_schedules.findMany.mockResolvedValue([
        {
          id: 'ms-1',
          contract_id: 'contract-id',
          period_label: 'Cất nóc tầng 35',
          expected_amount: 420000000,
          due_date: new Date('2026-05-15'),
          status: 'pending',
          sequence_number: 3,
        },
      ]);
      prisma.meter_readings.findMany.mockResolvedValue([]);
      prisma.management_fee_configs.findFirst.mockResolvedValue(null);

      const result = await service.calculateInvoice(
        'contract-id',
        'apt-1',
        'building-id',
        '2026-05',
        0,
        undefined,
        'purchase',
      );

      const ms = result.lineItems.find((i) => i.category === 'milestone');
      expect(ms).toBeDefined();
      expect(ms!.unitPrice).toBe(420000000);
      expect(ms!.vatRate).toBe(0.10);
      expect(ms!.vatAmount).toBe(42000000);
      expect(ms!.amount).toBe(462000000);
    });

    it('should skip purchase contract with no milestones due', async () => {
      prisma.contract_payment_schedules.findMany.mockResolvedValue([]);
      prisma.meter_readings.findMany.mockResolvedValue([]);
      prisma.management_fee_configs.findFirst.mockResolvedValue(null);

      const result = await service.calculateInvoice(
        'contract-id',
        'apt-1',
        'building-id',
        '2026-06',
        0,
        undefined,
        'purchase',
      );

      expect(result.lineItems).toHaveLength(0);
    });
  });

  describe('calculateInvoice - lease-to-own installment', () => {
    it('should calculate installment with VAT on interest only', async () => {
      prisma.contracts.findUnique.mockResolvedValue({
        id: 'contract-id',
        purchase_option_price: 4200000000,
        rent_amount: 70000000,
        option_period_months: 60,
      });
      prisma.invoices.count.mockResolvedValue(0); // first installment
      prisma.meter_readings.findMany.mockResolvedValue([]);
      prisma.management_fee_configs.findFirst.mockResolvedValue(null);

      const result = await service.calculateInvoice(
        'contract-id',
        'apt-1',
        'building-id',
        '2026-05',
        70000000,
        ['installment'],
        'lease_to_own',
      );

      const inst = result.lineItems.find((i) => i.category === 'installment');
      expect(inst).toBeDefined();
      expect(inst!.vatRate).toBe(0.10);
      // VAT should only be on the interest portion
      expect(inst!.metadata).toBeDefined();
      expect(inst!.metadata!.installmentNumber).toBe('1/60');
    });
  });

  describe('generateInvoiceNumber', () => {
    it('should generate first invoice number for period', async () => {
      prisma.invoices.findFirst.mockResolvedValue(null);

      const result = await service.generateInvoiceNumber('2026-05');
      expect(result).toBe('INV-202605-0001');
    });

    it('should increment from last invoice number', async () => {
      prisma.invoices.findFirst.mockResolvedValue({
        invoice_number: 'INV-202605-0042',
      });

      const result = await service.generateInvoiceNumber('2026-05');
      expect(result).toBe('INV-202605-0043');
    });
  });

  describe('VietQR reference generation', () => {
    it('should generate payment reference with unit number', async () => {
      prisma.meter_readings.findMany.mockResolvedValue([]);
      prisma.management_fee_configs.findFirst.mockResolvedValue(null);

      const result = await service.calculateInvoice(
        'contract-id',
        'apt-1',
        'building-id',
        '2026-05',
        18000000,
        ['rent'],
        'rental',
        'A101',
      );

      expect(result.paymentReference).toBe('A101_RENT_202605');
    });
  });
});
