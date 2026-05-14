import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  Filter, 
  Brain, 
  Layers, 
  FileText, 
  CheckCircle2,
  Loader2,
  Zap
} from 'lucide-react';
import type { AnalysisJob } from '../../shared/types';

interface AnalysisPipelineProps {
  job?: AnalysisJob | null;
  config: {
    packageName: string;
    languages: string[];
    regions: string[];
    count: string;
  };
}

const STEPS = [
  { id: 'fetch', label: '数据抓取', icon: Download },
  { id: 'clean', label: '清洗去重', icon: Filter },
  { id: 'translate', label: '统一翻译', icon: Loader2 },
  { id: 'analyze', label: 'AI 语义分析', icon: Brain },
  { id: 'modeling', label: '趋势建模', icon: Layers },
  { id: 'report', label: '生成报告', icon: FileText },
];

function stepIndexFor(job?: AnalysisJob | null) {
  switch (job?.status) {
    case 'queued':
      return 0;
    case 'fetching':
      return 0;
    case 'enriching':
      return 1;
    case 'translating':
      return 2;
    case 'analyzing':
      return 3;
    case 'summarizing':
      return 5;
    case 'completed':
      return 5;
    case 'failed':
      return 5;
    default:
      return 0;
  }
}

export default function AnalysisPipeline({ job, config }: AnalysisPipelineProps) {
  const currentStepIndex = stepIndexFor(job);
  const progress = job?.progress ?? 3;
  const statusMessage =
    job?.message ||
    `准备抓取 [${config.regions.join(', ').toUpperCase()}] / [${config.languages.join(', ')}] 评论，共 ${config.count} 条...`;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xl flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-8 border border-white/20"
      >
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-500/20">
            <Zap className="text-white w-8 h-8 fill-current animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">深度分析引擎正在运行</h2>
          <p className="text-slate-500 mt-2 font-medium max-w-md">正在为 <span className="text-blue-600 underline underline-offset-4">{config.packageName}</span> 构建多维度分析报告</p>
          {job?.reviewCount ? (
            <p className="text-xs text-slate-400 mt-2">
              已抓取 {job.reviewCount} 条，已分析 {job.analyzedCount} 条
            </p>
          ) : null}
        </div>

        {/* Stepper */}
        <div className="relative mb-12">
          {/* Progress Line Background */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-100 -z-10" />
          
          <div className="flex justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentStepIndex;
              const isActive = index === currentStepIndex;
              
              return (
                <div key={step.id} className="flex flex-col items-center gap-3 relative">
                  <motion.div 
                    initial={false}
                    animate={{ 
                      backgroundColor: isCompleted || isActive ? '#2563eb' : '#f1f5f9',
                      scale: isActive ? 1.2 : 1
                    }}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    ) : isActive ? (
                      <Icon className="w-5 h-5 text-white animate-pulse" />
                    ) : (
                      <Icon className="w-5 h-5 text-slate-400" />
                    )}
                  </motion.div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feedback Area */}
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              <span className="text-sm font-semibold text-slate-600">当前任务进度</span>
            </div>
            <span className="text-sm font-mono font-bold text-blue-600">{progress}%</span>
          </div>
          
          {/* Progress Bar Container */}
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mb-4">
            <motion.div 
              className="h-full bg-blue-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeOut" }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.p 
              key={statusMessage}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs font-medium text-slate-400 italic"
            >
              {statusMessage}
            </motion.p>
          </AnimatePresence>
          {job?.status === 'failed' && job.error ? (
            <p className="text-xs font-semibold text-rose-500 mt-3">{job.error}</p>
          ) : null}
        </div>

        <div className="mt-8 flex justify-center">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">POWERED BY CLOUD AI INFERENCE</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
