/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus, Trash2, Users, AlertTriangle } from 'lucide-react';

interface PersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  personnel: string[];
  onUpdatePersonnel: (personnel: string[]) => void;
  taskAssignees: string[]; // currently assigned people in tasks
}

export default function PersonnelModal({
  isOpen,
  onClose,
  personnel,
  onUpdatePersonnel,
  taskAssignees,
}: PersonnelModalProps) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setError('Please enter a name.');
      return;
    }
    if (personnel.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
      setError('This person already exists.');
      return;
    }
    onUpdatePersonnel([...personnel, trimmed]);
    setNewName('');
    setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleDelete = (name: string) => {
    const isAssigned = taskAssignees.includes(name);
    if (isAssigned && confirmDelete !== name) {
      setConfirmDelete(name);
      return;
    }
    onUpdatePersonnel(personnel.filter(p => p !== name));
    setConfirmDelete(null);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4" id="personnel-modal-container">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs"
          id="personnel-modal-backdrop"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col z-10"
          id="personnel-modal-card"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/85">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-violet-50 dark:bg-violet-950/40 rounded-xl">
                <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 font-sans" id="personnel-modal-title">
                  Manage Personnel
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-sans mt-0.5">
                  Add or remove team members for this project.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl cursor-pointer transition-colors"
              id="btn-close-personnel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Add New Person */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800/60">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-2">
              Add New Team Member
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Sarah Chen"
                value={newName}
                onChange={e => { setNewName(e.target.value); setError(''); setConfirmDelete(null); }}
                onKeyDown={handleKeyDown}
                className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/80 rounded-xl focus:outline-hidden focus:border-violet-500 text-slate-800 dark:text-slate-100 font-sans transition-all text-sm"
                id="input-new-personnel"
              />
              <button
                type="button"
                onClick={handleAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-100 dark:shadow-none cursor-pointer transition-all active:scale-98"
                id="btn-add-personnel"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
            {error && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-2 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
          </div>

          {/* Personnel List */}
          <div className="p-6 max-h-80 overflow-y-auto scrollbar-thin">
            {personnel.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No team members yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Add personnel above to populate your team roster.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {personnel.map((person, index) => {
                  const isAssigned = taskAssignees.includes(person);
                  const taskCount = taskAssignees.filter(a => a === person).length;
                  const isConfirming = confirmDelete === person;

                  return (
                    <motion.div
                      key={person}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                        isConfirming
                          ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                          : 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/20'
                      }`}
                      id={`personnel-row-${index}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {person.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{person}</p>
                          {isAssigned && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                              Assigned to {taskCount} task{taskCount !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isConfirming && (
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold whitespace-nowrap">
                            Has tasks! Sure?
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(person)}
                          className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                            isConfirming
                              ? 'bg-rose-600 text-white hover:bg-rose-700'
                              : 'hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400'
                          }`}
                          title={isConfirming ? 'Confirm delete' : 'Remove person'}
                          id={`btn-delete-personnel-${index}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-slate-100 dark:border-slate-800/85">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
              {personnel.length} member{personnel.length !== 1 ? 's' : ''} total
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold tracking-wide uppercase text-white bg-violet-600 hover:bg-violet-700 rounded-xl cursor-pointer shadow-md shadow-violet-100 dark:shadow-none transition-all active:scale-98 select-none"
              id="btn-done-personnel"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
