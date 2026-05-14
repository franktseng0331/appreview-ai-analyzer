import gplay from 'google-play-scraper';
import got from 'got';
import { config } from './config';
import { buildGooglePlayRequestOptions } from './googlePlayProxy';
import type { AnalyzeRequest, AppInfo, RawReview } from '../shared/types';

export interface FetchAttemptDetail {
  language: string;
  country: string;
  stage: 'selected';
  strategy: 'paged_newest' | 'paged_helpfulness';
  attemptCount: number;
  fetchedCount: number;
  uniqueTotalAfter: number;
  status: 'success' | 'empty' | 'partial' | 'failed';
  errorCategory?: string;
  errorMessage?: string;
}

export interface FetchReviewsResult {
  reviews: RawReview[];
  attempts: FetchAttemptDetail[];
}

export async function verifyGooglePlayConnectivity(): Promise<void> {
  try {
    const response = await got('https://play.google.com/store/apps', {
      method: 'HEAD',
      followRedirect: true,
      timeout: {
        request: config.googlePlayConnectivityTimeoutMs,
      },
      ...(buildGooglePlayRequestOptions() || {}),
    });

    if (response.statusCode >= 400) {
      throw new Error(`Google Play connectivity probe returned HTTP ${response.statusCode}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Google Play is not reachable from this environment right now: ${message}`);
  }
}

function toIsoDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function cleanText(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)),
  ]);
}

function normalizeLanguage(language: string): string {
  const normalized = language.trim();
  if (normalized === 'zh') return 'zh-CN';
  return normalized;
}

function classifyFetchError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes('timed out')) return 'fetch_timeout';
  if (lower.includes('404') || lower.includes('not found')) return 'app_not_found';
  if (lower.includes('econnreset') || lower.includes('socket') || lower.includes('network')) return 'network_error';
  return 'unknown_fetch_error';
}

function resolveSort(strategy: FetchAttemptDetail['strategy']) {
  return strategy === 'paged_helpfulness'
    ? (gplay.sort as any).HELPFULNESS
    : (gplay.sort as any).NEWEST;
}

async function fetchReviewPageForCombo(
  input: AnalyzeRequest,
  combo: { language: string; country: string },
  strategy: FetchAttemptDetail['strategy'],
  nextPaginationToken?: string | null,
): Promise<Awaited<ReturnType<typeof gplay.reviews>>> {
  return withTimeout(
    gplay.reviews({
      appId: input.packageName,
      lang: normalizeLanguage(combo.language),
      country: combo.country,
      sort: resolveSort(strategy),
      paginate: true,
      nextPaginationToken: nextPaginationToken ?? undefined,
      requestOptions: buildGooglePlayRequestOptions(),
    } as any),
    config.fetchTimeoutMs,
  );
}

export async function fetchAppInfo(input: AnalyzeRequest): Promise<AppInfo | null> {
  const language = input.languages[0] || 'en';
  const country = input.regions[0] || 'us';

  try {
    const app = await gplay.app({
      appId: input.packageName,
      lang: language,
      country,
      requestOptions: buildGooglePlayRequestOptions(),
    } as any);

    return {
      appId: app.appId,
      title: app.title,
      developer: app.developer,
      icon: app.icon,
      score: app.score,
      ratings: app.ratings,
      reviews: app.reviews,
      installs: app.installs,
      genre: app.genre,
      version: app.version,
      updated: app.updated,
      url: app.url,
    };
  } catch {
    return null;
  }
}

export async function fetchReviews(
  input: AnalyzeRequest,
  onProgress?: (message: string) => void,
): Promise<FetchReviewsResult> {
  const languages = input.languages.length ? input.languages : ['en'];
  const regions = input.regions.length ? input.regions : ['us'];
  const combos = languages.flatMap((language) => regions.map((country) => ({ language, country })));
  const deduped = new Map<string, RawReview>();
  const exhaustedCombos = new Set<string>();
  const failureCategories = new Set<string>();
  const attempts: FetchAttemptDetail[] = [];
  const startedAt = Date.now();
  const totalPlannedCombos = combos.length;
  const maxPagesPerCombo = 4;

  const runCombo = async (
    combo: { language: string; country: string },
    stage: 'selected',
    comboIndex: number,
    comboTotal: number,
  ) => {
    if (deduped.size >= input.count) return;
    const comboKey = `${combo.language}:${combo.country}`;
    if (exhaustedCombos.has(comboKey)) return;
    if (Date.now() - startedAt > config.fetchStageBudgetMs) {
      onProgress?.(`Fetch budget reached after trying ${attempts.length}/${totalPlannedCombos} combinations. Continuing with ${deduped.size} unique reviews.`);
      return;
    }

    const remaining = Math.max(1, input.count - deduped.size);
    const strategies: FetchAttemptDetail['strategy'][] = ['paged_newest', 'paged_helpfulness'];

    for (const strategy of strategies) {
      let nextPaginationToken: string | null | undefined = null;
      let pagesFetched = 0;
      let pageFetchCount = 0;
      let hadAnyUniqueGain = false;
      let lastError: unknown = null;

      while (pagesFetched < maxPagesPerCombo && deduped.size < input.count && Date.now() - startedAt <= config.fetchStageBudgetMs) {
        onProgress?.(
          `[${comboIndex}/${comboTotal}] Fetching page ${pagesFetched + 1}/${maxPagesPerCombo} from ${combo.country.toUpperCase()} / ${combo.language} via ${strategy}. Current unique reviews: ${deduped.size}.`,
        );

        let pageResult: Awaited<ReturnType<typeof gplay.reviews>> | null = null;
        for (let attempt = 1; attempt <= config.fetchRetryCount + 1; attempt += 1) {
          try {
            pageResult = await fetchReviewPageForCombo(input, combo, strategy, nextPaginationToken);
            break;
          } catch (error) {
            lastError = error;
            failureCategories.add(classifyFetchError(error));
            if (attempt <= config.fetchRetryCount) {
              onProgress?.(
                `[${comboIndex}/${comboTotal}] Retrying page ${pagesFetched + 1} for ${combo.country.toUpperCase()} / ${combo.language} via ${strategy} (${attempt}/${config.fetchRetryCount}). Current unique reviews: ${deduped.size}.`,
              );
            }
          }
        }

        if (!pageResult) {
          break;
        }

        const before = deduped.size;
        for (const item of pageResult.data) {
          const content = cleanText(item.text);
          if (!content) continue;

          const reviewId = String(item.id);
          const sourceKey = `${input.packageName}:${reviewId}`;
          const nextReview: RawReview = {
            sourceKey,
            reviewId: item.id,
            packageName: input.packageName,
            language: combo.language,
            country: combo.country,
            userName: cleanText(item.userName) || 'Anonymous',
            rating: Number(item.score || 0),
            title: cleanText(item.title) || undefined,
            content,
            date: toIsoDate(item.date),
            version: cleanText(item.version) || undefined,
            thumbsUp: Number(item.thumbsUp || 0),
            url: item.url,
          };

          const existing = deduped.get(sourceKey);
          if (existing) {
            const existingContentLength = existing.content.length;
            const nextContentLength = nextReview.content.length;
            const preferred =
              nextContentLength > existingContentLength
                ? nextReview
                : existing;

            deduped.set(sourceKey, {
              ...preferred,
              sourceKey,
              reviewId,
            });
            continue;
          }

          deduped.set(sourceKey, nextReview);
          if (deduped.size >= input.count) break;
        }

        const addedCount = deduped.size - before;
        if (addedCount > 0) hadAnyUniqueGain = true;
        pageFetchCount += pageResult.data.length;
        pagesFetched += 1;
        nextPaginationToken = pageResult.nextPaginationToken ?? null;

        if (!pageResult.data.length || !nextPaginationToken) {
          break;
        }
      }

      if (pagesFetched > 0 || hadAnyUniqueGain) {
        attempts.push({
          language: combo.language,
          country: combo.country,
          stage,
          strategy,
          attemptCount: pagesFetched,
          fetchedCount: pageFetchCount,
          uniqueTotalAfter: deduped.size,
          status: hadAnyUniqueGain ? 'success' : 'empty',
        });

        if (hadAnyUniqueGain || deduped.size >= input.count) {
          exhaustedCombos.add(comboKey);
          return;
        }
      } else if (lastError) {
        const reason = lastError instanceof Error ? lastError.message : 'Unknown fetch error';
        attempts.push({
          language: combo.language,
          country: combo.country,
          stage,
          strategy,
          attemptCount: config.fetchRetryCount + 1,
          fetchedCount: 0,
          uniqueTotalAfter: deduped.size,
          status: 'failed',
          errorCategory: classifyFetchError(lastError),
          errorMessage: reason,
        });
      }
    }

    exhaustedCombos.add(comboKey);
  };

  for (let index = 0; index < combos.length; index += 1) {
    if (Date.now() - startedAt > config.fetchStageBudgetMs) break;
    await runCombo(combos[index], 'selected', index + 1, totalPlannedCombos);
  }

  if (!deduped.size) {
    const categories = [...failureCategories];
    if (categories.includes('app_not_found')) {
      throw new Error('No Google Play reviews were fetched because the app or selected market could not be found.');
    }
    if (categories.includes('fetch_timeout') || categories.includes('network_error')) {
      throw new Error(`No Google Play reviews were fetched because upstream review endpoints timed out or failed across all user-selected combinations. Attempts: ${attempts.map((item) => `${item.stage}:${item.language}/${item.country}:${item.status}${item.errorCategory ? `(${item.errorCategory})` : ''}`).join('; ')}`);
    }
    throw new Error(`No Google Play reviews were fetched from the user-selected language/region combinations. Attempts: ${attempts.map((item) => `${item.stage}:${item.language}/${item.country}:${item.status}`).join('; ')}`);
  }

  return {
    reviews: [...deduped.values()].slice(0, input.count),
    attempts,
  };
}
