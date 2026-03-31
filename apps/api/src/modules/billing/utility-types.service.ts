import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateUtilityTypeDto,
  UpdateUtilityTypeDto,
  UtilityTypeResponseDto,
} from './dto/utility-type.dto';

@Injectable()
export class UtilityTypesService {
  private readonly logger = new Logger(UtilityTypesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUtilityTypeDto): Promise<UtilityTypeResponseDto> {
    // Check for duplicate code
    const existing = await this.prisma.utilityType.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Utility type with code "${dto.code}" already exists`);
    }

    const utilityType = await this.prisma.utilityType.create({
      data: {
        code: dto.code.toLowerCase(),
        name: dto.name,
        unit: dto.unit,
      },
    });

    return this.toResponseDto(utilityType);
  }

  async findAll(): Promise<UtilityTypeResponseDto[]> {
    const utilityTypes = await this.prisma.utilityType.findMany({
      orderBy: { code: 'asc' },
    });

    return utilityTypes.map(this.toResponseDto);
  }

  async findOne(id: string): Promise<UtilityTypeResponseDto> {
    const utilityType = await this.prisma.utilityType.findUnique({
      where: { id },
    });

    if (!utilityType) {
      throw new NotFoundException('Utility type not found');
    }

    return this.toResponseDto(utilityType);
  }

  async findByCode(code: string): Promise<UtilityTypeResponseDto> {
    const utilityType = await this.prisma.utilityType.findUnique({
      where: { code: code.toLowerCase() },
    });

    if (!utilityType) {
      throw new NotFoundException(`Utility type with code "${code}" not found`);
    }

    return this.toResponseDto(utilityType);
  }

  async update(id: string, dto: UpdateUtilityTypeDto): Promise<UtilityTypeResponseDto> {
    const utilityType = await this.prisma.utilityType.findUnique({
      where: { id },
    });

    if (!utilityType) {
      throw new NotFoundException('Utility type not found');
    }

    const updated = await this.prisma.utilityType.update({
      where: { id },
      data: {
        name: dto.name,
        unit: dto.unit,
        isActive: dto.isActive,
      },
    });

    return this.toResponseDto(updated);
  }

  async seedDefaults(): Promise<UtilityTypeResponseDto[]> {
    const defaults = [
      { code: 'electric', name: 'Electricity', unit: 'kWh' },
      { code: 'water', name: 'Water', unit: 'm³' },
      { code: 'gas', name: 'Gas', unit: 'kg' },
    ];

    const results: UtilityTypeResponseDto[] = [];

    for (const def of defaults) {
      const existing = await this.prisma.utilityType.findUnique({
        where: { code: def.code },
      });

      if (!existing) {
        const created = await this.prisma.utilityType.create({
          data: def,
        });
        results.push(this.toResponseDto(created));
        this.logger.log(`Created default utility type: ${def.code}`);
      } else {
        results.push(this.toResponseDto(existing));
      }
    }

    return results;
  }

  private toResponseDto(utilityType: any): UtilityTypeResponseDto {
    return {
      id: utilityType.id,
      code: utilityType.code,
      name: utilityType.name,
      unit: utilityType.unit,
      isActive: utilityType.isActive,
    };
  }
}
