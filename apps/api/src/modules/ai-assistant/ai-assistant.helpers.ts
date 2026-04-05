// =============================================================================
// Pure formatting helpers for AI assistant responses
// =============================================================================

export function parseContextData(context: string) {
  const lines = context.split('\n');
  let totalMatching = 0;
  let buildingName = '';
  let vacantCount = 0;
  const apartments: string[] = [];
  let bedroomSummary: Record<string, number> = {};

  for (const line of lines) {
    const buildingMatch = line.match(/^Building:\s*(.+)$/);
    if (buildingMatch && !buildingName) buildingName = buildingMatch[1].trim();

    const totalMatch = line.match(/Total matching apartments:\s*(\d+)/);
    if (totalMatch) totalMatching = parseInt(totalMatch[1], 10);

    const vacantMatch = line.match(/Vacant:\s*(\d+)/);
    if (vacantMatch) vacantCount = parseInt(vacantMatch[1], 10);

    const unitMatch = line.match(/^\s*-\s*Unit\s+(\w+):\s*(.+)$/);
    if (unitMatch) apartments.push(`• **Unit ${unitMatch[1]}** - ${unitMatch[2]}`);

    const bedroomSummaryMatch = line.match(/Summary by bedroom count:\s*(\{.+\})/);
    if (bedroomSummaryMatch) {
      try { bedroomSummary = JSON.parse(bedroomSummaryMatch[1]); } catch { /* ignore */ }
    }
  }

  return { totalMatching, buildingName, vacantCount, apartments, bedroomSummary };
}

export function formatApartmentSection(
  data: ReturnType<typeof parseContextData>,
  query: string,
): string {
  const isCountQuery = query.toLowerCase().includes('how many') || query.toLowerCase().includes('bao nhiêu');
  let markdown = '';

  if (isCountQuery) {
    markdown = `**${data.totalMatching}** apartments found`;
    if (data.buildingName) markdown += ` in **${data.buildingName}**`;
    markdown += '.\n\n';

    if (Object.keys(data.bedroomSummary).length > 0) {
      const summaryParts = Object.entries(data.bedroomSummary).map(([k, v]) => `${v} ${k}`);
      markdown += `📊 **Summary:** ${summaryParts.join(', ')}\n\n`;
    }

    if (data.apartments.length > 0) {
      markdown += `**Sample units:**\n`;
      markdown += data.apartments.slice(0, 5).join('\n');
      if (data.apartments.length > 5) {
        markdown += `\n\n_...and ${data.apartments.length - 5} more units available._`;
      }
    }
  } else {
    markdown = `Found **${data.totalMatching}** matching apartments`;
    if (data.buildingName) markdown += ` in **${data.buildingName}**`;
    markdown += ':\n\n';

    if (data.apartments.length > 0) {
      markdown += data.apartments.slice(0, 10).join('\n');
      if (data.apartments.length > 10) {
        markdown += `\n\n_...and ${data.apartments.length - 10} more units._`;
      }
    }
  }

  return markdown;
}

export function formatBuildingSection(context: string, buildingName: string, vacantCount: number): string {
  const addressMatch = context.match(/Address:\s*(.+)/);
  const floorsMatch = context.match(/Floors:\s*(\d+)/);
  const totalAptMatch = context.match(/Total apartments:\s*(\d+)/);

  let markdown = `## ${buildingName || 'Building Information'}\n\n`;
  if (addressMatch) markdown += `📍 **Address:** ${addressMatch[1].trim()}\n`;
  if (floorsMatch) markdown += `🏢 **Floors:** ${floorsMatch[1]}\n`;
  if (totalAptMatch) markdown += `🏠 **Total apartments:** ${totalAptMatch[1]}\n`;
  if (vacantCount > 0) markdown += `✅ **Available:** ${vacantCount}\n`;
  return markdown;
}

export function formatDatabaseContextAsMarkdown(context: string, query: string): string {
  const data = parseContextData(context);

  if (data.totalMatching > 0) {
    return formatApartmentSection(data, query).trim();
  }

  if (context.includes('Building Information')) {
    return formatBuildingSection(context, data.buildingName, data.vacantCount).trim();
  }

  if (context.includes('No apartments found')) {
    return '❌ No apartments found matching your criteria. Try adjusting your search filters.';
  }

  return context
    .replace(/=== (.+) ===/g, '## $1')
    .replace(/Filters applied: \{[^}]+\}\n?/g, '')
    .replace(/Summary by unit type: \{[^}]+\}\n?/g, '')
    .replace(/Summary by bedroom count: \{[^}]+\}\n?/g, '')
    .trim();
}
