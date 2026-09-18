import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, Trash2, X, Upload, Link, FileText, ExternalLink, Tag, ChevronDown, Check } from 'lucide-react';
import { ProjectDocument } from '../types';

interface DocumentsHubProps {
  documents: ProjectDocument[];
  onUpdateDocuments: (updated: ProjectDocument[], details: string) => void;
  restrictedMode: boolean;
  isOwner?: boolean;
  isViewerMode?: boolean;
}

export default function DocumentsHub({
  documents,
  onUpdateDocuments,
  restrictedMode,
  isOwner = true,
  isViewerMode = false,
}: DocumentsHubProps) {
  const [activeTabId, setActiveTabId] = useState<string>(() => documents[0]?.id || '');
  const [selectedLabel, setSelectedLabel] = useState<string>('All');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [labelsInput, setLabelsInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  
  // Inline attachment fields
  const [pastedUrl, setPastedUrl] = useState('');
  const [showUrlField, setShowUrlField] = useState(false);

  // Label dropdown
  const [isLabelDropdownOpen, setIsLabelDropdownOpen] = useState(false);
  const labelDropdownRef = useRef<HTMLDivElement>(null);

  // Close label dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (labelDropdownRef.current && !labelDropdownRef.current.contains(e.target as Node)) {
        setIsLabelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute available labels from documents
  const availableLabels = useMemo(() => {
    const labels = new Set<string>();
    documents.forEach(doc => (doc.labels || []).forEach(l => labels.add(l)));
    return ['All', ...Array.from(labels).sort()];
  }, [documents]);

  // Filter documents by selected label
  const filteredDocuments = useMemo(() => {
    if (selectedLabel === 'All') return documents;
    return documents.filter(doc => (doc.labels || []).includes(selectedLabel));
  }, [documents, selectedLabel]);

  // Set first tab active if active tab is deleted or missing from filter
  useEffect(() => {
    const docExists = filteredDocuments.some(d => d.id === activeTabId);
    if (!docExists && filteredDocuments.length > 0) {
      setActiveTabId(filteredDocuments[0].id);
    }
  }, [filteredDocuments, activeTabId]);

  const activeDocument = filteredDocuments.find(d => d.id === activeTabId) || filteredDocuments[0] || null;
  const currentActiveId = activeDocument?.id || '';

  const handleOpenCreate = () => {
    setTitle('');
    setDescription('');
    setLabelsInput('');
    setDateInput('');
    setModalMode('create');
    setEditingDocId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (doc: ProjectDocument) => {
    setTitle(doc.title);
    setDescription(doc.description || '');
    setLabelsInput((doc.labels || []).join(', '));
    setDateInput(doc.date || '');
    setModalMode('edit');
    setEditingDocId(doc.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the document "${name}"?`)) {
      const updated = documents.filter(d => d.id !== id);
      onUpdateDocuments(updated, `deleted document "${name}"`);
    }
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please fill out the document title.');
      return;
    }

    const labels = labelsInput
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (modalMode === 'create') {
      const newDoc: ProjectDocument = {
        id: `doc-${Date.now()}`,
        title: title.trim(),
        description: description.trim() || undefined,
        date: dateInput || undefined,
        labels,
      };
      const updated = [...documents, newDoc];
      onUpdateDocuments(updated, `created document tab "${newDoc.title}"`);
      setActiveTabId(newDoc.id);
    } else if (modalMode === 'edit' && editingDocId) {
      const updated = documents.map(d => {
        if (d.id === editingDocId) {
          return {
            ...d,
            title: title.trim(),
            description: description.trim() || undefined,
            date: dateInput || undefined,
            labels,
          };
        }
        return d;
      });
      onUpdateDocuments(updated, `modified details of document "${title.trim()}"`);
    }

    setIsModalOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeDocument) return;

    if (file.type !== 'application/pdf') {
      alert('Please select a valid PDF file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      const updated = documents.map(d => {
        if (d.id === activeDocument.id) {
          return { ...d, pdfDataUrl: base64String };
        }
        return d;
      });
      onUpdateDocuments(updated, `attached PDF file to "${activeDocument.title}"`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedUrl.trim() || !activeDocument) return;

    const updated = documents.map(d => {
      if (d.id === activeDocument.id) {
        return { ...d, externalLink: pastedUrl.trim() };
      }
      return d;
    });
    onUpdateDocuments(updated, `linked external URL to "${activeDocument.title}"`);
    setPastedUrl('');
    setShowUrlField(false);
  };

  const handleRemoveAttachment = () => {
    if (!activeDocument) return;
    if (confirm(`Remove all attached files and links from "${activeDocument.title}"?`)) {
      const updated = documents.map(d => {
        if (d.id === activeDocument.id) {
          return { ...d, pdfDataUrl: undefined, externalLink: undefined };
        }
        return d;
      });
      onUpdateDocuments(updated, `removed attached file from "${activeDocument.title}"`);
    }
  };

  const hasAttachment = !!activeDocument?.pdfDataUrl || !!activeDocument?.externalLink;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-sm flex flex-col gap-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 font-sans">
            Documents Library
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-sans mt-0.5">
            Organize and view project documentation, PDFs, and external Google Docs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Label Filter — Custom Dropdown */}
          {availableLabels.length > 1 && (
            <div className="relative" ref={labelDropdownRef}>
              <button
                onClick={() => setIsLabelDropdownOpen(prev => !prev)}
                className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer select-none ${
                  selectedLabel !== 'All'
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                aria-haspopup="listbox"
                aria-expanded={isLabelDropdownOpen}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>{selectedLabel === 'All' ? 'All Labels' : selectedLabel}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isLabelDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isLabelDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    role="listbox"
                    className="absolute right-0 top-full mt-2 min-w-[180px] z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xl shadow-slate-200/60 dark:shadow-slate-950/60 overflow-hidden py-1.5"
                  >
                    <p className="px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Filter by label
                    </p>
                    {availableLabels.map(label => {
                      const isActive = selectedLabel === label;
                      return (
                        <button
                          key={label}
                          role="option"
                          aria-selected={isActive}
                          onClick={() => { setSelectedLabel(label); setIsLabelDropdownOpen(false); }}
                          className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                            isActive
                              ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {label === 'All' ? (
                              <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-indigo-400 dark:bg-indigo-500" />
                            )}
                            {label}
                          </span>
                          {isActive && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {!restrictedMode && isOwner !== false && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 cursor-pointer transition-colors select-none"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Document</span>
            </button>
          )}
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-450">No documents available</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {!restrictedMode ? 'Click Add Document to create your first tab.' : 'The owner has not uploaded any documents yet.'}
          </p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-8">
          <Tag className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-450">No documents match this label.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Document Tabs */}
          <div className="flex flex-wrap gap-2">
            {filteredDocuments.map(doc => {
              const isActive = currentActiveId === doc.id;
              return (
                <button
                  key={doc.id}
                  onClick={() => setActiveTabId(doc.id)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer select-none flex items-center gap-2 ${
                    isActive
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-100 dark:shadow-none'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 opacity-70" />
                  {doc.title}
                </button>
              );
            })}
          </div>

          {/* Active Document Viewer */}
          {activeDocument && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    {activeDocument.title}
                    {(activeDocument.labels || []).map(l => (
                      <span key={l} className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md">
                        {l}
                      </span>
                    ))}
                  </h4>
                  <div className="flex items-center gap-3 mt-1">
                    {activeDocument.date && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        {new Date(activeDocument.date + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    )}
                    {activeDocument.description && (
                      <span className="text-sm text-slate-500 dark:text-slate-400">{activeDocument.description}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {!restrictedMode && isOwner !== false && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(activeDocument)}
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                        title="Edit Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {hasAttachment && (
                        <button
                          onClick={handleRemoveAttachment}
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-lg cursor-pointer transition-colors"
                          title="Remove Attachment"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(activeDocument.id, activeDocument.title)}
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg cursor-pointer transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Document Content Box */}
              <div className="border rounded-2xl overflow-hidden relative flex flex-col min-h-[500px] bg-slate-50/50 dark:bg-[#0d1117]/50 border-slate-200 dark:border-slate-800">
                {activeDocument.externalLink && (
                  <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-500 dark:text-indigo-400">
                        <Link className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200">External Document Linked</h5>
                        <p className="text-xs text-slate-500 dark:text-slate-400">This document is hosted externally (e.g., Google Docs).</p>
                      </div>
                    </div>
                    <a
                      href={activeDocument.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md transition-all active:scale-95 shrink-0"
                    >
                      Open Live Page
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}

                {activeDocument.pdfDataUrl && !activeDocument.externalLink && !restrictedMode && isOwner !== false && (
                  <div className="w-full bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 p-3">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-3xl mx-auto">
                      <span className="text-xs text-slate-500 font-semibold">Want to attach a live link (e.g. Google Docs) as well?</span>
                      
                      {!showUrlField ? (
                        <button
                          type="button"
                          onClick={() => setShowUrlField(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors shadow-sm"
                        >
                          <Link className="w-3.5 h-3.5" />
                          <span>Add Link</span>
                        </button>
                      ) : (
                        <form onSubmit={handleUrlSubmit} className="flex gap-2 w-full sm:max-w-md">
                          <input
                            type="url"
                            value={pastedUrl}
                            onChange={e => setPastedUrl(e.target.value)}
                            placeholder="https://..."
                            className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100 shadow-sm"
                            required
                          />
                          <button type="submit" className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm">
                            Attach
                          </button>
                          <button type="button" onClick={() => setShowUrlField(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">
                            Cancel
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                )}

                {activeDocument.pdfDataUrl ? (
                  <iframe 
                    src={activeDocument.pdfDataUrl} 
                    className="w-full h-[600px] flex-1 border-none"
                    title={activeDocument.title}
                  />
                ) : activeDocument.externalLink ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-600">
                    <FileText className="w-16 h-16 mb-4 opacity-50" />
                    <p className="text-sm">Only an external link is attached to this document.</p>
                    {!restrictedMode && isOwner !== false && (
                      <label className="mt-4 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors shadow-sm">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload PDF as well</span>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto">
                    <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3 animate-pulse" />
                    <h5 className="text-sm font-bold text-slate-700 dark:text-slate-350">No File Attached</h5>
                    
                    {!restrictedMode && isOwner !== false ? (
                      <div className="mt-4 w-full flex flex-col gap-3">
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          Upload a PDF file or link an external document (like Google Docs).
                        </p>

                        <div className="flex flex-col sm:flex-row gap-2 w-full mt-2">
                          <label className="inline-flex flex-1 items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors shadow-sm">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload PDF</span>
                            <input
                              type="file"
                              accept="application/pdf"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => setShowUrlField(prev => !prev)}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors shadow-sm"
                          >
                            <Link className="w-3.5 h-3.5" />
                            <span>{showUrlField ? 'Cancel' : 'Add Link'}</span>
                          </button>
                        </div>

                        <AnimatePresence>
                          {showUrlField && (
                            <motion.form
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              onSubmit={handleUrlSubmit}
                              className="mt-2 flex flex-col gap-2 w-full"
                            >
                              <input
                                type="url"
                                value={pastedUrl}
                                onChange={e => setPastedUrl(e.target.value)}
                                placeholder="https://docs.google.com/..."
                                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100 shadow-sm"
                                required
                              />
                              <button
                                type="submit"
                                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
                              >
                                Attach Link
                              </button>
                            </motion.form>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                        Waiting for project owner to attach a file to this document tab.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal for Creating / Editing Documents */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col z-10 p-6"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-50">
                  {modalMode === 'create' ? 'Add New Document' : 'Edit Document Details'}
                </h4>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveModal} className="flex flex-col gap-4 text-sm text-slate-700 dark:text-slate-300">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1.5">
                    Document Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g., Requirements Spec, Architecture Guide"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-sans"
                    required
                    maxLength={60}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1.5">
                    Labels (comma separated)
                  </label>
                  <input
                    type="text"
                    value={labelsInput}
                    onChange={e => setLabelsInput(e.target.value)}
                    placeholder="e.g., Guide, Technical, Setup"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-sans"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Useful for organizing and filtering documents.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1.5">
                    Brief Description
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Provide context about what this document covers..."
                    className="w-full px-3.5 py-2 min-h-[80px] bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-sans resize-none"
                    maxLength={250}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={dateInput}
                    onChange={e => setDateInput(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-sans"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">e.g., submission date, version date, or deadline.</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4.5 py-2 text-xs font-bold tracking-wide uppercase text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer shadow-md shadow-indigo-100 dark:shadow-none transition-all active:scale-95"
                  >
                    Save
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
