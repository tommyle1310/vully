import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService } from './ai-assistant.service';
import { EmbeddingService } from './embedding.service';
import { DocumentService } from './document.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [AiAssistantController],
  providers: [AiAssistantService, EmbeddingService, DocumentService],
  exports: [AiAssistantService, DocumentService],
})
export class AiAssistantModule {}
