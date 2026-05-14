import type { RawReview } from '../shared/types';

function detectLanguage(review: RawReview): string {
  const declared = review.language?.trim().toLowerCase();
  return declared || 'unknown';
}

function combineText(review: RawReview): string {
  const parts = [review.title?.trim(), review.content.trim()].filter(Boolean);
  return parts.join('. ').replace(/\s+/g, ' ').trim();
}

function normalizeDeclaredLanguage(code: string): string {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return 'unknown';
  if (normalized === 'en-us' || normalized === 'en-gb') return 'en';
  if (normalized === 'zh-cn' || normalized === 'zh-tw' || normalized === 'zh-hk') return 'zh';
  return normalized;
}

export function enrichReviews(reviews: RawReview[]): RawReview[] {
  return reviews
    .map((review) => {
      const combinedText = combineText(review);
      const detectedLanguage = normalizeDeclaredLanguage(detectLanguage(review));

      return {
        ...review,
        combinedText,
        detectedLanguage,
        translatedText: undefined,
        analysisLanguage: 'en',
        analysisText: combinedText,
      };
    })
    .filter((review) => Boolean(review.analysisText));
}

export function dedupeReviews(reviews: RawReview[]): {
  deduped: RawReview[];
  removedCount: number;
} {
  const deduped = new Map<string, RawReview>();

  for (const review of reviews) {
    const normalizedContent = review.content.replace(/\s+/g, ' ').trim().toLowerCase();
    const dedupeKey = review.reviewId || normalizedContent || review.sourceKey;
    const existing = deduped.get(dedupeKey);

    if (!existing) {
      deduped.set(dedupeKey, review);
      continue;
    }

    const existingScore =
      existing.content.length +
      (existing.title?.length || 0) +
      (existing.thumbsUp || 0);
    const nextScore =
      review.content.length +
      (review.title?.length || 0) +
      (review.thumbsUp || 0);

    if (nextScore > existingScore) {
      deduped.set(dedupeKey, review);
    }
  }

  return {
    deduped: [...deduped.values()],
    removedCount: Math.max(0, reviews.length - deduped.size),
  };
}

export function applyTranslations(
  reviews: RawReview[],
  translations: Array<{ sourceKey: string; detectedLanguage: string; translatedText: string }>,
): RawReview[] {
  const translationByKey = new Map(
    translations.map((item) => [
      item.sourceKey,
      {
        detectedLanguage: normalizeDeclaredLanguage(item.detectedLanguage || 'unknown'),
        translatedText: item.translatedText.replace(/\s+/g, ' ').trim(),
      },
    ]),
  );

  return reviews.map((review) => {
    const translation = translationByKey.get(review.sourceKey);
    const translatedText = translation?.translatedText || review.combinedText || review.content;
    return {
      ...review,
      detectedLanguage: translation?.detectedLanguage || review.detectedLanguage || 'unknown',
      translatedText,
      analysisLanguage: 'en',
      analysisText: translatedText,
    };
  });
}
