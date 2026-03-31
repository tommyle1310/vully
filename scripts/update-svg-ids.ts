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
 *   npx tsx scripts/update-svg-ids.ts abc-123 apt-{unitNumber}
 *   npx tsx scripts/update-svg-ids.ts abc-123 unit_{unitNumber}
 */

async function updateSvgElementIds(buildingId: string, pattern: string = 'apt-{unitNumber}') {
  try {
    console.log(`📍 Updating SVG element IDs for building: ${buildingId}`);
    console.log(`🎨 Pattern: ${pattern}\n`);

    // Fetch all apartments for the building
    const apartments = await prisma.apartment.findMany({
      where: { buildingId },
      select: {
        id: true,
        unitNumber: true,
        svgElementId: true,
      },
      orderBy: { unitNumber: 'asc' },
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
      const svgElementId = pattern.replace('{unitNumber}', apt.unitNumber);

      // Skip if already set to the same value
      if (apt.svgElementId === svgElementId) {
        console.log(`⏭️  ${apt.unitNumber}: Already set to ${svgElementId}`);
        skipped++;
        continue;
      }

      // Update
      await prisma.apartment.update({
        where: { id: apt.id },
        data: { svgElementId },
      });

      console.log(`✅ ${apt.unitNumber}: ${apt.svgElementId || 'NULL'} → ${svgElementId}`);
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
  pattern     - SVG element ID pattern (default: apt-{unitNumber})
                Use {unitNumber} as placeholder for apartment unit number

Examples:
  npx tsx scripts/update-svg-ids.ts abc-123-def-456
  npx tsx scripts/update-svg-ids.ts abc-123-def-456 "unit_{unitNumber}"
  npx tsx scripts/update-svg-ids.ts abc-123-def-456 "apt-{unitNumber}"

Patterns:
  apt-{unitNumber}    → apt-101, apt-102, apt-103
  unit_{unitNumber}   → unit_101, unit_102, unit_103
  {unitNumber}        → 101, 102, 103
  `);
  process.exit(0);
}

const [buildingId, pattern] = args;

updateSvgElementIds(buildingId, pattern);
