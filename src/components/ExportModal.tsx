import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Image, Download, Loader2, AlertTriangle } from 'lucide-react';
import { generateExportImage } from '../utils/exportUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (format: 'png' | 'jpeg', filename: string) => void;
  defaultFilename: string;
  projectTitle?: string;
}

export default function ExportModal({
  isOpen,
  onClose,
  onConfirm,
  defaultFilename,
  projectTitle,
}: ExportModalProps) {
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [filename, setFilename] = useState(defaultFilename);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);

  // Trigger preview generation when modal opens or format changes
  useEffect(() => {
    if (!isOpen) {
      setPreviewSrc(null);
      setError(null);
      setShowLightbox(false);
      return;
    }

    const generatePreview = async () => {
      setIsGenerating(true);
      setError(null);
      
      // Brief delay to ensure timeline DOM rendering settles
      await new Promise(resolve => setTimeout(resolve, 150));

      const el = document.getElementById('gantt-planner-container');
      if (!el) {
        setError('Gantt planner container element not found in DOM.');
        setIsGenerating(false);
        return;
      }

      try {
        const title = projectTitle || `${filename.trim() || defaultFilename} Gantt Chart`;
        const url = await generateExportImage(el, format, title);
        setPreviewSrc(url);
      } catch (err) {
        console.error('Preview generation failed:', err);
        setError('Failed to render Gantt chart preview image. Ensure browser has rendering context.');
      } finally {
        setIsGenerating(false);
      }
    };

    generatePreview();
  }, [isOpen, format, projectTitle]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(format, filename.trim() || defaultFilename);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4" id="export-modal-container">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs"
          id="export-modal-backdrop"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col z-10"
          id="export-modal-card"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/85">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl">
                <Image className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 font-sans" id="export-modal-title">
                  Export Gantt Chart
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-sans mt-0.5">
                  Save your project timeline as a shareable image file.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl cursor-pointer transition-colors"
              id="btn-close-export"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Side-by-side / Responsive Body */}
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
            {/* Settings (Left) */}
            <div className="w-full md:w-80 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800/80">
              <form id="export-form" onSubmit={handleSubmit} className="flex flex-col gap-5 text-sm text-slate-700 dark:text-slate-350">
                {/* Filename */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-2">
                    File Name
                  </label>
                  <input
                    type="text"
                    value={filename}
                    onChange={e => setFilename(e.target.value)}
                    placeholder="e.g. project_gantt_chart"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/80 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-sans transition-all text-sm focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950"
                    id="input-export-filename"
                    maxLength={80}
                  />
                </div>

                {/* Format Options */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-2">
                    Choose Format
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormat('png')}
                      className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                        format === 'png'
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500 text-indigo-700 dark:text-indigo-400 font-semibold ring-2 ring-indigo-500/10'
                          : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                      }`}
                      id="btn-format-png"
                    >
                      <p className="text-sm font-bold">PNG</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">High Quality</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormat('jpeg')}
                      className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                        format === 'jpeg'
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500 text-indigo-700 dark:text-indigo-400 font-semibold ring-2 ring-indigo-500/10'
                          : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                      }`}
                      id="btn-format-jpg"
                    >
                      <p className="text-sm font-bold">JPEG</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Compressed</p>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Preview Panel (Right) */}
            <div className="flex-1 bg-slate-50/50 dark:bg-slate-950/20 p-6 flex flex-col relative min-h-[380px] md:min-h-[460px]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Visual Export Preview (Click to Zoom)
                </span>
              </div>

              {/* Dotted canvas board frame */}
              <div className="flex-1 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden relative bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] flex items-center justify-center min-h-[300px]">
                {isGenerating ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-sans">Generating visual canvas...</p>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center gap-2 p-6 text-center">
                    <AlertTriangle className="w-8 h-8 text-amber-500 animate-bounce" />
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{error}</p>
                  </div>
                ) : previewSrc ? (
                  <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                    <img
                      src={previewSrc}
                      alt="Export preview"
                      onClick={() => setShowLightbox(true)}
                      className="rounded-lg shadow-md border border-slate-200/50 dark:border-slate-800/80 transition-all duration-300 max-w-full max-h-[330px] object-contain cursor-zoom-in hover:brightness-95 dark:hover:brightness-110 active:scale-99"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No layout generated.</p>
                )}

                {/* Interactive Overlay Download Trigger Button inside Preview container */}
                {previewSrc && !isGenerating && (
                  <div className="absolute bottom-4 right-4 left-4 sm:left-auto flex items-center gap-4 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md px-4.5 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl">
                    <div className="hidden sm:block text-left">
                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Layout ready to proceed</p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500">Output: {format.toUpperCase()} format</p>
                    </div>
                    <button
                      type="submit"
                      form="export-form"
                      className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold tracking-wide uppercase text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer shadow-md shadow-indigo-100 dark:shadow-none transition-all active:scale-98 select-none inline-flex items-center justify-center gap-1.5"
                      id="btn-confirm-export"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Proceed Export</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Fullscreen Image Lightbox Overlay */}
      {showLightbox && previewSrc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 cursor-zoom-out"
            onClick={() => setShowLightbox(false)}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative max-w-full max-h-full flex flex-col items-center z-10"
          >
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full cursor-pointer transition-colors"
              title="Close full view"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewSrc}
              alt="Export preview zoomed"
              onClick={() => setShowLightbox(false)}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl border border-slate-800/80 cursor-zoom-out"
            />
            <p className="text-white/50 text-xs font-medium mt-4 font-sans select-none pointer-events-none">
              Click anywhere or press X to return
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
