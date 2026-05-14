import type { AnalyzeRequest, RawReview } from '../shared/types';

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function parseCsv(content: string): string[][] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(splitCsvLine);
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function cell(row: string[], map: Map<string, number>, names: string[]): string {
  for (const name of names) {
    const index = map.get(name);
    if (index !== undefined) return row[index] ?? '';
  }
  return '';
}

export function parseImportedCsv(input: AnalyzeRequest): RawReview[] {
  if (!input.csvContent?.trim()) {
    throw new Error('CSV content is empty.');
  }

  const rows = parseCsv(input.csvContent);
  if (rows.length < 2) {
    throw new Error('CSV must include a header row and at least one data row.');
  }

  const headers = rows[0].map(normalizeHeader);
  const headerMap = new Map(headers.map((header, index) => [header, index]));

  const packageName = input.packageName.trim() || 'csv.imported.app';
  const defaultLanguage = input.languages[0] || 'en';
  const defaultRegion = input.regions[0] || 'us';

  return rows.slice(1).map((row, index) => {
    const reviewId =
      cell(row, headerMap, ['reviewid', 'id']) ||
      `${packageName}-csv-${index + 1}`;
    const title = cell(row, headerMap, ['title', 'headline']) || undefined;
    const content =
      cell(row, headerMap, ['content', 'text', 'review', 'reviewtext', 'body']) ||
      title ||
      '';
    const ratingValue = Number(cell(row, headerMap, ['rating', 'score', 'stars']) || '0');
    const date =
      cell(row, headerMap, ['date', 'reviewdate', 'createdat', 'time']) ||
      new Date().toISOString();
    const userName =
      cell(row, headerMap, ['username', 'user', 'author']) ||
      'Imported reviewer';
    const language =
      cell(row, headerMap, ['language', 'lang']) ||
      defaultLanguage;
    const country =
      cell(row, headerMap, ['country', 'region', 'market']) ||
      defaultRegion;

    return {
      sourceKey: `${packageName}:${reviewId}`,
      reviewId,
      packageName,
      language,
      country,
      userName,
      rating: Number.isFinite(ratingValue) ? ratingValue : 0,
      title,
      content,
      date: new Date(date).toISOString(),
      version: cell(row, headerMap, ['version', 'appversion']) || undefined,
      thumbsUp: Number(cell(row, headerMap, ['thumbsup', 'likes', 'helpful']) || '0'),
      url: cell(row, headerMap, ['url', 'link']) || undefined,
    };
  }).filter((review) => review.content.trim());
}
