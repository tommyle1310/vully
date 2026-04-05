# Design: Access Card Management

## Architecture Overview

The access card system extends the existing apartment management module with a new `AccessCard` entity that tracks physical access credentials. It integrates with:

- **Building Policies** — Limits on cards per apartment
- **Parking Slots** — Optional linked parking access cards
- **Apartments** — Card ownership and limit enforcement
- **Users** — Optional holder assignment for audit

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Building Policy                               │
│  accessCardLimitDefault: 4                                          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ inherits (unless overridden)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          Apartment                                   │
│  accessCardLimit: 6 (override) or null (use building default)       │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ AccessCard 1 │  │ AccessCard 2 │  │ AccessCard 3 │  ...         │
│  │ type:building│  │ type:building│  │ type:parking │              │
│  │ status:active│  │ status:lost  │  │ status:active│              │
│  └──────────────┘  └──────────────┘  └──────┬───────┘              │
└─────────────────────────────────────────────┼───────────────────────┘
                                              │ linked to
                                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Parking Slot                                 │
│  full_code: "B1-A-023"                                              │
│  assigned_apt_id: <apartment_id>                                    │
│  access_card_id: <card_id> (optional)                               │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Model

### AccessCard Entity

```prisma
model access_cards {
  id              String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  card_number     String           @unique @db.VarChar(50) // Physical card ID
  apartment_id    String           @db.Uuid
  holder_id       String?          @db.Uuid // Optional specific resident
  card_type       AccessCardType
  status          AccessCardStatus @default(active)
  access_zones    String[]         // ['lobby', 'elevator', 'gym', 'pool']
  floor_access    Int[]            // [1, 2, 3, 15] — floors card can access
  issued_at       DateTime         @default(now()) @db.Timestamptz(6)
  expires_at      DateTime?        @db.Timestamptz(6)
  deactivated_at  DateTime?        @db.Timestamptz(6)
  deactivated_by  String?          @db.Uuid
  notes           String?
  created_at      DateTime         @default(now()) @db.Timestamptz(6)
  updated_at      DateTime         @db.Timestamptz(6)

  // Relations
  apartments           apartments    @relation(fields: [apartment_id], references: [id], onDelete: Cascade)
  holder               users?        @relation("access_card_holder", fields: [holder_id], references: [id])
  deactivated_by_user  users?        @relation("access_card_deactivator", fields: [deactivated_by], references: [id])

  @@index([apartment_id])
  @@index([status])
  @@index([card_type])
}

enum AccessCardType {
  building  // Lobby, elevator, amenities
  parking   // Parking lot gates only
}

enum AccessCardStatus {
  active
  lost
  deactivated
  expired
}
```

### Parking Slot Extension

Add optional relation from `parking_slots` to `access_cards`:

```prisma
model parking_slots {
  // ... existing fields ...
  access_card_id  String?  @unique @db.Uuid // Optional linked parking card
  access_card     access_cards? @relation(fields: [access_card_id], references: [id])
}
```

## API Design

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/apartments/:id/access-cards` | List cards for apartment |
| POST | `/access-cards` | Issue new card (validates limit) |
| GET | `/access-cards/:id` | Get card details |
| PATCH | `/access-cards/:id` | Update zones/floor access |
| POST | `/access-cards/:id/deactivate` | Deactivate with reason |
| POST | `/access-cards/:id/reactivate` | Reactivate (audit logged) |

### DTOs

```typescript
// Issue new card
interface CreateAccessCardDto {
  cardNumber: string;        // Physical card ID (required, unique)
  apartmentId: string;       // UUID
  holderId?: string;         // Optional specific resident
  cardType: 'building' | 'parking';
  accessZones?: string[];    // Defaults to ['lobby', 'elevator']
  floorAccess?: number[];    // Defaults to all building floors
  expiresAt?: string;        // ISO date, optional
  notes?: string;
}

// Update card
interface UpdateAccessCardDto {
  accessZones?: string[];
  floorAccess?: number[];
  expiresAt?: string | null;
  notes?: string;
}

// Deactivate card
interface DeactivateAccessCardDto {
  reason: 'lost' | 'stolen' | 'resident_left' | 'admin_action';
  notes?: string;
}
```

### Response Format

```typescript
interface AccessCardResponse {
  id: string;
  cardNumber: string;
  apartmentId: string;
  apartment?: { unitNumber: string; buildingName: string };
  holderId?: string;
  holder?: { firstName: string; lastName: string };
  cardType: 'building' | 'parking';
  status: 'active' | 'lost' | 'deactivated' | 'expired';
  accessZones: string[];
  floorAccess: number[];
  issuedAt: string;
  expiresAt?: string;
  deactivatedAt?: string;
  notes?: string;
}
```

## Business Rules

### Card Limit Enforcement

```typescript
async validateCardLimit(apartmentId: string, cardType: AccessCardType): Promise<void> {
  const apartment = await this.getApartmentWithPolicy(apartmentId);
  
  // Only building cards count toward limit
  if (cardType !== 'building') return;
  
  const effectiveLimit = apartment.accessCardLimit 
    ?? apartment.building.currentPolicy?.accessCardLimitDefault 
    ?? 4;
  
  const activeCount = await this.prisma.accessCards.count({
    where: { 
      apartmentId, 
      cardType: 'building',
      status: 'active' 
    }
  });
  
  if (activeCount >= effectiveLimit) {
    throw new ConflictException(
      `Card limit reached (${activeCount}/${effectiveLimit}). Deactivate a card first.`
    );
  }
}
```

### Parking Card Lifecycle

When parking slot is assigned:
1. Optionally auto-issue parking card (configurable per building)
2. Link card to slot via `parking_slots.access_card_id`

When parking slot is unassigned:
1. Deactivate linked parking card (status: `deactivated`)
2. Clear `parking_slots.access_card_id`

### Status Transitions

```
                    ┌─────────────┐
                    │   active    │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌──────────┐    ┌────────────┐   ┌─────────┐
    │   lost   │    │ deactivated│   │ expired │
    └──────────┘    └────────────┘   └─────────┘
           │               │               
           └───────┬───────┘               
                   ▼                       
           (reactivate → active)           
```

- `lost` → `active`: Requires admin confirmation, audit logged
- `deactivated` → `active`: Standard reactivation
- `expired` → Cannot reactivate (must issue new card)

## Frontend Components

### AccessCardsTab

Located in apartment detail page as new tab:

```tsx
// apps/web/src/app/(dashboard)/apartments/[id]/access-cards-tab.tsx
export function AccessCardsTab({ apartmentId }: { apartmentId: string }) {
  const { data, isLoading } = useAccessCards(apartmentId);
  const effectiveLimit = useApartmentEffectiveConfig(apartmentId)?.accessCardLimit;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Access Cards</CardTitle>
        <CardDescription>
          {data?.length ?? 0} / {effectiveLimit ?? 4} cards issued
        </CardDescription>
        <IssueCardDialog apartmentId={apartmentId} />
      </CardHeader>
      <AccessCardsList cards={data} />
    </Card>
  );
}
```

### Card Status Badges

Use `DotBadge` for visual differentiation:
- `active` → green dot
- `lost` → red dot  
- `deactivated` → gray dot
- `expired` → amber dot

## Security Considerations

1. **Authorization**: Only admin/technician can issue/deactivate cards
2. **Audit Trail**: All card operations logged to `audit_logs` table
3. **Immediate Deactivation**: Lost card action must be synchronous (no queue)
4. **Card Number Validation**: Prevent re-issuing previously deactivated card numbers
5. **Rate Limiting**: Max 10 card operations per minute per user

## Performance

- **Indexes** on `apartment_id`, `status`, `card_type` for efficient queries
- **No caching** for card status (security-critical, must be real-time)
- **Optimistic UI** for status changes with rollback on error

## Migration Strategy

1. Add `access_cards` table and enums
2. Add `access_card_id` column to `parking_slots` (nullable)
3. No data migration needed (new feature, no existing cards)
