import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  label: string;
  icon: LucideIcon;
  color: string;
}

export default function MetricCard({ title, value, label, icon: Icon, color }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
          <Icon className="w-6 h-6" />
        </div>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <h3 className="text-sm font-medium text-slate-500 mb-1">{title}</h3>
      <div className="text-3xl font-bold text-slate-900 tracking-tight">{value}</div>
    </motion.div>
  );
}
