import { generateNarrative } from './deepseek';
import {
  canonicalizeUseCase,
  inferAppCategory,
  minimumUseCaseCount,
  resolvePainHierarchyCategory,
  resolvePainGain,
} from './insightRules';
import type {
  AnalysisJob,
  AnalysisReportData,
  AppInfo,
  FeatureRequestItem,
  MigrationItem,
  PainSignalGroupItem,
  PainToGainItem,
  PainSubIssueItem,
  PhraseItem,
  MonetizationJourneyStage,
  RawReview,
  ReportReview,
  ReviewAnalysis,
  Sentiment,
  TopicItem,
  TrendItem,
  TrustMatrixItem,
  UseCaseItem,
  UseCaseProfileItem,
  ScenarioActionItem,
  WordCloudItem,
  StrengthSignalItem,
} from '../shared/types';

const SENTIMENT_COLORS = {
  positive: '#10B981',
  neutral: '#F59E0B',
  negative: '#EF4444',
};

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'to',
  'of',
  'in',
  'on',
  'at',
  'by',
  'as',
  'is',
  'am',
  'be',
  'been',
  'being',
  'it',
  'its',
  'i',
  'im',
  "i'm",
  'ive',
  "i've",
  'me',
  'my',
  'mine',
  'we',
  'our',
  'ours',
  'us',
  'they',
  'them',
  'their',
  'theirs',
  'he',
  'him',
  'his',
  'she',
  'her',
  'hers',
  'for',
  'with',
  'that',
  'this',
  'you',
  'your',
  'app',
  'apps',
  'are',
  'was',
  'were',
  'but',
  'not',
  'have',
  'has',
  'had',
  'very',
  'really',
  'just',
  'can',
  'cannot',
  'cant',
  'use',
  'using',
  'used',
  'too',
  'all',
  'get',
  'got',
  'one',
  'from',
  'when',
  'while',
  'where',
  'which',
  'what',
  'why',
  'how',
  'after',
  'before',
  'into',
  'out',
  'more',
  'less',
  'than',
  'then',
  'there',
  'here',
  'also',
  'still',
  'even',
  'only',
  'again',
  'ever',
  'much',
  'many',
  'lot',
  'lots',
  'thing',
  'things',
  'overall',
  'something',
  'anything',
  'everything',
  'nothing',
  'app',
  'apps',
  'mobile',
  'desktop',
  'version',
  'versions',
  'service',
  'services',
  'product',
  'products',
  'team',
  'support',
  'company',
  'inc',
  'llc',
  'ltd',
  'co',
  'com',
  'www',
  'http',
  'https',
]);

const WEAK_DESCRIPTOR_WORDS = new Set([
  'great',
  'good',
  'nice',
  'best',
  'amazing',
  'awesome',
  'excellent',
  'perfect',
  'fine',
  'okay',
  'ok',
  'bad',
  'poor',
  'terrible',
  'horrible',
  'awful',
  'love',
  'like',
  'wow',
]);

const SHORT_UPPERCASE_TERMS = new Set(['ai', 'ui', 'ux', 'api', 'pdf']);
const GENERIC_PHRASES = new Set([
  'general',
  'general satisfaction',
  'overall experience',
  'positive experience',
  'negative experience',
  'great app',
  'good app',
  'great productivity',
  'productivity tool',
  'great productivity tool',
  'great app for now',
  'set it up',
  'working well',
]);

const GENERIC_STRENGTH_CATEGORIES = new Set([
  'General Satisfaction',
  'General Experience',
  'Positive Experience',
  'Brief Positive Praise',
]);

type PhraseSentimentStats = {
  positive: number;
  neutral: number;
  negative: number;
};

const PAIN_SIGNAL_RULES: Array<{ label: string; patterns: RegExp[] }> = [
  { label: 'Authentication', patterns: [/auth/i, /sign in/i, /google sign/i, /login/i] },
  { label: 'Support', patterns: [/no human support/i, /support ticket/i, /support token/i, /ai only support/i, /closed without resolution/i, /no support/i] },
  { label: 'Credit System', patterns: [/credit system/i, /credits not reset/i, /credit purchases/i, /credits?/i] },
  { label: 'Account Access', patterns: [/unable to access app/i, /access app/i, /account permanently blocked/i, /account blocked/i, /account restriction/i, /account violation/i, /false violation/i] },
  { label: 'Free Trial', patterns: [/free trial/i, /trial length/i, /trial app/i] },
  { label: 'Aggressive Paywall', patterns: [/paywall/i, /worth downloading/i, /limited free version/i, /small fortune/i] },
  { label: 'Login Loop', patterns: [/login loop/i, /redirect loop/i, /stuck.*login/i] },
  { label: 'False Root Detection', patterns: [/root/i, /jailbreak/i, /non rooted/i, /false alarm/i] },
  { label: 'Battery Drain', patterns: [/battery/i, /drain/i] },
  { label: 'Privacy Concerns', patterns: [/privacy/i, /data concern/i, /security concern/i] },
  { label: 'Unwanted Recording', patterns: [/overnight recording/i, /unwanted recording/i, /records by itself/i] },
  { label: 'Widgets', patterns: [/widget/i] },
  { label: 'Regression', patterns: [/regression/i, /recent updates broke/i, /new updates broke/i, /broke functionality/i] },
  { label: 'Tablet Compatibility', patterns: [/vertical mode on tablet/i, /tablet/i] },
  { label: 'Hardware Reliability', patterns: [/won't charge/i, /won't turn on/i, /notepin not working/i, /hardware/i] },
  { label: 'Server Reliability', patterns: [/busy servers/i, /server/i] },
  { label: 'Stability', patterns: [/stability/i, /crash/i, /buggy/i, /unreliable/i, /app keeps closing/i] },
  { label: 'Performance', patterns: [/slow/i, /lag/i, /performance/i] },
  { label: 'UI/UX', patterns: [/ui/i, /ux/i, /user interface/i, /white ui/i, /no dark mode/i] },
  { label: 'Pricing', patterns: [/pricing/i, /price/i, /cost/i, /expensive/i, /subscription/i, /pro\/unlimited/i, /high subscription cost/i, /service is rather expensive/i, /too expensive/i, /paying for subscription/i, /annual plan/i, /\$[0-9]+/i] },
  { label: 'AI Accuracy', patterns: [/mislabels/i, /wrong speaker/i, /wrong person/i, /manual correction/i] },
  { label: 'Transcript Quality', patterns: [/transcription/i, /summary quality/i, /summary issue/i, /inaccurate filipino/i, /dictate corrections/i] },
  { label: 'Feature Gaps', patterns: [/feature not as advertised/i, /keyword search only/i, /not useful/i] },
];

const GENERIC_STRENGTH_PATTERNS = [
  /good app/i,
  /good apps/i,
  /great app/i,
  /nice app/i,
  /lovely app/i,
  /amazing app/i,
  /excellent app/i,
  /perfect app/i,
  /best app/i,
  /super app/i,
  /very good/i,
  /very happy/i,
  /positive overall impression/i,
  /general appreciation/i,
  /helpful app/i,
  /works well/i,
  /very helpful/i,
  /highly recommended/i,
  /will recommend/i,
];

const STRENGTH_SIGNAL_RULES: Array<{ label: string; patterns: RegExp[] }> = [
  { label: 'Good Usability', patterns: [/good usability/i, /easy to use/i, /user[- ]?friendly/i, /easy to navigate/i] },
  { label: 'Useful Functionality', patterns: [/useful functionality/i, /very useful/i, /helpful functionality/i, /useful app/i, /daily use value/i] },
  { label: 'Accurate Transcription', patterns: [/accurate transcription/i, /exact transcription/i, /improved transcription/i, /excellent transcript/i, /transcript result/i, /voice to text/i] },
  { label: 'Translation Support', patterns: [/translation feature/i, /translation/i, /multilingual/i, /caption translation/i] },
  { label: 'Fast Performance', patterns: [/fast performance/i, /good and fast/i, /quick response/i, /smooth performance/i] },
  { label: 'Productivity Support', patterns: [/makes work easier/i, /productivity/i, /good for journalism/i, /work much easier/i] },
  { label: 'AI Assistance', patterns: [/ai integration/i, /ai summar/i, /ai assistance/i] },
];

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function titleCase(value: string) {
  return value
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeWord(value: string) {
  return value
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/^'+|'+$/g, '')
    .replace(/'s$/, '');
}

function tokenize(value: string): string[] {
  return (value.toLowerCase().match(/[a-z][a-z0-9']{1,}/g) || [])
    .map((token) => normalizeWord(token))
    .filter(Boolean);
}

function formatTokens(tokens: string[]) {
  return tokens
    .map((token) => (SHORT_UPPERCASE_TERMS.has(token) ? token.toUpperCase() : titleCase(token)))
    .join(' ');
}

function buildExcludedTerms(app: AppInfo | null | undefined) {
  const excluded = new Set<string>();
  const sources = [app?.title, app?.developer, app?.appId];

  for (const source of sources) {
    for (const token of tokenize(source || '')) {
      if (token.length >= 3) excluded.add(token);
    }
  }

  return excluded;
}

function monthOf(date: string) {
  return date.slice(0, 7) || 'Unknown';
}

function countValues(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const cleaned = titleCase(value);
    if (!cleaned) continue;
    counts.set(cleaned, (counts.get(cleaned) || 0) + 1);
  }
  return counts;
}

function normalizedLabelCounts(values: string[], app: AppInfo | null | undefined) {
  const excludedTerms = buildExcludedTerms(app);
  const counts = new Map<string, number>();

  for (const value of values) {
    const tokens = tokenize(value);
    if (!tokens.length || !isUsefulPhrase(tokens, excludedTerms)) continue;
    const label = formatTokens(tokens);
    if (isGenericPhrase(label)) continue;
    counts.set(label, (counts.get(label) || 0) + 1);
  }

  return counts;
}

function normalizeStrengthLabel(value: string) {
  const text = value.trim();
  if (!text) return null;

  for (const rule of STRENGTH_SIGNAL_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      return rule.label;
    }
  }

  return titleCase(text);
}

function normalizedStrengthCounts(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const normalized = normalizeStrengthLabel(value);
    if (!normalized || isGenericPhrase(normalized)) continue;
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  }
  return counts;
}

function topFromMap<T>(counts: Map<string, number>, limit: number, mapItem: (name: string, count: number) => T): T[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => mapItem(name, count));
}

function isMeaningfulToken(token: string, excludedTerms: Set<string>) {
  return !STOP_WORDS.has(token) && !WEAK_DESCRIPTOR_WORDS.has(token) && !excludedTerms.has(token);
}

function isUsefulPhrase(tokens: string[], excludedTerms: Set<string>) {
  if (!tokens.length) return false;
  if (STOP_WORDS.has(tokens[0]) || STOP_WORDS.has(tokens[tokens.length - 1])) return false;
  if (tokens.every((token) => !isMeaningfulToken(token, excludedTerms))) return false;
  return true;
}

function isGenericPhrase(label: string) {
  const normalized = label.toLowerCase();
  return GENERIC_PHRASES.has(normalized);
}

function mergeCounts(target: Map<string, number>, source: Map<string, number>, weight = 1) {
  for (const [key, value] of source.entries()) {
    target.set(key, (target.get(key) || 0) + value * weight);
  }
}

function incrementSentimentStat(
  target: Map<string, PhraseSentimentStats>,
  label: string,
  sentiment: Sentiment,
  amount = 1,
) {
  const current = target.get(label) || { positive: 0, neutral: 0, negative: 0 };
  current[sentiment] += amount;
  target.set(label, current);
}

function countExplicitPhrases(values: string[], excludedTerms: Set<string>) {
  const counts = new Map<string, number>();

  for (const value of values) {
    const tokens = tokenize(value);
    if (!isUsefulPhrase(tokens, excludedTerms)) continue;
    const label = formatTokens(tokens);
    counts.set(label, (counts.get(label) || 0) + 1);
  }

  return counts;
}

function normalizePainSignal(value: string) {
  const text = value.trim();
  if (!text) return null;

  for (const rule of PAIN_SIGNAL_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      return rule.label;
    }
  }

  return titleCase(text);
}

function normalizeTopicLabel(value: string) {
  const text = value.trim();
  if (!text) return null;
  if (/transcription quality|transcription accuracy|translation accuracy|translation quality/i.test(text)) {
    return 'Accurate Transcription';
  }
  if (/transcription/i.test(text)) return 'Accurate Transcription';
  if (/usability|ui\/ux/i.test(text)) return 'Good Usability';
  if (/productivity|use case|journalism/i.test(text)) return 'Productivity Support';
  if (/performance/i.test(text)) return 'Fast Performance';
  if (/functionality/i.test(text)) return 'Useful Functionality';
  if (/language support|translation/i.test(text)) return 'Translation Support';
  if (/ai summaries|ai integration/i.test(text)) return 'AI Assistance';
  return null;
}

function normalizeStrengthSignal(value: string, topics: string[], summary: string) {
  const text = `${value} ${summary}`.trim();
  if (!text) return null;

  for (const rule of STRENGTH_SIGNAL_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      return rule.label;
    }
  }

  const hasGenericPraise = GENERIC_STRENGTH_PATTERNS.some((pattern) => pattern.test(text));
  if (hasGenericPraise) {
    for (const topic of topics) {
      const normalized = normalizeTopicLabel(topic);
      if (normalized) return normalized;
    }
    return null;
  }

  return titleCase(value.trim());
}

function normalizedPainCounts(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const normalized = normalizePainSignal(value);
    if (!normalized || isGenericPhrase(normalized)) continue;
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  }
  return counts;
}

function inferFallbackTopics(analysis: ReviewAnalysis): string[] {
  const source = `${analysis.summary} ${analysis.painPoints.join(' ')} ${analysis.featureRequests.join(' ')}`.toLowerCase();

  const inferred = new Set<string>();

  const tryAdd = (label: string, patterns: RegExp[]) => {
    if (patterns.some((pattern) => pattern.test(source))) {
      inferred.add(label);
    }
  };

  tryAdd('Pricing', [/price/i, /pricing/i, /subscription/i, /expensive/i, /cost/i, /refund/i]);
  tryAdd('Accuracy', [/accur/i, /incorrect/i, /wrong/i, /mistake/i, /translation quality/i, /transcription quality/i]);
  tryAdd('Language Support', [/language/i, /arabic/i, /filipino/i, /translation/i, /translate/i]);
  tryAdd('UI/UX', [/ui/i, /ux/i, /interface/i, /layout/i, /design/i, /dark mode/i]);
  tryAdd('Functionality', [/feature/i, /function/i, /not working/i, /does not work/i, /broken/i, /missing/i]);
  tryAdd('Performance', [/slow/i, /lag/i, /speed/i, /performance/i, /loading/i]);
  tryAdd('Stability', [/crash/i, /bug/i, /unstable/i, /freeze/i, /close/i]);
  tryAdd('Recording', [/record/i, /audio/i, /voice/i, /mic/i, /microphone/i]);
  tryAdd('Transcription Quality', [/transcript/i, /transcription/i, /summary/i, /note/i, /notes/i]);
  tryAdd('Battery', [/battery/i, /power/i, /drain/i]);
  tryAdd('Authentication', [/login/i, /sign in/i, /account/i, /password/i, /google sign/i]);
  tryAdd('Connectivity', [/sync/i, /network/i, /upload/i, /download/i, /server/i]);

  if (inferred.size) {
    return [...inferred].slice(0, 2);
  }

  if (analysis.intent === 'feature_request') return ['Feature Requests'];
  if (analysis.intent === 'bug_report') return ['Bugs'];
  if (analysis.intent === 'complaint') return ['User Friction'];
  if (analysis.intent === 'praise') return ['General Satisfaction'];
  return ['Miscellaneous'];
}

function buildPhraseList(counts: Map<string, number>, limit: number): PhraseItem[] {
  const filtered = new Map<string, number>();
  for (const [name, count] of counts.entries()) {
    if (isGenericPhrase(name)) continue;
    filtered.set(name, count);
  }
  return topFromMap(filtered, limit, (name, count) => ({ text: name, count }));
}

function collectSentimentPhrases(
  target: Map<string, PhraseSentimentStats>,
  values: string[],
  sentiment: Sentiment,
  excludedTerms: Set<string>,
  weight = 1,
) {
  const phrases = countExplicitPhrases(values, excludedTerms);
  for (const [label, count] of phrases.entries()) {
    incrementSentimentStat(target, label, sentiment, count * weight);
  }
}

function collectPainSignals(
  target: Map<string, PhraseSentimentStats>,
  values: string[],
  sentiment: Sentiment,
  weight = 1,
) {
  for (const value of values) {
    const normalized = normalizePainSignal(value);
    if (!normalized) continue;
    incrementSentimentStat(target, normalized, sentiment, weight);
  }
}

function rankDiscriminativePhrases(
  stats: Map<string, PhraseSentimentStats>,
  desired: Sentiment,
  limit: number,
): PhraseItem[] {
  const opposite: Sentiment = desired === 'positive' ? 'negative' : 'positive';

  return [...stats.entries()]
    .filter(([name]) => !isGenericPhrase(name))
    .map(([name, counts]) => {
      const desiredCount = counts[desired];
      const oppositeCount = counts[opposite];
      const neutralCount = counts.neutral;
      const dominance = desiredCount - oppositeCount;
      const score = desiredCount * 3 - oppositeCount * 4 - neutralCount;
      return { text: name, count: desiredCount, score, dominance, oppositeCount };
    })
    .filter((item) => item.count > 0 && item.dominance > 0 && item.score > 0)
    .sort((a, b) => b.score - a.score || b.dominance - a.dominance || b.count - a.count)
    .slice(0, limit)
    .map(({ text, count }) => ({ text, count }));
}

function buildProsPhrases(
  analyses: ReviewAnalysis[],
  app: AppInfo | null,
  limit: number,
) {
  const counts = new Map<string, number>();
  const positiveAnalyses = analyses.filter((analysis) => analysis.sentiment === 'positive');

  for (const analysis of positiveAnalyses) {
    const sourceStrengths = analysis.strengths.length ? analysis.strengths : [''];
    const labels = new Set<string>();

    for (const strength of sourceStrengths) {
      const normalized = normalizeStrengthSignal(strength, analysis.topics, analysis.summary);
      if (normalized) labels.add(normalized);
    }

    if (!labels.size) {
      for (const topic of analysis.topics) {
        const normalized = normalizeTopicLabel(topic);
        if (normalized) labels.add(normalized);
      }
    }

    for (const label of labels) {
      counts.set(label, (counts.get(label) || 0) + 1);
    }
  }

  return buildPhraseList(counts, limit);
}

function buildConsPhrases(
  analyses: ReviewAnalysis[],
  app: AppInfo | null,
  limit: number,
) {
  const excludedTerms = buildExcludedTerms(app);
  const stats = new Map<string, PhraseSentimentStats>();

  for (const analysis of analyses) {
    collectSentimentPhrases(stats, analysis.topics, analysis.sentiment, excludedTerms, 1);
    collectPainSignals(stats, analysis.painPoints, analysis.sentiment, 2);
  }

  return rankDiscriminativePhrases(stats, 'negative', limit);
}

function buildNeutralPhrases(
  analyses: ReviewAnalysis[],
  app: AppInfo | null,
  limit: number,
) {
  const counts = normalizedLabelCounts(analyses.flatMap((analysis) => analysis.neutralSignals), app);
  return buildPhraseList(counts, limit);
}

function wordCloud(
  items: PhraseItem[],
  app: AppInfo | null,
  options?: { preserveLabels?: boolean },
): WordCloudItem[] {
  if (options?.preserveLabels) {
    const max = Math.max(1, items[0]?.count || 1);
    return items.slice(0, 10).map((item) => ({
      text: item.text,
      size: Math.max(18, Math.round(18 + (item.count / max) * 30)),
      weight: String(Math.max(400, Math.round(400 + (item.count / max) * 400))),
    }));
  }

  const excludedTerms = buildExcludedTerms(app);
  const counts = new Map<string, number>();

  for (const item of items) {
    for (const token of tokenize(item.text)) {
      if (!isMeaningfulToken(token, excludedTerms)) continue;
      const label = SHORT_UPPERCASE_TERMS.has(token) ? token.toUpperCase() : titleCase(token);
      counts.set(label, (counts.get(label) || 0) + item.count);
    }
  }

  const ranked = topFromMap(counts, 10, (text, count) => ({ text, count }));
  const max = Math.max(1, ranked[0]?.count || 1);

  return ranked.map((item) => ({
    text: item.text,
    size: Math.max(18, Math.round(18 + (item.count / max) * 30)),
    weight: String(Math.max(400, Math.round(400 + (item.count / max) * 400))),
  }));
}

function priority(count: number, max: number): FeatureRequestItem['priority'] {
  if (count >= max * 0.65) return 'High';
  if (count >= max * 0.35) return 'Medium';
  return 'Low';
}

function evidenceStrength(count: number): 'High' | 'Medium' | 'Low' {
  if (count >= 15) return 'High';
  if (count >= 6) return 'Medium';
  return 'Low';
}

function buildEvidenceSnippet(value: string, maxLength = 120) {
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function marketAngleForStrength(category: string) {
  if (category === 'Good Usability') return '可转写为“更低学习成本、更快上手”的核心采用卖点。';
  if (category === 'Useful Functionality') return '可转写为“功能直达结果、无需额外学习”的价值主张。';
  if (category === 'Fast Performance') return '可包装为“更快完成关键任务、更少流程中断”的效率收益。';
  if (category === 'Strong Encryption') return '适合面向企业与高信任行业强调“安全、合规、可放心签署”。';
  if (category === 'Easy Signing Process') return '可包装为“更短完成路径、更少步骤”的签署转化卖点。';
  return '可作为竞品已被用户认可的能力资产，进一步提炼成市场可传播的购买理由。';
}

function growthAngleForScenario(scenario: string) {
  const lower = scenario.toLowerCase();
  if (lower.includes('account onboarding')) return '这是阻断式增长场景，优先修复可直接改善新用户转化与激活率。';
  if (lower.includes('travel booking')) return '这是高意图转化场景，优化后可直接影响下单率与收入。';
  if (lower.includes('trip management')) return '这是高频留存场景，优化后更容易提升复购与订单管理满意度。';
  if (lower.includes('travel support')) return '这是风险控制场景，改善后可显著降低差评和退款争议。';
  if (lower.includes('professional productivity')) return '这是高粘性工作流场景，适合作为持续留存与升级转化抓手。';
  return '这是具备增长价值的核心场景，适合作为产品与市场共用的战略切入点。';
}

function buildStrengthHierarchy(analyses: ReviewAnalysis[], reviews: RawReview[]) {
  const reviewBySourceKey = new Map(reviews.map((review) => [review.sourceKey, review]));
  const counts = new Map<string, {
    count: number;
    subSignals: Map<string, { count: number; examples: string[] }>;
  }>();

  for (const analysis of analyses.filter((item) => item.sentiment === 'positive')) {
    const baseLabels = analysis.strengths.length ? analysis.strengths : analysis.topics;
    const review = reviewBySourceKey.get(analysis.sourceKey);
    const evidenceSnippet = buildEvidenceSnippet(
      review?.analysisText || review?.translatedText || review?.content || analysis.summary,
    );

    for (const value of baseLabels) {
      const category = normalizeStrengthSignal(value, analysis.topics, analysis.summary);
      if (!category) continue;
      const bucket = counts.get(category) || {
        count: 0,
        subSignals: new Map<string, { count: number; examples: string[] }>(),
      };
      bucket.count += 1;
      const label = value.trim() || analysis.summary;
      const current = bucket.subSignals.get(label) || { count: 0, examples: [] };
      current.count += 1;
      if (evidenceSnippet && current.examples.length < 3 && !current.examples.includes(evidenceSnippet)) {
        current.examples.push(evidenceSnippet);
      }
      bucket.subSignals.set(label, current);
      counts.set(category, bucket);
    }
  }

  return [...counts.entries()]
    .filter(([category]) => !GENERIC_STRENGTH_CATEGORIES.has(category))
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([category, payload]): StrengthSignalItem => ({
      category,
      count: payload.count,
      evidenceStrength: evidenceStrength(payload.count),
      marketAngle: marketAngleForStrength(category),
      subSignals: [...payload.subSignals.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3)
        .map(([label, detail]) => ({
          label,
          count: detail.count,
          example: detail.examples[0] || label,
          examples: detail.examples,
        })),
    }));
}

function buildFeatureHierarchy(analyses: ReviewAnalysis[], reviews: RawReview[]) {
  const reviewBySourceKey = new Map(reviews.map((review) => [review.sourceKey, review]));
  const counts = new Map<string, {
    count: number;
    subRequests: Map<string, { count: number; examples: string[] }>;
  }>();

  for (const analysis of analyses) {
    const review = reviewBySourceKey.get(analysis.sourceKey);
    const evidenceSnippet = buildEvidenceSnippet(
      review?.analysisText || review?.translatedText || review?.content || analysis.summary,
    );

    for (const request of analysis.featureRequests) {
      const category = normalizePainSignal(request) || titleCase(request);
      const bucket = counts.get(category) || {
        count: 0,
        subRequests: new Map<string, { count: number; examples: string[] }>(),
      };
      bucket.count += 1;
      const label = request.trim();
      const current = bucket.subRequests.get(label) || { count: 0, examples: [] };
      current.count += 1;
      if (evidenceSnippet && current.examples.length < 3 && !current.examples.includes(evidenceSnippet)) {
        current.examples.push(evidenceSnippet);
      }
      bucket.subRequests.set(label, current);
      counts.set(category, bucket);
    }
  }

  const maxCount = Math.max(1, ...[...counts.values()].map((item) => item.count));
  return [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([category, payload]): FeatureRequestItem => ({
      category,
      count: payload.count,
      priority: priority(payload.count, maxCount),
      evidenceStrength: evidenceStrength(payload.count),
      subRequests: [...payload.subRequests.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3)
        .map(([label, detail]) => ({
          label,
          count: detail.count,
          example: detail.examples[0] || label,
          examples: detail.examples,
        })),
    }));
}

function iconForPain(pain: string): PainToGainItem['icon'] {
  const lower = pain.toLowerCase();
  if (lower.includes('pricing') || lower.includes('billing')) return 'Download';
  if (lower.includes('privacy') || lower.includes('authentication') || lower.includes('stability')) return 'Shield';
  if (lower.includes('performance') || lower.includes('ui') || lower.includes('ux')) return 'Zap';
  return 'MousePointer2';
}

function buildPainHierarchy(analyses: ReviewAnalysis[], reviews: RawReview[]) {
  const reviewBySourceKey = new Map(reviews.map((review) => [review.sourceKey, review]));
  const categories = new Map<string, {
    count: number;
    subIssues: Map<string, { count: number; examples: string[] }>;
  }>();

  for (const analysis of analyses) {
    const labels = [
      ...analysis.painPoints,
      ...analysis.topics.filter((topic) => analysis.sentiment === 'negative'),
    ];
    const review = reviewBySourceKey.get(analysis.sourceKey);
    const evidenceSnippet = buildEvidenceSnippet(
      review?.analysisText || review?.translatedText || review?.content || analysis.summary,
    );

    for (const label of labels) {
      const resolved = resolvePainHierarchyCategory(label);
      if (!resolved) continue;
      const bucket = categories.get(resolved.category) || {
        count: 0,
        subIssues: new Map<string, { count: number; examples: string[] }>(),
      };
      bucket.count += 1;
      const current = bucket.subIssues.get(label) || { count: 0, examples: [] };
      current.count += 1;
      if (evidenceSnippet && current.examples.length < 3 && !current.examples.includes(evidenceSnippet)) {
        current.examples.push(evidenceSnippet);
      }
      bucket.subIssues.set(label, current);
      categories.set(resolved.category, bucket);
    }
  }

  return [...categories.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6)
    .map(([category, payload]): PainSignalGroupItem => {
      const subIssues: PainSubIssueItem[] = [...payload.subIssues.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 4)
        .map(([label, detail]) => ({
          label,
          count: detail.count,
          example: detail.examples[0] || label,
          examples: detail.examples.length ? detail.examples : [label],
        }));

      return {
        category,
        count: payload.count,
        evidenceStrength: evidenceStrength(payload.count),
        subIssues,
      };
    });
}

function useCaseRadar(analyses: ReviewAnalysis[], app: AppInfo | null): UseCaseItem[] {
  const category = inferAppCategory(app);
  const counts = new Map<string, number>();

  for (const analysis of analyses) {
    for (const label of analysis.useCaseLabels) {
      const normalized = canonicalizeUseCase(label, category);
      if (!normalized) continue;
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }
  }

  const total = Math.max(1, analyses.length);
  const minCount = minimumUseCaseCount(total);
  const top = [...counts.entries()]
    .filter(([, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const maxCount = Math.max(1, top[0]?.[1] || 1);

  return top.map(([subject, count]) => ({
    subject,
    A: Math.min(150, Math.max(24, Math.round((count / maxCount) * 150))),
    fullMark: 150,
  }));
}

function inferAudienceForScenario(scenario: string) {
  const lower = scenario.toLowerCase();
  if (lower.includes('travel booking')) return '价格敏感、需要快速完成机酒预订的出行用户';
  if (lower.includes('trip management')) return '需要管理订单、改签退订和行程变更的高频出行用户';
  if (lower.includes('travel support')) return '在退款、改签、客服响应上更关注保障体验的售后敏感用户';
  if (lower.includes('knowledge capture')) return '需要沉淀会议、课堂或语音内容的知识型用户';
  if (lower.includes('translation')) return '跨语言沟通和阅读需求较强的国际化用户';
  if (lower.includes('professional productivity')) return '希望提升日常工作效率的职场用户';
  return '当前样本中最典型的高频使用人群';
}

function inferTasksForScenario(scenario: string) {
  const lower = scenario.toLowerCase();
  if (lower.includes('travel booking')) return ['搜索航班与酒店', '比较价格并下单', '快速完成预订决策'];
  if (lower.includes('trip management')) return ['查看订单', '修改行程', '处理取消与退款'];
  if (lower.includes('travel support')) return ['联系售后', '追踪退款进度', '解决出票与改签问题'];
  if (lower.includes('knowledge capture')) return ['记录语音内容', '整理笔记', '回看和提取重点'];
  if (lower.includes('translation')) return ['跨语言阅读', '翻译字幕或文本', '处理多语言沟通'];
  if (lower.includes('professional productivity')) return ['提高工作效率', '完成日常事务', '减少流程阻力'];
  return ['完成核心任务', '降低流程阻力', '提升结果质量'];
}

function actionPlanForScenario(
  scenario: string,
  primaryFrictions: string[],
  unmetNeeds: string[],
  evidenceSnippets: string[],
): {
  productActions: ScenarioActionItem[];
  messagingActions: ScenarioActionItem[];
  gtmActions: ScenarioActionItem[];
} {
  const lower = scenario.toLowerCase();
  const makeAction = (text: string, pains: string[] = [], needs: string[] = []): ScenarioActionItem => ({
    text,
    supportingPains: pains,
    supportingNeeds: needs,
    evidenceSnippets: evidenceSnippets.slice(0, 2),
  });

  if (lower.includes('travel booking')) {
    return {
      productActions: [
        makeAction('优化价格展示与订单确认流程，降低预订决策中的不确定感。', primaryFrictions, unmetNeeds),
        primaryFrictions[0]
          ? makeAction(`优先修复与“${primaryFrictions[0]}”相关的关键预订阻力。`, [primaryFrictions[0]], unmetNeeds)
          : makeAction('优先减少机酒搜索到下单链路中的高频摩擦。', primaryFrictions, unmetNeeds),
      ],
      messagingActions: [
        makeAction('突出“价格透明、快速预订、下单确定性”三项核心价值。', primaryFrictions, unmetNeeds),
        unmetNeeds[0]
          ? makeAction(`把“${unmetNeeds[0]}”转化成更清晰的购买承诺与卖点表达。`, primaryFrictions, [unmetNeeds[0]])
          : makeAction('强调更省心、更确定的预订体验。', primaryFrictions, unmetNeeds),
      ],
      gtmActions: [
        makeAction('围绕高意图出行用户设计预订场景专题页与转化漏斗。', primaryFrictions, unmetNeeds),
        makeAction('在价格敏感渠道测试“省时 + 省钱 + 更稳妥”的组合话术。', primaryFrictions, unmetNeeds),
      ],
    };
  }

  if (lower.includes('trip management')) {
    return {
      productActions: [
        makeAction('强化订单查看、改签退订、退款追踪等高频管理能力。', primaryFrictions, unmetNeeds),
        primaryFrictions[0]
          ? makeAction(`针对“${primaryFrictions[0]}”设计更明确的状态反馈与处理闭环。`, [primaryFrictions[0]], unmetNeeds)
          : makeAction('缩短售后和行程管理的关键路径。', primaryFrictions, unmetNeeds),
      ],
      messagingActions: [
        makeAction('突出“订单可控、改退清晰、售后可追踪”的信任型价值表达。', primaryFrictions, unmetNeeds),
        makeAction('把行程管理能力包装成高频出行用户的核心保障体验。', primaryFrictions, unmetNeeds),
      ],
      gtmActions: [
        makeAction('针对高频商务/跨境出行用户投放“行程管理效率”主题内容。', primaryFrictions, unmetNeeds),
        makeAction('在 CRM 触达中增加改签、退款、订单可视化等功能教育。', primaryFrictions, unmetNeeds),
      ],
    };
  }

  if (lower.includes('travel support')) {
    return {
      productActions: [
        makeAction('优先优化退款、改签、人工支持和问题闭环体验。', primaryFrictions, unmetNeeds),
        primaryFrictions[0]
          ? makeAction(`针对“${primaryFrictions[0]}”建立更明确的服务 SLA 和状态反馈。`, [primaryFrictions[0]], unmetNeeds)
          : makeAction('提升售后处理确定性与响应速度。', primaryFrictions, unmetNeeds),
      ],
      messagingActions: [
        makeAction('把“退款更清晰、客服更可达、问题可追踪”作为核心保障卖点。', primaryFrictions, unmetNeeds),
        unmetNeeds[0]
          ? makeAction(`围绕“${unmetNeeds[0]}”设计更具安全感的价值表述。`, primaryFrictions, [unmetNeeds[0]])
          : makeAction('降低用户对高风险决策的顾虑。', primaryFrictions, unmetNeeds),
      ],
      gtmActions: [
        makeAction('面向退款/售后敏感用户设计保障型营销落地页。', primaryFrictions, unmetNeeds),
        makeAction('通过用户教育内容强化售后流程透明度与信任心智。', primaryFrictions, unmetNeeds),
      ],
    };
  }

  return {
    productActions: [
      primaryFrictions[0]
        ? makeAction(`优先解决“${primaryFrictions[0]}”带来的关键任务阻力。`, [primaryFrictions[0]], unmetNeeds)
        : makeAction('优先减少该场景中的主要流程摩擦。', primaryFrictions, unmetNeeds),
      unmetNeeds[0]
        ? makeAction(`将“${unmetNeeds[0]}”转化为下一阶段的重点需求项。`, primaryFrictions, [unmetNeeds[0]])
        : makeAction('围绕高频未满足需求优化核心任务路径。', primaryFrictions, unmetNeeds),
    ],
    messagingActions: [
      makeAction('围绕该场景的关键任务与结果价值重写核心卖点。', primaryFrictions, unmetNeeds),
      primaryFrictions[0]
        ? makeAction(`直接回应用户对“${primaryFrictions[0]}”的顾虑。`, [primaryFrictions[0]], unmetNeeds)
        : makeAction('突出更省心、更可控的结果导向价值。', primaryFrictions, unmetNeeds),
    ],
    gtmActions: [
      makeAction('针对该场景设计专属落地页、案例内容和受众定向。', primaryFrictions, unmetNeeds),
      makeAction('用“场景任务 + 痛点回应 + 结果承诺”的结构测试转化话术。', primaryFrictions, unmetNeeds),
    ],
  };
}

function opportunityLevel(score: number): 'High' | 'Medium' | 'Low' {
  if (score >= 3) return 'High';
  if (score >= 2) return 'Medium';
  return 'Low';
}

function recommendedPriorityLevel(
  marketAttractiveness: UseCaseProfileItem['marketAttractiveness'],
  painIntensity: UseCaseProfileItem['painIntensity'],
  differentiationPotential: UseCaseProfileItem['differentiationPotential'],
): UseCaseProfileItem['recommendedPriority'] {
  const score =
    (marketAttractiveness === 'High' ? 2 : marketAttractiveness === 'Medium' ? 1 : 0) +
    (painIntensity === 'High' ? 2 : painIntensity === 'Medium' ? 1 : 0) +
    (differentiationPotential === 'High' ? 2 : differentiationPotential === 'Medium' ? 1 : 0);

  if (score >= 5) return 'P1';
  if (score >= 3) return 'P2';
  return 'P3';
}

function priorityReasonText(
  marketAttractiveness: UseCaseProfileItem['marketAttractiveness'],
  painIntensity: UseCaseProfileItem['painIntensity'],
  differentiationPotential: UseCaseProfileItem['differentiationPotential'],
  priority: UseCaseProfileItem['recommendedPriority'],
) {
  if (priority === 'P1') {
    return `因为市场吸引力${marketAttractiveness}、痛点强度${painIntensity}，且差异化潜力${differentiationPotential}，所以建议优先作为 P1 场景推进。`;
  }
  if (priority === 'P2') {
    return `因为该场景已经存在明确机会，但痛点或差异化潜力仍未同时达到最高，因此建议列为 P2，继续验证后投入。`;
  }
  return `因为当前评论量、痛点强度或差异化空间仍偏弱，所以更适合作为 P3 观察型场景，而不是立即重点投入。`;
}

function buildUseCaseProfiles(
  analyses: ReviewAnalysis[],
  reviews: RawReview[],
  app: AppInfo | null,
  painHierarchy: PainSignalGroupItem[],
  strengthHierarchy: StrengthSignalItem[],
  featureRequests: FeatureRequestItem[],
): UseCaseProfileItem[] {
  const category = inferAppCategory(app);
  const reviewBySourceKey = new Map(reviews.map((review) => [review.sourceKey, review]));
  const buckets = new Map<string, {
    count: number;
    examples: string[];
    analyses: ReviewAnalysis[];
  }>();

  for (const analysis of analyses) {
    const review = reviewBySourceKey.get(analysis.sourceKey);
    const snippet = buildEvidenceSnippet(
      review?.analysisText || review?.translatedText || review?.content || analysis.summary,
      140,
    );

    for (const label of analysis.useCaseLabels) {
      const normalized = canonicalizeUseCase(label, category);
      if (!normalized) continue;
      const current = buckets.get(normalized) || { count: 0, examples: [], analyses: [] };
      current.count += 1;
      if (snippet && current.examples.length < 3 && !current.examples.includes(snippet)) {
        current.examples.push(snippet);
      }
      current.analyses.push(analysis);
      buckets.set(normalized, current);
    }
  }

  const total = Math.max(1, analyses.length);
  const minCount = minimumUseCaseCount(total);
  const profiles = [...buckets.entries()]
    .filter(([, payload]) => payload.count >= minCount)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([scenario, payload]): UseCaseProfileItem => {
      const scenarioPainCounts = new Map<string, number>();
      const scenarioStrengthCounts = new Map<string, number>();
      const scenarioFeatureCounts = new Map<string, number>();

      for (const analysis of payload.analyses) {
        for (const pain of analysis.painPoints) {
          const normalizedPain = normalizePainSignal(pain);
          if (!normalizedPain) continue;
          scenarioPainCounts.set(normalizedPain, (scenarioPainCounts.get(normalizedPain) || 0) + 1);
        }

        for (const strength of analysis.strengths) {
          const normalizedStrength = normalizeStrengthSignal(strength, analysis.topics, analysis.summary);
          if (!normalizedStrength || GENERIC_STRENGTH_CATEGORIES.has(normalizedStrength)) continue;
          scenarioStrengthCounts.set(normalizedStrength, (scenarioStrengthCounts.get(normalizedStrength) || 0) + 1);
        }

        for (const request of analysis.featureRequests) {
          const normalizedRequest = normalizePainSignal(request) || titleCase(request);
          scenarioFeatureCounts.set(normalizedRequest, (scenarioFeatureCounts.get(normalizedRequest) || 0) + 1);
        }
      }

      const primaryFrictions = topFromMap(scenarioPainCounts, 3, (name) => name);
      const valueSignals = topFromMap(scenarioStrengthCounts, 3, (name) => name);
      const unmetNeeds = topFromMap(scenarioFeatureCounts, 3, (name) => name);

      const fallbackPrimaryFrictions = painHierarchy
        .slice(0, 2)
        .flatMap((group) => group.subIssues.slice(0, 2).map((subIssue) => subIssue.label))
        .slice(0, 3);

      const fallbackValueSignals = strengthHierarchy
        .slice(0, 2)
        .flatMap((group) => group.subSignals.slice(0, 2).map((signal) => signal.label))
        .slice(0, 3);

      const fallbackUnmetNeeds = featureRequests
        .slice(0, 2)
        .flatMap((group) => group.subRequests.slice(0, 2).map((request) => request.label))
        .slice(0, 3);

      const keyTasks = inferTasksForScenario(scenario);
      const targetAudience = inferAudienceForScenario(scenario);
      const effectiveFrictions = primaryFrictions.length ? primaryFrictions : fallbackPrimaryFrictions;
      const effectiveUnmetNeeds = unmetNeeds.length ? unmetNeeds : fallbackUnmetNeeds;
      const effectiveValueSignals = valueSignals.length ? valueSignals : fallbackValueSignals;
      const marketAttractiveness = opportunityLevel(
        payload.count >= 12 ? 3 : payload.count >= 6 ? 2 : 1,
      );
      const painIntensity = opportunityLevel(
        effectiveFrictions.length >= 3 ? 3 : effectiveFrictions.length >= 2 ? 2 : effectiveFrictions.length >= 1 ? 1 : 0,
      );
      const differentiationPotential = opportunityLevel(
        effectiveUnmetNeeds.length >= 2 && effectiveValueSignals.length >= 1
          ? 3
          : effectiveUnmetNeeds.length >= 1 || effectiveValueSignals.length >= 2
            ? 2
            : 1,
      );
      const recommendedPriority = recommendedPriorityLevel(
        marketAttractiveness,
        painIntensity,
        differentiationPotential,
      );
      const recommendedMessage =
        scenario === 'Travel Booking'
          ? '围绕“价格透明 + 快速预订 + 下单确定性”组织价值表达，弱化预订流程中的不确定感。'
          : scenario === 'Trip Management'
            ? '突出“订单可控、改退清晰、售后可追踪”，把行程管理体验作为核心信任卖点。'
            : scenario === 'Travel Support'
              ? '将“退款响应、客服跟进、问题闭环”包装成差异化保障能力，降低高风险决策顾虑。'
              : `围绕“${scenario}”场景强化价值主张，并优先回应相关高频阻力。`;
      const actionPlan = actionPlanForScenario(
        scenario,
        effectiveFrictions,
        effectiveUnmetNeeds,
        payload.examples,
      );

      return {
        scenario,
        reviewCount: payload.count,
        evidenceStrength: evidenceStrength(payload.count),
        growthAngle: growthAngleForScenario(scenario),
        targetAudience,
        keyTasks,
        primaryFrictions: effectiveFrictions,
        unmetNeeds: effectiveUnmetNeeds,
        valueSignals: effectiveValueSignals,
        recommendedMessage,
        marketAttractiveness,
        painIntensity,
        differentiationPotential,
        recommendedPriority,
        priorityReason: priorityReasonText(
          marketAttractiveness,
          painIntensity,
          differentiationPotential,
          recommendedPriority,
        ),
        productActions: actionPlan.productActions,
        messagingActions: actionPlan.messagingActions,
        gtmActions: actionPlan.gtmActions,
        exampleSnippets: payload.examples,
      };
    });

  return profiles;
}

function buildDealbreakerSummaryLabel(group: PainSignalGroupItem) {
  const topSubIssues = group.subIssues
    .slice(0, 3)
    .map((subIssue) => subIssue.label)
    .filter(Boolean);

  if (!topSubIssues.length) return group.category;
  return `${group.category}: ${topSubIssues.join(' / ')}`;
}

function buildExecutiveSummary(input: {
  app: AppInfo | null;
  overviewSentiment: AnalysisReportData['overviewSentiment'];
  painHierarchy: PainSignalGroupItem[];
  featureRequests: FeatureRequestItem[];
  strengthHierarchy: StrengthSignalItem[];
  useCaseProfiles: UseCaseProfileItem[];
}): AnalysisReportData['executiveSummary'] {
  const appTitle = input.app?.title || 'The app';
  const negative = input.overviewSentiment.find((item) => item.sentiment === 'Negative')?.count || 0;
  const total = input.overviewSentiment.reduce((sum, item) => sum + item.count, 0) || 1;
  const negativeShare = Math.round((negative / total) * 100);
  const topPain = input.painHierarchy[0];
  const secondPain = input.painHierarchy[1];
  const topFeature = input.featureRequests[0];
  const topStrength = input.strengthHierarchy[0];
  const topScenario = input.useCaseProfiles[0];

  return {
    headline: `${appTitle} 当前最强的负面风险集中在“${topPain?.category || '核心流程'}”，负面评论占比约 ${negativeShare}% ，属于需要优先处理的竞争性短板。`,
    biggestRisk: topPain
      ? `${topPain.category} 是当前最大风险，核心问题集中在 ${topPain.subIssues.slice(0, 3).map((item) => item.label).join(' / ')}。`
      : '当前样本尚未形成单一最大风险。',
    biggestOpportunity: topScenario
      ? `${topScenario.scenario} 是最值得优先争夺的增长场景，当前优先级为 ${topScenario.recommendedPriority}。${topScenario.growthAngle}`
      : '当前尚未形成高置信增长机会，需要补充更多场景样本。',
    immediateActions: [
      topPain
        ? `立即修复 ${topPain.subIssues.slice(0, 2).map((item) => item.label).join(' / ')} 相关阻断问题，先降低流失。`
        : '立即优先排查当前最高频负面链路。',
      topFeature
        ? `优先实现或重构“${topFeature.category}”相关能力，回应用户最集中的需求。`
        : '优先收敛高频需求，形成下一阶段产品动作清单。',
      topStrength
        ? `围绕“${topStrength.category}”重写市场价值表达，放大当前仍被认可的能力资产。`
        : '在修复主线问题前，避免过度放大不稳定的价值承诺。',
    ],
    strategicCaution: secondPain
      ? `不要只盯住主风险“${topPain?.category || '核心流程'}”，次级问题“${secondPain.category}”同样可能在修复后成为新的流失来源。`
      : '在主问题修复前，避免同时大幅扩张功能范围，以免分散资源。',
  };
}

function buildMonetizationJourneyDiagnosis(
  painHierarchy: PainSignalGroupItem[],
): AnalysisReportData['monetizationJourney'] {
  const monetizationGroup = painHierarchy.find((group) => group.category === 'Billing & Charges');
  if (!monetizationGroup || monetizationGroup.count < 3) return null;

  const allLabels = monetizationGroup.subIssues.map((item) => item.label.toLowerCase());
  const stageProblems = {
    preConversion: monetizationGroup.subIssues.filter((item) => /pricing|expensive|cost|price/i.test(item.label)),
    conversionGate: monetizationGroup.subIssues.filter((item) => /subscription|free trial|trial|paywall/i.test(item.label)),
    postPurchaseControl: monetizationGroup.subIssues.filter((item) => /billing|refund|cancellation|charge/i.test(item.label)),
  };

  const stages: MonetizationJourneyStage[] = [];

  if (stageProblems.preConversion.length) {
    stages.push({
      stage: 'Pre-conversion pricing transparency',
      problems: stageProblems.preConversion.map((item) => item.label),
      evidenceStrength: evidenceStrength(stageProblems.preConversion.reduce((sum, item) => sum + item.count, 0)),
      example: stageProblems.preConversion[0].example,
    });
  }

  if (stageProblems.conversionGate.length) {
    stages.push({
      stage: 'Conversion gate friction',
      problems: stageProblems.conversionGate.map((item) => item.label),
      evidenceStrength: evidenceStrength(stageProblems.conversionGate.reduce((sum, item) => sum + item.count, 0)),
      example: stageProblems.conversionGate[0].example,
    });
  }

  if (stageProblems.postPurchaseControl.length) {
    stages.push({
      stage: 'Post-purchase control failure',
      problems: stageProblems.postPurchaseControl.map((item) => item.label),
      evidenceStrength: evidenceStrength(stageProblems.postPurchaseControl.reduce((sum, item) => sum + item.count, 0)),
      example: stageProblems.postPurchaseControl[0].example,
    });
  }

  if (!stages.length) {
    stages.push({
      stage: 'Monetization friction',
      problems: monetizationGroup.subIssues.map((item) => item.label),
      evidenceStrength: monetizationGroup.evidenceStrength,
      example: monetizationGroup.subIssues[0]?.example || '',
    });
  }

  return {
    title: 'Monetization Journey Diagnosis',
    summary: `当前变现主线的问题并不是单一“贵”，而是覆盖了价格预期、转化闸门和购买后控制三段交易旅程。`,
    stages,
  };
}

function localInterpretations(
  stats: {
    total: number;
    negativeShare: number;
    topTopic?: string;
    topPain?: string;
    topFeature?: string;
    topCompetitor?: string;
  },
  interpretationLanguage: AnalysisJob['interpretationLanguage'],
): Record<string, string> {
  if (interpretationLanguage === 'en') {
    return {
      sentiment_distribution: `This run analyzed ${stats.total} reviews, with negative feedback accounting for about ${stats.negativeShare}%. This provides a first-pass temperature check on competitor experience risk.`,
      avg_rating_vs_sentiment: 'Star ratings and semantic sentiment should be read together: low-star reviews often expose stability, pricing, or trust issues, while high-star reviews reveal defended product value.',
      trust_matrix: 'The star-by-sentiment matrix helps surface unusual samples such as high-star complaints or low-star praise for manual review.',
      monthly_trends: 'Monthly shifts help identify release-driven reputation swings; when negative share rises sharply, review recent competitor updates and concentrated complaints.',
      topic_distribution: stats.topTopic
        ? `${stats.topTopic} is the most discussed topic, suggesting user attention is concentrated on that product area.`
        : 'Topic concentration is still weak; collect a larger sample before locking in stable patterns.',
      topic_sentiment_cross: stats.topPain
        ? `The most important negative topic is "${stats.topPain}", which may be a direct trigger for churn or poor ratings.`
        : 'No single high-risk topic dominates the topic-sentiment cross yet.',
      pros_cons_phrases: 'Strength and pain signals can be turned directly into a product opportunity backlog: frequent strengths indicate defended value, while repeated pains highlight whitespace.',
      word_clouds: 'The signal clusters provide a fast first-screen summary of user language and emotional focus for competitive reporting.',
      feature_requests: stats.topFeature
        ? `The most visible unmet need is "${stats.topFeature}", which is a strong candidate for MVP validation.`
        : 'Feature requests are still diffuse; consider increasing sample size or isolating low-star reviews.',
      pain_to_gain: 'The pain-to-gain matrix translates competitor friction into positioning, feature priority, and go-to-market language.',
      dealbreakers: stats.topPain
        ? `"${stats.topPain}" should be treated as a primary churn risk and moved into the reverse-competitive design checklist.`
        : 'No dominant dealbreaker has emerged yet.',
      migration: stats.topCompetitor
        ? `The most visible competitor migration signal points to ${stats.topCompetitor}; its switching capture points are worth a focused teardown.`
        : 'No strong competitor migration pattern is visible in the current sample.',
      use_cases: 'Use case inference helps clarify who the competitor is really serving beyond the surface feature list.',
    };
  }

  return {
    sentiment_distribution: `本次共分析 ${stats.total} 条评论，负面反馈占比约 ${stats.negativeShare}%。这可以作为竞品体验风险的基础温度计，后续应重点追踪负面占比的波动。`,
    avg_rating_vs_sentiment: '星级评分与语义情感可相互校验：低星评论通常暴露稳定性、付费或数据风险，高星评论则揭示竞品仍被认可的核心价值。',
    trust_matrix: '星级与 AI 情感矩阵用于识别“高星抱怨”和“低星赞美”等异常样本，这些样本适合人工复核。',
    monthly_trends: '月度趋势可以帮助定位版本更新后的口碑变化；若某个月负面占比突然升高，应回看竞品发布日志和用户集中抱怨。',
    topic_distribution: stats.topTopic
      ? `${stats.topTopic} 是当前最高频主题，说明用户讨论焦点集中在该体验模块。`
      : '主题分布尚不集中，建议增加抓取量后再判断稳定模式。',
    topic_sentiment_cross: stats.topPain
      ? `负面主题中最值得关注的是“${stats.topPain}”，它可能是用户迁移或差评的直接触发点。`
      : '主题与情感交叉结果暂未出现明显单点风险。',
    pros_cons_phrases: '优缺点短语适合直接转化为产品需求池：高频优点代表竞品护城河，高频缺点代表新产品机会。',
    word_clouds: '词云用于快速扫出用户语言中的情绪重心，适合做竞品汇报的第一屏摘要。',
    feature_requests: stats.topFeature
      ? `用户最常提到的未满足需求是“${stats.topFeature}”，可优先进入 MVP 验证。`
      : '功能请求较分散，建议继续扩大样本或聚焦低星评论。',
    pain_to_gain: '痛点转卖点矩阵可以把竞品缺陷直接翻译成新产品定位、落地功能和推广话术。',
    dealbreakers: stats.topPain
      ? `“${stats.topPain}”应被视为核心流失风险，适合优先进入竞品反向设计清单。`
      : '暂未发现强势流失触发器。',
    migration: stats.topCompetitor
      ? `评论中出现的主要竞品流向是 ${stats.topCompetitor}，建议单独拆解它的功能承接能力。`
      : '评论中暂未出现明显竞品迁移信号。',
      use_cases: '使用场景推断可帮助判断竞品真实用户是谁，避免只按功能清单做产品对比。',
  };
}

function looksMostlyEnglish(text: string) {
  const asciiLetters = (text.match(/[A-Za-z]/g) || []).length;
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  return asciiLetters > chineseChars * 2 && asciiLetters >= 20;
}

function enforceInterpretationLanguage(
  interpretations: Record<string, string>,
  fallback: Record<string, string>,
  interpretationLanguage: AnalysisJob['interpretationLanguage'],
) {
  if (interpretationLanguage !== 'zh') return interpretations;

  const next = { ...interpretations };
  for (const [key, value] of Object.entries(next)) {
    if (looksMostlyEnglish(value)) {
      next[key] = fallback[key] || value;
    }
  }
  return next;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export async function buildReportData(input: {
  job: AnalysisJob;
  app: AppInfo | null;
  reviews: RawReview[];
  analyses: ReviewAnalysis[];
}): Promise<AnalysisReportData> {
  const dedupedReviews = new Map<string, RawReview>();
  for (const review of input.reviews) {
    const dedupeKey = review.reviewId || review.sourceKey;
    const existing = dedupedReviews.get(dedupeKey);
    if (!existing || review.content.length > existing.content.length) {
      dedupedReviews.set(dedupeKey, review);
    }
  }

  const dedupedAnalyses = new Map<string, ReviewAnalysis>();
  for (const analysis of input.analyses) {
    const review = input.reviews.find((item) => item.sourceKey === analysis.sourceKey);
    const dedupeKey = review?.reviewId || analysis.sourceKey;
    if (!dedupedAnalyses.has(dedupeKey)) {
      dedupedAnalyses.set(dedupeKey, analysis);
    }
  }

  const uniqueReviews = [...dedupedReviews.values()];
  const uniqueAnalyses = [...dedupedAnalyses.values()];
  const analysisByKey = new Map(uniqueAnalyses.map((analysis) => [analysis.sourceKey, analysis]));
  const reportReviews: ReportReview[] = uniqueReviews
    .map((review) => {
      const analysis = analysisByKey.get(review.sourceKey);
      return analysis
        ? {
            ...review,
            sentiment: analysis.sentiment,
            intent: analysis.intent,
          }
        : null;
    })
    .filter(Boolean) as ReportReview[];

  const total = Math.max(1, reportReviews.length);
  const sentiments: Sentiment[] = ['positive', 'neutral', 'negative'];

  const overviewSentiment = sentiments.map((sentiment) => {
    const reviews = reportReviews.filter((review) => review.sentiment === sentiment);
    const avgRating = reviews.length
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    return {
      sentiment: titleCase(sentiment) as 'Positive' | 'Neutral' | 'Negative',
      count: reviews.length,
      avgRating: round(avgRating),
      color: SENTIMENT_COLORS[sentiment],
    };
  });

  const trustMatrix: TrustMatrixItem[] = [5, 4, 3, 2, 1].map((star) => {
    const starReviews = reportReviews.filter((review) => review.rating === star);
    return {
      stars: star === 1 ? '1 Star' : `${star} Stars`,
      positive: percent(starReviews.filter((review) => review.sentiment === 'positive').length, starReviews.length),
      neutral: percent(starReviews.filter((review) => review.sentiment === 'neutral').length, starReviews.length),
      negative: percent(starReviews.filter((review) => review.sentiment === 'negative').length, starReviews.length),
    };
  });

  const monthCounts = new Map<string, { positive: number; neutral: number; negative: number }>();
  for (const review of reportReviews) {
    const month = monthOf(review.date);
    const current = monthCounts.get(month) || { positive: 0, neutral: 0, negative: 0 };
    current[review.sentiment] += 1;
    monthCounts.set(month, current);
  }

  const trendData: TrendItem[] = [...monthCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, counts]) => {
      const monthTotal = counts.positive + counts.neutral + counts.negative;
      return {
        month,
        positive: percent(counts.positive, monthTotal),
        neutral: percent(counts.neutral, monthTotal),
        negative: percent(counts.negative, monthTotal),
      };
    });

  const topicStats = new Map<string, TopicItem>();
  for (const analysis of uniqueAnalyses) {
    for (const topic of analysis.topics.length ? analysis.topics : inferFallbackTopics(analysis)) {
      const name = titleCase(topic);
      const current = topicStats.get(name) || { name, count: 0, positive: 0, neutral: 0, negative: 0 };
      current.count += 1;
      current[analysis.sentiment] += 1;
      topicStats.set(name, current);
    }
  }

  const weakTopics = new Set([
    'General',
    'General Experience',
    'General Satisfaction',
    'Overall Experience',
    'Overall Satisfaction',
    'Overall Quality',
    'Miscellaneous',
  ]);

  const topicData = [...topicStats.values()]
    .sort((a, b) => {
      const aPenalty = weakTopics.has(a.name) ? 1 : 0;
      const bPenalty = weakTopics.has(b.name) ? 1 : 0;
      if (aPenalty !== bPenalty) return aPenalty - bPenalty;
      return b.count - a.count;
    })
    .slice(0, 10);
  const pros = buildProsPhrases(uniqueAnalyses, input.app, 10);
  const cons = buildConsPhrases(uniqueAnalyses, input.app, 10);
  const neutral = buildNeutralPhrases(uniqueAnalyses, input.app, 10);
  const strengthHierarchy = buildStrengthHierarchy(uniqueAnalyses, uniqueReviews);

  const featureRequests = buildFeatureHierarchy(uniqueAnalyses, uniqueReviews);

  const painHierarchy = buildPainHierarchy(uniqueAnalyses, uniqueReviews);
  const dealbreakersData = painHierarchy.slice(0, 5).map((group) => ({
    name: buildDealbreakerSummaryLabel(group),
    value: group.count,
  }));
  const gainSuggestionCounts = new Map<string, number>();
  for (const analysis of uniqueAnalyses) {
    const suggestion = analysis.gainSuggestion.trim();
    if (!suggestion || analysis.sentiment === 'positive') continue;
    gainSuggestionCounts.set(suggestion, (gainSuggestionCounts.get(suggestion) || 0) + 1);
  }

  const painToGain: PainToGainItem[] = painHierarchy.slice(0, 4).map((item) => {
    const category = inferAppCategory(input.app);
    const mapped = resolvePainGain(item.category, category) || resolvePainGain(item.subIssues[0]?.label || item.category, category);
    const matchingSuggestion = [...gainSuggestionCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .find(([suggestion]) => {
        const lower = suggestion.toLowerCase();
        const pain = item.category.toLowerCase();
        return lower.includes(pain) || pain.includes('pricing') && lower.includes('pricing');
      })?.[0];

    const issue = item.subIssues.map((sub) => sub.label).join(' / ');
    const businessRisk =
      item.category === 'Network Performance'
        ? '用户对核心连接质量失去信任，可能直接影响活跃度、续费与口碑。'
        : item.category === 'Billing & Charges'
          ? '计费与扣费争议会直接伤害付费转化、信任感与长期留存。'
          : item.category === 'App Reliability'
            ? '关键流程不稳定会降低可用性，放大差评和流失风险。'
            : item.category === 'Account & Activation'
              ? '激活和验证受阻会抬高新用户流失率，并削弱账户信任。'
              : item.category === 'UX Friction'
                ? '交互摩擦会抬高学习成本，降低完成关键任务的效率。'
                : item.category === 'Support & Resolution'
                  ? '响应与申诉机制不足会放大负面体验，延长问题闭环时间。'
                  : '该类问题会持续削弱用户信任，并影响关键路径转化。';

    return {
      painCategory: item.category,
      issue,
      businessRisk,
      recommendedAction:
        mapped?.gain || matchingSuggestion || '将这一类高频痛点转化为优先修复项，并在产品承诺与版本路线图中明确回应。',
      supportingSubIssues: item.subIssues.map((sub) => sub.label),
      evidenceStrength: item.evidenceStrength,
      icon: mapped?.icon || iconForPain(item.category),
    };
  }).filter((item) => item.issue && item.painCategory);

  const competitorCounts = countValues(uniqueAnalyses.flatMap((analysis) => analysis.competitorMentions));
  const filteredCompetitorCounts = new Map(
    [...competitorCounts.entries()].filter(([name, count]) => count >= 2 && name.trim().length >= 3),
  );
  const migrationData: MigrationItem[] = topFromMap(filteredCompetitorCounts, 8, (name, count) => ({ name, count }));
  const useCaseData = useCaseRadar(uniqueAnalyses, input.app);
  const useCaseProfiles = buildUseCaseProfiles(
    uniqueAnalyses,
    uniqueReviews,
    input.app,
    painHierarchy,
    strengthHierarchy,
    featureRequests,
  );
  const monetizationJourney = buildMonetizationJourneyDiagnosis(painHierarchy);
  const executiveSummary = buildExecutiveSummary({
    app: input.app,
    overviewSentiment,
    painHierarchy,
    featureRequests,
    strengthHierarchy,
    useCaseProfiles,
  });

  const negativeShare = percent(reportReviews.filter((review) => review.sentiment === 'negative').length, total);
  const fallbackInsights = localInterpretations(
    {
      total: reportReviews.length,
      negativeShare,
      topTopic: topicData[0]?.name,
      topPain: dealbreakersData[0]?.name,
      topFeature: featureRequests[0]?.category,
      topCompetitor: migrationData[0]?.name,
    },
    input.job.interpretationLanguage,
  );

  const narrativeStats = {
    app: input.app,
    totalReviews: reportReviews.length,
    overviewSentiment,
    trustMatrix,
    trendData,
    topicData: topicData.slice(0, 6),
    featureRequests: featureRequests.slice(0, 6),
    dealbreakersData,
    migrationData,
    useCaseData,
    useCaseProfiles,
    executiveSummary,
    monetizationJourney,
  };

  let aiInterpretations = fallbackInsights;
  try {
    aiInterpretations = enforceInterpretationLanguage({
      ...fallbackInsights,
      ...(await withTimeout(
        generateNarrative(input.job.id, narrativeStats, input.job.interpretationLanguage),
        45_000,
        'Report narrative generation',
      )),
    }, fallbackInsights, input.job.interpretationLanguage);
  } catch {
    aiInterpretations = fallbackInsights;
  }

  return {
    job: input.job,
    app: input.app,
    overviewSentiment,
    trustMatrix,
    trendData,
    topicData,
    phraseData: { pros, cons },
    strengthHierarchy,
    wordCloud: {
      positive: wordCloud(pros, input.app),
      negative: wordCloud(cons, input.app, { preserveLabels: true }),
    },
    aiInterpretations,
    featureRequests,
    painHierarchy,
    painToGain,
    monetizationJourney,
    dealbreakersData,
    migrationData,
    useCaseRadar: useCaseData,
    useCaseProfiles,
    executiveSummary,
    reviews: reportReviews,
  };
}
