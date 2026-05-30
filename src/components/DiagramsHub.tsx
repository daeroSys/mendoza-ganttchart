import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, Trash2, Maximize2, X, ExternalLink, Image as ImageIcon, Upload, Link } from 'lucide-react';
import { ProjectDiagram } from '../types';

interface DiagramsHubProps {
  diagrams: ProjectDiagram[];
  onUpdateDiagrams: (updated: ProjectDiagram[], details: string) => void;
  restrictedMode: boolean;
}

export default function DiagramsHub({
  diagrams,
  onUpdateDiagrams,
  restrictedMode,
}: DiagramsHubProps) {
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    return diagrams[0]?.id || '';
  });
  
  // Modal states for Diagram Creation/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingDiagramId, setEditingDiagramId] = useState<string | null>(null);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Inline attachment form fields
  const [pastedUrl, setPastedUrl] = useState('');
  const [showUrlField, setShowUrlField] = useState(false);

  // Lightbox zoom state
  const [zoomImageSrc, setZoomImageSrc] = useState<string | null>(null);

  // Set first tab active if active tab is deleted or missing
  const activeDiagram = diagrams.find(d => d.id === activeTabId) || diagrams[0] || null;
  const currentActiveId = activeDiagram?.id || '';

  const handleOpenCreate = () => {
    setTitle('');
    setDescription('');
    setModalMode('create');
    setEditingDiagramId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (diag: ProjectDiagram) => {
    setTitle(diag.title);
    setDescription(diag.description || '');
    setModalMode('edit');
    setEditingDiagramId(diag.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the diagram "${name}"?`)) {
      const updated = diagrams.filter(d => d.id !== id);
      onUpdateDiagrams(updated, `deleted architecture diagram "${name}"`);
      if (currentActiveId === id && updated.length > 0) {
        setActiveTabId(updated[0].id);
      }
    }
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please fill out the diagram name.');
      return;
    }

    if (modalMode === 'create') {
      const newDiag: ProjectDiagram = {
        id: `diag-${Date.now()}`,
        title: title.trim(),
        imageUrl: '', // Always starts empty; image is attached later
        description: description.trim() || undefined,
      };
      const updated = [...diagrams, newDiag];
      onUpdateDiagrams(updated, `created diagram tab "${newDiag.title}"`);
      setActiveTabId(newDiag.id);
    } else if (modalMode === 'edit' && editingDiagramId) {
      const updated = diagrams.map(d => {
        if (d.id === editingDiagramId) {
          return {
            ...d,
            title: title.trim(),
            description: description.trim() || undefined,
          };
        }
        return d;
      });
      onUpdateDiagrams(updated, `modified details of diagram "${title.trim()}"`);
    }

    setIsModalOpen(false);
  };

  // Handle local image file upload (convert to Base64)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeDiagram) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      const updated = diagrams.map(d => {
        if (d.id === activeDiagram.id) {
          return { ...d, imageUrl: base64String };
        }
        return d;
      });
      onUpdateDiagrams(updated, `attached image file to "${activeDiagram.title}"`);
    };
    reader.readAsDataURL(file);
    
    // reset input
    e.target.value = '';
  };

  // Handle pasted URL submit
  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedUrl.trim() || !activeDiagram) return;

    const updated = diagrams.map(d => {
      if (d.id === activeDiagram.id) {
        return { ...d, imageUrl: pastedUrl.trim() };
      }
      return d;
    });
    onUpdateDiagrams(updated, `linked image URL to "${activeDiagram.title}"`);
    setPastedUrl('');
    setShowUrlField(false);
  };

  // Remove image attachment
  const handleRemoveImage = () => {
    if (!activeDiagram) return;
    if (confirm(`Remove the attached image from "${activeDiagram.title}"?`)) {
      const updated = diagrams.map(d => {
        if (d.id === activeDiagram.id) {
          return { ...d, imageUrl: '' };
        }
        return d;
      });
      onUpdateDiagrams(updated, `removed attached image from "${activeDiagram.title}"`);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-sm flex flex-col gap-6" id="diagrams-hub-panel">
      {/* Header section with tabs and add action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 font-sans">
            Architecture & Design Diagrams
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-sans mt-0.5">
            Visualize flowcharts, database ERDs, and data flows for this system.
          </p>
        </div>

        {/* Add diagram button (Owners only) */}
        {!restrictedMode && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 cursor-pointer transition-colors select-none"
            id="btn-add-diagram"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Diagram</span>
          </button>
        )}
      </div>

      {/* Tabs navigation list */}
      {diagrams.length === 0 ? (
        <div className="text-center py-8" id="diagrams-empty-state">
          <ImageIcon className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-450">No diagrams available</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {!restrictedMode ? 'Click Add Diagram to create your first layout tab.' : 'The owner has not uploaded any diagrams yet.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Tab bar list */}
          <div className="flex flex-wrap gap-2" id="diagrams-tabs-row">
            {diagrams.map(diag => {
              const isActive = currentActiveId === diag.id;
              return (
                <button
                  key={diag.id}
                  onClick={() => setActiveTabId(diag.id)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer select-none ${
                    isActive
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-100 dark:shadow-none'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {diag.title}
                </button>
              );
            })}
          </div>

          {/* Active diagram layout card */}
          {activeDiagram && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="diagram-view-workspace">
              {/* Meta Info details & actions */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 font-sans text-sm">
                      {activeDiagram.title}
                    </h4>
                    
                    {/* Owner controls: Edit details, Remove Image, Delete Tab */}
                    {!restrictedMode && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEdit(activeDiagram)}
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-355 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                          title="Edit Title/Description"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {activeDiagram.imageUrl && (
                          <button
                            onClick={handleRemoveImage}
                            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-lg cursor-pointer transition-colors"
                            title="Remove/Detach Image"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(activeDiagram.id, activeDiagram.title)}
                          className="p-1.5 text-slate-400 dark:text-slate-550 hover:text-rose-600 dark:hover:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg cursor-pointer transition-colors"
                          title="Delete Diagram Tab"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {activeDiagram.description ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                      {activeDiagram.description}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic font-sans">
                      No description provided for this design layout.
                    </p>
                  )}

                  {activeDiagram.imageUrl && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-850 flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Source:</span>
                      {activeDiagram.imageUrl.startsWith('data:') ? (
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-450">Attached File</span>
                      ) : (
                        <a
                          href={activeDiagram.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5"
                        >
                          <span>Open Image Link</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Graphic Display Panel (Image view or Attachment Box) */}
              <div className="lg:col-span-8 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden relative bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
                {activeDiagram.imageUrl ? (
                  <>
                    <img
                      src={activeDiagram.imageUrl}
                      alt={activeDiagram.title}
                      onClick={() => setZoomImageSrc(activeDiagram.imageUrl)}
                      className="max-w-full max-h-[380px] object-contain rounded-lg shadow-sm border border-slate-200/40 dark:border-slate-850 cursor-zoom-in hover:brightness-95 dark:hover:brightness-110 active:scale-99 transition-all p-3 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xs"
                    />
                    
                    <button
                      onClick={() => setZoomImageSrc(activeDiagram.imageUrl)}
                      className="absolute bottom-4 right-4 p-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs rounded-xl border border-slate-200/50 dark:border-slate-800 shadow-md text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                      title="Expand Fullscreen"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  // No image attached placeholder
                  <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm">
                    <ImageIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3 animate-pulse" />
                    <h5 className="text-sm font-bold text-slate-700 dark:text-slate-350">No Image Attached</h5>
                    
                    {!restrictedMode ? (
                      // Owner upload controls
                      <div className="mt-4 w-full flex flex-col gap-3">
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          Attach an architecture file or paste an image URL to share this diagram with teammates.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-2.5 justify-center mt-2">
                          {/* File input trigger button */}
                          <label className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer shadow-sm transition-colors select-none">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Image File</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => setShowUrlField(prev => !prev)}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
                          >
                            <Link className="w-3.5 h-3.5" />
                            <span>{showUrlField ? 'Cancel' : 'Paste Image Link'}</span>
                          </button>
                        </div>

                        {/* Inline URL paste field */}
                        <AnimatePresence>
                          {showUrlField && (
                            <motion.form
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              onSubmit={handleUrlSubmit}
                              className="mt-3 flex gap-2 w-full"
                            >
                              <input
                                type="url"
                                value={pastedUrl}
                                onChange={e => setPastedUrl(e.target.value)}
                                placeholder="Paste direct image URL..."
                                className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-sans"
                                required
                              />
                              <button
                                type="submit"
                                className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                              >
                                Attach
                              </button>
                            </motion.form>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      // Teammate view-only placeholder
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                        Waiting for project owner to attach the visual layout for this diagram.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Diagram Dialog Modal (Title & Description only) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4" id="diagram-modal-container">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col z-10 p-6"
              id="diagram-modal-card"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-150 dark:border-slate-800">
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-55 font-sans">
                  {modalMode === 'create' ? 'Add Architecture Diagram' : 'Edit Diagram Details'}
                </h4>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveModal} className="flex flex-col gap-4 text-sm text-slate-700 dark:text-slate-350">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1.5">
                    Diagram Title / Name
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Database ERD, Process Flowchart"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/80 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-sans transition-all text-sm"
                    required
                    maxLength={50}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1.5">
                    Brief Description
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Provide context explaining the layout structure..."
                    className="w-full px-3.5 py-2 min-h-24 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/80 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-sans transition-all text-sm resize-none"
                    maxLength={200}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-150 dark:border-slate-800 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4.5 py-2 text-xs font-bold tracking-wide uppercase text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer shadow-md shadow-indigo-100 dark:shadow-none transition-all active:scale-98"
                  >
                    Save
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox full image view overlay */}
      {zoomImageSrc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 cursor-zoom-out"
            onClick={() => setZoomImageSrc(null)}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative max-w-full max-h-full flex flex-col items-center z-10"
          >
            <button
              onClick={() => setZoomImageSrc(null)}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full cursor-pointer transition-colors"
              title="Close full view"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={zoomImageSrc}
              alt="Expanded view"
              onClick={() => setZoomImageSrc(null)}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl border border-slate-800/80 cursor-zoom-out"
            />
            <p className="text-white/50 text-xs font-medium mt-4 font-sans select-none pointer-events-none">
              Click anywhere or press X to return
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
