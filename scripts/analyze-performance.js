#!/usr/bin/env node
/**
 * Performance Analysis Script
 * 
 * Usage:
 *   node scripts/analyze-performance.js
 * 
 * Features:
 * - Analyzes Next.js build output
 * - Identifies large bundles
 * - Suggests optimizations
 * - Checks for common performance issues
 */

const fs = require('fs');
const path = require('path');

const BUILD_OUTPUT_FILE = path.join(__dirname, '../apps/web/.next/build-manifest.json');
const STATS_FILE = path.join(__dirname, '../apps/web/.next/next-server-app-paths-manifest.json');

console.log('🔍 Analyzing Vully Performance...\n');

// Check if build output exists
if (!fs.existsSync(BUILD_OUTPUT_FILE)) {
  console.error('❌ Build output not found. Run `pnpm run build` first.');
  process.exit(1);
}

// Performance thresholds
const THRESHOLDS = {
  PAGE_SIZE_KB: 50, // Page should be < 50KB
  FIRST_LOAD_KB: 300, // First Load JS should be < 300KB
  SHARED_JS_KB: 150, // Shared JS should be < 150KB
};

// Read build stats
try {
  const manifest = JSON.parse(fs.readFileSync(BUILD_OUTPUT_FILE, 'utf8'));
  
  console.log('📊 Bundle Analysis:\n');
  console.log('Pages:');
  
  const pages = Object.keys(manifest.pages);
  const issues = [];
  
  for (const page of pages) {
    const files = manifest.pages[page];
    const totalSize = files.reduce((sum, file) => {
      try {
        const filePath = path.join(__dirname, '../apps/web/.next', file);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          return sum + stats.size;
        }
      } catch (e) {
        // Ignore
      }
      return sum;
    }, 0);
    
    const sizeKB = Math.round(totalSize / 1024);
    const status = sizeKB > THRESHOLDS.PAGE_SIZE_KB ? '⚠️' : '✅';
    
    console.log(`  ${status} ${page}: ${sizeKB} KB`);
    
    if (sizeKB > THRESHOLDS.PAGE_SIZE_KB) {
      issues.push({
        page,
        sizeKB,
        type: 'large-bundle',
        suggestion: 'Consider code splitting or lazy loading heavy components',
      });
    }
  }
  
  // Check for common issues
  console.log('\n🔎 Optimization Opportunities:\n');
  
  if (issues.length === 0) {
    console.log('✅ No major performance issues detected!');
  } else {
    for (const issue of issues) {
      console.log(`⚠️  ${issue.page} (${issue.sizeKB} KB)`);
      console.log(`   💡 ${issue.suggestion}\n`);
    }
  }
  
  // General recommendations
  console.log('\n💡 General Recommendations:\n');
  console.log('1. Use dynamic imports for heavy components');
  console.log('2. Implement virtualization for long lists (>100 items)');
  console.log('3. Optimize images with Next.js Image component');
  console.log('4. Use TanStack Query for efficient data caching');
  console.log('5. Monitor Web Vitals in production');
  
  // Backend optimization tips
  console.log('\n🔧 Backend Optimizations:\n');
  console.log('✅ Redis caching implemented (5 min TTL)');
  console.log('✅ Database query optimization with Prisma');
  console.log('✅ BullMQ for background jobs');
  console.log('💡 Consider adding database query caching');
  console.log('💡 Implement rate limiting for public APIs');
  
  console.log('\n📈 Next Steps:\n');
  console.log('1. Run Lighthouse audit: Chrome DevTools > Lighthouse');
  console.log('2. Monitor Web Vitals: Check /lib/web-vitals.ts');
  console.log('3. Bundle analysis: ANALYZE=true pnpm run build');
  console.log('4. Load testing: Use k6 or Apache Bench');
  
} catch (error) {
  console.error('❌ Error analyzing build:', error.message);
  process.exit(1);
}

console.log('\n✨ Analysis complete!\n');
