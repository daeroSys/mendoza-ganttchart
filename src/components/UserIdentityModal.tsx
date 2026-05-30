import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Check } from 'lucide-react';

interface UserIdentityModalProps {
  isOpen: boolean;
  onSave: (username: string) => void;
}

export default function UserIdentityModal({ isOpen, onSave }: UserIdentityModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name to collaborate.');
      return;
    }
    onSave(name.trim());
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/70 dark:bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden p-6 z-10"
        >
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-3">
              <User className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-50 font-sans">
              Collaborator Setup
            </h3>
            <p className="text-xs text-slate-450 dark:text-slate-400 font-sans mt-1">
              Please enter your name to collaborate on this Gantt chart. Your edits will be logged under your identity.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-450 text-center bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/40">
                ⚠️ {error}
              </p>
            )}

            <div>
              <input
                type="text"
                placeholder="e.g. Sarah Chen"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  setError('');
                }}
                maxLength={40}
                autoFocus
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/80 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-sans text-center font-semibold text-sm transition-all focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs tracking-wide uppercase transition-all shadow-md shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Join Collaboration</span>
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
