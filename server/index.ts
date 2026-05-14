import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { config } from './config';
import { cancelJob, readJob, readJobsByQuery, readRecentJobs, readReport, retryJob, startAnalysis } from './jobs';
import { applySystemProxyEnvironment } from './proxy';

const analyzeSchema = z.object({
  sourceType: z.enum(['google_play', 'csv_import']).default('google_play'),
  packageName: z.string().min(1),
  languages: z.array(z.string()).default(['en']),
  regions: z.array(z.string()).default(['us']),
  count: z.number().int().min(1).max(5000).default(100),
  interpretationLanguage: z.enum(['zh', 'en']).default('zh'),
  csvContent: z.string().optional(),
  csvFileName: z.string().optional(),
});

const listJobsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  status: z
    .enum(['queued', 'fetching', 'enriching', 'translating', 'analyzing', 'summarizing', 'completed', 'failed', 'canceled', 'active', 'history'])
    .optional(),
  packageName: z.string().trim().optional(),
});

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

applySystemProxyEnvironment();

await app.register(cors, {
  origin: true,
});

app.get('/api/health', async () => ({
  ok: true,
  database: config.databasePath,
  deepseekConfigured: Boolean(config.deepseekApiKey),
}));

app.post('/api/analyze/start', async (request, reply) => {
  const parsed = analyzeSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      error: 'Invalid analysis request.',
      details: parsed.error.flatten(),
    });
  }

  const job = startAnalysis(parsed.data);
  return reply.status(202).send({ job });
});

app.get('/api/jobs', async (request, reply) => {
  const parsed = listJobsSchema.safeParse(request.query);
  if (!parsed.success) {
    return reply.status(400).send({
      error: 'Invalid jobs query.',
      details: parsed.error.flatten(),
    });
  }

  return readJobsByQuery(parsed.data);
});

app.get('/api/reports', async (request, reply) => {
  const query = request.query as Record<string, unknown>;
  const parsed = listJobsSchema.safeParse({
    limit: query.limit,
    offset: query.offset,
    packageName: query.packageName,
    status: 'completed',
  });
  if (!parsed.success) {
    return reply.status(400).send({
      error: 'Invalid reports query.',
      details: parsed.error.flatten(),
    });
  }

  return readJobsByQuery(parsed.data);
});

app.get('/api/jobs/:jobId', async (request, reply) => {
  const { jobId } = request.params as { jobId: string };
  const job = readJob(jobId);
  if (!job) return reply.status(404).send({ error: 'Job not found.' });
  return { job };
});

app.post('/api/jobs/:jobId/cancel', async (request, reply) => {
  const { jobId } = request.params as { jobId: string };
  const job = cancelJob(jobId);
  if (!job) return reply.status(404).send({ error: 'Job not found.' });
  return { job };
});

app.post('/api/jobs/:jobId/retry', async (request, reply) => {
  const { jobId } = request.params as { jobId: string };
  const job = retryJob(jobId);
  if (!job) return reply.status(404).send({ error: 'Job not found.' });
  return reply.status(202).send({ job });
});

app.get('/api/reports/:jobId', async (request, reply) => {
  const { jobId } = request.params as { jobId: string };
  const report = await readReport(jobId);
  if (!report) return reply.status(404).send({ error: 'Report not ready.' });
  return { report };
});

const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  await app.register(fastifyStatic, {
    root: distPath,
    prefix: '/',
  });

  app.setNotFoundHandler((request, reply) => {
    if (request.raw.url?.startsWith('/api/')) {
      return reply.status(404).send({ error: 'API route not found.' });
    }
    return reply.sendFile('index.html');
  });
}

try {
  await app.listen({ port: config.port, host: config.host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
