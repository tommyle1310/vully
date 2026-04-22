import { readFileSync, writeFileSync } from 'node:fs';

interface OpenApiDoc {
  info?: { title?: string; version?: string };
  paths?: Record<string, Record<string, { tags?: string[]; summary?: string }>>;
}

function normalizeTag(path: string, fallback?: string): string {
  if (fallback && fallback.length > 0) {
    return fallback.toLowerCase();
  }

  const firstSegment = path.split('/').filter(Boolean)[0] ?? 'misc';
  return firstSegment.toLowerCase();
}

function generateMarkdown(doc: OpenApiDoc): string {
  const groups = new Map<string, Array<{ method: string; path: string; summary: string }>>();

  for (const [path, methods] of Object.entries(doc.paths ?? {})) {
    for (const [method, operation] of Object.entries(methods)) {
      const tag = normalizeTag(path, operation.tags?.[0]);
      const current = groups.get(tag) ?? [];
      current.push({
        method: method.toUpperCase(),
        path,
        summary: operation.summary ?? '',
      });
      groups.set(tag, current);
    }
  }

  const lines: string[] = [];
  lines.push(`# API Contracts (Generated Baseline)`);
  lines.push('');
  lines.push(`Source: Swagger JSON`);
  lines.push(`Title: ${doc.info?.title ?? 'unknown'}`);
  lines.push(`Version: ${doc.info?.version ?? 'unknown'}`);
  lines.push('');

  const sortedTags = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));

  for (const tag of sortedTags) {
    lines.push(`## ${tag}`);
    lines.push('');
    lines.push('| Method | Path | Summary |');
    lines.push('|---|---|---|');

    const routes = (groups.get(tag) ?? []).sort((a, b) => {
      if (a.path === b.path) {
        return a.method.localeCompare(b.method);
      }
      return a.path.localeCompare(b.path);
    });

    for (const route of routes) {
      lines.push(`| ${route.method} | ${route.path} | ${route.summary} |`);
    }

    lines.push('');
  }

  lines.push('## Notes');
  lines.push('');
  lines.push('- This file is generated as a baseline and should be curated for role scopes and business constraints.');
  lines.push('- Regenerate whenever route signatures change.');
  lines.push('');

  return lines.join('\n');
}

function main(): void {
  const inputPath = process.argv[2] ?? 'docs/swagger.json';
  const outputPath = process.argv[3] ?? 'docs/api-contracts.generated.md';

  const raw = readFileSync(inputPath, 'utf8');
  const parsed = JSON.parse(raw) as OpenApiDoc;
  const markdown = generateMarkdown(parsed);

  writeFileSync(outputPath, markdown, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`Generated ${outputPath} from ${inputPath}`);
}

main();
