/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus, Trash2, Users, AlertTriangle, Loader2 } from 'lucide-react';
import { fetchAllProfiles } from '../utils/supabaseData';
import { sendPersonnelInviteEmail } from '../utils/emailService';

interface PersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  personnel: string[];
  onUpdatePersonnel: (personnel: string[]) => void;
  taskAssignees: string[]; // currently assigned people in tasks
  projectName: string;
  isOwner?: boolean;
}

export default function PersonnelModal({
  isOpen,
  onClose,
  personnel,
  onUpdatePersonnel,
  taskAssignees,
  projectName,
  isOwner = true,
}: PersonnelModalProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<{id: string, email: string, full_name: string}[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoadingProfiles(true);
      fetchAllProfiles().then(data => {
        setProfiles(data);
        setLoadingProfiles(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdd = async (user: { firstName: string, email: string, full_name: string }) => {
    if (personnel.some(p => p.toLowerCase() === user.firstName.toLowerCase())) {
      return;
    }
    
    // Immediately update UI
    onUpdatePersonnel([...personnel, user.firstName]);

    // Send the email in the background
    try {
      await sendPersonnelInviteEmail(user.email, user.full_name || user.firstName, projectName);
    } catch (err) {
      console.error("Could not send invite email", err);
      alert("Added to project, but failed to send the invite email. Please check EmailJS configuration or browser console.");
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

  // Extract first names from registered users
  const availableUsers = profiles.map(p => {
    const firstName = p.full_name ? p.full_name.split(' ')[0] : p.email.split('@')[0];
    return { ...p, firstName };
  }).filter(p => !personnel.includes(p.firstName));

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

          {/* Add New Person (From Registered Users) */}
          {isOwner && (
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/30">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-3">
                Available Registered Users
              </label>
            <div className="max-h-48 overflow-y-auto scrollbar-thin">
              {loadingProfiles ? (
                <div className="flex items-center justify-center py-4 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span className="text-sm">Loading users...</span>
                </div>
              ) : availableUsers.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4 italic">
                  No new users available to add.
                </p>
              ) : (
                <div className="space-y-2 pr-2">
                  {availableUsers.map((user) => (
                    <div key={user.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {user.firstName[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user.firstName}</p>
                          <p className="text-[10px] text-slate-400">{user.email}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAdd(user)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:hover:bg-violet-800/60 cursor-pointer transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}

          {/* Personnel List (Currently Added) */}
          <div className="p-6 max-h-80 overflow-y-auto scrollbar-thin">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-3">
              Current Project Personnel
            </label>
            {personnel.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No team members yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Add registered users from above.</p>
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
                          {person[0].toUpperCase()}
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
                      {isOwner && (
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
                      )}
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
