import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Bulk update apartment SVG element IDs
 * This script helps link apartments to SVG floor plan elements
 * 
 * Usage:
 *   npx tsx scripts/update-svg-ids.ts <buildingId> [pattern]
 * 
 * Examples:
 *   npx tsx scripts/update-svg-ids.ts abc-123 apt-{unit_number}
 *   npx tsx scripts/update-svg-ids.ts abc-123 unit_{unit_number}
 */

async function updateSvgElementIds(buildingId: string, pattern: string = 'apt-{unit_number}') {
  try {
    console.log(`📍 Updating SVG element IDs for buildings: ${buildingId}`);
    console.log(`🎨 Pattern: ${pattern}\n`);

    // Fetch all apartments for the building
    const apartments = await prisma.apartments.findMany({
      where: { buildingId },
      select: {
        id: true,
        unit_number: true,
        svgElementId: true,
      },
      orderBy: { unit_number: 'asc' },
    });

    if (apartments.length === 0) {
      console.log('❌ No apartments found for this building');
      return;
    }

    console.log(`Found ${apartments.length} apartments\n`);

    // Update each apartment
    let updated = 0;
    let skipped = 0;

    for (const apt of apartments) {
      // Generate SVG element ID from pattern
      const svgElementId = pattern.replace('{unit_number}', apt.unit_number);

      // Skip if already set to the same value
      if (apt.svgElementId === svgElementId) {
        console.log(`⏭️  ${apt.unit_number}: Already set to ${svgElementId}`);
        skipped++;
        continue;
      }

      // Update
      await prisma.apartments.update({
        where: { id: apt.id },
        data: { svgElementId },
      });

      console.log(`✅ ${apt.unit_number}: ${apt.svgElementId || 'NULL'} → ${svgElementId}`);
      updated++;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${apartments.length}`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
Usage: npx tsx scripts/update-svg-ids.ts <buildingId> [pattern]

Arguments:
  buildingId  - UUID of the building
  pattern     - SVG element ID pattern (default: apt-{unit_number})
                Use {unit_number} as placeholder for apartment unit number

Examples:
  npx tsx scripts/update-svg-ids.ts abc-123-def-456
  npx tsx scripts/update-svg-ids.ts abc-123-def-456 "unit_{unit_number}"
  npx tsx scripts/update-svg-ids.ts abc-123-def-456 "apt-{unit_number}"

Patterns:
  apt-{unit_number}    → apt-101, apt-102, apt-103
  unit_{unit_number}   → unit_101, unit_102, unit_103
  {unit_number}        → 101, 102, 103
  `);
  process.exit(0);
}

const [buildingId, pattern] = args;

updateSvgElementIds(buildingId, pattern);
