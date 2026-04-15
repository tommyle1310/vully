# Backend Code Reading Guide - Module Apartments

> **Mục đích**: Hướng dẫn đọc code backend NestJS cho người chỉ biết Frontend, chuẩn bị phỏng vấn Backend Senior

---

## 📚 Mục Lục

1. [Backend Flow Tổng Quan](#1-backend-flow-tổng-quan)
2. [NestJS Architecture 101](#2-nestjs-architecture-101)
3. [Chi Tiết Từng File Trong Module Apartments](#3-chi-tiết-từng-file)
4. [Ví Dụ Hoàn Chỉnh: Tạo Apartment](#4-ví-dụ-hoàn-chỉnh)
5. [Patterns & Concepts Quan Trọng](#5-patterns--concepts)
6. [Checklist Đọc Code Cho Interview](#6-checklist-đọc-code)

---

## 1. Backend Flow Tổng Quan

### Request → Response Journey (So sánh với Frontend)

**Frontend (bạn đã biết)**:
```
User clicks button → Event handler → Update state → Re-render UI
```

**Backend (tương tự nhưng khác)**:
```
Client sends HTTP request
  ↓
Middleware (kiểm tra JWT token, log request)
  ↓
Guard (kiểm tra user có quyền không?)
  ↓
Controller (nhận request, validate data)
  ↓
Service (xử lý business logic)
  ↓
Prisma (query database)
  ↓
Mapper (chuyển database object → DTO)
  ↓
Response (trả JSON về client)
```

### Ví Dụ Cụ Thể: `GET /apartments?buildingId=abc`

```typescript
// 1. Middleware kiểm tra token JWT
CorrelationIdMiddleware → tạo request ID để track logs

// 2. Guard kiểm tra quyền
JwtAuthGuard → "Token có hợp lệ không?"
RolesGuard → "User có role 'admin' hoặc 'resident' không?"

// 3. Controller nhận request
ApartmentsController.findAll(buildingId: 'abc')

// 4. Service xử lý logic
ApartmentsService.findAll({ buildingId: 'abc' })
  → Prisma query: SELECT * FROM apartments WHERE building_id = 'abc'

// 5. Mapper chuyển đổi data
toApartmentResponseDto(apartment) → Chuyển snake_case → camelCase

// 6. Response
{ data: [...apartments], total: 10 }
```

---

## 2. NestJS Architecture 101

### 2.1. Module (`.module.ts`) - "Hộp Chứa"

**Giống như**: React Context Provider - bọc tất cả components con

**Tác dụng**:
- Đăng ký tất cả Controllers và Services
- Khai báo dependencies (Services nào cần inject)
- Export Services để module khác dùng

**File**: `apartments.module.ts`

```typescript
@Module({
  controllers: [
    BuildingsController,    // ← Nhận HTTP requests
    ApartmentsController,
    ContractsController,
    // ...
  ],
  providers: [
    BuildingsService,       // ← Xử lý business logic
    ApartmentsService,
    ApartmentsConfigService, // ← Helper service
    // ...
  ],
  exports: [
    BuildingsService,       // ← Cho phép module khác import
    // ...
  ],
})
export class ApartmentsModule {}
```

**Khái niệm quan trọng**:
- `controllers`: Nhận HTTP requests (tương tự React component nhận props)
- `providers`: Services được inject vào controllers (tương tự React hooks)
- `exports`: Cho phép module khác dùng service này (tương tự export function)

---

### 2.2. Controller (`.controller.ts`) - "Receptionist"

**Giống như**: React component - nhận props (request params) và render (response)

**Tác dụng**:
- Định nghĩa API endpoints (routes)
- Validate request data (params, query, body)
- Gọi Service để xử lý logic
- Trả về response

**File**: `apartments.controller.ts`

```typescript
@Controller('apartments')  // ← Base path: /apartments
@UseGuards(JwtAuthGuard)   // ← Phải đăng nhập mới gọi được
export class ApartmentsController {
  constructor(
    private readonly apartmentsService: ApartmentsService  // ← Dependency Injection
  ) {}

  @Get()  // ← GET /apartments
  @Roles('admin', 'resident')  // ← Chỉ admin/resident mới gọi được
  async findAll(
    @Query('buildingId') buildingId?: string,  // ← Lấy query param
    @Query('page') page?: string,
  ) {
    // Gọi service để xử lý
    const result = await this.apartmentsService.findAll({ buildingId }, page);
    return { data: result.data, total: result.total };
  }

  @Post()  // ← POST /apartments
  @Roles('admin')  // ← Chỉ admin mới tạo được
  async create(
    @Body() dto: CreateApartmentDto,  // ← Lấy request body
    @CurrentUser() user: AuthUser,    // ← Lấy thông tin user hiện tại
  ) {
    const apartment = await this.apartmentsService.create(dto);
    return { data: apartment };
  }

  @Get(':id')  // ← GET /apartments/abc-123
  async findOne(
    @Param('id', ParseUUIDPipe) id: string  // ← Lấy path param + validate UUID
  ) {
    const apartment = await this.apartmentsService.findOne(id);
    return { data: apartment };
  }
}
```

**Decorators Quan Trọng** (giống như React props types):
- `@Get()`, `@Post()`, `@Patch()`, `@Delete()` → HTTP methods
- `@Query('name')` → Lấy query param (?name=value)
- `@Param('id')` → Lấy path param (/apartments/:id)
- `@Body()` → Lấy request body (JSON payload)
- `@CurrentUser()` → Custom decorator, lấy user từ JWT token

---

### 2.3. Service (`.service.ts`) - "Business Logic Brain"

**Giống như**: Custom React hook - chứa logic phức tạp, tách biệt khỏi UI

**Tác dụng**:
- Xử lý business logic (tính toán, validation phức tạp)
- Query database qua Prisma
- Gọi external APIs
- Xử lý transactions

**File**: `apartments.service.ts`

```typescript
@Injectable()  // ← Cho phép inject vào Controller
export class ApartmentsService {
  constructor(
    private readonly prisma: PrismaService  // ← Inject Prisma (database client)
  ) {}

  async create(dto: CreateApartmentDto): Promise<ApartmentResponseDto> {
    // 1. Validate: Kiểm tra building tồn tại
    const building = await this.prisma.buildings.findUnique({
      where: { id: dto.buildingId },
    });
    if (!building) {
      throw new NotFoundException('Building not found');
    }

    // 2. Create apartment
    const apartment = await this.prisma.apartments.create({
      data: {
        building_id: dto.buildingId,
        unit_number: dto.unit_number,
        floor_index: dto.floorIndex,
        bedroom_count: dto.bedroomCount ?? 1,
        status: 'vacant',
        // ... 50+ fields
      },
      include: {
        buildings: true,  // ← JOIN với bảng buildings
      },
    });

    // 3. Log event
    this.logger.log({
      event: 'apartment_created',
      apartmentId: apartment.id,
    });

    // 4. Transform data trước khi trả về
    return toApartmentResponseDto(apartment);
  }

  async findAll(
    filters: ApartmentFiltersDto,
    page = 1,
    limit = 20,
  ): Promise<{ data: ApartmentResponseDto[]; total: number }> {
    // 1. Build WHERE clause động
    const where: Prisma.apartmentsWhereInput = {};
    if (filters.buildingId) where.building_id = filters.buildingId;
    if (filters.status) where.status = { in: filters.status };

    // 2. Query với pagination
    const [apartments, total] = await Promise.all([
      this.prisma.apartments.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { buildings: true },
        orderBy: { unit_number: 'asc' },
      }),
      this.prisma.apartments.count({ where }),
    ]);

    // 3. Transform tất cả apartments
    return {
      data: apartments.map(toApartmentResponseDto),
      total,
    };
  }
}
```

**Prisma Query Patterns** (giống như fetch API):
- `findUnique({ where: { id } })` → `SELECT * FROM table WHERE id = ?`
- `findMany({ where, skip, take })` → `SELECT * ... LIMIT ... OFFSET ...`
- `create({ data })` → `INSERT INTO ...`
- `update({ where, data })` → `UPDATE ... SET ... WHERE ...`
- `delete({ where })` → `DELETE FROM ... WHERE ...`

---

### 2.4. DTO (`dto/*.dto.ts`) - "Data Contract"

**Giống như**: TypeScript interface + Zod schema - định nghĩa shape của data

**Tác dụng**:
- Validate request data (type, required, min/max value)
- Auto-generate Swagger docs
- Type safety

**File**: `dto/apartment.dto.ts`

```typescript
export class CreateApartmentDto {
  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({ description: 'Building ID' })
  buildingId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Unit number (e.g., A-101)' })
  unit_number: string;

  @IsInt()
  @Min(0)
  @ApiProperty({ description: 'Floor index (0 = ground floor)' })
  floorIndex: number;

  @IsEnum(UnitType)
  @IsOptional()
  @ApiProperty({ enum: UnitType, required: false })
  unitType?: UnitType;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiProperty({ description: 'Gross area in m²', required: false })
  grossArea?: number;

  @IsInt()
  @Min(0)
  @Max(10)
  @IsOptional()
  @ApiProperty({ description: 'Number of bedrooms', required: false })
  bedroomCount?: number;
}

export class ApartmentResponseDto {
  id: string;
  buildingId: string;
  unit_number: string;
  floorIndex: number;
  status: ApartmentStatus;
  unitType: string | null;
  grossArea: number | null;
  bedroomCount: number;
  // ... 50+ fields
}
```

**Validation Decorators**:
- `@IsString()`, `@IsNumber()`, `@IsBoolean()` → Kiểm tra type
- `@IsNotEmpty()`, `@IsOptional()` → Bắt buộc hay không
- `@Min(0)`, `@Max(100)` → Giới hạn giá trị
- `@IsEnum(EnumType)` → Chỉ cho phép giá trị trong enum
- `@IsUUID()` → Kiểm tra format UUID

---

### 2.5. Mapper (`.mapper.ts`) - "Data Transformer"

**Giống như**: Utility function - chuyển đổi data format

**Tác dụng**:
- Chuyển database object (snake_case) → DTO (camelCase)
- Handle null/undefined values
- Format dates, numbers, decimals

**File**: `apartments.mapper.ts`

```typescript
// Type cho data từ database (Prisma)
export type ApartmentWithRelations = apartments & {
  buildings?: { id: string; name: string; address: string };
  contracts?: Array<{ id: string; status: string; /* ... */ }>;
};

// Helper functions
const toNum = (v: unknown) => (v != null ? Number(v) : null);
const toStr = (v: unknown) => (v != null ? String(v) : null);

// Main mapper function
export function toApartmentResponseDto(
  apartment: ApartmentWithRelations,
): ApartmentResponseDto {
  return {
    // Database: snake_case → DTO: camelCase
    id: apartment.id,
    buildingId: apartment.building_id,
    unit_number: apartment.unit_number,  // ← Giữ nguyên vì business term
    floorIndex: apartment.floor_index,
    
    // Handle nulls
    apartmentCode: toStr(apartment.apartment_code),
    grossArea: toNum(apartment.gross_area),
    
    // Transform nested objects
    building: apartment.buildings ? {
      id: apartment.buildings.id,
      name: apartment.buildings.name,
      address: apartment.buildings.address,
    } : null,
    
    // Map active contract (if exists)
    activeContract: mapActiveContract(apartment.contracts),
  };
}
```

**Tại sao cần Mapper?**
- Database dùng `snake_case` (PostgreSQL convention)
- Frontend/API dùng `camelCase` (JavaScript convention)
- Database có thể chứa `Prisma.Decimal` (cần convert sang `number`)
- Cần filter/transform data trước khi expose ra API

---

## 3. Chi Tiết Từng File Trong Module Apartments

### 📂 File Structure Overview

```
apartments/
├── apartments.module.ts          ← Entry point, đăng ký tất cả
│
├── *.controller.ts (9 files)     ← API endpoints
│   ├── apartments.controller.ts      → CRUD apartments
│   ├── buildings.controller.ts       → CRUD buildings
│   ├── contracts.controller.ts       → CRUD contracts
│   ├── payment-schedule.controller.ts → Payment tracking
│   ├── building-policies.controller.ts → Building rules
│   ├── parking.controller.ts         → Parking management
│   ├── access-cards.controller.ts    → Access card CRUD
│   ├── access-card-requests.controller.ts → Card request workflow
│   └── bank-accounts.controller.ts   → Bank account for VietQR
│
├── *.service.ts (Main services - 13 files)
│   ├── apartments.service.ts         → Business logic for apartments
│   ├── buildings.service.ts          → Business logic for buildings
│   ├── contracts.service.ts          → Business logic for contracts
│   ├── payment-schedule.service.ts   → Payment CRUD
│   ├── building-policies.service.ts  → Policy versioning
│   ├── parking.service.ts            → Parking CRUD
│   ├── access-cards.service.ts       → Access card CRUD
│   ├── access-card-requests.service.ts → Request workflow
│   └── bank-accounts.service.ts      → Bank account CRUD
│
├── *-helper.service.ts (Helper services)
│   ├── apartments-config.service.ts  → Calculate effective config
│   ├── buildings-svg.service.ts      → SVG map processing
│   ├── contracts-tenant.service.ts   → Tenant-specific queries
│   ├── payment-generator.service.ts  → Generate payment schedules
│   ├── parking-zones.service.ts      → Parking zone helpers
│   ├── access-cards-helpers.service.ts → Audit logs
│   └── access-cards-lifecycle.service.ts → Deactivate/Reactivate
│
├── *.mapper.ts (Data transformers)
│   ├── apartments.mapper.ts
│   ├── contracts.mapper.ts
│   ├── parking.mapper.ts
│   ├── access-cards.mapper.ts
│   └── payment-schedule.mapper.ts
│
└── dto/ (Data Transfer Objects - 13 files)
    ├── apartment.dto.ts              → CreateApartmentDto, UpdateApartmentDto, etc.
    ├── building.dto.ts
    ├── contract.dto.ts
    ├── payment.dto.ts
    ├── access-card.dto.ts
    └── ...
```

---

### 3.1. Core CRUD Files (Apartments, Buildings, Contracts)

#### **apartments.controller.ts** (API Layer)
**Endpoints**:
- `POST /apartments` → Create apartment (admin only)
- `GET /apartments` → List apartments (với filters)
- `GET /apartments/:id` → Get one apartment
- `PATCH /apartments/:id` → Update apartment
- `DELETE /apartments/:id` → Delete apartment (admin only)
- `GET /apartments/:id/effective-config` → Lấy config hiệu lực (kế thừa từ building policy)

**Pattern Chính**:
```typescript
@Controller('apartments')
@UseGuards(JwtAuthGuard, RolesGuard)  // ← Bắt buộc đăng nhập + check role
export class ApartmentsController {
  constructor(
    private readonly apartmentsService: ApartmentsService,
    private readonly configService: ApartmentsConfigService,  // ← Helper service
  ) {}

  @Get()
  @Roles('admin', 'technician', 'resident')
  async findAll(
    @Query() filters: ApartmentFiltersDto,  // ← DTO auto-validate
  ) {
    const result = await this.apartmentsService.findAll(filters);
    return { data: result.data, total: result.total };
  }
}
```

---

#### **apartments.service.ts** (Business Logic)
**Chức năng chính**:
- `create()`: Tạo apartment, validate building tồn tại
- `findAll()`: Query với filters động (buildingId, status, unitType, floor, area, orientation)
- `findOne()`: Query với relations (building, owner, contracts, parking slots)
- `update()`: Update apartment, log changes
- `delete()`: Soft delete (có thể thêm later) hoặc hard delete

**Complex Query Example**:
```typescript
async findAll(filters: ApartmentFiltersDto, page = 1, limit = 20) {
  // 1. Build WHERE clause động
  const where: Prisma.apartmentsWhereInput = {};
  
  if (filters.buildingId) where.building_id = filters.buildingId;
  
  if (filters.status) {
    where.status = Array.isArray(filters.status) 
      ? { in: filters.status }  // ← SQL: WHERE status IN ('vacant', 'occupied')
      : filters.status;
  }
  
  if (filters.minArea || filters.maxArea) {
    where.gross_area = {};
    if (filters.minArea) where.gross_area.gte = filters.minArea;
    if (filters.maxArea) where.gross_area.lte = filters.maxArea;
  }
  
  // 2. Query với pagination
  const [apartments, total] = await Promise.all([
    this.prisma.apartments.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        buildings: true,
        users: true,  // ← owner
        contracts: {
          where: { status: 'active' },
          include: { users_contracts_tenant_idTousers: true },
        },
      },
    }),
    this.prisma.apartments.count({ where }),
  ]);
  
  // 3. Transform data
  return {
    data: apartments.map(toApartmentResponseDto),
    total,
  };
}
```

**Khái niệm quan trọng**:
- `Prisma.apartmentsWhereInput` → TypeScript type cho WHERE clause (type-safe!)
- `include` → JOIN với bảng khác (eager loading)
- `Promise.all()` → Query song song để tăng performance

---

#### **apartments-config.service.ts** (Helper Service)
**Tác dụng**: Tính config hiệu lực cho apartment (kế thừa từ building policy + apartment override)

**Business Logic**:
```typescript
async getEffectiveConfig(apartmentId: string) {
  const apartment = await this.prisma.apartments.findUnique({
    where: { id: apartmentId },
    include: {
      buildings: {
        include: {
          building_policies: {
            where: {
              effective_from: { lte: new Date() },  // ← Policy đã có hiệu lực
              OR: [
                { effective_to: null },              // ← Vô thời hạn
                { effective_to: { gte: new Date() } }, // ← Chưa hết hạn
              ],
            },
            orderBy: { effective_from: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  const policy = apartment.buildings.building_policies[0];
  
  // Apartment config override building policy
  return {
    utilityRateElectricity: apartment.utility_rate_electricity_override || policy.default_utility_rate_electricity,
    utilityRateWater: apartment.utility_rate_water_override || policy.default_utility_rate_water,
    managementFeeRate: apartment.management_fee_override || policy.default_management_fee_rate,
    // ...
  };
}
```

**Pattern**: Policy Inheritance với Override
- Building có default policy (effective date range)
- Apartment có thể override từng field
- Service tính giá trị cuối cùng

---

### 3.2. Payment Tracking Files

#### **payment-schedule.controller.ts** + **payment-schedule.service.ts**
**Flow**: Contract → Payment Schedules → Payments

**Endpoints**:
- `GET /contracts/:id/payment-schedules` → Lấy lịch thanh toán
- `POST /contracts/:id/payment-schedules/:scheduleId/payments` → Ghi nhận thanh toán
- `POST /payments/:id/void` → Void payment (hủy, không delete)
- `GET /contracts/:id/financial-summary` → Tổng hợp tài chính

**Key Service Method**:
```typescript
async recordPayment(
  scheduleId: string,
  dto: RecordPaymentDto,
  userId: string,
) {
  return this.prisma.$transaction(async (tx) => {
    // 1. Lấy schedule
    const schedule = await tx.contract_payment_schedules.findUnique({
      where: { id: scheduleId },
    });
    
    // 2. Tạo payment record
    const payment = await tx.contract_payments.create({
      data: {
        schedule_id: scheduleId,
        amount: dto.amount,
        payment_method: dto.paymentMethod,
        payment_date: dto.paymentDate,
        reference_number: dto.referenceNumber,
        receipt_url: dto.receiptUrl,
        created_by: userId,
      },
    });
    
    // 3. Update schedule status
    const receivedAmount = schedule.received_amount + dto.amount;
    let newStatus = schedule.status;
    
    if (receivedAmount >= schedule.expected_amount) {
      newStatus = 'paid';
    } else if (receivedAmount > 0) {
      newStatus = 'partial';
    }
    
    await tx.contract_payment_schedules.update({
      where: { id: scheduleId },
      data: {
        received_amount: receivedAmount,
        status: newStatus,
        updated_at: new Date(),
      },
    });
    
    // 4. Log audit
    await tx.audit_logs.create({
      data: {
        actor_id: userId,
        action: 'payment.recorded',
        resource_type: 'contract_payment',
        resource_id: payment.id,
        new_values: { amount: dto.amount, status: newStatus },
      },
    });
    
    return payment;
  });
}
```

**Khái niệm quan trọng**:
- `$transaction` → ACID guarantee (tất cả thành công hoặc tất cả rollback)
- Audit logging → Immutable log cho financial transactions
- Status calculation → `pending` → `partial` → `paid`

---

#### **payment-generator.service.ts** (Helper Service)
**Tác dụng**: Generate payment schedules cho contracts

**2 Loại Schedules**:
1. **Rent Schedules**: Monthly recurring (hợp đồng thuê)
2. **Purchase Milestones**: Các cột mốc thanh toán (hợp đồng mua)

**Complex Logic: Pro-rated First Period**
```typescript
async generateRentSchedules(contractId: string, dto: GenerateRentScheduleDto) {
  const contract = await this.validateContractForGeneration(contractId, 'rental');
  
  const startDate = new Date(contract.start_date);
  const rentAmount = Number(contract.rent_amount);
  const months = dto.months || 12;
  
  const schedules = [];
  
  for (let i = 0; i < months; i++) {
    const monthDate = addMonths(startDate, i);
    let dueDate = new Date(monthDate);
    dueDate.setDate(contract.payment_due_day || 5);  // ← Default ngày 5 hàng tháng
    
    let expectedAmount = rentAmount;
    
    // Pro-rate tháng đầu nếu ký hợp đồng giữa tháng
    if (i === 0 && startDate.getDate() > 1) {
      const startDay = startDate.getDate();
      const daysInMonth = getDaysInMonth(startDate);
      const billableDays = daysInMonth - startDay + 1;
      
      expectedAmount = (rentAmount / daysInMonth) * billableDays;
      // ← Example: Nếu ký ngày 15/30, chỉ tính 16 ngày
    }
    
    // Check overdue
    const today = startOfDay(new Date());
    const status = isBefore(dueDate, today) ? 'overdue' : 'pending';
    
    schedules.push({
      contract_id: contractId,
      period_label: `Tháng ${i + 1} (${format(monthDate, 'MM/yyyy')})`,
      payment_type: 'rent',
      sequence_number: i + 1,
      due_date: dueDate,
      expected_amount: Math.round(expectedAmount),
      status,
    });
  }
  
  // Bulk insert
  await this.prisma.contract_payment_schedules.createMany({
    data: schedules,
  });
  
  return schedules.map(toScheduleResponseDto);
}
```

**Tại sao có helper service riêng?**
- Logic phức tạp (pro-rating, date calculations)
- Dùng lại ở nhiều nơi (API endpoint + Cron job)
- Easier to test (unit test helper service riêng)

---

### 3.3. Access Card Lifecycle Files

#### **access-cards.service.ts** (Main CRUD)
**Chức năng**: CRUD access cards

#### **access-cards-lifecycle.service.ts** (State Management)
**Chức năng**: Quản lý lifecycle của card

**States**: `active` → `deactivated` / `lost` / `expired`

**Key Method: Deactivate Card**
```typescript
async deactivate(
  id: string,
  dto: DeactivateAccessCardDto,
  userId: string,
) {
  const existingCard = await this.prisma.access_cards.findUnique({
    where: { id },
    include: { parking_slot: true },  // ← Check parking link
  });
  
  if (!existingCard) {
    throw new NotFoundException('Access card not found');
  }
  
  if (existingCard.status !== 'active') {
    throw new BadRequestException(
      `Cannot deactivate card with status '${existingCard.status}'`
    );
  }
  
  // Determine new status based on reason
  const newStatus = dto.reason === 'lost' ? 'lost' : 'deactivated';
  
  // Transaction: Update card + unlink parking
  const card = await this.prisma.$transaction(async (tx) => {
    // 1. Unlink from parking slot
    if (existingCard.parking_slot) {
      await tx.parking_slots.update({
        where: { id: existingCard.parking_slot.id },
        data: { access_card_id: null },
      });
    }
    
    // 2. Update card status
    return tx.access_cards.update({
      where: { id },
      data: {
        status: newStatus,
        deactivated_at: new Date(),
        deactivated_by: userId,
        notes: `${dto.reason}: ${dto.notes || ''}`,
      },
    });
  });
  
  // 3. Audit log
  await this.helpers.createAuditLog(
    userId,
    'access_card.deactivated',
    card.id,
    { status: 'active' },
    { status: newStatus, reason: dto.reason },
  );
  
  return toAccessCardResponseDto(card);
}
```

**Pattern**: State Machine với Side Effects
- Validate state transition (chỉ deactivate khi `active`)
- Side effects: unlink parking slot
- Audit trail: log old vs new state

---

#### **access-cards-helpers.service.ts** (Utilities)
**Chức năng**:
- `createAuditLog()`: Tạo audit logs
- `validateCardNumber()`: Validate card number unique
- `generateCardNumber()`: Generate card number tự động

**Tại sao tách riêng?**
- Reusable utilities (gọi từ nhiều services)
- Single Responsibility Principle (mỗi service 1 mục đích)

---

#### **access-card-requests.service.ts** (Workflow Service)
**Chức năng**: Xử lý workflow approve/reject access card requests

**Flow**: `pending` → Admin approve → `approved` + Issue card

**Key Method: Approve Request**
```typescript
async approve(requestId: string, userId: string) {
  const request = await this.prisma.access_card_requests.findUnique({
    where: { id: requestId },
    include: { apartments: true },
  });
  
  if (!request) {
    throw new NotFoundException('Request not found');
  }
  
  if (request.status !== 'pending') {
    throw new BadRequestException('Request not pending');
  }
  
  // Transaction: Update request + issue card
  return this.prisma.$transaction(async (tx) => {
    // 1. Update request status
    await tx.access_card_requests.update({
      where: { id: requestId },
      data: {
        status: 'approved',
        approved_by: userId,
        approved_at: new Date(),
      },
    });
    
    // 2. Issue new access card
    const card = await tx.access_cards.create({
      data: {
        card_number: await this.generateCardNumber(),
        apartment_id: request.apartment_id,
        holder_id: request.requester_id,
        card_type: request.card_type,
        status: 'active',
        issued_at: new Date(),
        issued_by: userId,
      },
    });
    
    return { request, card };
  });
}
```

**Pattern**: Workflow State Machine + Side Effects
- State validation
- Transaction để ensure atomicity
- Side effect: tạo access card mới

---

### 3.4. Mapper Files

#### **apartments.mapper.ts**, **contracts.mapper.ts**, etc.

**Tác dụng**: Transform database objects → DTOs

**Pattern Chung**:
```typescript
// 1. Type cho data từ Prisma (database)
export type ApartmentWithRelations = apartments & {
  buildings?: { id: string; name: string };
  contracts?: Array<{ ... }>;
};

// 2. Helper functions
const toNum = (v: unknown) => (v != null ? Number(v) : null);
const toStr = (v: unknown) => (v != null ? String(v) : null);
const toDate = (v: unknown) => v instanceof Date ? v.toISOString().split('T')[0] : null;

// 3. Main mapper
export function toApartmentResponseDto(
  apartment: ApartmentWithRelations
): ApartmentResponseDto {
  return {
    id: apartment.id,
    buildingId: apartment.building_id,  // ← snake_case → camelCase
    unit_number: apartment.unit_number, // ← Business term, giữ nguyên
    grossArea: toNum(apartment.gross_area),  // ← Handle null
    
    // Nested objects
    building: apartment.buildings ? {
      id: apartment.buildings.id,
      name: apartment.buildings.name,
    } : null,
    
    // Complex mapping
    activeContract: mapActiveContract(apartment.contracts),
  };
}
```

---

## 4. Ví Dụ Hoàn Chỉnh: Tạo Apartment

### Request Flow Chi Tiết

**Frontend gửi request**:
```typescript
// Frontend code (bạn đã quen)
const response = await fetch('/api/apartments', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    buildingId: 'abc-123',
    unit_number: 'A-101',
    floorIndex: 10,
    unitType: 'two_bedroom',
    grossArea: 85.5,
    bedroomCount: 2,
    bathroomCount: 2,
  }),
});
```

---

**Backend xử lý từng bước**:

#### Bước 1: Middleware (Global)
```typescript
// File: common/middleware/correlation-id.middleware.ts
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: Function) {
    // Tạo request ID để track logs
    req['correlationId'] = req.headers['x-correlation-id'] || uuidv4();
    
    // Set response header
    res.setHeader('x-correlation-id', req['correlationId']);
    
    next();
  }
}
```

#### Bước 2: Guard - Authentication
```typescript
// File: modules/identity/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // 1. Extract JWT token from header
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];
    
    // 2. Verify token
    const payload = this.jwtService.verify(token, { secret: JWT_SECRET });
    
    // 3. Attach user to request
    request.user = {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles,
    };
    
    return true;  // ← Cho phép tiếp tục
  }
}
```

#### Bước 3: Guard - Authorization
```typescript
// File: common/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // 1. Lấy roles required từ decorator @Roles('admin')
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    
    // 2. Lấy user từ request (đã attach ở JWT guard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // 3. Check user có role nào match không
    return requiredRoles.some(role => user.roles.includes(role));
  }
}
```

#### Bước 4: Controller - Receive Request
```typescript
// File: apartments.controller.ts
@Controller('apartments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApartmentsController {
  @Post()
  @Roles('admin')  // ← RolesGuard sẽ check role này
  async create(
    @Body() dto: CreateApartmentDto,  // ← DTO auto-validate
    @CurrentUser() user: AuthUser,
  ) {
    // Gọi service
    const apartment = await this.apartmentsService.create(dto);
    return { data: apartment };
  }
}
```

**Ở đây xảy ra gì?**
1. NestJS auto-validate `dto` bằng class-validator decorators
2. Nếu validation FAIL → throw `400 Bad Request`
3. Nếu PASS → gọi service

---

#### Bước 5: Service - Business Logic
```typescript
// File: apartments.service.ts
@Injectable()
export class ApartmentsService {
  async create(dto: CreateApartmentDto): Promise<ApartmentResponseDto> {
    // 1. Validate: Building tồn tại?
    const building = await this.prisma.buildings.findUnique({
      where: { id: dto.buildingId },
    });
    if (!building) {
      throw new NotFoundException('Building not found');  // ← 404
    }
    
    // 2. Log input để debug
    this.logger.debug({
      event: 'apartment_create_input',
      dto,
    });
    
    // 3. Create apartment
    const apartment = await this.prisma.apartments.create({
      data: {
        building_id: dto.buildingId,
        unit_number: dto.unit_number,
        floor_index: dto.floorIndex,
        unit_type: dto.unitType ?? null,
        gross_area: dto.grossArea !== undefined ? dto.grossArea : null,
        bedroom_count: dto.bedroomCount ?? 1,
        bathroom_count: dto.bathroomCount ?? 1,
        status: 'vacant',  // ← Default status
        features: {},
        updated_at: new Date(),
      },
      include: {
        buildings: {
          select: { id: true, name: true, address: true },
        },
      },
    });
    
    // 4. Log success
    this.logger.log({
      event: 'apartment_created',
      apartmentId: apartment.id,
      buildingId: dto.buildingId,
    });
    
    // 5. Transform data trước khi return
    return toApartmentResponseDto(apartment);
  }
}
```

**Prisma Query Chạy SQL**:
```sql
INSERT INTO apartments (
  id,
  building_id,
  unit_number,
  floor_index,
  unit_type,
  gross_area,
  bedroom_count,
  bathroom_count,
  status,
  features,
  created_at,
  updated_at
) VALUES (
  'uuid-generated',
  'abc-123',
  'A-101',
  10,
  'two_bedroom',
  85.5,
  2,
  2,
  'vacant',
  '{}',
  NOW(),
  NOW()
) RETURNING *;

-- Sau đó JOIN với buildings
SELECT apartments.*, buildings.id, buildings.name, buildings.address
FROM apartments
INNER JOIN buildings ON apartments.building_id = buildings.id
WHERE apartments.id = 'uuid-generated';
```

---

#### Bước 6: Mapper - Transform Data
```typescript
// File: apartments.mapper.ts
export function toApartmentResponseDto(
  apartment: ApartmentWithRelations
): ApartmentResponseDto {
  return {
    // Database snake_case → API camelCase
    id: apartment.id,
    buildingId: apartment.building_id,
    unit_number: apartment.unit_number,
    floorIndex: apartment.floor_index,
    status: apartment.status,
    
    // Handle nulls
    unitType: toStr(apartment.unit_type),
    grossArea: toNum(apartment.gross_area),
    
    // Nested object
    building: apartment.buildings ? {
      id: apartment.buildings.id,
      name: apartment.buildings.name,
      address: apartment.buildings.address,
    } : null,
    
    // Defaults
    bedroomCount: apartment.bedroom_count,
    bathroomCount: apartment.bathroom_count,
  };
}
```

---

#### Bước 7: Response
```typescript
// Controller return
return { data: apartment };

// NestJS auto-serialize to JSON
{
  "data": {
    "id": "uuid-generated",
    "buildingId": "abc-123",
    "unit_number": "A-101",
    "floorIndex": 10,
    "status": "vacant",
    "unitType": "two_bedroom",
    "grossArea": 85.5,
    "bedroomCount": 2,
    "bathroomCount": 2,
    "building": {
      "id": "abc-123",
      "name": "Vinhomes Central Park",
      "address": "208 Nguyễn Hữu Cảnh, Bình Thạnh"
    }
  }
}
```

---

#### Bước 8: Global Exception Filter (Nếu có lỗi)
```typescript
// File: common/filters/http-exception.filter.ts
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    
    let status = 500;
    let message = 'Internal server error';
    
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    }
    
    // Standardized error response
    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId: request.correlationId,
    });
  }
}
```

**Example Error Response**:
```json
{
  "statusCode": 404,
  "message": "Building not found",
  "timestamp": "2026-04-14T10:30:00.000Z",
  "path": "/api/apartments",
  "correlationId": "abc-123-def-456"
}
```

---

## 5. Patterns & Concepts Quan Trọng

### 5.1. Dependency Injection (DI)

**Giống như**: React Context - share data/functions giữa components

**NestJS Pattern**:
```typescript
// Service được inject vào Controller
@Controller('apartments')
export class ApartmentsController {
  constructor(
    private readonly apartmentsService: ApartmentsService,  // ← DI
    private readonly configService: ApartmentsConfigService,
  ) {}
  
  // Sử dụng: this.apartmentsService.create(...)
}

// Service inject Prisma
@Injectable()
export class ApartmentsService {
  constructor(
    private readonly prisma: PrismaService  // ← DI
  ) {}
}
```

**Lợi ích**:
- Dễ test (mock services trong unit test)
- Loose coupling (thay đổi implementation không ảnh hưởng controller)
- Single instance (singleton pattern tự động)

---

### 5.2. Guards (Authorization/Authentication)

**Giống như**: React `PrivateRoute` - check permission trước khi render

**NestJS Guards**:
```typescript
@Controller('apartments')
@UseGuards(JwtAuthGuard, RolesGuard)  // ← Guards chạy theo thứ tự
export class ApartmentsController {
  @Get()
  @Roles('admin', 'resident')  // ← Metadata cho RolesGuard
  async findAll() { ... }
  
  @Post()
  @Roles('admin')  // ← Chỉ admin
  async create() { ... }
}
```

**Guard Implementation**:
```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get('roles', context.getHandler());
    const user = context.switchToHttp().getRequest().user;
    
    // Check user có role nào match không
    return requiredRoles.some(role => user.roles.includes(role));
  }
}
```

---

### 5.3. Decorators (Metadata & Utilities)

**Custom Decorators**:
```typescript
// File: common/decorators/current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;  // ← User từ JWT guard
  },
);

// Sử dụng:
@Post()
async create(
  @Body() dto: CreateApartmentDto,
  @CurrentUser() user: AuthUser,  // ← Lấy user từ request
) {
  console.log(user.id, user.email, user.roles);
}
```

---

### 5.4. Transactions (ACID Guarantee)

**Pattern**: Đảm bảo nhiều operations thành công hoặc tất cả rollback

```typescript
// Example: Approve request + Issue card (phải cùng thành công)
return this.prisma.$transaction(async (tx) => {
  // 1. Update request
  await tx.access_card_requests.update({
    where: { id: requestId },
    data: { status: 'approved' },
  });
  
  // 2. Create card
  const card = await tx.access_cards.create({
    data: { /* ... */ },
  });
  
  // Nếu step 1 hoặc 2 fail → rollback cả 2
  return { request, card };
});
```

**Khi nào dùng**:
- Financial operations (payments, refunds)
- Workflow state changes (approve request → issue card)
- Multi-step updates (deactivate card → unlink parking)

---

### 5.5. Prisma Query Patterns

#### 5.5.1. Basic CRUD
```typescript
// CREATE
const apartment = await prisma.apartments.create({
  data: { building_id: 'abc', unit_number: 'A-101', /* ... */ },
});

// READ
const apartment = await prisma.apartments.findUnique({
  where: { id: 'xyz' },
});

const apartments = await prisma.apartments.findMany({
  where: { building_id: 'abc', status: 'vacant' },
});

// UPDATE
await prisma.apartments.update({
  where: { id: 'xyz' },
  data: { status: 'occupied' },
});

// DELETE
await prisma.apartments.delete({
  where: { id: 'xyz' },
});
```

#### 5.5.2. Relations (JOINs)
```typescript
const apartment = await prisma.apartments.findUnique({
  where: { id: 'xyz' },
  include: {
    buildings: true,  // ← JOIN buildings
    users: true,      // ← JOIN owner (users)
    contracts: {      // ← JOIN contracts với filter
      where: { status: 'active' },
      include: {
        users_contracts_tenant_idTousers: true,  // ← Nested JOIN
      },
    },
  },
});

// SQL equivalent:
// SELECT a.*, b.*, u.*, c.*
// FROM apartments a
// LEFT JOIN buildings b ON a.building_id = b.id
// LEFT JOIN users u ON a.owner_id = u.id
// LEFT JOIN contracts c ON c.apartment_id = a.id AND c.status = 'active'
// LEFT JOIN users t ON c.tenant_id = t.id
// WHERE a.id = 'xyz';
```

#### 5.5.3. Filters (WHERE с Conditions)
```typescript
const where: Prisma.apartmentsWhereInput = {
  building_id: 'abc',
  status: { in: ['vacant', 'occupied'] },  // ← IN clause
  gross_area: { gte: 50, lte: 100 },       // ← BETWEEN
  bedroom_count: { gte: 2 },                // ← >= 2
  
  // OR conditions
  OR: [
    { unit_type: 'two_bedroom' },
    { unit_type: 'three_bedroom' },
  ],
  
  // Nested filters
  buildings: {
    name: { contains: 'Vinhomes' },        // ← LIKE '%Vinhomes%'
  },
};

const apartments = await prisma.apartments.findMany({ where });
```

#### 5.5.4. Aggregations
```typescript
// Count
const count = await prisma.apartments.count({
  where: { building_id: 'abc', status: 'vacant' },
});

// Aggregate
const stats = await prisma.apartments.aggregate({
  where: { building_id: 'abc' },
  _count: { id: true },
  _avg: { gross_area: true },
  _sum: { gross_area: true },
  _min: { gross_area: true },
  _max: { gross_area: true },
});
```

---

### 5.6. Error Handling

#### Standard HTTP Exceptions
```typescript
import { 
  NotFoundException,      // ← 404
  BadRequestException,    // ← 400
  ForbiddenException,     // ← 403
  UnauthorizedException,  // ← 401
  ConflictException,      // ← 409
} from '@nestjs/common';

// Example usage
if (!apartment) {
  throw new NotFoundException('Apartment not found');
}

if (apartment.status !== 'vacant') {
  throw new BadRequestException('Apartment is not vacant');
}

if (user.role !== 'admin') {
  throw new ForbiddenException('Only admin can perform this action');
}
```

#### Custom Error Messages
```typescript
throw new BadRequestException({
  statusCode: 400,
  message: 'Validation failed',
  errors: [
    { field: 'grossArea', message: 'Must be positive number' },
    { field: 'bedroomCount', message: 'Must be at least 1' },
  ],
});
```

---

## 6. Checklist Đọc Code Cho Interview

### 6.1. Flow Đọc Code (Theo thứ tự)

**Bước 1: Hiểu Module Structure** (5 phút)
- [ ] Đọc `apartments.module.ts` → Xem có bao nhiêu controllers, services
- [ ] List ra các nhóm chức năng (apartments, contracts, payments, access cards, etc.)
- [ ] Hiểu dependencies giữa các services (service nào inject service nào)

**Bước 2: Pick 1 Feature để Đọc Sâu** (15 phút)
Chọn feature quan trọng nhất (recommend: **Apartments CRUD** hoặc **Payment Tracking**)

- [ ] Đọc `*.controller.ts` → List endpoints, HTTP methods, guards, roles
- [ ] Đọc `*.service.ts` → Hiểu business logic, query patterns
- [ ] Đọc `*.dto.ts` → Hiểu shape của data, validation rules
- [ ] Đọc `*.mapper.ts` → Hiểu transform logic

**Bước 3: Trace 1 Request End-to-End** (10 phút)
Pick 1 endpoint (recommend: `POST /apartments`)

- [ ] Middleware: JWT auth → Roles guard
- [ ] Controller: Nhận request, validate DTO
- [ ] Service: Business logic, Prisma query
- [ ] Mapper: Transform data
- [ ] Response: JSON structure

**Bước 4: Hiểu Complex Logic** (15 phút)
- [ ] Transactions: Tìm `prisma.$transaction()` → Hiểu ACID use cases
- [ ] State Machines: Access card lifecycle, payment status
- [ ] Calculated Fields: Pro-rated rent, effective config
- [ ] Background Jobs: `onModuleInit()` → Update overdue statuses

**Bước 5: Prepare Talking Points** (10 phút)
- [ ] Pick 1 complex feature để giải thích (payment pro-rating, access card workflow)
- [ ] Prepare 1 câu hỏi về race conditions (parking slot assignment)
- [ ] Prepare 1 câu hỏi về transaction boundaries (approve + issue card)

---

### 6.2. Key Files Phải Đọc (Sorted by Priority)

#### **Must Read** (Core logic):
1. `apartments.module.ts` → Hiểu structure tổng thể
2. `apartments.controller.ts` + `apartments.service.ts` → CRUD pattern
3. `payment-generator.service.ts` → Complex business logic (pro-rating)
4. `access-cards-lifecycle.service.ts` → State machine + transactions
5. `apartments.mapper.ts` → Data transformation pattern

#### **Should Read** (Important patterns):
6. `contracts.service.ts` → Multi-type contracts (rental/purchase/lease-to-own)
7. `payment-schedule.service.ts` → Financial tracking, void workflow
8. `building-policies.service.ts` → Versioned policies với effective dates
9. `parking.service.ts` → Hierarchical data (zones → slots)

#### **Nice to Read** (Helper utilities):
10. `apartments-config.service.ts` → Inheritance + override pattern
11. `access-cards-helpers.service.ts` → Audit logging
12. `buildings-svg.service.ts` → SVG processing (nếu interview hỏi về 3D viewer)

---

### 6.3. Concepts Phải Nắm (Interview Questions)

#### **Architecture Patterns**:
- [ ] Dependency Injection: Controllers inject Services, Services inject Prisma
- [ ] Guards: JwtAuthGuard (authentication) + RolesGuard (authorization)
- [ ] Decorators: `@CurrentUser()`, `@Roles()` - metadata extractor
- [ ] Mappers: Transform database objects → DTOs (snake_case → camelCase)

#### **Database Patterns**:
- [ ] Prisma Queries: `findMany`, `create`, `update`, `delete`, `include` (JOINs)
- [ ] Transactions: `$transaction()` cho multi-step operations
- [ ] Filters: Dynamic WHERE clauses (`Prisma.apartmentsWhereInput`)
- [ ] Pagination: `skip`, `take` với `count()`

#### **Business Logic Patterns**:
- [ ] State Machines: Incident (open → assigned → resolved), Access Card (active → deactivated)
- [ ] Workflow: Access card requests (pending → approved → issue card)
- [ ] Calculated Fields: Pro-rated rent, effective config (inheritance + override)
- [ ] Audit Logging: Immutable logs với old/new values

#### **Performance Patterns**:
- [ ] Parallel Queries: `Promise.all([apartments, count])`
- [ ] Selective Fields: `select` vs `include` (fetch only needed data)
- [ ] Indexes: (Không thể hiện trong code, nhưng hiểu concept)

---

### 6.4. Interview Talking Points (Examples)

#### **"Explain the payment tracking system"**:
> "Hệ thống payment tracking có 3 layers:
> 1. **Contract** → Định nghĩa rent amount, start/end date
> 2. **Payment Schedules** → Generate lịch thanh toán (monthly for rent, milestones for purchase)
> 3. **Payments** → Record thanh toán thực tế, update schedule status
> 
> Logic phức tạp nhất là **pro-rating tháng đầu**: Nếu ký hợp đồng ngày 15/30, chỉ tính 16 ngày → `(rentAmount / daysInMonth) * billableDays`.
> 
> Dùng transaction để ensure atomicity: Record payment + update schedule status cùng thành công hoặc rollback."

#### **"How do you handle access card lifecycle?"**:
> "Access card có state machine: `active` → `deactivated`/`lost`/`expired`.
> 
> Khi deactivate card, có side effects:
> 1. Unlink card khỏi parking slot (nếu có)
> 2. Update card status + timestamp
> 3. Log audit trail (old status → new status + reason)
> 
> Dùng transaction để ensure 3 steps này atomic. Nếu unlink parking fail → card không bị deactivate."

#### **"Explain effective config calculation"**:
> "Apartment có thể inherit config từ building policy hoặc override từng field.
> 
> Flow:
> 1. Query building policy hiệu lực (effective_from <= now, effective_to >= now)
> 2. Query apartment overrides
> 3. Merge: `apartment.override_field ?? policy.default_field`
> 
> Ví dụ: Building policy có `default_utility_rate_electricity: 1806 VND/kWh`. Apartment A override thành 2000. Apartment B không override → dùng 1806."

---

### 6.5. Questions Để Hỏi Interviewer (Show Deep Understanding)

#### **About Architecture**:
- "How do you handle idempotency for order creation? Do you use unique constraints or distributed locks?"
- "What's your strategy for handling race conditions in inventory reservation?"
- "Do you use event sourcing or state machine for order lifecycle?"

#### **About Transactions**:
- "How do you handle compensating transactions when payment fails after order creation?"
- "What's your maximum transaction duration? Do you use saga pattern for long-running workflows?"

#### **About Performance**:
- "What's the expected throughput? (orders/sec)"
- "How do you handle database connection pooling for high concurrency?"
- "Do you use read replicas for analytics queries?"

#### **About Monitoring**:
- "How do you track distributed transaction failures across services?"
- "What metrics do you monitor for order gateway? (latency, error rate, throughput)"

---

## 7. Summary: Module Apartments Architecture

```
apartments.module.ts (Entry Point)
│
├── 9 Controllers (API Layer)
│   ├── apartments.controller.ts       → /apartments endpoints
│   ├── buildings.controller.ts        → /buildings endpoints
│   ├── contracts.controller.ts        → /contracts endpoints
│   ├── payment-schedule.controller.ts → /contracts/:id/payment-schedules
│   ├── building-policies.controller.ts → /buildings/:id/policies
│   ├── parking.controller.ts          → /parking endpoints
│   ├── access-cards.controller.ts     → /access-cards endpoints
│   ├── access-card-requests.controller.ts → /access-card-requests
│   └── bank-accounts.controller.ts    → /bank-accounts endpoints
│
├── 9 Main Services (Business Logic)
│   ├── apartments.service.ts          → Apartments CRUD + queries
│   ├── buildings.service.ts           → Buildings CRUD
│   ├── contracts.service.ts           → Contracts CRUD (3 types)
│   ├── payment-schedule.service.ts    → Payment CRUD, void workflow
│   ├── building-policies.service.ts   → Versioned policies
│   ├── parking.service.ts             → Parking CRUD
│   ├── access-cards.service.ts        → Access cards CRUD
│   ├── access-card-requests.service.ts → Workflow (approve/reject)
│   └── bank-accounts.service.ts       → Bank accounts CRUD
│
├── 6 Helper Services (Utilities)
│   ├── apartments-config.service.ts   → Calculate effective config
│   ├── buildings-svg.service.ts       → SVG processing
│   ├── contracts-tenant.service.ts    → Tenant-specific queries
│   ├── payment-generator.service.ts   → Generate schedules (pro-rating)
│   ├── parking-zones.service.ts       → Parking zone helpers
│   ├── access-cards-helpers.service.ts → Audit logs, utilities
│   └── access-cards-lifecycle.service.ts → State transitions
│
├── 5 Mappers (Data Transformers)
│   ├── apartments.mapper.ts
│   ├── contracts.mapper.ts
│   ├── parking.mapper.ts
│   ├── access-cards.mapper.ts
│   └── payment-schedule.mapper.ts
│
└── 13 DTOs (Data Contracts)
    ├── apartment.dto.ts               → CreateApartmentDto, UpdateApartmentDto, etc.
    ├── building.dto.ts
    ├── contract.dto.ts
    ├── payment.dto.ts
    ├── access-card.dto.ts
    └── ... (9 more)
```

---

## Tổng Kết

**Bạn đã học được**:
1. ✅ Backend request flow (Client → Middleware → Guard → Controller → Service → Prisma → Mapper → Response)
2. ✅ NestJS architecture (Module, Controller, Service, DTO, Mapper, Guards, Decorators)
3. ✅ Prisma query patterns (CRUD, JOINs, filters, transactions)
4. ✅ Business logic patterns (state machines, workflows, calculations)
5. ✅ Production patterns (error handling, logging, audit trails, transactions)

**Next Steps**:
1. **Đọc code theo checklist** → Hiểu 1-2 features sâu
2. **Trace 1 request end-to-end** → Từ HTTP request đến database query
3. **Prepare talking points** → Giải thích 2-3 features phức tạp
4. **Practice questions** → Hỏi về idempotency, transactions, race conditions

**Good luck với interview! 🚀**
