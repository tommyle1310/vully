import { Test, TestingModule } from '@nestjs/testing';
import { VacantBillingService } from './vacant-billing.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InvoiceCalculatorService } from './invoice-calculator.service';

const mockPrismaService = {
  apartments: { findMany: jest.fn() },
  parking_slots: { findMany: jest.fn() },
  invoices: { create: jest.fn() },
};

const mockCalculator = {
  buildManagementFeeLineItem: jest.fn(),
  generateInvoiceNumber: jest.fn(),
};

describe('VacantBillingService', () => {
  let service: VacantBillingService;
  let prisma: typeof mockPrismaService;
  let calculator: typeof mockCalculator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VacantBillingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: InvoiceCalculatorService, useValue: mockCalculator },
      ],
    }).compile();

    service = module.get<VacantBillingService>(VacantBillingService);
    prisma = module.get<typeof mockPrismaService>(PrismaService);
    calculator = module.get<typeof mockCalculator>(InvoiceCalculatorService);
    jest.clearAllMocks();
  });

  describe('findBillableVacantApartments', () => {
    it('should find vacant apartments with owner', async () => {
      prisma.apartments.findMany.mockResolvedValue([
        { id: 'apt-1', unit_number: 'A101', building_id: 'b1', owner_id: 'owner-1' },
      ]);

      const result = await service.findBillableVacantApartments('2026-06');

      expect(result).toHaveLength(1);
      expect(prisma.apartments.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'vacant',
            owner_id: { not: null },
            contracts: { none: { status: 'active' } },
            invoices: { none: { billing_period: '2026-06' } },
          }),
        }),
      );
    });

    it('should filter by building when provided', async () => {
      prisma.apartments.findMany.mockResolvedValue([]);

      await service.findBillableVacantApartments('2026-06', 'building-1');

      expect(prisma.apartments.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ building_id: 'building-1' }),
        }),
      );
    });

    it('should return empty array when no vacant apartments', async () => {
      prisma.apartments.findMany.mockResolvedValue([]);

      const result = await service.findBillableVacantApartments('2026-06');

      expect(result).toEqual([]);
    });
  });

  describe('generateVacantInvoice', () => {
    const mockMgmtItem = {
      description: 'Management Fee (80 m² × 15,000 VND/m²)',
      category: 'management_fee',
      quantity: 80,
      unitPrice: 15000,
      amount: 1320000, // 1,200,000 + 120,000 VAT
      vatRate: 0.10,
      vatAmount: 120000,
      environmentFee: 0,
    };

    it('should create invoice with management fee for vacant unit', async () => {
      calculator.buildManagementFeeLineItem.mockResolvedValue(mockMgmtItem);
      calculator.generateInvoiceNumber.mockResolvedValue('INV-202606-0010');
      prisma.parking_slots.findMany.mockResolvedValue([]);

      const mockInvoice = {
        id: 'inv-id',
        contract_id: null,
        apartment_id: 'apt-1',
        invoice_number: 'INV-202606-0010',
        billing_period: '2026-06',
        issue_date: new Date('2026-06-01'),
        due_date: new Date('2026-06-15'),
        status: 'pending',
        subtotal: 1200000,
        tax_amount: 120000,
        total_amount: 1320000,
        paid_amount: 0,
        paid_at: null,
        notes: 'Management fee for vacant unit B205',
        price_snapshot: { paymentReference: 'B205_MGMT_202606', vacantUnit: true },
        invoice_stream: 'operational',
        created_at: new Date(),
        updated_at: new Date(),
        invoice_line_items: [{ ...mockMgmtItem, id: 'li-1', unit_price: 15000, vat_rate: 0.10, vat_amount: 120000, environment_fee: 0, utility_type_id: null, meter_reading_id: null, tier_breakdown: null }],
        contracts: null,
        apartments: {
          id: 'apt-1',
          unit_number: 'B205',
          buildings: { id: 'b1', name: 'Building B' },
          users: { id: 'owner-1', first_name: 'John', last_name: 'Doe', email: 'john@test.com' },
        },
      };
      prisma.invoices.create.mockResolvedValue(mockInvoice);

      const result = await service.generateVacantInvoice('apt-1', 'b1', 'B205', '2026-06');

      expect(result).toBeDefined();
      expect(result.contractId).toBeNull();
      expect(result.apartment).toBeDefined();
      expect(result.apartment!.unit_number).toBe('B205');

      // Verify invoice create was called with null contract_id + apartment_id
      expect(prisma.invoices.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contract_id: null,
            apartment_id: 'apt-1',
          }),
        }),
      );
    });

    it('should use VietQR format {UnitNumber}_MGMT_{PERIOD}', async () => {
      calculator.buildManagementFeeLineItem.mockResolvedValue(mockMgmtItem);
      calculator.generateInvoiceNumber.mockResolvedValue('INV-202606-0001');
      prisma.parking_slots.findMany.mockResolvedValue([]);
      prisma.invoices.create.mockResolvedValue({
        id: 'inv-id', contract_id: null, apartment_id: 'apt-1',
        invoice_number: 'INV-202606-0001', billing_period: '2026-06',
        issue_date: new Date(), due_date: new Date(), status: 'pending',
        subtotal: 0, tax_amount: 0, total_amount: 0, paid_amount: 0,
        paid_at: null, notes: '', invoice_stream: 'operational',
        price_snapshot: { paymentReference: 'B205_MGMT_202606' },
        created_at: new Date(), updated_at: new Date(),
        invoice_line_items: [], contracts: null,
        apartments: { id: 'apt-1', unit_number: 'B205', buildings: { id: 'b1', name: 'B' }, users: null },
      });

      await service.generateVacantInvoice('apt-1', 'b1', 'B205', '2026-06');

      const createCall = prisma.invoices.create.mock.calls[0][0];
      expect(createCall.data.price_snapshot).toEqual(
        expect.objectContaining({ paymentReference: 'B205_MGMT_202606' }),
      );
    });

    it('should include parking line items when slots are assigned', async () => {
      calculator.buildManagementFeeLineItem.mockResolvedValue(mockMgmtItem);
      calculator.generateInvoiceNumber.mockResolvedValue('INV-202606-0002');
      prisma.parking_slots.findMany.mockResolvedValue([
        {
          id: 'slot-1',
          full_code: 'P1-A01',
          fee_override: null,
          status: 'assigned',
          parking_zones: { fee_per_month: 500000, slot_type: 'car' },
        },
      ]);

      prisma.invoices.create.mockImplementation(({ data }) => ({
        id: 'inv-id', ...data,
        paid_amount: 0, paid_at: null,
        created_at: new Date(), updated_at: new Date(),
        invoice_line_items: [], contracts: null,
        apartments: { id: 'apt-1', unit_number: 'A101', buildings: { id: 'b1', name: 'B' }, users: null },
      }));

      await service.generateVacantInvoice('apt-1', 'b1', 'A101', '2026-06');

      const createCall = prisma.invoices.create.mock.calls[0][0];
      const lineItemsData = createCall.data.invoice_line_items.create;
      expect(lineItemsData).toHaveLength(2); // management fee + parking
      const parkingItem = lineItemsData.find((li: { category: string }) => li.category.startsWith('parking_'));
      expect(parkingItem).toBeDefined();
      expect(parkingItem.description).toContain('P1-A01');
    });

    it('should return null when no billable items exist', async () => {
      calculator.buildManagementFeeLineItem.mockResolvedValue(null);
      prisma.parking_slots.findMany.mockResolvedValue([]);

      const result = await service.generateVacantInvoice('apt-1', 'b1', 'A101', '2026-06');

      expect(result).toBeNull();
      expect(prisma.invoices.create).not.toHaveBeenCalled();
    });
  });
});
