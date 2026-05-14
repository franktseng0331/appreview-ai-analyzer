import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 8787),
  host: process.env.HOST || '127.0.0.1',
  databasePath: process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data', 'appreview.sqlite'),
  insightDictionaryPath: process.env.INSIGHT_DICTIONARY_PATH || path.resolve(process.cwd(), 'config', 'insight-dictionaries.json'),
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
  deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  deepseekFastModel: process.env.DEEPSEEK_MODEL_FAST || 'deepseek-v4-flash',
  deepseekReportModel: process.env.DEEPSEEK_MODEL_REPORT || 'deepseek-v4-pro',
  googlePlayHttpProxy: process.env.GOOGLE_PLAY_HTTP_PROXY || process.env.HTTP_PROXY || '',
  googlePlayHttpsProxy: process.env.GOOGLE_PLAY_HTTPS_PROXY || process.env.HTTPS_PROXY || '',
  llmBatchSize: Number(process.env.LLM_BATCH_SIZE || 24),
  llmConcurrency: Number(process.env.LLM_CONCURRENCY || 2),
  fetchTimeoutMs: Number(process.env.FETCH_TIMEOUT_MS || 20000),
  fetchRetryCount: Number(process.env.FETCH_RETRY_COUNT || 2),
  fetchStageBudgetMs: Number(process.env.FETCH_STAGE_BUDGET_MS || 180000),
  googlePlayConnectivityTimeoutMs: Number(process.env.GOOGLE_PLAY_CONNECTIVITY_TIMEOUT_MS || 5000),
  minimumViableReviewCount: Number(process.env.MINIMUM_VIABLE_REVIEW_COUNT || 50),
};
