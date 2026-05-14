import PQueue from 'p-queue';
import { config } from './config';
import {
  createJob,
  getAnalysesByJob,
  getAppInfo,
  getJob,
  getReviewsByJob,
  getSummary,
  listJobs,
  listJobsByQuery,
  saveAppInfo,
  saveSummary,
  updateJob,
  upsertReviewAnalyses,
  upsertReviews,
} from './db';
import { analyzeReviewBatch, translateReviewBatch } from './deepseek';
import { parseImportedCsv } from './csvImport';
import { applyTranslations, dedupeReviews, enrichReviews } from './enrichment';
import { fetchAppInfo, fetchReviews, verifyGooglePlayConnectivity } from './googlePlay';
import { buildReportData } from './report';
import { normalizePackageNameInput } from '../shared/packageName';
import type { AnalysisJob, AnalyzeRequest, AnalysisReportData, JobsQuery, RawReview } from '../shared/types';

const jobQueue = new PQueue({ concurrency: 1 });
const canceledJobs = new Set<string>();

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function normalizeInput(input: AnalyzeRequest): AnalyzeRequest {
  return {
    sourceType: input.sourceType || 'google_play',
    packageName: normalizePackageNameInput(input.packageName),
    languages: [...new Set((input.languages || []).map((item) => item.trim()).filter(Boolean))],
    regions: [...new Set((input.regions || []).map((item) => item.trim().toLowerCase()).filter(Boolean))],
    count: Math.min(5000, Math.max(1, Number(input.count || 100))),
    interpretationLanguage: input.interpretationLanguage || 'zh',
    csvContent: input.csvContent,
    csvFileName: input.csvFileName,
  };
}

function summaryCacheKey(input: AnalyzeRequest) {
  return JSON.stringify({
    packageName: input.packageName,
    languages: [...input.languages].sort(),
    regions: [...input.regions].sort(),
    count: input.count,
  });
}

export function startAnalysis(input: AnalyzeRequest): AnalysisJob {
  const normalized = normalizeInput(input);
  if (!normalized.packageName) {
    throw new Error('Package name is required.');
  }

  const job = createJob(normalized);
  jobQueue.add(() => runAnalysis(job.id)).catch((error) => {
    updateJob(job.id, {
      status: 'failed',
      progress: 100,
      message: 'Analysis failed.',
      error: error instanceof Error ? error.message : 'Unknown analysis error',
    });
  });
  return job;
}

export function readJob(jobId: string): AnalysisJob | null {
  return getJob(jobId);
}

export function readRecentJobs(limit = 20): AnalysisJob[] {
  return listJobs(limit);
}

export function readJobsByQuery(query: JobsQuery) {
  return listJobsByQuery({
    limit: query.limit || 20,
    offset: query.offset || 0,
    status: query.status,
    packageName: query.packageName,
  });
}

export function cancelJob(jobId: string): AnalysisJob | null {
  const job = getJob(jobId);
  if (!job) return null;
  if (job.status === 'completed' || job.status === 'failed' || job.status === 'canceled') {
    return job;
  }

  canceledJobs.add(jobId);
  updateJob(jobId, {
    status: 'canceled',
    progress: 100,
    message: 'Analysis canceled by user.',
    error: null,
  });

  return getJob(jobId);
}

export function retryJob(jobId: string): AnalysisJob | null {
  const job = getJob(jobId);
  if (!job) return null;

  return startAnalysis({
    packageName: job.packageName,
    languages: job.languages,
    regions: job.regions,
    count: job.count,
    interpretationLanguage: job.interpretationLanguage,
  });
}

export async function readReport(jobId: string): Promise<AnalysisReportData | null> {
  const job = getJob(jobId);
  if (!job || job.status !== 'completed') return null;

  const cached = getSummary<{ reportData?: AnalysisReportData }>(jobId, {});
  if (cached.reportData) {
    return {
      ...cached.reportData,
      job,
    };
  }

  const reviews = getReviewsByJob(jobId);
  const analyses = getAnalysesByJob(jobId);
  return buildReportData({
    job,
    app: getAppInfo(jobId),
    reviews,
    analyses,
  });
}

async function runAnalysis(jobId: string) {
  const job = getJob(jobId);
  if (!job) throw new Error(`Job ${jobId} not found.`);

  const assertNotCanceled = () => {
    if (canceledJobs.has(jobId)) {
      canceledJobs.delete(jobId);
      throw new Error('Analysis canceled by user.');
    }
  };

  const input: AnalyzeRequest = {
    sourceType: job.sourceType,
    packageName: job.packageName,
    languages: job.languages,
    regions: job.regions,
    count: job.count,
    interpretationLanguage: job.interpretationLanguage,
  };

  let reviews: RawReview[] = [];
  let fetchAttemptSummary = '';

  if (input.sourceType === 'csv_import') {
    updateJob(jobId, {
      status: 'fetching',
      progress: 8,
      message: `Parsing imported CSV${job.sourceName ? ` (${job.sourceName})` : ''}...`,
    });
    reviews = parseImportedCsv(input);
    fetchAttemptSummary = `csv_import:${job.sourceName || 'manual upload'}:${reviews.length}`;
    saveAppInfo(jobId, null);
  } else {
    updateJob(jobId, {
      status: 'fetching',
      progress: 5,
      message: `Looking up ${input.packageName} on Google Play...`,
    });
    assertNotCanceled();

    updateJob(jobId, {
      status: 'fetching',
      progress: 6,
      message: 'Checking Google Play connectivity from the current environment...',
    });
    await verifyGooglePlayConnectivity();
    assertNotCanceled();

    const appInfo = await fetchAppInfo(input);
    saveAppInfo(jobId, appInfo);
    assertNotCanceled();

    const fetchResult = await fetchReviews(input, (message) => {
      const matched = message.match(/Current unique reviews: (\\d+)/);
      const currentUniqueReviews = matched ? Number(matched[1]) : 0;
      const progress = Math.min(
        17,
        Math.max(10, 10 + Math.round((Math.min(currentUniqueReviews, input.count) / Math.max(1, input.count)) * 7)),
      );
      updateJob(jobId, {
        status: 'fetching',
        progress,
        message,
        reviewCount: currentUniqueReviews,
      });
    });
    reviews = fetchResult.reviews;
    fetchAttemptSummary = fetchResult.attempts
      .map((item) => `${item.stage}:${item.language}/${item.country}:${item.status}${item.errorCategory ? `(${item.errorCategory})` : ''}`)
      .join('; ');
  }
  assertNotCanceled();

  if (!reviews.length) {
    throw new Error(
      input.sourceType === 'csv_import'
        ? 'No reviews were parsed from the uploaded CSV. Check that the file contains a header row and review content columns.'
        : 'No Google Play reviews were fetched. Check the package name, countries, app availability, or upstream endpoint stability.',
    );
  }

  if (reviews.length < config.minimumViableReviewCount) {
    updateJob(jobId, {
      status: 'fetching',
      progress: 14,
      reviewCount: reviews.length,
      message: `Only ${reviews.length}/${input.count} unique reviews were fetched after retries across the user-selected combinations. Continuing with reduced sample coverage... ${fetchAttemptSummary}`,
    });
  }

  updateJob(jobId, {
    status: 'enriching',
    progress: 18,
    reviewCount: reviews.length,
    message: `Fetched ${reviews.length} reviews. Cleaning, deduplicating, and enriching review text...`,
  });
  assertNotCanceled();

  const { deduped: dedupedReviews, removedCount } = dedupeReviews(reviews);
  const enrichedReviews = enrichReviews(dedupedReviews);
  upsertReviews(jobId, enrichedReviews);
  assertNotCanceled();

  updateJob(jobId, {
    status: 'enriching',
    progress: 20,
    reviewCount: enrichedReviews.length,
    message:
      removedCount > 0
        ? `Removed ${removedCount} duplicate reviews. Prepared ${enrichedReviews.length} unique reviews for translation...`
        : `No duplicate reviews detected. Prepared ${enrichedReviews.length} unique reviews for translation...`,
  });
  assertNotCanceled();

  updateJob(jobId, {
    status: 'translating',
    progress: 22,
    reviewCount: enrichedReviews.length,
    message: `Detected review languages. Translating non-English reviews into English for unified analysis...`,
  });
  const translationChunks = chunk(enrichedReviews, config.llmBatchSize);
  const translatedReviewMap = new Map<string, RawReview>();

  for (let index = 0; index < translationChunks.length; index += config.llmConcurrency) {
    assertNotCanceled();
    const activeChunks = translationChunks.slice(index, index + config.llmConcurrency);
    const translatedBatchResults = await Promise.all(
      activeChunks.map((items) => translateReviewBatch(jobId, items)),
    );

    for (let batchIndex = 0; batchIndex < translatedBatchResults.length; batchIndex += 1) {
      const batchTranslations = translatedBatchResults[batchIndex];
      const translatedReviews = applyTranslations(
        activeChunks[batchIndex] || [],
        batchTranslations,
      );
      for (const translatedReview of translatedReviews) {
        translatedReviewMap.set(translatedReview.sourceKey, translatedReview);
      }
    }

    const translatedCount = translatedReviewMap.size;
    const progress = Math.min(24, 18 + Math.round((translatedCount / enrichedReviews.length) * 6));
    updateJob(jobId, {
      status: 'translating',
      progress,
      reviewCount: enrichedReviews.length,
      message: `Prepared English analysis text for ${translatedCount}/${enrichedReviews.length} reviews...`,
    });
  }

  const translatedReviews = enrichedReviews.map((review) => translatedReviewMap.get(review.sourceKey) || review);
  upsertReviews(jobId, translatedReviews);

  updateJob(jobId, {
    status: 'analyzing',
    progress: 25,
    reviewCount: translatedReviews.length,
    message: `Prepared ${translatedReviews.length} translated reviews. Starting DeepSeek classification...`,
  });

  const reviewChunks = chunk(translatedReviews, config.llmBatchSize);
  let analyzed = 0;

  for (let index = 0; index < reviewChunks.length; index += config.llmConcurrency) {
    assertNotCanceled();
    const activeChunks = reviewChunks.slice(index, index + config.llmConcurrency);
    const batchResults = await Promise.all(
      activeChunks.map((items) => analyzeReviewBatch(jobId, items)),
    );

    for (const analyses of batchResults) {
      upsertReviewAnalyses(jobId, analyses);
      analyzed += analyses.length;
    }

    const progress = Math.min(84, 25 + Math.round((analyzed / translatedReviews.length) * 58));
    updateJob(jobId, {
      status: 'analyzing',
      progress,
      analyzedCount: analyzed,
      message: `DeepSeek classified ${analyzed}/${translatedReviews.length} translated reviews...`,
    });
  }

  updateJob(jobId, {
    status: 'summarizing',
    progress: 88,
    analyzedCount: analyzed,
    message: 'Building aggregate charts and strategic insights...',
  });
  assertNotCanceled();

  const latestJob = getJob(jobId)!;
  const report = await buildReportData({
    job: latestJob,
    app: getAppInfo(jobId),
    reviews: getReviewsByJob(jobId) as RawReview[],
    analyses: getAnalysesByJob(jobId),
  });

  saveSummary(jobId, {
    inputSignature: summaryCacheKey(input),
    generatedAt: new Date().toISOString(),
    totalReviews: report.reviews.length,
    topTopics: report.topicData.slice(0, 5),
    reportData: {
      ...report,
      job: getJob(jobId)!,
    },
  });

  updateJob(jobId, {
    status: 'completed',
    progress: 100,
    message: 'Analysis completed.',
    reviewCount: report.reviews.length,
    analyzedCount: report.reviews.length,
    error: null,
  });
  canceledJobs.delete(jobId);
}
