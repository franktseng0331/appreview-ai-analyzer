import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config';
import type {
  AnalysisJob,
  AnalyzeRequest,
  AppInfo,
  JobStatus,
  RawReview,
  ReviewAnalysis,
} from '../shared/types';

fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });

export const db = new Database(config.databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS analysis_jobs (
    id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL DEFAULT 'google_play',
    source_name TEXT,
    package_name TEXT NOT NULL,
    languages_json TEXT NOT NULL,
    regions_json TEXT NOT NULL,
    requested_count INTEGER NOT NULL,
    interpretation_language TEXT NOT NULL DEFAULT 'zh',
    status TEXT NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    message TEXT NOT NULL DEFAULT '',
    review_count INTEGER NOT NULL DEFAULT 0,
    analyzed_count INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    app_info_json TEXT,
    summary_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reviews_raw (
    source_key TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    review_id TEXT NOT NULL,
    package_name TEXT NOT NULL,
    language TEXT NOT NULL,
    country TEXT NOT NULL,
    user_name TEXT NOT NULL,
    rating INTEGER NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    review_date TEXT NOT NULL,
    version TEXT,
    thumbs_up INTEGER,
    url TEXT,
    fetched_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reviews_analysis (
    source_key TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    sentiment TEXT NOT NULL,
    intent TEXT NOT NULL,
    topics_json TEXT NOT NULL,
    feature_requests_json TEXT NOT NULL,
    pain_points_json TEXT NOT NULL,
    competitor_mentions_json TEXT NOT NULL,
    summary TEXT NOT NULL,
    confidence REAL NOT NULL,
    raw_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS llm_calls (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    call_type TEXT NOT NULL,
    model TEXT NOT NULL,
    input_count INTEGER NOT NULL,
    raw_response TEXT,
    error TEXT,
    created_at TEXT NOT NULL
  );
`);

function ensureColumn(table: string, column: string, definition: string) {
  const existing = db
    .prepare(`PRAGMA table_info(${table})`)
    .all() as Array<{ name: string }>;

  if (existing.some((item) => item.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

ensureColumn('reviews_raw', 'combined_text', 'TEXT');
ensureColumn('reviews_raw', 'detected_language', 'TEXT');
ensureColumn('reviews_raw', 'translated_text', 'TEXT');
ensureColumn('reviews_raw', 'analysis_language', 'TEXT');
ensureColumn('reviews_raw', 'analysis_text', 'TEXT');
ensureColumn('reviews_analysis', 'strengths_json', `TEXT NOT NULL DEFAULT '[]'`);
ensureColumn('reviews_analysis', 'neutral_signals_json', `TEXT NOT NULL DEFAULT '[]'`);
ensureColumn('reviews_analysis', 'use_case_labels_json', `TEXT NOT NULL DEFAULT '[]'`);
ensureColumn('reviews_analysis', 'gain_suggestion', `TEXT NOT NULL DEFAULT ''`);
ensureColumn('analysis_jobs', 'interpretation_language', `TEXT NOT NULL DEFAULT 'zh'`);
ensureColumn('analysis_jobs', 'source_type', `TEXT NOT NULL DEFAULT 'google_play'`);
ensureColumn('analysis_jobs', 'source_name', 'TEXT');

function now() {
  return new Date().toISOString();
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapJob(row: any): AnalysisJob {
  return {
    id: row.id,
    sourceType: row.source_type ?? 'google_play',
    sourceName: row.source_name ?? null,
    packageName: row.package_name,
    languages: parseJson<string[]>(row.languages_json, []),
    regions: parseJson<string[]>(row.regions_json, []),
    count: row.requested_count,
    interpretationLanguage: row.interpretation_language,
    status: row.status as JobStatus,
    progress: row.progress,
    message: row.message,
    reviewCount: row.review_count,
    analyzedCount: row.analyzed_count,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createJob(input: AnalyzeRequest): AnalysisJob {
  const id = crypto.randomUUID();
  const timestamp = now();
  db.prepare(`
    INSERT INTO analysis_jobs (
      id, source_type, source_name, package_name, languages_json, regions_json, requested_count, interpretation_language,
      status, progress, message, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'queued', 0, ?, ?, ?)
  `).run(
    id,
    (input as AnalyzeRequest & { sourceType?: string }).sourceType || 'google_play',
    (input as AnalyzeRequest & { csvFileName?: string }).csvFileName || null,
    input.packageName,
    JSON.stringify(input.languages),
    JSON.stringify(input.regions),
    input.count,
    (input as AnalyzeRequest & { interpretationLanguage?: string }).interpretationLanguage || 'zh',
    'Waiting for the local analysis worker...',
    timestamp,
    timestamp,
  );
  return getJob(id)!;
}

export function getJob(id: string): AnalysisJob | null {
  const row = db.prepare('SELECT * FROM analysis_jobs WHERE id = ?').get(id);
  return row ? mapJob(row) : null;
}

export function listJobs(limit = 20): AnalysisJob[] {
  return db
    .prepare('SELECT * FROM analysis_jobs ORDER BY created_at DESC LIMIT ?')
    .all(limit)
    .map(mapJob);
}

export function listJobsByQuery(input: {
  limit: number;
  offset: number;
  status?: string;
  packageName?: string;
}): { jobs: AnalysisJob[]; total: number } {
  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (input.status === 'active') {
    conditions.push(`status NOT IN ('completed', 'failed', 'canceled')`);
  } else if (input.status === 'history') {
    conditions.push(`status IN ('completed', 'failed', 'canceled')`);
  } else if (input.status) {
    conditions.push('status = ?');
    params.push(input.status);
  }

  if (input.packageName) {
    conditions.push('package_name LIKE ?');
    params.push(`%${input.packageName}%`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const totalRow = db
    .prepare(`SELECT COUNT(*) as total FROM analysis_jobs ${whereClause}`)
    .get(...params) as { total: number };

  const rows = db
    .prepare(`SELECT * FROM analysis_jobs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, input.limit, input.offset);

  return {
    jobs: rows.map(mapJob),
    total: totalRow.total,
  };
}

export function updateJob(
  id: string,
  patch: Partial<Pick<AnalysisJob, 'status' | 'progress' | 'message' | 'reviewCount' | 'analyzedCount' | 'error'>>,
) {
  const current = getJob(id);
  if (!current) return;
  db.prepare(`
    UPDATE analysis_jobs
    SET status = ?, progress = ?, message = ?, review_count = ?, analyzed_count = ?, error = ?, updated_at = ?
    WHERE id = ?
  `).run(
    patch.status ?? current.status,
    patch.progress ?? current.progress,
    patch.message ?? current.message,
    patch.reviewCount ?? current.reviewCount,
    patch.analyzedCount ?? current.analyzedCount,
    patch.error === undefined ? current.error ?? null : patch.error,
    now(),
    id,
  );
}

export function saveAppInfo(jobId: string, appInfo: AppInfo | null) {
  db.prepare('UPDATE analysis_jobs SET app_info_json = ?, updated_at = ? WHERE id = ?').run(
    appInfo ? JSON.stringify(appInfo) : null,
    now(),
    jobId,
  );
}

export function getAppInfo(jobId: string): AppInfo | null {
  const row = db.prepare('SELECT app_info_json FROM analysis_jobs WHERE id = ?').get(jobId) as
    | { app_info_json?: string }
    | undefined;
  return parseJson<AppInfo | null>(row?.app_info_json, null);
}

export function saveSummary(jobId: string, summary: unknown) {
  db.prepare('UPDATE analysis_jobs SET summary_json = ?, updated_at = ? WHERE id = ?').run(
    JSON.stringify(summary),
    now(),
    jobId,
  );
}

export function getSummary<T>(jobId: string, fallback: T): T {
  const row = db.prepare('SELECT summary_json FROM analysis_jobs WHERE id = ?').get(jobId) as
    | { summary_json?: string }
    | undefined;
  return parseJson<T>(row?.summary_json, fallback);
}

const upsertReviewStatement = db.prepare(`
  INSERT INTO reviews_raw (
    source_key, job_id, review_id, package_name, language, country, user_name,
    rating, title, content, review_date, version, thumbs_up, url,
    combined_text, detected_language, translated_text, analysis_language, analysis_text, fetched_at
  ) VALUES (
    @sourceKey, @jobId, @reviewId, @packageName, @language, @country, @userName,
    @rating, @title, @content, @date, @version, @thumbsUp, @url,
    @combinedText, @detectedLanguage, @translatedText, @analysisLanguage, @analysisText, @fetchedAt
  )
  ON CONFLICT(source_key) DO UPDATE SET
    job_id = excluded.job_id,
    user_name = excluded.user_name,
    rating = excluded.rating,
    title = excluded.title,
    content = excluded.content,
    review_date = excluded.review_date,
    version = excluded.version,
    thumbs_up = excluded.thumbs_up,
    url = excluded.url,
    combined_text = excluded.combined_text,
    detected_language = excluded.detected_language,
    translated_text = excluded.translated_text,
    analysis_language = excluded.analysis_language,
    analysis_text = excluded.analysis_text,
    fetched_at = excluded.fetched_at
`);

export function upsertReviews(jobId: string, reviews: RawReview[]) {
  const insertMany = db.transaction((items: RawReview[]) => {
    for (const review of items) {
      upsertReviewStatement.run({
        ...review,
        jobId,
        fetchedAt: now(),
      });
    }
  });
  insertMany(reviews);
}

function mapRawReview(row: any): RawReview {
  return {
    sourceKey: row.source_key,
    reviewId: row.review_id,
    packageName: row.package_name,
    language: row.language,
    country: row.country,
    userName: row.user_name,
    rating: row.rating,
    title: row.title ?? undefined,
    content: row.content,
    date: row.review_date,
    version: row.version ?? undefined,
    thumbsUp: row.thumbs_up ?? undefined,
    url: row.url ?? undefined,
    combinedText: row.combined_text ?? undefined,
    detectedLanguage: row.detected_language ?? undefined,
    translatedText: row.translated_text ?? undefined,
    analysisLanguage: row.analysis_language ?? undefined,
    analysisText: row.analysis_text ?? undefined,
  };
}

export function getReviewsByJob(jobId: string): RawReview[] {
  return db
    .prepare('SELECT * FROM reviews_raw WHERE job_id = ? ORDER BY review_date DESC')
    .all(jobId)
    .map(mapRawReview);
}

const upsertAnalysisStatement = db.prepare(`
  INSERT INTO reviews_analysis (
    source_key, job_id, sentiment, intent, topics_json, strengths_json, feature_requests_json,
    pain_points_json, neutral_signals_json, use_case_labels_json, gain_suggestion,
    competitor_mentions_json, summary, confidence, raw_json, created_at
  ) VALUES (
    @sourceKey, @jobId, @sentiment, @intent, @topicsJson, @strengthsJson, @featureRequestsJson,
    @painPointsJson, @neutralSignalsJson, @useCaseLabelsJson, @gainSuggestion,
    @competitorMentionsJson, @summary, @confidence, @rawJson, @createdAt
  )
  ON CONFLICT(source_key) DO UPDATE SET
    job_id = excluded.job_id,
    sentiment = excluded.sentiment,
    intent = excluded.intent,
    topics_json = excluded.topics_json,
    strengths_json = excluded.strengths_json,
    feature_requests_json = excluded.feature_requests_json,
    pain_points_json = excluded.pain_points_json,
    neutral_signals_json = excluded.neutral_signals_json,
    use_case_labels_json = excluded.use_case_labels_json,
    gain_suggestion = excluded.gain_suggestion,
    competitor_mentions_json = excluded.competitor_mentions_json,
    summary = excluded.summary,
    confidence = excluded.confidence,
    raw_json = excluded.raw_json,
    created_at = excluded.created_at
`);

export function upsertReviewAnalyses(jobId: string, analyses: ReviewAnalysis[]) {
  const insertMany = db.transaction((items: ReviewAnalysis[]) => {
    for (const analysis of items) {
      upsertAnalysisStatement.run({
        sourceKey: analysis.sourceKey,
        jobId,
        sentiment: analysis.sentiment,
        intent: analysis.intent,
        topicsJson: JSON.stringify(analysis.topics),
        strengthsJson: JSON.stringify(analysis.strengths),
        featureRequestsJson: JSON.stringify(analysis.featureRequests),
        painPointsJson: JSON.stringify(analysis.painPoints),
        neutralSignalsJson: JSON.stringify(analysis.neutralSignals),
        useCaseLabelsJson: JSON.stringify(analysis.useCaseLabels),
        gainSuggestion: analysis.gainSuggestion,
        competitorMentionsJson: JSON.stringify(analysis.competitorMentions),
        summary: analysis.summary,
        confidence: analysis.confidence,
        rawJson: JSON.stringify(analysis),
        createdAt: now(),
      });
    }
  });
  insertMany(analyses);
}

function mapAnalysis(row: any): ReviewAnalysis {
  return {
    sourceKey: row.source_key,
    sentiment: row.sentiment,
    intent: row.intent,
    topics: parseJson<string[]>(row.topics_json, []),
    strengths: parseJson<string[]>(row.strengths_json, []),
    featureRequests: parseJson<string[]>(row.feature_requests_json, []),
    painPoints: parseJson<string[]>(row.pain_points_json, []),
    neutralSignals: parseJson<string[]>(row.neutral_signals_json, []),
    useCaseLabels: parseJson<string[]>(row.use_case_labels_json, []),
    gainSuggestion: row.gain_suggestion ?? '',
    competitorMentions: parseJson<string[]>(row.competitor_mentions_json, []),
    summary: row.summary,
    confidence: row.confidence,
  };
}

export function getAnalysesByJob(jobId: string): ReviewAnalysis[] {
  return db
    .prepare('SELECT * FROM reviews_analysis WHERE job_id = ?')
    .all(jobId)
    .map(mapAnalysis);
}

export function recordLlmCall(input: {
  jobId: string;
  callType: string;
  model: string;
  inputCount: number;
  rawResponse?: string;
  error?: string;
}) {
  db.prepare(`
    INSERT INTO llm_calls (id, job_id, call_type, model, input_count, raw_response, error, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    input.jobId,
    input.callType,
    input.model,
    input.inputCount,
    input.rawResponse ?? null,
    input.error ?? null,
    now(),
  );
}
