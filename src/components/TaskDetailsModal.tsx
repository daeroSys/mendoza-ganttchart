import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, AlignLeft, LayoutList } from 'lucide-react';
import { Task } from '../types';

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
}

export default function TaskDetailsModal({ isOpen, onClose, task }: TaskDetailsModalProps) {
  if (!isOpen || !task) return null;

  // Format date helper
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/50 dark:border-slate-800/80 overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/85">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
                <LayoutList className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Task Details</h2>
                <p className="text-xs text-slate-500 mt-0.5">Project Information</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-6">
            
            {/* Task Name */}
            <div>
              <label className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5 mb-2">
                 Task Name
              </label>
              <div className="text-lg font-semibold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80">
                {task.name}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5 mb-2">
                <Calendar className="w-4 h-4" /> Duration
              </label>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80">
                {formatDate(task.startDate)} &nbsp;—&nbsp; {formatDate(task.endDate)}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5 mb-2">
                <AlignLeft className="w-4 h-4" /> Description
              </label>
              <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 min-h-[100px] whitespace-pre-wrap leading-relaxed">
                {task.description || <span className="italic text-slate-400">No description provided.</span>}
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 dark:border-slate-800/85 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
