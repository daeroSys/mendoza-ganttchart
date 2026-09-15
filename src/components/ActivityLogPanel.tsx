import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, X, User, Edit3, Trash2, Calendar, FileText, Users } from 'lucide-react';
import { ActivityLog } from '../types';

interface ActivityLogPanelProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ActivityLog[];
}

export default function ActivityLogPanel({ isOpen, onClose, logs }: ActivityLogPanelProps) {
  const getIcon = (type: ActivityLog['actionType']) => {
    const classBase = "w-4 h-4";
    switch (type) {
      case 'task_create':
        return <Clock className={`${classBase} text-emerald-500`} />;
      case 'task_update':
        return <Edit3 className={`${classBase} text-blue-500`} />;
      case 'task_delete':
        return <Trash2 className={`${classBase} text-rose-500`} />;
      case 'task_reschedule':
        return <Calendar className={`${classBase} text-amber-500`} />;
      case 'personnel_update':
        return <Users className={`${classBase} text-violet-500`} />;
      default:
        return <FileText className={`${classBase} text-slate-500`} />;
    }
  };

  const getRelativeTime = (timestampStr: string) => {
    try {
      const past = new Date(timestampStr).getTime();
      const now = Date.now();
      const diffMs = now - past;
      
      if (diffMs < 5000) return 'Just now';
      
      const diffSecs = Math.floor(diffMs / 1000);
      if (diffSecs < 60) return `${diffSecs}s ago`;
      
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}m ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  const [filterAction, setFilterAction] = useState<string>('All');
  const [filterDate, setFilterDate] = useState<string>('');

  // Filter & Sort logs: newest first
  const filteredLogs = [...logs]
    .filter(log => filterAction === 'All' || log.actionType === filterAction)
    .filter(log => {
      if (!filterDate) return true;
      // log.timestamp is ISO string, starts with YYYY-MM-DD
      return log.timestamp.startsWith(filterDate);
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-900"
          />

          {/* Sidebar Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed right-0 top-0 bottom-0 w-80 sm:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 z-50 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-500" />
                <h3 className="text-md font-extrabold text-slate-800 dark:text-slate-100">Project Activity Feed</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-2 shrink-0">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Filter Activity</p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 text-xs bg-slate-100/50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-medium cursor-pointer transition-all appearance-none shadow-xs"
                  >
                    <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="All">All Actions</option>
                    <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="task_create">Task Created</option>
                    <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="task_update">Task Updated</option>
                    <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="task_delete">Task Deleted</option>
                    <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="task_reschedule">Task Rescheduled</option>
                    <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="personnel_update">Collaborators Updated</option>
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
                
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-slate-100/50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-medium cursor-pointer transition-all shadow-xs"
                />
              </div>
              {(filterAction !== 'All' || filterDate) && (
                <button
                  onClick={() => {
                    setFilterAction('All');
                    setFilterDate('');
                  }}
                  className="text-[10px] font-semibold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer self-start mt-0.5"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Scrollable Logs Feed */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4.5 scrollbar-thin">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Clock className="w-8 h-8 text-slate-355 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-medium">No activity logged yet.</p>
                  <p className="text-[10px] text-slate-450 mt-1">Changes made to tasks will appear here.</p>
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 bg-slate-50/60 dark:bg-slate-950/20 border border-slate-100/50 dark:border-slate-800/40 rounded-2xl"
                  >
                    <div className="p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shrink-0">
                      {getIcon(log.actionType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex justify-between items-baseline gap-2">
                        <span className="truncate flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate text-indigo-650 dark:text-indigo-400">{log.user}</span>
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 shrink-0 font-medium">{getRelativeTime(log.timestamp)}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed break-words font-sans">
                        {log.details}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
