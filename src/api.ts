import type { AnalysisJob, AnalysisReportData, AnalyzeRequest, JobsQuery } from '../shared/types';

export interface HealthResponse {
  ok: boolean;
  database: string;
  deepseekConfigured: boolean;
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed with status ${response.status}`);
  }
  return payload as T;
}

export async function startAnalysis(input: AnalyzeRequest) {
  return requestJson<{ job: AnalysisJob }>('/api/analyze/start', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getJob(jobId: string) {
  return requestJson<{ job: AnalysisJob }>(`/api/jobs/${jobId}`);
}

export async function listJobs(limit = 20) {
  return requestJson<{ jobs: AnalysisJob[] }>(`/api/jobs?limit=${limit}`);
}

export async function queryJobs(query: JobsQuery) {
  const params = new URLSearchParams();
  if (query.limit) params.set('limit', String(query.limit));
  if (query.offset) params.set('offset', String(query.offset));
  if (query.status) params.set('status', query.status);
  if (query.packageName) params.set('packageName', query.packageName);
  return requestJson<{ jobs: AnalysisJob[]; total: number }>(`/api/jobs?${params.toString()}`);
}

export async function queryReports(query: JobsQuery) {
  const params = new URLSearchParams();
  if (query.limit) params.set('limit', String(query.limit));
  if (query.offset) params.set('offset', String(query.offset));
  if (query.packageName) params.set('packageName', query.packageName);
  return requestJson<{ jobs: AnalysisJob[]; total: number }>(`/api/reports?${params.toString()}`);
}

export async function cancelJob(jobId: string) {
  return requestJson<{ job: AnalysisJob }>(`/api/jobs/${jobId}/cancel`, {
    method: 'POST',
    body: '{}',
  });
}

export async function retryJob(jobId: string) {
  return requestJson<{ job: AnalysisJob }>(`/api/jobs/${jobId}/retry`, {
    method: 'POST',
    body: '{}',
  });
}

export async function getReport(jobId: string) {
  return requestJson<{ report: AnalysisReportData }>(`/api/reports/${jobId}`);
}

export async function getHealth() {
  return requestJson<HealthResponse>('/api/health');
}
