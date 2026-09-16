import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, X, User, Edit3, Trash2, Calendar, FileText, Users, Check } from 'lucide-react';
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
  const [isActionDropdownOpen, setIsActionDropdownOpen] = useState(false);

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
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-3 shrink-0">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Filter Activity</p>
              <div className="flex items-center gap-2 relative z-10">
                {/* Custom Action Dropdown */}
                <div className="relative flex-1">
                  <button
                    onClick={() => setIsActionDropdownOpen(!isActionDropdownOpen)}
                    className={`w-full pl-3 pr-8 py-2 text-xs bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 border ${isActionDropdownOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-700'} rounded-xl font-medium cursor-pointer transition-all text-left flex items-center justify-between text-slate-700 dark:text-slate-200 shadow-xs`}
                  >
                    <span className="truncate">
                      {filterAction === 'All' && 'All Actions'}
                      {filterAction === 'task_create' && 'Task Created'}
                      {filterAction === 'task_update' && 'Task Updated'}
                      {filterAction === 'task_delete' && 'Task Deleted'}
                      {filterAction === 'task_reschedule' && 'Task Rescheduled'}
                      {filterAction === 'personnel_update' && 'Collaborators Updated'}
                    </span>
                  </button>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                  </div>

                  <AnimatePresence>
                    {isActionDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsActionDropdownOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -5, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -5, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full mt-2 left-0 w-48 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-xl shadow-xl z-50 p-1.5 flex flex-col gap-0.5 overflow-hidden"
                        >
                          {[
                            { value: 'All', label: 'All Actions' },
                            { value: 'task_create', label: 'Task Created' },
                            { value: 'task_update', label: 'Task Updated' },
                            { value: 'task_delete', label: 'Task Deleted' },
                            { value: 'task_reschedule', label: 'Task Rescheduled' },
                            { value: 'personnel_update', label: 'Collaborators Updated' },
                          ].map(option => (
                            <button
                              key={option.value}
                              onClick={() => {
                                setFilterAction(option.value);
                                setIsActionDropdownOpen(false);
                              }}
                              className={`flex items-center justify-between w-full text-left px-2.5 py-2 text-xs rounded-lg transition-colors ${filterAction === option.value ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                            >
                              {option.label}
                              {filterAction === option.value && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Date Input styled to match */}
                <div className="relative flex-1">
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 dark:text-slate-200 font-medium cursor-pointer transition-all shadow-xs"
                  />
                </div>
              </div>
              
              <AnimatePresence>
                {(filterAction !== 'All' || filterDate) && (
                  <motion.button
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    onClick={() => {
                      setFilterAction('All');
                      setFilterDate('');
                    }}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 transition-colors cursor-pointer self-start flex items-center gap-1 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-md"
                  >
                    <X className="w-3 h-3" /> Clear Filters
                  </motion.button>
                )}
              </AnimatePresence>
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
