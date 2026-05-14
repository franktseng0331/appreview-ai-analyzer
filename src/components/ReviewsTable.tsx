import { Star } from 'lucide-react';
import type { ReportReview } from '../../shared/types';

interface ReviewsTableProps {
  reviews?: ReportReview[];
}

export default function ReviewsTable({ reviews }: ReviewsTableProps) {
  const rows = reviews ?? [];

  const getSentimentStyle = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-emerald-100 text-emerald-700';
      case 'neutral': return 'bg-slate-100 text-slate-700';
      case 'negative': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getIntentStyle = (intent: string) => {
    switch (intent) {
      case 'feature_request': return 'border-blue-200 text-blue-700 bg-blue-50';
      case 'bug_report': return 'border-rose-200 text-rose-700 bg-rose-50';
      case 'praise': return 'border-emerald-200 text-emerald-700 bg-emerald-50';
      default: return 'border-slate-200 text-slate-700 bg-slate-50';
    }
  };

  const formatIntent = (intent: string) => {
    return intent.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="py-4 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">用户</th>
            <th className="py-4 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">评分</th>
            <th className="py-4 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider w-1/3">评论原文</th>
            <th className="py-4 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">AI 情感</th>
            <th className="py-4 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">AI 意图</th>
          </tr>
        </thead>
        <tbody>
          {!rows.length ? (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-sm font-medium text-slate-400">
                No analyzed reviews are available for this report yet.
              </td>
            </tr>
          ) : null}
          {rows.map((review) => (
            <tr key={review.sourceKey} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
              <td className="py-4 px-4">
                <div className="font-medium text-slate-900">{review.userName}</div>
                <div className="text-xs text-slate-400">{review.date}</div>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-0.5 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill={i < review.rating ? 'currentColor' : 'none'} strokeWidth={2.5} />
                  ))}
                </div>
              </td>
              <td className="py-4 px-4">
                <p className="text-sm text-slate-600 line-clamp-2" title={review.content}>
                  {review.content}
                </p>
              </td>
              <td className="py-4 px-4">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${getSentimentStyle(review.sentiment)}`}>
                  {review.sentiment}
                </span>
              </td>
              <td className="py-4 px-4">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getIntentStyle(review.intent)}`}>
                  {formatIntent(review.intent)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
