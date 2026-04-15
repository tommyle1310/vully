import { access_cards } from '@prisma/client';
import { AccessCardResponseDto } from '../dto/access-card.dto';

export function toAccessCardResponseDto(
  card: access_cards & {
    apartments?: {
      id: string;
      unit_number: string;
      buildings?: { name: string };
    };
    holder?: {
      id: string;
      first_name: string;
      last_name: string;
      email?: string;
    } | null;
  },
  apartmentData?: {
    unit_number?: string;
    buildings?: { name?: string };
  },
): AccessCardResponseDto {
  return {
    id: card.id,
    cardNumber: card.card_number,
    apartmentId: card.apartment_id,
    apartment: card.apartments
      ? {
          id: card.apartments.id,
          unitNumber: card.apartments.unit_number,
          buildingName: card.apartments.buildings?.name,
        }
      : apartmentData
        ? {
            id: card.apartment_id,
            unitNumber: apartmentData.unit_number ?? '',
            buildingName: apartmentData.buildings?.name,
          }
        : undefined,
    holderId: card.holder_id,
    holder: card.holder
      ? {
          id: card.holder.id,
          firstName: card.holder.first_name,
          lastName: card.holder.last_name,
          email: card.holder.email,
        }
      : null,
    cardType: card.card_type,
    status: card.status,
    accessZones: card.access_zones,
    floorAccess: card.floor_access,
    issuedAt: card.issued_at.toISOString(),
    expiresAt: card.expires_at?.toISOString() ?? null,
    deactivatedAt: card.deactivated_at?.toISOString() ?? null,
    deactivatedBy: card.deactivated_by,
    notes: card.notes,
    createdAt: card.created_at.toISOString(),
    updatedAt: card.updated_at.toISOString(),
  };
}
