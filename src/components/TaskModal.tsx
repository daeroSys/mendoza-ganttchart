/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, User, Clock, AlertTriangle, Link2, Check } from 'lucide-react';
import { Task, Priority } from '../types';
import { COLOR_MAP } from '../data/defaultTasks';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Omit<Task, 'id'> & { id?: string }) => void;
  taskToEdit: Task | null;
  allTasks: Task[];
  personnel?: string[];
  restrictedMode?: boolean;
}

const COLORS = Object.keys(COLOR_MAP);

export default function TaskModal({
  isOpen,
  onClose,
  onSave,
  taskToEdit,
  allTasks,
  personnel = [],
  restrictedMode = false,
}: TaskModalProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('2026-05-27');
  const [endDate, setEndDate] = useState('2026-06-03');
  const [progress, setProgress] = useState(0);
  const [priority, setPriority] = useState<Priority>('Medium');
  const [assignee, setAssignee] = useState<string[]>([]);
  const [assigneeStringInput, setAssigneeStringInput] = useState('');
  const [color, setColor] = useState('indigo');
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [error, setError] = useState('');

  // Synchronize state when open & taskToEdit changes
  useEffect(() => {
    if (taskToEdit) {
      setName(taskToEdit.name);
      setStartDate(taskToEdit.startDate);
      setEndDate(taskToEdit.endDate);
      setProgress(taskToEdit.progress);
      setPriority(taskToEdit.priority);
      const initialAssignees = Array.isArray(taskToEdit.assignee) ? taskToEdit.assignee : [taskToEdit.assignee].filter(Boolean);
      setAssignee(initialAssignees);
      setAssigneeStringInput(initialAssignees.join(', '));
      setColor(taskToEdit.color);
      setDependencies(taskToEdit.dependencies || []);
      setError('');
    } else {
      setName('');
      setStartDate('2026-05-27');
      setEndDate('2026-06-03');
      setProgress(0);
      setPriority('Medium');
      setAssignee([]);
      setAssigneeStringInput('');
      setColor('indigo');
      setDependencies([]);
      setError('');
    }
  }, [taskToEdit, isOpen]);

  if (!isOpen) return null;

  // Filter possible dependencies - prevent self-dependency
  const availableDependencies = allTasks.filter(
    t => !taskToEdit || t.id !== taskToEdit.id
  );

  const toggleAssignee = (personName: string) => {
    if (restrictedMode) return;
    setAssignee(prev => {
      if (prev.includes(personName)) {
        return prev.filter(p => p !== personName);
      } else {
        return [...prev, personName];
      }
    });
  };

  const toggleDependency = (id: string) => {
    if (restrictedMode) return;
    setDependencies(prev => {
      if (prev.includes(id)) {
        return prev.filter(depId => depId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Task name is required.');
      return;
    }

    const finalAssignees = personnel.length > 0
      ? assignee
      : assigneeStringInput.split(',').map(a => a.trim()).filter(Boolean);

    if (finalAssignees.length === 0) {
      setError('At least one assignee is required.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      setError('Start date cannot be after end date.');
      return;
    }

    onSave({
      ...(taskToEdit ? { id: taskToEdit.id } : {}),
      name: name.trim(),
      startDate,
      endDate,
      progress,
      priority,
      assignee: finalAssignees,
      color,
      dependencies,
    });
    
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4" id="modal-container">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs"
          id="modal-backdrop"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col z-10"
          id="modal-content-card"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/85">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 font-sans" id="modal-title">
                {taskToEdit ? 'Modify Task Details' : 'Create New Project Task'}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-400 font-sans mt-1">
                Configure critical milestones and dates to orchestrate progress.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl cursor-pointer transition-colors"
              id="btn-close-modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto text-sm text-slate-700 dark:text-slate-300 pointer-events-auto" id="modal-form-element">
            
            {/* Error Message Alert */}
            {error && (
              <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-400 font-sans font-medium" id="modal-error-alert">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Task Name */}
            <div className="mb-4" id="grp-task-name">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 dark:bg-transparent tracking-wider uppercase mb-1.5">Task Title</label>
              <input
                type="text"
                placeholder="Database Schema Design, UX Prototype, etc."
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={80}
                disabled={restrictedMode}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/80 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-sans transition-all focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 disabled:opacity-60 disabled:cursor-not-allowed"
                id="input-task-name"
              />
            </div>

            {/* Quick 2 Column Grid for dates & assignee */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              
              {/* Start Date */}
              <div id="grp-start-date">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  disabled={restrictedMode}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/80 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-sans transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  id="input-start-date"
                />
              </div>

              {/* End Date */}
              <div id="grp-end-date">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  disabled={restrictedMode}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/80 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-sans transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  id="input-end-date"
                />
              </div>

              {/* Assigned Person */}
              <div id="grp-assignee" className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1.5 flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Assignees (Select team members)
                </label>
                {personnel.length > 0 ? (
                  <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-950/20 scrollbar-thin" id="assignees-checkbox-list">
                    {personnel.map(person => {
                      const isChecked = assignee.includes(person);
                      return (
                        <div
                          key={person}
                          onClick={() => toggleAssignee(person)}
                          className={`flex items-center gap-2.5 px-3.5 py-2 select-none transition-colors ${restrictedMode ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50'}`}
                          id={`assignee-item-${person}`}
                        >
                          <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all ${
                            isChecked 
                              ? 'bg-indigo-600 border-indigo-600 text-white' 
                              : 'border-slate-300 dark:border-slate-700'
                          } ${restrictedMode ? 'opacity-60' : ''}`} id={`checkbox-assignee-${person}`}>
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className={`text-xs font-semibold text-slate-855 dark:text-slate-200 ${restrictedMode ? 'opacity-60' : ''}`}>👤 {person}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. Marcus Vance, Sarah Chen (comma separated)"
                    value={assigneeStringInput}
                    onChange={e => setAssigneeStringInput(e.target.value)}
                    disabled={restrictedMode}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/80 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-sans transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    id="input-assignee"
                  />
                )}
              </div>

              {/* Priority Dropdown */}
              <div id="grp-priority">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Priority
                </label>
                <div className="relative">
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as Priority)}
                    disabled={restrictedMode}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/80 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-sans appearance-none cursor-pointer h-10.5 disabled:opacity-60 disabled:cursor-not-allowed"
                    id="select-priority"
                  >
                    <option value="High">🔴 High Priority</option>
                    <option value="Medium">🟡 Medium Priority</option>
                    <option value="Low">🟢 Low Priority</option>
                  </select>
                </div>
              </div>

            </div>

            {/* Beautiful Progress Slider */}
            <div className="mb-4" id="grp-progress">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">Progress Completed</label>
                <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{progress}%</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progress}
                  onChange={e => setProgress(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  id="input-progress-slider"
                />
              </div>
            </div>

            {/* Custom Color Circle Pickers */}
            <div className="mb-4" id="grp-color-selector">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-2">Color Tag Accent</label>
              <div className="flex flex-wrap gap-2.5">
                {COLORS.map(c => {
                  const isSelected = color === c;
                  // Color dot matching actual spectrum
                  const colorMatch: Record<string, string> = {
                    indigo: 'bg-indigo-500',
                    blue: 'bg-blue-500',
                    purple: 'bg-purple-500',
                    cyan: 'bg-cyan-500',
                    teal: 'bg-teal-500',
                    amber: 'bg-amber-500',
                    emerald: 'bg-emerald-500',
                    rose: 'bg-rose-500'
                  };
                  return (
                    <button
                      key={c}
                      type="button"
                      disabled={restrictedMode}
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full ${colorMatch[c] || 'bg-slate-400'} flex items-center justify-center transition-all focus:outline-hidden hover:scale-108 active:scale-95 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                        isSelected ? 'ring-3 ring-indigo-600 dark:ring-indigo-400 ring-offset-2 dark:ring-offset-slate-900 scale-105' : 'opacity-85'
                      }`}
                      title={c}
                      id={`btn-color-dot-${c}`}
                    >
                      {isSelected && <Check className="w-4.5 h-4.5 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Multi-Select Dependencies */}
            <div id="grp-dependencies">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-2 flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-indigo-500" /> Linked Block Dependencies (Prerequisite Tasks)
              </label>
              {availableDependencies.length === 0 ? (
                <p className="text-xs text-slate-400 p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 rounded-xl font-sans italic">
                  No other tasks are available to link as dependencies yet. Create other tasks first.
                </p>
              ) : (
                <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-950/20 scrollbar-thin" id="dependencies-checkbox-list">
                  {availableDependencies.map(task => {
                    const isChecked = dependencies.includes(task.id);
                    return (
                      <div
                        key={task.id}
                        onClick={() => toggleDependency(task.id)}
                        className={`flex items-center gap-2.5 px-3.5 py-2 select-none transition-colors ${restrictedMode ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50'}`}
                        id={`dep-item-${task.id}`}
                      >
                        <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all ${
                          isChecked 
                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                            : 'border-slate-300 dark:border-slate-700'
                        } ${restrictedMode ? 'opacity-65' : ''}`} id={`checkbox-box-${task.id}`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold text-slate-800 dark:text-slate-200 truncate ${restrictedMode ? 'opacity-65' : ''}`}>{task.name}</p>
                          <p className={`text-[10px] text-slate-400 mt-0.5 font-mono ${restrictedMode ? 'opacity-55' : ''}`}>
                            {task.startDate} to {task.endDate} · 👤 {task.assignee.join(', ')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </form>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-2 p-6 border-t border-slate-100 dark:border-slate-800/85">
            <button
              type="button"
              onClick={onClose}
              className="px-4.5 py-2.5 text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer transition-all select-none"
              id="btn-cancel-modal"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2.5 text-xs font-bold tracking-wide uppercase text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer shadow-md shadow-indigo-100 dark:shadow-none transition-all active:scale-98 select-none"
              id="btn-submit-modal"
            >
              {taskToEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
