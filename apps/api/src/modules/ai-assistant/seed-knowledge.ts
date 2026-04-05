/**
 * Seed script to populate the AI assistant knowledge base with initial documents.
 * Run with: npx ts-node -r tsconfig-paths/register src/modules/ai-assistant/seed-knowledge.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { DocumentService } from './document.service';
import { KNOWLEDGE_DOCUMENTS } from './knowledge-base.data';

async function seedKnowledge() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const documentService = app.get(DocumentService);

  console.log(`\n🌱 Seeding ${KNOWLEDGE_DOCUMENTS.length} knowledge documents...\n`);

  for (const doc of KNOWLEDGE_DOCUMENTS) {
    try {
      console.log(`📄 Creating: "${doc.title}" [${doc.category}]`);
      await documentService.createDocument(doc);
      console.log(`   ✅ Done`);
    } catch (error) {
      console.error(`   ❌ Failed: ${(error as Error).message}`);
    }
  }

  console.log('\n✅ Knowledge base seeding complete!\n');
  await app.close();
}

seedKnowledge().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
