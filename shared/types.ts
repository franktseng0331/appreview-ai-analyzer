export type Sentiment = 'positive' | 'neutral' | 'negative';

export type ReviewIntent =
  | 'feature_request'
  | 'bug_report'
  | 'praise'
  | 'complaint'
  | 'other';

export type JobStatus =
  | 'queued'
  | 'fetching'
  | 'enriching'
  | 'translating'
  | 'analyzing'
  | 'summarizing'
  | 'completed'
  | 'canceled'
  | 'failed';

export type InterpretationLanguage = 'zh' | 'en';
export type AnalysisSourceType = 'google_play' | 'csv_import';

export interface AnalyzeRequest {
  sourceType?: AnalysisSourceType;
  packageName: string;
  languages: string[];
  regions: string[];
  count: number;
  interpretationLanguage: InterpretationLanguage;
  csvContent?: string;
  csvFileName?: string;
}

export interface AnalysisJob {
  id: string;
  sourceType: AnalysisSourceType;
  sourceName?: string | null;
  packageName: string;
  languages: string[];
  regions: string[];
  count: number;
  interpretationLanguage: InterpretationLanguage;
  status: JobStatus;
  progress: number;
  message: string;
  reviewCount: number;
  analyzedCount: number;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobsQuery {
  limit?: number;
  offset?: number;
  status?: JobStatus | 'active' | 'history';
  packageName?: string;
}

export interface AppInfo {
  appId: string;
  title: string;
  developer?: string;
  icon?: string;
  score?: number;
  ratings?: number;
  reviews?: number;
  installs?: string;
  genre?: string;
  version?: string;
  updated?: number;
  url?: string;
}

export interface RawReview {
  sourceKey: string;
  reviewId: string;
  packageName: string;
  language: string;
  country: string;
  userName: string;
  rating: number;
  title?: string;
  content: string;
  date: string;
  version?: string;
  thumbsUp?: number;
  url?: string;
  combinedText?: string;
  detectedLanguage?: string;
  translatedText?: string;
  analysisLanguage?: string;
  analysisText?: string;
}

export interface ReviewAnalysis {
  sourceKey: string;
  sentiment: Sentiment;
  intent: ReviewIntent;
  topics: string[];
  strengths: string[];
  featureRequests: string[];
  painPoints: string[];
  neutralSignals: string[];
  useCaseLabels: string[];
  gainSuggestion: string;
  competitorMentions: string[];
  summary: string;
  confidence: number;
}

export interface ReportReview extends RawReview {
  sentiment: Sentiment;
  intent: ReviewIntent;
}

export interface SentimentOverviewItem {
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  count: number;
  avgRating: number;
  color: string;
}

export interface TrustMatrixItem {
  stars: string;
  positive: number;
  neutral: number;
  negative: number;
}

export interface TrendItem {
  month: string;
  positive: number;
  neutral: number;
  negative: number;
}

export interface TopicItem {
  name: string;
  count: number;
  positive: number;
  neutral: number;
  negative: number;
}

export interface PhraseItem {
  text: string;
  count: number;
}

export interface EvidenceItem {
  label: string;
  count: number;
  example: string;
  examples: string[];
}

export interface StrengthSignalItem {
  category: string;
  count: number;
  evidenceStrength: 'High' | 'Medium' | 'Low';
  marketAngle?: string;
  subSignals: EvidenceItem[];
}

export interface WordCloudItem {
  text: string;
  size: number;
  weight: string;
}

export interface FeatureRequestItem {
  category: string;
  count: number;
  priority: 'High' | 'Medium' | 'Low';
  evidenceStrength: 'High' | 'Medium' | 'Low';
  subRequests: EvidenceItem[];
}

export interface PainSubIssueItem extends EvidenceItem {}

export interface PainSignalGroupItem {
  category: string;
  count: number;
  evidenceStrength: 'High' | 'Medium' | 'Low';
  subIssues: PainSubIssueItem[];
}

export interface PainToGainItem {
  painCategory: string;
  issue: string;
  businessRisk: string;
  recommendedAction: string;
  supportingSubIssues: string[];
  evidenceStrength: 'High' | 'Medium' | 'Low';
  icon: 'Zap' | 'Shield' | 'MousePointer2' | 'Download';
}

export interface MonetizationJourneyStage {
  stage: string;
  problems: string[];
  evidenceStrength: 'High' | 'Medium' | 'Low';
  example: string;
}

export interface MonetizationJourneyDiagnosis {
  title: string;
  summary: string;
  stages: MonetizationJourneyStage[];
}

export interface PieItem {
  name: string;
  value: number;
}

export interface MigrationItem {
  name: string;
  count: number;
}

export interface UseCaseItem {
  subject: string;
  A: number;
  fullMark: number;
}

export interface UseCaseProfileItem {
  scenario: string;
  reviewCount: number;
  evidenceStrength: 'High' | 'Medium' | 'Low';
  growthAngle: string;
  targetAudience: string;
  keyTasks: string[];
  primaryFrictions: string[];
  unmetNeeds: string[];
  valueSignals: string[];
  recommendedMessage: string;
  marketAttractiveness: 'High' | 'Medium' | 'Low';
  painIntensity: 'High' | 'Medium' | 'Low';
  differentiationPotential: 'High' | 'Medium' | 'Low';
  recommendedPriority: 'P1' | 'P2' | 'P3';
  priorityReason: string;
  productActions: ScenarioActionItem[];
  messagingActions: ScenarioActionItem[];
  gtmActions: ScenarioActionItem[];
  exampleSnippets: string[];
}

export interface ScenarioActionItem {
  text: string;
  supportingPains: string[];
  supportingNeeds: string[];
  evidenceSnippets: string[];
}

export interface ExecutiveSummaryItem {
  title: string;
  body: string;
  support: string[];
}

export interface ExecutiveSummary {
  headline: string;
  biggestRisk: string;
  biggestOpportunity: string;
  immediateActions: string[];
  strategicCaution: string;
}

export interface AnalysisReportData {
  job: AnalysisJob;
  app?: AppInfo | null;
  overviewSentiment: SentimentOverviewItem[];
  trustMatrix: TrustMatrixItem[];
  trendData: TrendItem[];
  topicData: TopicItem[];
  phraseData: {
    pros: PhraseItem[];
    cons: PhraseItem[];
  };
  strengthHierarchy: StrengthSignalItem[];
  wordCloud: {
    positive: WordCloudItem[];
    negative: WordCloudItem[];
  };
  aiInterpretations: Record<string, string>;
  featureRequests: FeatureRequestItem[];
  painHierarchy: PainSignalGroupItem[];
  painToGain: PainToGainItem[];
  monetizationJourney?: MonetizationJourneyDiagnosis | null;
  dealbreakersData: PieItem[];
  migrationData: MigrationItem[];
  useCaseRadar: UseCaseItem[];
  useCaseProfiles: UseCaseProfileItem[];
  executiveSummary: ExecutiveSummary;
  reviews: ReportReview[];
}
