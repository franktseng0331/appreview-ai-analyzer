import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Search, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Option } from '../constants';

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  label: string;
}

export default function MultiSelect({ options, selected, onChange, placeholder = "Select...", label }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opt.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter(item => item !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const removeOption = (e: React.MouseEvent, val: string) => {
    e.stopPropagation();
    onChange(selected.filter(item => item !== val));
  };

  const selectedOptions = options.filter(opt => selected.includes(opt.value));

  return (
    <div className="w-full relative" ref={containerRef}>
      <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest pl-1">
        {label}
      </label>
      
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`min-h-[42px] px-3 py-1.5 bg-slate-50 border rounded-xl cursor-pointer flex flex-wrap items-center gap-1.5 transition-all outline-none ring-offset-white ${
          isOpen ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {selectedOptions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {selectedOptions.map(opt => (
              <span
                key={opt.value}
                className="flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-sm transition-transform active:scale-95"
              >
                <span>{opt.icon}</span>
                {opt.label.split(' (')[0]}
                <X
                  size={12}
                  className="cursor-pointer text-slate-400 hover:text-rose-500 transition-colors"
                  onClick={(e) => removeOption(e, opt.value)}
                />
              </span>
            ))}
          </div>
        ) : (
          <span className="text-sm text-slate-400 font-medium pl-1">{placeholder}</span>
        )}
        
        <div className="ml-auto flex items-center pr-1 text-slate-400">
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className="absolute z-50 left-0 right-0 top-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="p-3 border-b border-slate-50 bg-slate-50/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  placeholder="Search options..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto p-1.5 custom-scrollbar">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => (
                  <div
                    key={opt.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOption(opt.value);
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                      selected.includes(opt.value)
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{opt.icon}</span>
                      <span className="text-sm font-medium">{opt.label}</span>
                    </div>
                    {selected.includes(opt.value) && (
                      <Check className="w-4 h-4" />
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-400 font-medium">No results found</p>
                </div>
              )}
            </div>
            
            {selected.length > 0 && (
              <div className="p-2 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button 
                  onClick={() => onChange([])}
                  className="text-[10px] font-bold text-slate-400 hover:text-rose-500 tracking-widest uppercase transition-colors px-2"
                >
                  Clear All Selection
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
