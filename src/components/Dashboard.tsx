import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderKanban,
  History,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  RotateCcw,
  Search,
  Settings2,
  Square,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { LANGUAGES, REGIONS } from '../constants';
import {
  cancelJob,
  getHealth,
  getJob,
  getReport,
  queryJobs,
  retryJob,
  startAnalysis,
} from '../api';
import { normalizePackageNameInput } from '../../shared/packageName';
import type { AnalysisJob, AnalysisReportData, AnalysisSourceType, InterpretationLanguage } from '../../shared/types';
import AnalysisReport from './AnalysisReport';
import DictionaryGuide from './DictionaryGuide';
import MultiSelect from './MultiSelect';
import ReviewsTable from './ReviewsTable';

const FETCH_OPTIONS = [
  { value: '100', label: '100' },
  { value: '500', label: '500' },
  { value: '1000', label: '1000' },
  { value: '3000', label: '3000' },
  { value: 'max', label: 'Max (≈5000)' },
] as const;

type ServiceState = 'checking' | 'ready' | 'degraded';
type DashboardView = 'run' | 'recent' | 'history' | 'report' | 'dictionary';

const ACTIVE_JOB_STORAGE_KEY = 'appreview-active-job-id';

function summarizeErrorMessage(error: string) {
  const trimmed = error.trim();
  if (!trimmed.startsWith('[')) return trimmed;

  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed) || !parsed.length) return trimmed;

    const first = parsed[0];
    const path = Array.isArray(first?.path) ? first.path.join('.') : 'unknown path';
    return `Analysis failed because the model returned incomplete fields for ${parsed.length} items. First issue: ${path} - ${first?.message || 'Unknown validation error'}`;
  } catch {
    return trimmed;
  }
}

export default function Dashboard() {
  const [sourceType, setSourceType] = useState<AnalysisSourceType>('google_play');
  const [packageName, setPackageName] = useState('com.todoist');
  const [csvFileName, setCsvFileName] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [amount, setAmount] = useState<string>('500');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['en']);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['us']);
  const [interpretationLanguage, setInterpretationLanguage] = useState<InterpretationLanguage>('zh');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCountOpen, setIsCountOpen] = useState(false);
  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [jobs, setJobs] = useState<AnalysisJob[]>([]);
  const [historyJobs, setHistoryJobs] = useState<AnalysisJob[]>([]);
  const [report, setReport] = useState<AnalysisReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serviceState, setServiceState] = useState<ServiceState>('checking');
  const [serviceLabel, setServiceLabel] = useState('Checking backend...');
  const [activeView, setActiveView] = useState<DashboardView>('run');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState({
    analysis: true,
    history: true,
    guide: true,
  });
  const countRef = useRef<HTMLDivElement>(null);
  const pollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'completed' | 'failed' | 'canceled'>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [historyTotal, setHistoryTotal] = useState(0);
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<AnalysisJob | null>(null);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countRef.current && !countRef.current.contains(event.target as Node)) {
        setIsCountOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }
    };
  }, []);

  const stopPolling = () => {
    if (pollingTimerRef.current) {
      clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };

  const persistActiveJob = (jobId: string | null) => {
    if (typeof window === 'undefined') return;
    if (jobId) {
      window.localStorage.setItem(ACTIVE_JOB_STORAGE_KEY, jobId);
      return;
    }
    window.localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
  };

  const refreshJobs = async () => {
    try {
      const response = await queryJobs({
        limit: 20,
        offset: 0,
      });
      setJobs(response.jobs);
    } catch {
      // Keep the visible state steady even if polling this list fails once.
    }
  };

  const refreshHistory = async () => {
    try {
      const response = await queryJobs({
        limit: 10,
        offset: (historyPage - 1) * 10,
        status: historyFilter === 'all' ? 'history' : historyFilter,
        packageName: historySearch || undefined,
      });
      setHistoryJobs(response.jobs);
      setHistoryTotal(response.total);
    } catch {
      // Keep the previous history list visible on transient failures.
    }
  };

  const openCompletedReport = async (jobId: string) => {
    try {
      const reportResponse = await getReport(jobId);
      setReport(reportResponse.report);
      setJob(reportResponse.report.job);
      setError(null);
      setActiveView('report');
      setIsAnalyzing(false);
      persistActiveJob(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load report.');
    }
  };

  const resumeJob = async (jobId: string) => {
    try {
      const response = await getJob(jobId);
      setJob(response.job);

      if (response.job.status === 'completed') {
        await openCompletedReport(jobId);
        await refreshJobs();
        return;
      }

      if (response.job.status === 'failed' || response.job.status === 'canceled') {
        setReport(null);
        setIsAnalyzing(false);
        setError(response.job.error ? summarizeErrorMessage(response.job.error) : response.job.message);
        persistActiveJob(null);
        setActiveView('history');
        await refreshJobs();
        return;
      }

      setIsAnalyzing(true);
      setActiveView('recent');
      setError(null);
      persistActiveJob(jobId);
      stopPolling();
      await refreshJobs();

      const poll = async () => {
        try {
          const next = await getJob(jobId);
          setJob(next.job);
          await refreshJobs();

          if (next.job.status === 'completed') {
            await openCompletedReport(jobId);
            stopPolling();
            await refreshJobs();
            return;
          }

          if (next.job.status === 'failed' || next.job.status === 'canceled') {
            setReport(null);
            setIsAnalyzing(false);
            setError(next.job.error ? summarizeErrorMessage(next.job.error) : next.job.message);
            persistActiveJob(null);
            setActiveView('history');
            stopPolling();
            await refreshJobs();
            return;
          }

          pollingTimerRef.current = setTimeout(poll, 1200);
        } catch (pollError) {
          setIsAnalyzing(false);
          setError(pollError instanceof Error ? pollError.message : 'Failed to poll analysis status.');
          stopPolling();
        }
      };

      pollingTimerRef.current = setTimeout(poll, 300);
    } catch (resumeError) {
      setReport(null);
      setIsAnalyzing(false);
      setError(
        resumeError instanceof Error
          ? summarizeErrorMessage(resumeError.message)
          : 'Failed to restore analysis state.',
      );
      persistActiveJob(null);
      await refreshJobs();
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const activeJobId = window.localStorage.getItem(ACTIVE_JOB_STORAGE_KEY);
    if (!activeJobId) return;
    resumeJob(activeJobId);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const checkHealth = async () => {
      try {
        const response = await getHealth();
        if (cancelled) return;

        if (response.ok && response.deepseekConfigured) {
          setServiceState('ready');
          setServiceLabel('Backend ready');
          return;
        }

        setServiceState('degraded');
        setServiceLabel(response.deepseekConfigured ? 'API online, DeepSeek missing' : 'DeepSeek key missing');
      } catch {
        if (cancelled) return;
        setServiceState('degraded');
        setServiceLabel('Backend unavailable');
      }
    };

    checkHealth();
    refreshJobs();
    refreshHistory();
    const healthTimer = setInterval(checkHealth, 15000);
    const jobsTimer = setInterval(refreshJobs, 5000);

    return () => {
      cancelled = true;
      clearInterval(healthTimer);
      clearInterval(jobsTimer);
    };
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [historyPage, historyFilter, historySearch]);

  const handleAnalyze = async () => {
    const normalizedPackageName = normalizePackageNameInput(packageName);
    if (!normalizedPackageName) {
      setError('Please enter a Google Play package name.');
      return;
    }
    if (sourceType === 'csv_import' && !csvContent.trim()) {
      setError('Please upload a CSV file before starting CSV import analysis.');
      return;
    }

    setError(null);
    setReport(null);
    setJob(null);
    setIsAnalyzing(true);
    setActiveView('recent');
    if (normalizedPackageName !== packageName) {
      setPackageName(normalizedPackageName);
    }
    stopPolling();

    try {
      const count = amount === 'max' ? 5000 : Number(amount);
      const response = await startAnalysis({
        sourceType,
        packageName: normalizedPackageName,
        languages: selectedLanguages,
        regions: selectedRegions,
        count,
        interpretationLanguage,
        csvContent: sourceType === 'csv_import' ? csvContent : undefined,
        csvFileName: sourceType === 'csv_import' ? csvFileName : undefined,
      });
      await resumeJob(response.job.id);
      await refreshJobs();
      await refreshHistory();
    } catch (startError) {
      setReport(null);
      setIsAnalyzing(false);
      setError(startError instanceof Error ? startError.message : 'Failed to start analysis.');
      persistActiveJob(null);
      await refreshJobs();
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      const response = await cancelJob(jobId);
      if (job?.id === jobId) {
        setReport(null);
        setJob(response.job);
        setIsAnalyzing(false);
        setActiveView('history');
      }
      await refreshJobs();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : 'Failed to cancel job.');
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      const response = await retryJob(jobId);
      setReport(null);
      setError(null);
      await resumeJob(response.job.id);
      await refreshJobs();
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : 'Failed to retry job.');
    }
  };

  const selectedOptionLabel = FETCH_OPTIONS.find((opt) => opt.value === amount)?.label;
  const serviceClassName =
    serviceState === 'ready'
      ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
      : serviceState === 'checking'
        ? 'text-amber-600 bg-amber-50 border-amber-100'
        : 'text-rose-600 bg-rose-50 border-rose-100';
  const serviceDotClassName =
    serviceState === 'ready'
      ? 'text-emerald-500'
      : serviceState === 'checking'
        ? 'text-amber-500'
        : 'text-rose-500';

  const activeJobs = jobs.filter((item) => item.status !== 'completed' && item.status !== 'failed' && item.status !== 'canceled');
  const hasReportReviews = Boolean(report?.reviews.length);
  const historyPages = Math.max(1, Math.ceil(historyTotal / 10));

  const toggleGroup = (key: 'analysis' | 'history' | 'guide') => {
    setOpenGroups((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const navItemClass = (view: DashboardView) =>
    `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
      activeView === view
        ? 'bg-blue-50 text-blue-700'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    }`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      <nav className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <BrainCircuit className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">AppReview AI</span>
          </div>
          <div className="flex items-center gap-4">
            <div className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider ${serviceClassName}`}>
              <Activity className={`w-3.5 h-3.5 ${serviceDotClassName}`} />
              {serviceLabel}
            </div>
            <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Settings2 className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-200" />
          </div>
        </div>
      </nav>

      <main className="px-6 py-8">
        <div className="grid grid-cols-[auto_1fr] gap-6 items-start">
          <aside className={`bg-white border border-slate-200 rounded-2xl shadow-sm transition-all ${sidebarCollapsed ? 'w-20' : 'w-72'}`}>
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
              {!sidebarCollapsed ? (
                <div className="flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold uppercase tracking-wider text-slate-700">System Menu</span>
                </div>
              ) : (
                <FolderKanban className="w-4 h-4 text-blue-600 mx-auto" />
              )}
              <button
                onClick={() => setSidebarCollapsed((value) => !value)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50"
              >
                {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              </button>
            </div>

            <div className="p-3 space-y-2">
              <div>
                <button
                  onClick={() => toggleGroup('analysis')}
                  className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-50"
                >
                  {!sidebarCollapsed ? <span>Analysis</span> : <BrainCircuit className="w-4 h-4 mx-auto" />}
                  {!sidebarCollapsed ? (
                    <ChevronRight className={`w-4 h-4 transition-transform ${openGroups.analysis ? 'rotate-90' : ''}`} />
                  ) : null}
                </button>
                {openGroups.analysis && !sidebarCollapsed ? (
                  <div className="mt-1 space-y-1">
                    <button onClick={() => setActiveView('run')} className={navItemClass('run')}>
                      <Play className="w-4 h-4" />
                      <span>Run Analysis</span>
                    </button>
                    <button onClick={() => setActiveView('recent')} className={navItemClass('recent')}>
                      <Activity className="w-4 h-4" />
                      <span>Recent Tasks</span>
                    </button>
                  </div>
                ) : null}
              </div>

              <div>
                <button
                  onClick={() => toggleGroup('history')}
                  className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-50"
                >
                  {!sidebarCollapsed ? <span>Reports</span> : <History className="w-4 h-4 mx-auto" />}
                  {!sidebarCollapsed ? (
                    <ChevronRight className={`w-4 h-4 transition-transform ${openGroups.history ? 'rotate-90' : ''}`} />
                  ) : null}
                </button>
                {openGroups.history && !sidebarCollapsed ? (
                  <div className="mt-1 space-y-1">
                    <button onClick={() => setActiveView('history')} className={navItemClass('history')}>
                      <History className="w-4 h-4" />
                      <span>History</span>
                    </button>
                    {report ? (
                      <div className="ml-7 text-[11px] text-slate-400 truncate">Current: {report.job.packageName}</div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div>
                <button
                  onClick={() => toggleGroup('guide')}
                  className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-50"
                >
                  {!sidebarCollapsed ? <span>Guide</span> : <BookOpen className="w-4 h-4 mx-auto" />}
                  {!sidebarCollapsed ? (
                    <ChevronRight className={`w-4 h-4 transition-transform ${openGroups.guide ? 'rotate-90' : ''}`} />
                  ) : null}
                </button>
                {openGroups.guide && !sidebarCollapsed ? (
                  <div className="mt-1 space-y-1">
                    <button onClick={() => setActiveView('dictionary')} className={navItemClass('dictionary')}>
                      <BookOpen className="w-4 h-4" />
                      <span>Dictionary Guide</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </aside>

          <section className="min-w-0">
            {activeView === 'dictionary' ? <DictionaryGuide /> : null}
            {activeView === 'run' ? (
              <section className="mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 tracking-tight">Run Analysis</h3>
                      <p className="text-sm text-slate-500 mt-1">Configure a new analysis job with package, market, review volume, and report interpretation language.</p>
                    </div>
                    <button
                      onClick={() => setShowAdvancedConfig((value) => !value)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                      {showAdvancedConfig ? 'Hide Advanced' : 'Show Advanced'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    <div className="md:col-span-4">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest pl-1">
                        ANALYSIS SOURCE
                      </label>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {[
                          { value: 'google_play', label: 'Google Play' },
                          { value: 'csv_import', label: 'CSV Import' },
                        ].map((item) => (
                          <button
                            key={item.value}
                            onClick={() => setSourceType(item.value as AnalysisSourceType)}
                            className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                              sourceType === item.value
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>

                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest pl-1">
                        APP PACKAGE NAME
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          type="text"
                          value={packageName}
                          onChange={(e) => setPackageName(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium h-[42px]"
                          placeholder="e.g. my.com.tngdigital.ewallet or a Google Play URL"
                        />
                      </div>
                      {sourceType === 'csv_import' ? (
                        <div className="mt-4 space-y-3">
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
                            CSV FILE
                          </label>
                          <input
                            type="file"
                            accept=".csv,text/csv"
                            onChange={async (event) => {
                              const file = event.target.files?.[0];
                              if (!file) return;
                              setCsvFileName(file.name);
                              const text = await file.text();
                              setCsvContent(text);
                            }}
                            className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                          />
                          <p className="text-xs text-slate-400">
                            Supported columns include review text, rating, date, language, country, title, and user name. If some columns are missing, the importer will fill defaults.
                          </p>
                          {csvFileName ? (
                            <div className="text-xs font-medium text-slate-500">Loaded file: {csvFileName}</div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="md:col-span-3">
                      <MultiSelect
                        label="LANGUAGES"
                        options={LANGUAGES}
                        selected={selectedLanguages}
                        onChange={setSelectedLanguages}
                        placeholder="Any Language"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <MultiSelect
                        label="REGIONS"
                        options={REGIONS}
                        selected={selectedRegions}
                        onChange={setSelectedRegions}
                        placeholder="Any Region"
                      />
                    </div>

                    <div className="md:col-span-6">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest pl-1">
                        REPORT INTERPRETATION LANGUAGE
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: 'zh', label: 'Chinese' },
                          { value: 'en', label: 'English' },
                        ].map((item) => (
                          <button
                            key={item.value}
                            onClick={() => setInterpretationLanguage(item.value as InterpretationLanguage)}
                            className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                              interpretationLanguage === item.value
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {showAdvancedConfig ? (
                      <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Analysis Flow</div>
                          <p className="text-sm text-slate-600">
                            {sourceType === 'csv_import'
                              ? 'Import uploaded reviews, enrich and normalize text, run structured LLM analysis, then aggregate the report.'
                              : 'Fetch reviews, enrich and normalize text, run structured LLM analysis, then aggregate the report.'}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Language Scope</div>
                          <p className="text-sm text-slate-600">Selected review languages guide fetching. Interpretation language controls the narrative explanation language in the final report.</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Large Runs</div>
                          <p className="text-sm text-slate-600">Higher review counts improve coverage but take longer and consume more model budget.</p>
                        </div>
                      </div>
                    ) : null}

                    <div className="md:col-span-2 relative" ref={countRef}>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest pl-1">
                        FETCH COUNT
                      </label>
                      <div
                        onClick={() => setIsCountOpen(!isCountOpen)}
                        className={`w-full px-4 py-2 bg-slate-50 border rounded-xl flex items-center justify-between cursor-pointer transition-all h-[42px] ${
                          isCountOpen ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-sm font-semibold text-slate-700">{selectedOptionLabel}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCountOpen ? 'rotate-180' : ''}`} />
                      </div>

                      <AnimatePresence>
                        {isCountOpen ? (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 4 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute z-50 left-0 right-0 top-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden py-1.5"
                          >
                            {FETCH_OPTIONS.map((opt) => (
                              <div
                                key={opt.value}
                                onClick={() => {
                                  setAmount(opt.value);
                                  setIsCountOpen(false);
                                }}
                                className={`flex items-center justify-between px-4 py-2 cursor-pointer transition-colors ${
                                  amount === opt.value ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-600'
                                }`}
                              >
                                <span className="text-sm font-medium">{opt.label}</span>
                                {amount === opt.value ? <Check className="w-4 h-4" /> : null}
                              </div>
                            ))}
                          </motion.div>
                        ) : null}
                      </AnimatePresence>

                      <AnimatePresence>
                        {amount === 'max' ? (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-start gap-1.5 mt-2 px-1"
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                            <p className="text-[10px] leading-tight font-medium text-slate-400">
                              Analysis may take several minutes and consume more API tokens.
                            </p>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>

                    <div className="md:col-span-12 flex justify-end mt-4">
                      <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="w-full md:w-auto px-10 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Performing AI Analysis...
                          </>
                        ) : (
                          <>
                            <Play className="w-5 h-5 fill-current" />
                            Run Analysis Engine
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {error ? (
                    <div className="mt-5 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {activeView === 'recent' ? (
              <section className="mb-8">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-600" />
                      <h3 className="text-sm font-bold tracking-wider uppercase text-slate-700">Recent Tasks</h3>
                    </div>
                    <span className="text-xs font-medium text-slate-400">{activeJobs.length} active</span>
                  </div>
                  <div className="space-y-3">
                    {!activeJobs.length ? <p className="text-sm text-slate-400">No active tasks right now.</p> : null}
                    {activeJobs.map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-800 truncate">{item.packageName}</div>
                            <div className="text-xs text-slate-400 mt-1">{item.message}</div>
                            <div className="text-[11px] text-slate-400 mt-2">
                              {item.languages.join(', ')} · {item.regions.map((region) => region.toUpperCase()).join(', ')} · {item.count} reviews
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1">
                              Interpretation: {item.interpretationLanguage === 'en' ? 'English' : 'Chinese'}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs font-bold uppercase text-slate-500">{item.status}</div>
                            <div className="text-sm font-mono font-bold text-blue-600 mt-1">{item.progress}%</div>
                          </div>
                        </div>
                        <div className="mt-3 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div className="h-full bg-blue-600" style={{ width: `${item.progress}%` }} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => resumeJob(item.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                          >
                            <Activity className="w-3.5 h-3.5" />
                            View Progress
                          </button>
                          <button
                            onClick={() => setSelectedTaskForDetails(item)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Details
                          </button>
                          <button
                            onClick={() => handleCancelJob(item.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700"
                          >
                            <Square className="w-3.5 h-3.5" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            {activeView === 'history' ? (
              <section className="mb-8">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-slate-600" />
                      <h3 className="text-sm font-bold tracking-wider uppercase text-slate-700">History</h3>
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={historySearch}
                        onChange={(e) => {
                          setHistoryPage(1);
                          setHistorySearch(e.target.value);
                        }}
                        placeholder="Search package"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      <select
                        value={historyFilter}
                        onChange={(e) => {
                          setHistoryPage(1);
                          setHistoryFilter(e.target.value as typeof historyFilter);
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      >
                        <option value="all">All</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                        <option value="canceled">Canceled</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {!historyJobs.length ? <p className="text-sm text-slate-400">No historical tasks yet.</p> : null}
                    {historyJobs.map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-100 px-4 py-3">
                        <div className="text-sm font-semibold text-slate-800 truncate">{item.packageName}</div>
                        <div className="text-xs text-slate-400 mt-1">{new Date(item.updatedAt).toLocaleString()}</div>
                        <div className="text-xs font-medium mt-2 text-slate-500">{item.status}</div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          {item.reviewCount} analyzed · {item.interpretationLanguage === 'en' ? 'English' : 'Chinese'} interpretation
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.status === 'completed' ? (
                            <button
                              onClick={() => openCompletedReport(item.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              View Report
                            </button>
                          ) : null}
                          <button
                            onClick={() => handleRetryJob(item.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Retry
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                    <button
                      disabled={historyPage === 1}
                      onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span>Page {historyPage} / {historyPages}</span>
                    <button
                      disabled={historyPage >= historyPages}
                      onClick={() => setHistoryPage((page) => Math.min(historyPages, page + 1))}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </section>
            ) : null}

            {activeView === 'report' && report ? (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, x: 100, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                >
                  <AnalysisReport data={report} />
                  <section className="mt-16 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-bold text-lg tracking-tight">原始数据与详细分析 (Raw Logs)</h3>
                      <div className="text-sm font-bold text-slate-400">
                        {hasReportReviews ? `${report.reviews.length} REVIEWS` : 'NO REVIEWS'}
                      </div>
                    </div>
                    <ReviewsTable reviews={report.reviews} />
                  </section>
                </motion.div>
              </AnimatePresence>
            ) : null}
          </section>
        </div>
      </main>

      {selectedTaskForDetails ? (
        <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 p-6 overflow-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-sm font-bold uppercase tracking-wider text-slate-500">Task Details</div>
                <div className="text-lg font-semibold text-slate-900 mt-1">{selectedTaskForDetails.packageName}</div>
              </div>
              <button
                onClick={() => setSelectedTaskForDetails(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600"
              >
                Close
              </button>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <div className="text-slate-400">Status</div>
                <div className="font-semibold text-slate-800">{selectedTaskForDetails.status}</div>
              </div>
              <div>
                <div className="text-slate-400">Progress</div>
                <div className="font-semibold text-slate-800">{selectedTaskForDetails.progress}%</div>
              </div>
              <div>
                <div className="text-slate-400">Message</div>
                <div className="font-semibold text-slate-800">{selectedTaskForDetails.message}</div>
              </div>
              <div>
                <div className="text-slate-400">Languages</div>
                <div className="font-semibold text-slate-800">{selectedTaskForDetails.languages.join(', ')}</div>
              </div>
              <div>
                <div className="text-slate-400">Interpretation Language</div>
                <div className="font-semibold text-slate-800">{selectedTaskForDetails.interpretationLanguage === 'en' ? 'English' : 'Chinese'}</div>
              </div>
              <div>
                <div className="text-slate-400">Regions</div>
                <div className="font-semibold text-slate-800">{selectedTaskForDetails.regions.map((region) => region.toUpperCase()).join(', ')}</div>
              </div>
              <div>
                <div className="text-slate-400">Requested Reviews</div>
                <div className="font-semibold text-slate-800">{selectedTaskForDetails.count}</div>
              </div>
              <div>
                <div className="text-slate-400">Fetched / Analyzed</div>
                <div className="font-semibold text-slate-800">{selectedTaskForDetails.reviewCount} / {selectedTaskForDetails.analyzedCount}</div>
              </div>
              {selectedTaskForDetails.error ? (
                <div>
                  <div className="text-slate-400">Error</div>
                  <div className="font-semibold text-rose-700 whitespace-pre-wrap">{selectedTaskForDetails.error}</div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-200 mt-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center">
              <BrainCircuit className="text-white w-4 h-4" />
            </div>
            <span className="font-bold text-sm tracking-tight italic">AppReview AI Analyzer</span>
          </div>
          <p className="text-xs font-mono">© 2024 PRECISION DATA LABS • ALL RIGHTS RESERVED</p>
        </div>
      </footer>
    </div>
  );
}
