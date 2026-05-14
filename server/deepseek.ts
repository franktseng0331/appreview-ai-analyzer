import OpenAI from 'openai';
import { z } from 'zod';
import { config } from './config';
import { recordLlmCall } from './db';
import type {
  InterpretationLanguage,
  RawReview,
  ReviewAnalysis,
  ReviewIntent,
  Sentiment,
} from '../shared/types';

const client = new OpenAI({
  apiKey: config.deepseekApiKey || 'missing-key',
  baseURL: config.deepseekBaseUrl,
});

const reviewAnalysisSchema = z.object({
  id: z.string(),
  sentiment: z.string().optional().default(''),
  intent: z.string().optional().default(''),
  topics: z.array(z.string()).default([]),
  strengths: z.array(z.string()).default([]),
  featureRequests: z.array(z.string()).default([]),
  painPoints: z.array(z.string()).default([]),
  neutralSignals: z.array(z.string()).default([]),
  useCaseLabels: z.array(z.string()).default([]),
  gainSuggestion: z.string().default(''),
  competitorMentions: z.array(z.string()).default([]),
  summary: z.string().default(''),
  confidence: z.number().optional().default(0.7),
});

const batchSchema = z.object({
  reviews: z.array(reviewAnalysisSchema),
});

const narrativeSchema = z.object({
  sentiment_distribution: z.string().optional(),
  avg_rating_vs_sentiment: z.string().optional(),
  trust_matrix: z.string().optional(),
  monthly_trends: z.string().optional(),
  topic_distribution: z.string().optional(),
  topic_sentiment_cross: z.string().optional(),
  pros_cons_phrases: z.string().optional(),
  word_clouds: z.string().optional(),
  feature_requests: z.string().optional(),
  pain_to_gain: z.string().optional(),
  dealbreakers: z.string().optional(),
  migration: z.string().optional(),
  use_cases: z.string().optional(),
});

const translationBatchSchema = z.object({
  reviews: z.array(
    z.object({
      id: z.string(),
      detectedLanguage: z.string().default('unknown'),
      translatedText: z.string().default(''),
    }),
  ),
});

function assertDeepSeekConfigured() {
  if (!config.deepseekApiKey) {
    throw new Error('DEEPSEEK_API_KEY is missing. Add it to .env.local before running analysis.');
  }
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('The model returned an empty response.');

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('The model did not return valid JSON.');
    return JSON.parse(match[0]);
  }
}

function fallbackSummary(review: RawReview): string {
  return review.content.length > 140 ? `${review.content.slice(0, 137)}...` : review.content;
}

function cleanList(value: string[] | undefined, limit = 4): string[] {
  return (value || [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeSentiment(value: string): Sentiment {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'positive' || normalized === 'negative' || normalized === 'neutral') {
    return normalized;
  }
  if (normalized === 'mixed') return 'neutral';
  if (normalized.includes('pos')) return 'positive';
  if (normalized.includes('neg')) return 'negative';
  return 'neutral';
}

function normalizeIntent(value: string): ReviewIntent {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (
    normalized === 'feature_request' ||
    normalized === 'bug_report' ||
    normalized === 'praise' ||
    normalized === 'complaint' ||
    normalized === 'other'
  ) {
    return normalized;
  }
  if (normalized.includes('feature') || normalized.includes('request') || normalized.includes('suggest')) {
    return 'feature_request';
  }
  if (normalized.includes('bug') || normalized.includes('issue') || normalized.includes('crash')) {
    return 'bug_report';
  }
  if (normalized.includes('praise') || normalized.includes('love') || normalized.includes('like')) {
    return 'praise';
  }
  if (normalized.includes('complaint') || normalized.includes('frustrat') || normalized.includes('dissatisf')) {
    return 'complaint';
  }
  return 'other';
}

function normalizeConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.7;
  return Math.max(0, Math.min(1, value));
}

function inferFallbackSentiment(review: RawReview): Sentiment {
  if (review.rating >= 4) return 'positive';
  if (review.rating <= 2) return 'negative';
  return 'neutral';
}

function inferFallbackIntent(review: RawReview, sentiment: Sentiment): ReviewIntent {
  const text = (review.analysisText || review.content).toLowerCase();
  if (/please|add|need|wish|should|would like|could you|feature/.test(text)) return 'feature_request';
  if (/crash|bug|error|broken|cannot|can't|cant|won't|wont|issue|problem/.test(text)) return 'bug_report';
  if (sentiment === 'positive') return 'praise';
  if (sentiment === 'negative') return 'complaint';
  return 'other';
}

function inferFallbackTopics(review: RawReview): string[] {
  const text = (review.analysisText || review.content).toLowerCase();
  if (/login|sign in|sign-in|sign up|signup|register/.test(text)) return ['Authentication'];
  if (/verify|verification|id|passport/.test(text)) return ['Verification'];
  if (/crash|freeze|stuck|bug|broken|error/.test(text)) return ['Stability'];
  if (/price|pricing|subscription|charge|billing|paid/.test(text)) return ['Pricing'];
  if (/translate|translation|english|language|caption/.test(text)) return ['Language Support'];
  if (/ui|interface|design|navigation/.test(text)) return ['UI/UX'];
  return [inferFallbackSentiment(review) === 'positive' ? 'General Satisfaction' : 'Functionality'];
}

function fallbackAnalysisForReview(review: RawReview): ReviewAnalysis {
  const sentiment = inferFallbackSentiment(review);
  const intent = inferFallbackIntent(review, sentiment);
  return {
    sourceKey: review.sourceKey,
    sentiment,
    intent,
    topics: inferFallbackTopics(review),
    strengths: [],
    featureRequests: [],
    painPoints: [],
    neutralSignals: [],
    useCaseLabels: [],
    gainSuggestion: '',
    competitorMentions: [],
    summary: fallbackSummary(review),
    confidence: 0.35,
  };
}

export async function analyzeReviewBatch(
  jobId: string,
  reviews: RawReview[],
): Promise<ReviewAnalysis[]> {
  assertDeepSeekConfigured();

  const compactReviews = reviews.map((review) => ({
    id: review.sourceKey,
    rating: review.rating,
    language: review.language,
    country: review.country,
    date: review.date,
    text: review.analysisText || review.content,
  }));

  const systemPrompt = `
You are an app-store review analyst for competitor product research.
Return STRICT JSON only. Do not include markdown, explanations, comments, or code fences.

Your task:
For each input review, return exactly one review object with ALL required keys present.
Never omit keys. Never return null for arrays. Never invent extra top-level keys.

Required keys for every review object:
- id: copy exactly from input
- sentiment: one of "positive", "neutral", "negative"
- intent: one of "feature_request", "bug_report", "praise", "complaint", "other"
- topics: array of 1-4 short product-area labels, e.g. ["Stability"], ["Pricing"], ["UI/UX"]
- strengths: array of concrete positive signals or praised capabilities, or []
- featureRequests: array of concrete requested features, or []
- painPoints: array of concrete user frictions/failures, or []
- neutralSignals: array of mixed/neutral observations, tradeoffs, or factual notes, or []
- useCaseLabels: array of 0-3 concrete usage scenarios inferred from the review, or []
- gainSuggestion: one short product-facing gain/opportunity statement derived from the review, or ""
- competitorMentions: array of competing apps/products explicitly mentioned, or []
- summary: one short English phrase
- confidence: number from 0 to 1

Hard rules:
1. Every review in input must appear exactly once in output.
2. Every review object must include ALL required keys even when uncertain.
3. If uncertain about sentiment, use "neutral".
4. If uncertain about intent, use "other".
5. If no topics are obvious, use 1 broad but meaningful product-area topic such as "General Satisfaction", "Usability", "Functionality", or "Pricing". Do NOT use an empty topics array unless the text is completely unusable.
6. Use [] for empty arrays. Do not use null.
7. Keep topics short noun phrases, not full sentences.
8. painPoints are concrete failures/frictions already experienced.
9. featureRequests are desired additions or improvements explicitly requested.
10. strengths are concrete valued capabilities already praised by the user.
11. neutralSignals are mixed observations, caveats, or factual notes that are neither clearly praise nor clearly pain.
12. useCaseLabels should describe concrete usage scenarios, such as "Study notes", "Meeting transcription", "Travel translation", "Social content browsing", "Cross-border community browsing", or "Lecture note capture".
13. gainSuggestion should translate the review into a short product opportunity, such as "Offer smoother international sign-up for overseas users" or "Position accurate live transcription as a key differentiator".
14. competitorMentions should only include names explicitly mentioned in the review text.
15. For travel or booking apps, prefer specific useCaseLabels such as "Travel Booking", "Hotel Booking", "Flight Booking", "Trip Planning", "Refund Support", or "Reservation Management" when supported by the review.
16. competitorMentions must only include actual competing app or brand names. Do not output generic nouns, categories, trust-related words, transport types, or product domains such as "Other Apps", "Airline", "Trainline", "Trust", "Service", "Hotel", or "Booking".
17. For very short reviews like "great app", still return all keys with a sensible fallback summary and at least one topic.
18. If sentiment is "positive", strengths should usually contain 1-3 short normalized capability labels. Do not leave strengths empty unless the text is too vague to infer any concrete positive signal.
19. Avoid vague strengths such as "Good app", "Great app", "Helpful", "Works great", or "Positive overall impression" when a more specific capability can be inferred.
20. Never output generic praise-only strengths such as "Good app", "Great app", "Nice app", "Best app", "Wonderful app", "Perfect app", "Very good app", "Helpful app", "Amazing app", or "Positive overall impression".
21. If a positive review contains praise but no concrete capability can be inferred, return strengths: [] and put the general praise into summary only.

Field guidance:
- sentiment = overall emotional polarity of the review text, not the star rating alone
- intent = the single dominant purpose of the review
- topics = product areas discussed
- strengths = normalized positive descriptions such as "Fast transcription", "Useful meeting summaries"
- painPoints = what is broken, frustrating, costly, inaccurate, missing, or unreliable
- neutralSignals = balanced observations such as "Good idea but expensive", "Works well after setup"
- useCaseLabels = realistic usage scenarios inferred from the review text
- gainSuggestion = short product-facing opportunity statement derived from the review
- featureRequests = what the user wants added or changed
- For short positive reviews, infer the most likely concrete value signal from the text, such as "Good usability", "Useful translation", "Accurate transcription", "Relevant content", "Fast performance", or "Useful functionality".
- Prefer capability labels over emotional praise labels.
- If only emotional praise is present and no capability is inferable, strengths must be [].

Few-shot examples:
Input review:
{"id":"r1","rating":1,"text":"App crashes every time I export a file."}
Output review:
{"id":"r1","sentiment":"negative","intent":"bug_report","topics":["Stability","Export"],"strengths":[],"featureRequests":[],"painPoints":["App crashes during export"],"neutralSignals":[],"useCaseLabels":["Document export workflow"],"gainSuggestion":"Promote reliable export for document-heavy workflows","competitorMentions":[],"summary":"Crash during export","confidence":0.95}

Input review:
{"id":"r2","rating":5,"text":"Great app, very useful for meeting notes."}
Output review:
{"id":"r2","sentiment":"positive","intent":"praise","topics":["Meeting Notes","Productivity"],"strengths":["Useful meeting notes"],"featureRequests":[],"painPoints":[],"neutralSignals":[],"useCaseLabels":["Meeting note capture"],"gainSuggestion":"Emphasize efficient meeting note capture as a core product value","competitorMentions":[],"summary":"Useful for meeting notes","confidence":0.9}

Input review:
{"id":"r3","rating":3,"text":"Please add dark mode."}
Output review:
{"id":"r3","sentiment":"neutral","intent":"feature_request","topics":["UI/UX"],"strengths":[],"featureRequests":["Dark mode"],"painPoints":[],"neutralSignals":["Current theme is insufficient"],"useCaseLabels":["Night-time app usage"],"gainSuggestion":"Use dark mode demand to position a more comfortable low-light experience","competitorMentions":[],"summary":"Requests dark mode","confidence":0.93}

Input review:
{"id":"r4","rating":4,"text":"Okay."}
Output review:
{"id":"r4","sentiment":"neutral","intent":"other","topics":["General Satisfaction"],"strengths":[],"featureRequests":[],"painPoints":[],"neutralSignals":["Brief ambiguous feedback"],"useCaseLabels":[],"gainSuggestion":"","competitorMentions":[],"summary":"Brief neutral feedback","confidence":0.55}

Input review:
{"id":"r5","rating":5,"text":"Very useful app."}
Output review:
{"id":"r5","sentiment":"positive","intent":"praise","topics":["Usability","Productivity"],"strengths":["Useful functionality"],"featureRequests":[],"painPoints":[],"neutralSignals":[],"useCaseLabels":["Daily productivity use"],"gainSuggestion":"Frame everyday usefulness as a simple productivity win","competitorMentions":[],"summary":"Useful app","confidence":0.82}

Input review:
{"id":"r6","rating":5,"text":"Translation is excellent and captions are very accurate."}
Output review:
{"id":"r6","sentiment":"positive","intent":"praise","topics":["Translation","Transcription Accuracy"],"strengths":["Useful translation","Accurate captions"],"featureRequests":[],"painPoints":[],"neutralSignals":[],"useCaseLabels":["Multilingual caption reading","Language translation support"],"gainSuggestion":"Position accurate multilingual captions as a core differentiation point","competitorMentions":[],"summary":"Excellent translation and accurate captions","confidence":0.93}

Input review:
{"id":"r7","rating":5,"text":"Amazing app!"}
Output review:
{"id":"r7","sentiment":"positive","intent":"praise","topics":["General Satisfaction"],"strengths":[],"featureRequests":[],"painPoints":[],"neutralSignals":[],"useCaseLabels":[],"gainSuggestion":"","competitorMentions":[],"summary":"Brief positive praise","confidence":0.62}

Expected JSON shape:
{
  "reviews": [
    {
      "id": "same id from input",
      "sentiment": "negative",
      "intent": "bug_report",
      "topics": ["Stability"],
      "strengths": [],
      "featureRequests": [],
      "painPoints": ["App crashes"],
      "neutralSignals": [],
      "useCaseLabels": [],
      "gainSuggestion": "",
      "competitorMentions": [],
      "summary": "Crash during recurring task setup",
      "confidence": 0.91
    }
  ]
}`.trim();

  const userPrompt = `Analyze this JSON array of Google Play reviews. Return one output object for every input item and preserve each input id exactly.\n${JSON.stringify(compactReviews)}`;

  const runSingleBatch = async () => {
    const response = await client.chat.completions.create({
      model: config.deepseekFastModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 12000,
      stream: false,
      thinking: { type: 'disabled' },
    } as any, { timeout: 60_000 });

    const content = response.choices[0]?.message?.content || '';
    recordLlmCall({
      jobId,
      callType: 'review_batch',
      model: config.deepseekFastModel,
      inputCount: reviews.length,
      rawResponse: content,
    });

    const parsed = batchSchema.parse(parseJsonObject(content));
    const bySourceKey = new Map(reviews.map((review) => [review.sourceKey, review]));

    const mappedAnalyses = parsed.reviews
      .filter((analysis) => bySourceKey.has(analysis.id))
      .map((analysis) => {
        const original = bySourceKey.get(analysis.id);
        if (!original) return null;

        return {
          sourceKey: analysis.id,
          sentiment: normalizeSentiment(analysis.sentiment),
          intent: normalizeIntent(analysis.intent),
          topics: cleanList(analysis.topics),
          strengths: cleanList(analysis.strengths),
          featureRequests: cleanList(analysis.featureRequests),
          painPoints: cleanList(analysis.painPoints),
          neutralSignals: cleanList(analysis.neutralSignals),
          useCaseLabels: cleanList(analysis.useCaseLabels, 3),
          gainSuggestion: analysis.gainSuggestion.trim(),
          competitorMentions: cleanList(analysis.competitorMentions),
          summary: analysis.summary.trim() || fallbackSummary(original),
          confidence: normalizeConfidence(analysis.confidence),
        };
      })
      .filter((analysis): analysis is ReviewAnalysis => Boolean(analysis));

    const matchedKeys = new Set(mappedAnalyses.map((analysis) => analysis.sourceKey));
    const missingReviews = reviews.filter((review) => !matchedKeys.has(review.sourceKey));

    if (!missingReviews.length) {
      return mappedAnalyses;
    }

    if (missingReviews.length && reviews.length > 1) {
      const recoveredAnalyses = await analyzeReviewBatch(jobId, missingReviews);
      return [...mappedAnalyses, ...recoveredAnalyses];
    }

    return [
      ...mappedAnalyses,
      ...missingReviews.map((review) => fallbackAnalysisForReview(review)),
    ];
  };

  try {
    return await runSingleBatch();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown DeepSeek error';
    recordLlmCall({
      jobId,
      callType: 'review_batch',
      model: config.deepseekFastModel,
      inputCount: reviews.length,
      error: message,
    });

    if (reviews.length > 8) {
      const midpoint = Math.ceil(reviews.length / 2);
      const left = await analyzeReviewBatch(jobId, reviews.slice(0, midpoint));
      const right = await analyzeReviewBatch(jobId, reviews.slice(midpoint));
      return [...left, ...right];
    }

    throw error;
  }
}

export async function generateNarrative(
  jobId: string,
  stats: unknown,
  interpretationLanguage: InterpretationLanguage = 'zh',
): Promise<Record<string, string>> {
  assertDeepSeekConfigured();

  const systemPrompt = `
You are a senior product strategy analyst. Write concise ${
    interpretationLanguage === 'en' ? 'English' : 'Chinese'
  } insights for an app review analytics dashboard.
Return strict json only. No markdown. Each field should be 1-2 sentences, decision-oriented, and based only on the provided statistics.
${interpretationLanguage === 'zh'
  ? 'Every value MUST be written in Simplified Chinese. Do not output English sentences except unavoidable product names or quoted labels.'
  : 'Every value MUST be written in English. Do not output Chinese sentences.'}

Expected json keys:
sentiment_distribution, avg_rating_vs_sentiment, trust_matrix, monthly_trends,
topic_distribution, topic_sentiment_cross, pros_cons_phrases, word_clouds,
feature_requests, pain_to_gain, dealbreakers, migration, use_cases
`.trim();

  try {
    const response = await client.chat.completions.create({
      model: config.deepseekReportModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Create dashboard insight json from these statistics:\n${JSON.stringify(stats)}` },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 3000,
      stream: false,
      thinking: { type: 'disabled' },
    } as any, { timeout: 45_000 });

    const content = response.choices[0]?.message?.content || '';
    recordLlmCall({
      jobId,
      callType: 'report_narrative',
      model: config.deepseekReportModel,
      inputCount: 1,
      rawResponse: content,
    });

    return narrativeSchema.parse(parseJsonObject(content));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown DeepSeek summary error';
    recordLlmCall({
      jobId,
      callType: 'report_narrative',
      model: config.deepseekReportModel,
      inputCount: 1,
      error: message,
    });
    throw error;
  }
}

export async function translateReviewBatch(
  jobId: string,
  reviews: RawReview[],
): Promise<Array<{ sourceKey: string; detectedLanguage: string; translatedText: string }>> {
  assertDeepSeekConfigured();

  const compactReviews = reviews.map((review) => ({
    id: review.sourceKey,
    declaredLanguage: review.language,
    text: review.combinedText || review.content,
  }));

  const systemPrompt = `
You normalize multilingual Google Play reviews for downstream English analysis.
Return STRICT JSON only. Do not include markdown, comments, or code fences.

For each input review, return exactly one object with:
- id: copy exactly from input
- detectedLanguage: ISO-like language code when inferable (e.g. "en", "zh", "es", "ms", "ar"), otherwise "unknown"
- translatedText: fluent English translation of the review text

Rules:
1. Preserve one output object per input review.
2. If the review is already English, translatedText should be a cleaned English version of the same text.
3. Translate title/content meaning faithfully. Do not summarize. Do not omit product complaints or feature requests.
4. If the text contains mixed languages, choose the dominant language in detectedLanguage and translate the full meaning to English.
5. If the text is too short but meaningful, keep it short in English.
6. If the text is unusable, return translatedText as the cleaned original text and detectedLanguage as "unknown".

Expected shape:
{
  "reviews": [
    {
      "id": "same id from input",
      "detectedLanguage": "es",
      "translatedText": "The login flow keeps sending me back to the start screen."
    }
  ]
}`.trim();

  const userPrompt = `Translate this JSON array of Google Play reviews into analysis-ready English and infer the actual review language.\n${JSON.stringify(compactReviews)}`;

  const response = await client.chat.completions.create({
    model: config.deepseekFastModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 12000,
    stream: false,
    thinking: { type: 'disabled' },
  } as any, { timeout: 60_000 });

  const content = response.choices[0]?.message?.content || '';
  recordLlmCall({
    jobId,
    callType: 'translation_batch',
    model: config.deepseekFastModel,
    inputCount: reviews.length,
    rawResponse: content,
  });

  const parsed = translationBatchSchema.parse(parseJsonObject(content));
  const bySourceKey = new Map(reviews.map((review) => [review.sourceKey, review]));

  return parsed.reviews
    .filter((item) => bySourceKey.has(item.id))
    .map((item) => {
      const original = bySourceKey.get(item.id);
      const translatedText = item.translatedText.trim() || original?.combinedText || original?.content || '';

      return {
        sourceKey: item.id,
        detectedLanguage: item.detectedLanguage.trim().toLowerCase() || 'unknown',
        translatedText,
      };
    });
}
