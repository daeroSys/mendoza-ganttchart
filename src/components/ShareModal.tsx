import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, CheckCircle2, Globe } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
}

export default function ShareModal({ isOpen, onClose, shareUrl }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
          className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800/85">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 font-sans">
              Share Project
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 flex flex-col gap-5">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl shrink-0 mt-1">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Anyone with the link</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Anyone who has this link will be able to view the project timeline and details in Read-Only mode. They cannot make changes to tasks.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden shadow-inner">
                <p className="text-sm text-slate-600 dark:text-slate-400 font-mono truncate">
                  {shareUrl}
                </p>
              </div>
              <button
                onClick={handleCopy}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all active:scale-98 text-sm font-bold"
              >
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
