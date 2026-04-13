import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService } from './ai-assistant.service';
import { AiAssistantSearchService } from './ai-assistant-search.service';
import { EmbeddingService } from './embedding.service';
import { DocumentService } from './document.service';
import { GroqService } from './groq.service';
import { SemanticCacheService } from './semantic-cache.service';
import { CacheInvalidationListener } from './cache-invalidation.listener';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule, EventEmitterModule],
  controllers: [AiAssistantController],
  providers: [
    AiAssistantService,
    AiAssistantSearchService,
    EmbeddingService,
    DocumentService,
    GroqService,
    SemanticCacheService,
    CacheInvalidationListener,
  ],
  exports: [AiAssistantService, DocumentService],
})
export class AiAssistantModule {}
