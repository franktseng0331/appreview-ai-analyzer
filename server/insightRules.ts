import fs from 'node:fs';
import { z } from 'zod';
import { config } from './config';
import type { AppInfo, PainToGainItem } from '../shared/types';

export type AppCategory = 'social' | 'productivity' | 'utility' | 'general';

type UseCaseRule = {
  label: string;
  categories: AppCategory[];
  patterns: RegExp[];
};

type PainGainRule = {
  icon: PainToGainItem['icon'];
  painLabels: string[];
  gain: string;
};

type PainHierarchyRule = {
  category: string;
  patterns: RegExp[];
  subIssueExamples: string[];
};

const useCaseRuleSchema = z.object({
  label: z.string().min(1),
  categories: z.array(z.enum(['social', 'productivity', 'utility', 'general'])).min(1),
  patterns: z.array(z.string().min(1)).min(1),
});

const painGainRuleSchema = z.object({
  icon: z.enum(['Zap', 'Shield', 'MousePointer2', 'Download']),
  painLabels: z.array(z.string().min(1)).min(1),
  gain: z.string().min(1),
});

const painHierarchyRuleSchema = z.object({
  category: z.string().min(1),
  patterns: z.array(z.string().min(1)).min(1),
  subIssueExamples: z.array(z.string().min(1)).min(1),
});

const dictionariesSchema = z.object({
  useCaseRules: z.array(useCaseRuleSchema),
  painHierarchyRules: z.array(painHierarchyRuleSchema),
  painGainRules: z.record(
    z.enum(['social', 'productivity', 'utility', 'general']),
    z.array(painGainRuleSchema),
  ),
});

function compilePatterns(patterns: string[]) {
  return patterns.map((pattern) => new RegExp(pattern, 'i'));
}

function loadDictionaries() {
  const raw = fs.readFileSync(config.insightDictionaryPath, 'utf8');
  const parsed = dictionariesSchema.parse(JSON.parse(raw));

  const useCaseRules: UseCaseRule[] = parsed.useCaseRules.map((rule) => ({
    label: rule.label,
    categories: rule.categories,
    patterns: compilePatterns(rule.patterns),
  }));

  const painHierarchyRules: PainHierarchyRule[] = parsed.painHierarchyRules.map((rule) => ({
    category: rule.category,
    patterns: compilePatterns(rule.patterns),
    subIssueExamples: rule.subIssueExamples,
  }));

  const painGainRules: Record<AppCategory, PainGainRule[]> = {
    social: [],
    productivity: [],
    utility: [],
    general: [],
  };

  for (const category of Object.keys(parsed.painGainRules) as AppCategory[]) {
    painGainRules[category] = parsed.painGainRules[category].map((rule) => ({
      icon: rule.icon,
      painLabels: rule.painLabels,
      gain: rule.gain,
    }));
  }

  return {
    useCaseRules,
    painHierarchyRules,
    painGainRules,
  };
}

const {
  useCaseRules: USE_CASE_RULES,
  painHierarchyRules: PAIN_HIERARCHY_RULES,
  painGainRules: PAIN_GAIN_RULES,
} = loadDictionaries();

export function inferAppCategory(app: AppInfo | null): AppCategory {
  const genre = app?.genre?.toLowerCase() || '';

  if (genre.includes('social')) return 'social';
  if (genre.includes('productivity') || genre.includes('business')) return 'productivity';
  if (genre.includes('tools') || genre.includes('utility')) return 'utility';
  return 'general';
}

export function canonicalizeUseCase(label: string, category: AppCategory): string | null {
  const text = label.trim();
  if (!text) return null;

  for (const rule of USE_CASE_RULES) {
    if (!rule.categories.includes(category) && !rule.categories.includes('general')) continue;
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      return rule.label;
    }
  }

  return null;
}

export function minimumUseCaseCount(totalAnalyses: number) {
  if (totalAnalyses >= 300) return 4;
  if (totalAnalyses >= 100) return 2;
  return 1;
}

export function resolvePainHierarchyCategory(label: string) {
  const text = label.trim();
  if (!text) return null;

  for (const rule of PAIN_HIERARCHY_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      return {
        category: rule.category,
        subIssueExamples: rule.subIssueExamples,
      };
    }
  }

  return null;
}

export function resolvePainGain(
  painLabel: string,
  category: AppCategory,
): { gain: string; icon: PainToGainItem['icon'] } | null {
  const lookup = [...(PAIN_GAIN_RULES[category] || []), ...(PAIN_GAIN_RULES.general || [])];
  const normalizedPain = painLabel.trim();

  for (const rule of lookup) {
    if (rule.painLabels.includes(normalizedPain)) {
      return { gain: rule.gain, icon: rule.icon };
    }
  }

  return null;
}
