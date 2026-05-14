import { Fragment, useRef, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import { motion } from 'motion/react';
import { TrendingUp, Search, Zap, BarChart3, PieChartIcon, Download, Loader2, Sparkles, Target, Users, AlertTriangle, Shield, MousePointer2 } from 'lucide-react';
import type { AnalysisReportData } from '../../shared/types';

interface AIInsightProps {
  text: string;
}

interface ReportModuleProps {
  data: AnalysisReportData;
}

const INSIGHT_DICTIONARY_PATH = '/Users/mac/Desktop/appreview-ai-analyzer/config/insight-dictionaries.json';

function AIInterpretation({ text }: AIInsightProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-6 flex gap-4 p-5 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 rounded-2xl border border-blue-100 shadow-sm"
    >
      <div className="flex-shrink-0 w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600">
        <Sparkles className="w-5 h-5 fill-current animate-pulse" />
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">AI Agent Interpretation</span>
          <div className="h-1 flex-1 bg-blue-100 rounded-full" />
        </div>
        <p className="text-sm text-slate-600 leading-relaxed font-medium">
          {text}
        </p>
      </div>
    </motion.div>
  );
}

function EvidenceRuleHint() {
  return (
    <p className="text-[11px] text-slate-400 mt-3">
      证据强度说明：High {'>='} 15 条，Medium = 6-14 条，Low {'<='} 5 条。低证据模块会降级展示或隐藏。
    </p>
  );
}

function summarizePainGroupTitle(category: string, subIssues: Array<{ label: string }>) {
  const summary = subIssues
    .slice(0, 3)
    .map((item) => item.label)
    .filter(Boolean)
    .join(' / ');

  return summary ? `${category}: ${summary}` : category;
}

function InsufficientEvidenceNotice({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
      {text}
    </div>
  );
}

function ScenarioPriorityBadge({ priority }: { priority: 'P1' | 'P2' | 'P3' }) {
  const styles =
    priority === 'P1'
      ? 'bg-rose-100 text-rose-700'
      : priority === 'P2'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-slate-100 text-slate-600';

  return <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${styles}`}>{priority}</span>;
}

function ModuleExecutiveSummary({ data }: ReportModuleProps) {
  const totalReviews = data.overviewSentiment.reduce((sum, item) => sum + item.count, 0);
  const negativeShare = totalReviews
    ? Math.round(((data.overviewSentiment.find((item) => item.sentiment === 'Negative')?.count || 0) / totalReviews) * 100)
    : 0;
  const topPain = data.painHierarchy[0];
  const topScenario = data.useCaseProfiles[0];
  const topStrength = data.strengthHierarchy[0];

  return (
    <section className="mb-12 break-after-page">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Executive Summary</h2>
          <p className="text-xs text-slate-400 font-medium">Management-ready summary for product, engineering, and go-to-market decisions</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="rounded-2xl bg-slate-900 text-white px-6 py-5 mb-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300 mb-2">Headline</div>
              <p className="text-base font-semibold leading-relaxed">{data.executiveSummary.headline}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 min-w-[280px]">
              <div className="rounded-xl bg-white/10 px-3 py-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-300 mb-1">Samples</div>
                <div className="text-xl font-bold">{totalReviews}</div>
              </div>
              <div className="rounded-xl bg-white/10 px-3 py-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-300 mb-1">Negative Share</div>
                <div className="text-xl font-bold">{negativeShare}%</div>
              </div>
              <div className="rounded-xl bg-white/10 px-3 py-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-300 mb-1">Top Risk</div>
                <div className="text-sm font-bold leading-snug">{topPain?.category || 'N/A'}</div>
              </div>
              <div className="rounded-xl bg-white/10 px-3 py-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-300 mb-1">Top Growth Scenario</div>
                <div className="text-sm font-bold leading-snug">{topScenario?.scenario || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-500 mb-2">Top Product Risk</div>
            <div className="text-sm font-semibold text-slate-700">{topPain?.subIssues.slice(0, 3).map((item) => item.label).join(' / ') || 'N/A'}</div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-500 mb-2">Top Defended Value</div>
            <div className="text-sm font-semibold text-slate-700">{topStrength?.category || 'N/A'}</div>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-500 mb-2">Recommended Priority</div>
            <div className="text-sm font-semibold text-slate-700">{topScenario ? `${topScenario.scenario} (${topScenario.recommendedPriority})` : 'N/A'}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-500 mb-2">Biggest Risk</div>
            <p className="text-sm font-semibold text-slate-700">{data.executiveSummary.biggestRisk}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-500 mb-2">Biggest Opportunity</div>
            <p className="text-sm font-semibold text-slate-700">{data.executiveSummary.biggestOpportunity}</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-500 mb-3">3 Immediate Actions</div>
            <div className="space-y-2">
              {data.executiveSummary.immediateActions.map((action) => (
                <div key={action} className="rounded-lg bg-white px-3 py-2 text-[12px] text-slate-700">
                  {action}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-600 mb-2">Strategic Caution</div>
            <p className="text-sm font-semibold text-slate-700">{data.executiveSummary.strategicCaution}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- Module 1: Overview & Trust ---
function ModuleOverview({ data }: ReportModuleProps) {
  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
          <PieChartIcon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Module 1: 全局概览与数据信任 (Overview & Trust)</h2>
          <p className="text-xs text-slate-400 font-medium">Sentiment distribution and label reliability matrix</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Count Bar Chart */}
        <div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-full flex flex-col">
            <h3 className="text-sm font-bold text-slate-700 mb-6 uppercase tracking-wider">AI 情感分布 (总计)</h3>
            <div className="h-[250px] mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.overviewSentiment} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="sentiment" axisLine={false} tickLine={false} style={{ fontSize: '12px' }} />
                  <YAxis axisLine={false} tickLine={false} style={{ fontSize: '12px' }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={50}>
                    {data.overviewSentiment.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <AIInterpretation text={data.aiInterpretations.sentiment_distribution} />
          </div>
        </div>

        {/* Avg Rating Bar Chart */}
        <div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-full flex flex-col">
            <h3 className="text-sm font-bold text-slate-700 mb-6 uppercase tracking-wider">情感类别 × 平均星级评分</h3>
            <div className="h-[250px] mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.overviewSentiment} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="sentiment" axisLine={false} tickLine={false} style={{ fontSize: '12px' }} />
                  <YAxis domain={[0, 5]} axisLine={false} tickLine={false} style={{ fontSize: '12px' }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="avgRating" radius={[6, 6, 0, 0]} barSize={50}>
                    {data.overviewSentiment.map((entry, index) => (
                      <Cell key={index} fill={entry.color} opacity={0.6} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <AIInterpretation text={data.aiInterpretations.avg_rating_vs_sentiment} />
          </div>
        </div>
      </div>

      {/* Trust Matrix */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-12">
        <div className="flex items-center gap-2 mb-8">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">星级 vs AI 情感验证矩阵 (Trust Matrix)</h3>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Rating</div>
          <div className="text-xs font-bold text-emerald-500 uppercase tracking-[0.2em] text-center mb-2">Positive</div>
          <div className="text-xs font-bold text-amber-500 uppercase tracking-[0.2em] text-center mb-2">Neutral</div>
          <div className="text-xs font-bold text-rose-500 uppercase tracking-[0.2em] text-center mb-2">Negative</div>

          {data.trustMatrix.map((row, idx) => (
            <Fragment key={`row-${idx}`}>
              <div className="py-3 border-t border-slate-50 font-bold text-sm text-slate-600">
                {row.stars}
              </div>
              <div className="py-3 border-t border-slate-50 text-center">
                <span className={`text-sm font-bold ${row.positive > 70 ? 'text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100' : 'text-slate-400'}`}>
                  {row.positive}%
                </span>
              </div>
              <div className="py-3 border-t border-slate-50 text-center">
                <span className={`text-sm font-bold ${row.neutral > 50 ? 'text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100' : 'text-slate-400'}`}>
                  {row.neutral}%
                </span>
              </div>
              <div className="py-3 border-t border-slate-50 text-center">
                <span className={`text-sm font-bold ${row.negative > 70 ? 'text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100' : 'text-slate-400'}`}>
                  {row.negative}%
                </span>
              </div>
            </Fragment>
          ))}
        </div>
        <AIInterpretation text={data.aiInterpretations.trust_matrix} />
      </div>
    </section>
  );
}

// --- Module 2: Trends ---
function ModuleTrends({ data }: ReportModuleProps) {
  const singleMonth = data.trendData.length <= 1;
  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Module 2: 趋势与版本监控 (Trends)</h2>
          <p className="text-xs text-slate-400 font-medium">Monthly sentiment volatility monitoring</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-8 uppercase tracking-wider">每月情感趋势 (堆叠面积图)</h3>
        <div className="h-[400px] mb-8">
          <ResponsiveContainer width="100%" height="100%">
            {singleMonth ? (
              <BarChart data={data.trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} style={{ fontSize: '12px' }} />
                <YAxis axisLine={false} tickLine={false} style={{ fontSize: '12px' }} tickFormatter={(val) => `${val}%`} />
                <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Bar dataKey="positive" fill="#10B981" radius={[6, 6, 0, 0]} barSize={36} />
                <Bar dataKey="neutral" fill="#F59E0B" radius={[6, 6, 0, 0]} barSize={36} />
                <Bar dataKey="negative" fill="#EF4444" radius={[6, 6, 0, 0]} barSize={36} />
              </BarChart>
            ) : (
              <AreaChart data={data.trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} style={{ fontSize: '12px' }} />
                <YAxis axisLine={false} tickLine={false} style={{ fontSize: '12px' }} tickFormatter={(val) => `${val}%`} />
                <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Area type="monotone" dataKey="positive" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                <Area type="monotone" dataKey="neutral" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.4} />
                <Area type="monotone" dataKey="negative" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.5} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
        <AIInterpretation text={data.aiInterpretations.monthly_trends} />
      </div>
    </section>
  );
}

// --- Module 3: Deep Dive ---
function ModuleDeepDive({ data }: ReportModuleProps) {
  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
          <Search className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Module 3: 深度归因排查 (Deep Dive)</h2>
          <p className="text-xs text-slate-400 font-medium">Topic attribution and sentiment cross-analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Topics Chart */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-700 mb-8 uppercase tracking-wider">Top 10 主题标签分布</h3>
          <div className="h-[400px] mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={data.topicData} margin={{ left: 40, right: 40 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} style={{ fontSize: '12px', fontWeight: 600 }} width={100} />
                <Tooltip 
                   cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={15} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <AIInterpretation text={data.aiInterpretations.topic_distribution} />
        </div>

        {/* Stacked Topic x Sentiment */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-700 mb-8 uppercase tracking-wider">主题 × 情感交叉分析</h3>
          <div className="h-[400px] mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={data.topicData} margin={{ left: 40, right: 40 }}>
                 <XAxis type="number" domain={[0, 'dataMax']} hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} style={{ fontSize: '12px', fontWeight: 600 }} width={100} />
                <Tooltip 
                   cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="square" />
                <Bar dataKey="positive" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} barSize={15} />
                <Bar dataKey="neutral" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} barSize={15} />
                <Bar dataKey="negative" stackId="a" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={15} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <AIInterpretation text={data.aiInterpretations.topic_sentiment_cross} />
        </div>
      </div>
    </section>
  );
}

// --- Module 4: Actionable Insights ---
function ModuleActionable({ data }: ReportModuleProps) {
  const [expandedStrengthEvidence, setExpandedStrengthEvidence] = useState<Record<string, boolean>>({});
  const [expandedPainEvidence, setExpandedPainEvidence] = useState<Record<string, boolean>>({});
  const showStrengthSignals = data.strengthHierarchy.length > 0 && data.strengthHierarchy[0].count >= 3;
  const showPainSignals = data.painHierarchy.length > 0 && data.painHierarchy[0].count >= 3;

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Module 4: 战术级行动指南 (Actionable Insights)</h2>
          <p className="text-xs text-slate-400 font-medium">Structured strength and pain signal extraction for tactical decisions</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Pros Phrases */}
          <div className="bg-emerald-50 bg-opacity-30 p-8 rounded-3xl border border-emerald-100 shadow-sm">
            <h3 className="text-sm font-bold text-emerald-700 mb-8 uppercase tracking-widest pl-2">🏆 核心优势信号 (Strength Signals)</h3>
            <EvidenceRuleHint />
            {showStrengthSignals ? (
            <div className="space-y-5">
              {data.strengthHierarchy.slice(0, 8).map((group, i) => (
                <div key={group.category} className="group rounded-2xl bg-white/70 border border-emerald-100 p-4">
                  <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-white border border-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-600 shadow-sm">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-700">{group.category}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                          group.evidenceStrength === 'High'
                            ? 'bg-emerald-100 text-emerald-700'
                            : group.evidenceStrength === 'Medium'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {group.evidenceStrength}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-emerald-600 font-bold">{group.count}</span>
                    </div>
                    <div className="h-1.5 w-full bg-emerald-100/50 rounded-full overflow-hidden">
                      <motion.div 
                         initial={{ width: 0 }}
                        whileInView={{ width: `${(group.count / data.strengthHierarchy[0].count) * 100}%` }}
                        className="h-full bg-emerald-500 rounded-full"
                      />
                    </div>
                  </div>
                </div>
                  <div className="mt-3 space-y-2 pl-12">
                    {group.subSignals.map((signal) => {
                      const evidenceKey = `${group.category}-${signal.label}`;
                      const expanded = expandedStrengthEvidence[evidenceKey];
                      return (
                      <div key={evidenceKey} className="rounded-xl bg-emerald-50/70 border border-emerald-100 px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold text-slate-700">{signal.label}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-mono text-emerald-600">{signal.count}</span>
                            <button
                              onClick={() => setExpandedStrengthEvidence((current) => ({ ...current, [evidenceKey]: !current[evidenceKey] }))}
                              className="text-[11px] font-semibold text-emerald-700"
                            >
                              {expanded ? '收起证据' : '展开证据'}
                            </button>
                          </div>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">示例评论证据：{signal.example}</p>
                        {expanded ? (
                          <div className="mt-2 space-y-2">
                            {signal.examples.map((example) => (
                              <div key={`${evidenceKey}-${example}`} className="rounded-lg bg-white px-3 py-2 text-[11px] text-slate-600 border border-emerald-100">
                                {example}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <InsufficientEvidenceNotice text="当前优势信号证据不足，暂不展示结构化优势结论。" />
            )}
          </div>

          {/* Cons Phrases */}
          <div className="bg-rose-50 bg-opacity-30 p-8 rounded-3xl border border-rose-100 shadow-sm">
            <h3 className="text-sm font-bold text-rose-700 mb-8 uppercase tracking-widest pl-2">💔 核心痛点信号 (Pain Signals)</h3>
             <EvidenceRuleHint />
             {showPainSignals ? (
             <div className="space-y-5">
              {data.painHierarchy.slice(0, 6).map((group, i) => (
                <div key={group.category} className="rounded-2xl bg-white/70 border border-rose-100 p-4">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-8 h-8 rounded-full bg-white border border-rose-100 flex items-center justify-center text-[10px] font-bold text-rose-600 shadow-sm">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-bold text-slate-700">
                          {summarizePainGroupTitle(group.category, group.subIssues)}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                            group.evidenceStrength === 'High'
                              ? 'bg-rose-100 text-rose-700'
                              : group.evidenceStrength === 'Medium'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}>
                            {group.evidenceStrength}
                          </span>
                          <span className="text-xs font-mono text-rose-600 font-bold">{group.count}</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-rose-100/50 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${(group.count / data.painHierarchy[0].count) * 100}%` }}
                          className="h-full bg-rose-500 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 pl-12">
                    {group.subIssues.map((subIssue) => (
                      <div key={`${group.category}-${subIssue.label}`} className="rounded-xl bg-rose-50/70 border border-rose-100 px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold text-slate-700">{subIssue.label}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-mono text-rose-600">{subIssue.count}</span>
                            <button
                              onClick={() => setExpandedPainEvidence((current) => ({ ...current, [`${group.category}-${subIssue.label}`]: !current[`${group.category}-${subIssue.label}`] }))}
                              className="text-[11px] font-semibold text-rose-700"
                            >
                              {expandedPainEvidence[`${group.category}-${subIssue.label}`] ? '收起证据' : '展开证据'}
                            </button>
                          </div>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">示例评论证据：{subIssue.example}</p>
                        {expandedPainEvidence[`${group.category}-${subIssue.label}`] ? (
                          <div className="mt-2 space-y-2">
                            {subIssue.examples.map((example) => (
                              <div key={`${group.category}-${subIssue.label}-${example}`} className="rounded-lg bg-white px-3 py-2 text-[11px] text-slate-600 border border-rose-100">
                                {example}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
             ) : (
              <InsufficientEvidenceNotice text="当前痛点证据不足，暂不展示结构化痛点诊断。" />
             )}
          </div>
        </div>
        <AIInterpretation text={data.aiInterpretations.pros_cons_phrases} />
      </div>

      {/* Simulated Word Clouds */}
      <div className="bg-slate-900 rounded-[3rem] p-12 overflow-hidden relative">
        {/* Background Gradients */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-64 h-64 bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-64 h-64 bg-rose-500/20 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="relative z-10">
            <h3 className="text-center text-xs font-bold text-emerald-400 uppercase tracking-[0.3em] mb-12">Strength Signal Clusters</h3>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-6">
              {data.wordCloud.positive.map((word, i) => (
                <motion.span 
                  key={i}
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  style={{ 
                    fontSize: `${word.size}px`, 
                    fontWeight: word.weight,
                  }}
                  className="text-emerald-400 hover:text-white transition-colors cursor-default drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                  {word.text}
                </motion.span>
              ))}
            </div>
          </div>

          <div className="relative z-10 border-t lg:border-t-0 lg:border-l border-slate-800 pt-12 lg:pt-0 lg:pl-12">
            <h3 className="text-center text-xs font-bold text-rose-400 uppercase tracking-[0.3em] mb-12">Pain Signal Clusters</h3>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-6">
              {data.wordCloud.negative.map((word, i) => (
                <motion.span 
                  key={i}
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  style={{ 
                    fontSize: `${word.size}px`, 
                    fontWeight: word.weight,
                  }}
                  className="text-rose-400 hover:text-white transition-colors cursor-default drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                >
                  {word.text}
                </motion.span>
              ))}
            </div>
          </div>
        </div>
        <div className="relative z-10 bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10 mt-8">
           <AIInterpretation text={data.aiInterpretations.word_clouds} />
        </div>
      </div>
    </section>
  );
}

// --- Module 5: Opportunity & Feature Gaps ---
function ModuleOpportunity({ data }: ReportModuleProps) {
  const ICONS: Record<string, any> = { Zap, Shield, MousePointer2, Download };
  const [expandedRequestEvidence, setExpandedRequestEvidence] = useState<Record<string, boolean>>({});
  const showFeatureRequests = data.featureRequests.length > 0 && data.featureRequests.reduce((sum, item) => sum + item.count, 0) >= 3;
  const showPainToGain = data.painToGain.length > 0 && data.painToGain.some((item) => item.evidenceStrength !== 'Low');
  const showMonetizationJourney = Boolean(data.monetizationJourney && data.monetizationJourney.stages.length);

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
          <Target className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Module 5: 机会点挖掘与需求空白 (Opportunity & Feature Gaps)</h2>
          <p className="text-xs text-slate-400 font-medium">Identifying unmet needs and competitive advantages</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Feature Requests */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-700 mb-8 uppercase tracking-wider">“未满足需求”排行榜 (Top Feature Requests)</h3>
          <EvidenceRuleHint />
          {showFeatureRequests ? (
          <div className="space-y-4 mb-8">
            {data.featureRequests.map((req, i) => (
              <div key={i} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-purple-200 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-xs font-bold text-slate-400 border border-slate-100">
                      {i + 1}
                    </span>
                    <span className="text-sm font-bold text-slate-700">{req.category}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      req.priority === 'High' ? 'bg-rose-100 text-rose-600' : 
                      req.priority === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                    }`}>
                      {req.priority}
                    </span>
                    <span className="text-xs font-mono font-bold text-purple-600">+{req.count}</span>
                  </div>
                </div>
                <div className="mt-3 space-y-2 pl-12">
                  {req.subRequests.map((sub) => {
                    const evidenceKey = `${req.category}-${sub.label}`;
                    const expanded = expandedRequestEvidence[evidenceKey];
                    return (
                      <div key={evidenceKey} className="rounded-xl bg-white border border-slate-100 px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold text-slate-700">{sub.label}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-mono text-purple-600">{sub.count}</span>
                            <button
                              onClick={() => setExpandedRequestEvidence((current) => ({ ...current, [evidenceKey]: !current[evidenceKey] }))}
                              className="text-[11px] font-semibold text-purple-700"
                            >
                              {expanded ? '收起证据' : '展开证据'}
                            </button>
                          </div>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">示例评论证据：{sub.example}</p>
                        {expanded ? (
                          <div className="mt-2 space-y-2">
                            {sub.examples.map((example) => (
                              <div key={`${evidenceKey}-${example}`} className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600 border border-slate-100">
                                {example}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          ) : (
            <InsufficientEvidenceNotice text="当前未满足需求证据不足，暂不展示结构化需求结论。" />
          )}
          <AIInterpretation text={data.aiInterpretations.feature_requests} />
        </div>

        {/* Pain-to-Gain Matrix */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-700 mb-8 uppercase tracking-wider">痛点转化为卖点 (Pain-to-Gain Matrix)</h3>
          <p className="text-xs text-slate-400 -mt-5 mb-6">
            规则来源：可配置字典文件 [config/insight-dictionaries.json](/Users/mac/Desktop/appreview-ai-analyzer/config/insight-dictionaries.json)。
            运营/产品可直接维护 Pain-to-Gain 标签与策略映射。
          </p>
          <EvidenceRuleHint />
          {showPainToGain ? (
          <div className="grid grid-cols-1 gap-4 mb-8">
            {data.painToGain.map((item, i) => {
              const IconComp = ICONS[item.icon] || Zap;
              return (
                <div key={i} className="flex items-center gap-4 p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div className="flex-1 grid grid-cols-1 gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">主问题类</div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                        item.evidenceStrength === 'High'
                          ? 'bg-rose-100 text-rose-700'
                          : item.evidenceStrength === 'Medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.evidenceStrength}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-700">{item.painCategory}</div>
                    <div className="text-xs">
                      <div className="text-slate-400 font-bold uppercase tracking-[0.1em] mb-1">Issue</div>
                      <div className="text-slate-600 font-medium">{item.issue}</div>
                    </div>
                    <div className="text-xs">
                      <div className="text-slate-400 font-bold uppercase tracking-[0.1em] mb-1">Business Risk</div>
                      <div className="text-slate-600 font-medium">{item.businessRisk}</div>
                    </div>
                    <div className="text-xs">
                      <div className="text-emerald-500 font-bold uppercase tracking-[0.1em] mb-1">Recommended Action</div>
                      <div className="text-emerald-700 font-bold">{item.recommendedAction}</div>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      支撑子问题：
                      {' '}
                      {item.supportingSubIssues.join(' / ')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          ) : (
            <InsufficientEvidenceNotice text="当前策略建议证据不足，暂不展示 Pain-to-Gain 结构化建议。" />
          )}
          <AIInterpretation text={data.aiInterpretations.pain_to_gain} />
        </div>
      </div>

      {showMonetizationJourney ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm mb-8">
          <h3 className="text-sm font-bold text-slate-700 mb-6 uppercase tracking-wider">{data.monetizationJourney?.title}</h3>
          <p className="text-sm text-slate-500 mb-6">{data.monetizationJourney?.summary}</p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {data.monetizationJourney?.stages.map((stage) => (
              <div key={stage.stage} className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="text-sm font-bold text-slate-700">{stage.stage}</div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                    stage.evidenceStrength === 'High'
                      ? 'bg-rose-100 text-rose-700'
                      : stage.evidenceStrength === 'Medium'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                  }`}>
                    {stage.evidenceStrength}
                  </span>
                </div>
                <p className="text-[12px] text-slate-700">{stage.problems.join(' / ')}</p>
                <div className="mt-3 rounded-xl bg-white border border-amber-100 px-3 py-2 text-[11px] text-slate-500">
                  {stage.example}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

// --- Module 6: Churn Triggers & Dealbreakers ---
function ModuleChurn({ data }: ReportModuleProps) {
  const COLORS = ['#EF4444', '#F59E0B', '#3B82F6', '#6B7280'];
  const dealbreakerGroups = data.painHierarchy.slice(0, 5);

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Module 6: 流失原因与致命缺陷剖析 (Churn Triggers)</h2>
          <p className="text-xs text-slate-400 font-medium">Critical reasons for uninstalls and competitor migration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Dealbreakers Pie Chart */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-700 mb-8 uppercase tracking-wider">流失原因 / 致命缺陷分布 (Dealbreakers)</h3>
          <div className="h-[300px] mb-8 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.dealbreakersData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.dealbreakersData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 gap-3 mb-8">
            {data.dealbreakersData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm font-semibold text-slate-700 break-words">{item.name}</span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500 shrink-0">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="space-y-4 mb-8">
            {dealbreakerGroups.map((group) => (
              <div key={group.category} className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="text-sm font-bold text-slate-700">{group.category}</div>
                  <span className="text-[11px] font-mono font-bold text-rose-600">{group.count}</span>
                </div>
                <div className="space-y-2">
                  {group.subIssues.slice(0, 3).map((subIssue) => (
                    <div key={`${group.category}-${subIssue.label}`} className="rounded-xl bg-white border border-rose-100 px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-slate-700">{subIssue.label}</span>
                        <span className="text-[11px] font-mono text-rose-600">{subIssue.count}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">示例评论证据：{subIssue.example}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <AIInterpretation text={data.aiInterpretations.dealbreakers} />
        </div>

        {/* Competitor Migration */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-700 mb-8 uppercase tracking-wider">核心竞品流向监控 (Competitor Migration)</h3>
          <div className="space-y-6 mb-8 pt-4">
            {data.migrationData.map((comp, i) => (
              <div key={i} className="relative">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-slate-700">{comp.name}</span>
                  <span className="text-xs font-mono font-bold text-rose-500">{comp.count} Users Switching</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(comp.count / data.migrationData[0].count) * 100}%` }}
                    className="h-full bg-rose-500 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
          <AIInterpretation text={data.aiInterpretations.migration} />
        </div>
      </div>
    </section>
  );
}

// --- Module 7: User Persona & Use Cases ---
function ModulePersona({ data }: ReportModuleProps) {
  const useCaseCount = data.useCaseRadar.length;
  const showUseCaseModule = useCaseCount > 0;
  const showPersonaInsights = data.useCaseProfiles.length > 0;
  const showRadar = useCaseCount >= 3;
  const maxUseCaseValue = Math.max(1, ...data.useCaseRadar.map((item) => item.A));

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Module 7: 用户画像与使用场景推测 (User Persona & Use Cases)</h2>
          <p className="text-xs text-slate-400 font-medium">Inferred personas and primary work scenarios</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-8">
          {/* Use Case Radar */}
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-slate-700 mb-8 uppercase tracking-wider">场景需求雷达图 (Use Case Radar)</h3>
            <p className="text-xs text-slate-400 -mt-5 mb-6">
              规则来源：可配置字典文件 [config/insight-dictionaries.json](/Users/mac/Desktop/appreview-ai-analyzer/config/insight-dictionaries.json)。
              运营/产品可直接维护 Use Case 标签与归并规则。
            </p>
            <div className="h-[350px]">
              {!showUseCaseModule ? (
                <InsufficientEvidenceNotice text="当前评论中缺少足够明确的使用场景证据，暂不展示 Use Case 图表。建议补充更高质量场景描述样本，或扩展 Use Case 归并规则。" />
              ) : showRadar ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.useCaseRadar}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 150]} hide />
                    <Radar
                      name="Usage"
                      dataKey="A"
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.6}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="space-y-5 pt-6">
                  {data.useCaseRadar.map((item) => (
                    <div key={item.subject}>
                      <div className="flex items-center justify-between mb-2 gap-4">
                        <span className="text-sm font-semibold text-slate-700">{item.subject}</span>
                        <span className="text-xs font-mono font-bold text-blue-600">{item.A}</span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${(item.A / maxUseCaseValue) * 100}%` }}
                          className="h-full bg-blue-500 rounded-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Persona Inferences */}
          <div className="flex flex-col pt-4">
             <h3 className="text-sm font-bold text-slate-700 mb-8 uppercase tracking-wider">商业场景画像 (Commercial Scenario Profiles)</h3>
             {showPersonaInsights ? (
               <div className="space-y-4">
                  {data.useCaseProfiles.map((profile) => (
                    <div key={profile.scenario} className="p-5 rounded-2xl border bg-blue-50 border-blue-100 text-blue-800">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="text-xs font-bold uppercase tracking-widest">{profile.scenario}</div>
                        <div className="flex items-center gap-3">
                          <ScenarioPriorityBadge priority={profile.recommendedPriority} />
                          <span className="text-[11px] font-mono text-blue-700">{profile.reviewCount} 条评论</span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                            profile.evidenceStrength === 'High'
                              ? 'bg-blue-200 text-blue-800'
                              : profile.evidenceStrength === 'Medium'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}>
                            {profile.evidenceStrength}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-white/80 border border-blue-100 px-3 py-2">
                            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-blue-500 mb-1">Market Attractiveness</div>
                            <div className="font-semibold">{profile.marketAttractiveness}</div>
                          </div>
                          <div className="rounded-xl bg-white/80 border border-blue-100 px-3 py-2">
                            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-blue-500 mb-1">Pain Intensity</div>
                            <div className="font-semibold">{profile.painIntensity}</div>
                          </div>
                          <div className="rounded-xl bg-white/80 border border-blue-100 px-3 py-2">
                            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-blue-500 mb-1">Differentiation Potential</div>
                            <div className="font-semibold">{profile.differentiationPotential}</div>
                          </div>
                          <div className="rounded-xl bg-white/80 border border-blue-100 px-3 py-2">
                            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-blue-500 mb-1">Recommended Priority</div>
                            <div className="font-semibold">{profile.recommendedPriority}</div>
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-blue-500 mb-1">目标人群</div>
                          <p className="opacity-90">{profile.targetAudience}</p>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-blue-500 mb-1">关键任务</div>
                          <p className="opacity-90">{profile.keyTasks.join(' / ')}</p>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-blue-500 mb-1">主要阻力</div>
                          <p className="opacity-90">{profile.primaryFrictions.join(' / ') || '暂无足够高频阻力证据'}</p>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-rose-500 mb-1">高频需求</div>
                          <p className="opacity-90">{profile.unmetNeeds.join(' / ') || '暂无足够高频需求证据'}</p>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-blue-500 mb-1">价值信号</div>
                          <p className="opacity-90">{profile.valueSignals.join(' / ') || '暂无足够高频价值信号'}</p>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-emerald-500 mb-1">建议价值主张</div>
                          <p className="font-medium text-emerald-700">{profile.recommendedMessage}</p>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-purple-500 mb-1">优先级判断说明</div>
                          <p className="font-medium text-purple-700">{profile.priorityReason}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="rounded-xl bg-white/80 border border-blue-100 px-3 py-3">
                            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-blue-500 mb-2">Product Actions</div>
                            <div className="space-y-1">
                              {profile.productActions.map((action) => (
                                <div key={`${profile.scenario}-product-${action.text}`} className="rounded-lg border border-blue-100 bg-slate-50/70 px-3 py-2">
                                  <p className="text-[12px] font-medium text-slate-700">{action.text}</p>
                                  <p className="mt-1 text-[11px] text-slate-500">支撑痛点：{action.supportingPains.join(' / ') || '暂无'}</p>
                                  <p className="text-[11px] text-slate-500">支撑需求：{action.supportingNeeds.join(' / ') || '暂无'}</p>
                                  <p className="text-[11px] text-slate-500">证据：{action.evidenceSnippets[0] || '暂无代表证据'}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-xl bg-white/80 border border-blue-100 px-3 py-3">
                            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-emerald-500 mb-2">Messaging Actions</div>
                            <div className="space-y-1">
                              {profile.messagingActions.map((action) => (
                                <div key={`${profile.scenario}-message-${action.text}`} className="rounded-lg border border-emerald-100 bg-slate-50/70 px-3 py-2">
                                  <p className="text-[12px] font-medium text-slate-700">{action.text}</p>
                                  <p className="mt-1 text-[11px] text-slate-500">支撑痛点：{action.supportingPains.join(' / ') || '暂无'}</p>
                                  <p className="text-[11px] text-slate-500">支撑需求：{action.supportingNeeds.join(' / ') || '暂无'}</p>
                                  <p className="text-[11px] text-slate-500">证据：{action.evidenceSnippets[0] || '暂无代表证据'}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-xl bg-white/80 border border-blue-100 px-3 py-3">
                            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-rose-500 mb-2">GTM Actions</div>
                            <div className="space-y-1">
                              {profile.gtmActions.map((action) => (
                                <div key={`${profile.scenario}-gtm-${action.text}`} className="rounded-lg border border-rose-100 bg-slate-50/70 px-3 py-2">
                                  <p className="text-[12px] font-medium text-slate-700">{action.text}</p>
                                  <p className="mt-1 text-[11px] text-slate-500">支撑痛点：{action.supportingPains.join(' / ') || '暂无'}</p>
                                  <p className="text-[11px] text-slate-500">支撑需求：{action.supportingNeeds.join(' / ') || '暂无'}</p>
                                  <p className="text-[11px] text-slate-500">证据：{action.evidenceSnippets[0] || '暂无代表证据'}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 mb-1">代表评论证据</div>
                          <div className="space-y-2">
                            {profile.exampleSnippets.map((example) => (
                              <div key={`${profile.scenario}-${example}`} className="rounded-xl bg-white/80 border border-blue-100 px-3 py-2 text-[12px] text-slate-600">
                                {example}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
               </div>
             ) : (
               <InsufficientEvidenceNotice text="当前样本不足以形成可信的商业场景画像，建议先扩充带明确任务和场景描述的评论样本。" />
             )}
          </div>
        </div>
        <AIInterpretation text={data.aiInterpretations.use_cases} />
      </div>
    </section>
  );
}

interface AnalysisReportProps {
  data: AnalysisReportData;
}

export default function AnalysisReport({ data }: AnalysisReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    
    setIsDownloading(true);
    try {
      const element = reportRef.current;
      const [htmlToImage, jsPdfModule] = await Promise.all([
        import('html-to-image'),
        import('jspdf'),
      ]);
      const JsPDF = jsPdfModule.default;
      
      const dataUrl = await htmlToImage.toPng(element, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#f8fafc',
      });

      const pdf = new JsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // We need to get the image dimensions. Since it's a PNG from html-to-image, 
      // we can create a temporary image object or use the element's client dimensions.
      const img = new Image();
      img.src = dataUrl;
      
      await new Promise((resolve) => (img.onload = resolve));
      
      const imgWidth = img.width;
      const imgHeight = img.height;
      
      const imgScaledWidth = pdfWidth;
      const imgScaledHeight = (imgHeight * pdfWidth) / imgWidth;
      
      let heightLeft = imgScaledHeight;
      let position = 0;

      pdf.addImage(dataUrl, 'PNG', 0, position, imgScaledWidth, imgScaledHeight);
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgScaledHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, imgScaledWidth, imgScaledHeight);
        heightLeft -= pdfHeight;
      }

      const fileName = 'AI_Review_Analysis_Report.pdf';
      const blob = pdf.output('blob');
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      link.rel = 'noopener';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Fallback for embedded/in-app browsers that suppress the download prompt:
      // open the generated PDF in a new tab so the user can still preview/save it.
      setTimeout(() => {
        window.open(objectUrl, '_blank', 'noopener,noreferrer');
      }, 150);

      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 60_000);
    } catch (error: any) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Error: ' + (error?.message || 'Unknown error'));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div ref={reportRef} className="space-y-16 py-8 bg-slate-50 px-8 rounded-[2rem]">
      <header className="flex items-center justify-between px-2 mb-12 border-b border-slate-200 pb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            可视化分析报告 (Detailed Report)
          </h1>
          <p className="text-slate-400 font-medium mt-1">
            {data.app?.title || data.job.packageName} · {data.reviews.length} AI-processed Google Play reviews
          </p>
        </div>
        <div className="flex items-center gap-4">
           <div className="text-right">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Report ID</div>
              <div className="text-sm font-mono font-bold text-blue-600">{data.job.id.slice(0, 8).toUpperCase()}</div>
           </div>
           <div className="h-10 w-[1px] bg-slate-200 mx-2"></div>
           <button 
              disabled={isDownloading}
              onClick={handleDownloadPDF}
              className="group flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-200"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  GENERATING...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                  DOWNLOAD PDF
                </>
              )}
           </button>
        </div>
      </header>

      <ModuleExecutiveSummary data={data} />
      <ModuleOverview data={data} />
      <ModuleTrends data={data} />
      <ModuleDeepDive data={data} />
      <ModuleActionable data={data} />
      <ModuleOpportunity data={data} />
      <ModuleChurn data={data} />
      <ModulePersona data={data} />

      <footer className="pt-20 text-center">
         <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full text-[10px] font-bold text-blue-600 uppercase tracking-widest">
            <Zap className="w-3 h-3" />
            AI Pipeline Engine v2.4 (Enterprise Edition)
         </div>
         <p className="text-slate-300 text-[10px] mt-4 tracking-widest">PRODUCED FOR REAL-TIME DECISION SUPPORT SYSTEM</p>
      </footer>
    </div>
  );
}
