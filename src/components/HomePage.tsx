/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Calendar,
  Layers,
  Users,
  TrendingUp,
  Trash2,
  Edit,
  ChevronRight,
  FolderOpen,
  Sun,
  Moon,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Project } from '../types';

interface HomePageProps {
  projects: Project[];
  onSelectProject: (id: string) => void;
  onCreateProject: (name: string, description?: string) => void;
  onDeleteProject: (id: string) => void;
  onUpdateProject: (id: string, name: string, tag?: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

// Gradient combos for project cards
const CARD_GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-cyan-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-violet-500 to-fuchsia-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-sky-500 to-indigo-600',
  'from-lime-500 to-emerald-600',
];

export default function HomePage({
  projects,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onUpdateProject,
  darkMode,
  setDarkMode,
}: HomePageProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [createError, setCreateError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectTag, setEditProjectTag] = useState('');
  const [editError, setEditError] = useState('');

  const handleEditClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setProjectToEdit(project);
    setEditProjectName(project.name);
    setEditProjectTag(project.tag || '');
    setEditError('');
  };

  const handleSaveEdit = () => {
    const trimmed = editProjectName.trim();
    if (!trimmed) {
      setEditError('Please enter a project name.');
      return;
    }
    if (projectToEdit) {
      onUpdateProject(projectToEdit.id, trimmed, editProjectTag.trim() || undefined);
      setProjectToEdit(null);
      setEditProjectName('');
      setEditProjectTag('');
      setEditError('');
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === 'Escape') {
      setProjectToEdit(null);
    }
  };

  const handleCreate = () => {
    const trimmed = newProjectName.trim();
    if (!trimmed) {
      setCreateError('Please enter a project name.');
      return;
    }
    onCreateProject(trimmed, newProjectDesc.trim() || undefined);
    setNewProjectName('');
    setNewProjectDesc('');
    setCreateError('');
    setShowCreateModal(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreate();
    }
    if (e.key === 'Escape') {
      setShowCreateModal(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (confirmDeleteId === projectId) {
      onDeleteProject(projectId);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(projectId);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200 font-sans mesh-gradient" id="homepage-viewport">

      {/* Header */}
      <header className="border-b border-slate-200/70 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30" id="homepage-header">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-950/50" id="homepage-logo">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 font-display" id="homepage-title">
                Daero's Gantt Chart Repo
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                Manage and visualize all your project timelines in one place.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-xs flex items-center justify-center cursor-pointer transition-colors"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              id="homepage-theme-toggle"
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>
            {/* Create New */}
            <button
              onClick={() => { setShowCreateModal(true); setNewProjectName(''); setCreateError(''); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-950/40 cursor-pointer transition-all active:scale-98"
              id="btn-create-project"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10" id="homepage-main">
        {projects.length === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32"
            id="homepage-empty"
          >
            <div className="p-6 bg-slate-100 dark:bg-slate-900 rounded-3xl mb-6">
              <FolderOpen className="w-16 h-16 text-slate-300 dark:text-slate-700" />
            </div>
            <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-300 font-display mb-2">
              No Projects Yet
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md text-center mb-8">
              Create your first Gantt chart project to start planning and tracking your milestones.
            </p>
            <button
              onClick={() => { setShowCreateModal(true); setNewProjectName(''); setCreateError(''); }}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-950/40 cursor-pointer transition-all active:scale-98"
              id="btn-create-first-project"
            >
              <Plus className="w-5 h-5" />
              <span>Create Your First Project</span>
            </button>
          </motion.div>
        ) : (
          <>
            {/* Stats Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="glass-card border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 flex items-center gap-4">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl">
                  <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Total Projects</p>
                  <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{projects.length}</h3>
                </div>
              </div>
              <div className="glass-card border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 flex items-center gap-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Total Tasks</p>
                  <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{projects.reduce((s, p) => s + p.tasks.length, 0)}</h3>
                </div>
              </div>
              <div className="glass-card border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 flex items-center gap-4">
                <div className="p-3 bg-violet-50 dark:bg-violet-950/40 rounded-xl">
                  <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Total Personnel</p>
                  <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
                    {new Set(projects.flatMap(p => p.personnel)).size}
                  </h3>
                </div>
              </div>
            </div>

            {/* Project Cards Grid */}
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 font-display mb-5 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-indigo-500" />
              Your Projects
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="project-cards-grid">
              {projects.map((project, index) => {
                const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
                const totalTasks = project.tasks.length;
                const completedTasks = project.tasks.filter(t => t.progress === 100).length;
                const avgProgress = totalTasks > 0
                  ? Math.round(project.tasks.reduce((s, t) => s + t.progress, 0) / totalTasks)
                  : 0;
                const isConfirming = confirmDeleteId === project.id;

                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                    onClick={() => onSelectProject(project.id)}
                    className="project-card group cursor-pointer rounded-2xl border border-slate-200/70 dark:border-slate-800/60 bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-xl dark:hover:shadow-slate-950/50 transition-all"
                    id={`project-card-${project.id}`}
                  >
                    {/* Card Gradient Top Strip */}
                    <div className={`h-2 bg-gradient-to-r ${gradient}`} />

                    {/* Card Content */}
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {project.name}
                          </h3>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1">
                            Created {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        {!isConfirming && (
                          <button
                            onClick={(e) => handleEditClick(e, project)}
                            className="p-1.5 rounded-lg transition-all shrink-0 ml-2 opacity-0 group-hover:opacity-100 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 cursor-pointer"
                            title="Edit project"
                            id={`btn-edit-project-${project.id}`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDeleteClick(e, project.id)}
                          className={`p-1.5 rounded-lg transition-all shrink-0 ml-2 ${
                            isConfirming
                              ? 'bg-rose-600 text-white hover:bg-rose-700'
                              : 'opacity-0 group-hover:opacity-100 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                          } cursor-pointer`}
                          title={isConfirming ? 'Confirm delete' : 'Delete project'}
                          id={`btn-delete-project-${project.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {isConfirming && (
                        <div className="mb-3 px-3 py-2 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50 rounded-xl">
                          <p className="text-[10px] text-rose-700 dark:text-rose-400 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Click delete again to confirm permanent removal.
                          </p>
                        </div>
                      )}

                      {/* Stats Row */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center">
                          <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{totalTasks}</p>
                          <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Tasks</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{completedTasks}</p>
                          <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Done</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-extrabold text-violet-600 dark:text-violet-400">{project.personnel.length}</p>
                          <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">People</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Overall Progress</span>
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{avgProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${avgProgress}%` }}
                            transition={{ duration: 0.8, delay: index * 0.1 }}
                            className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
                          />
                        </div>
                      </div>

                      {/* Open CTA */}
                      <div className="flex items-center justify-end pt-2">
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                          Open Chart
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Create Project Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="create-project-modal">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-10"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/85">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 font-sans">
                    Create New Project
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Give your Gantt chart project a name.
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Website Redesign"
                    value={newProjectName}
                    onChange={e => { setNewProjectName(e.target.value); setCreateError(''); }}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    maxLength={60}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/80 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-sans transition-all text-sm focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950"
                    id="input-project-name"
                  />
                  {createError && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 mt-2 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {createError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-2">
                    Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Centralized Infrastructure, Decentralized Access"
                    value={newProjectDesc}
                    onChange={e => setNewProjectDesc(e.target.value)}
                    onKeyDown={handleKeyDown}
                    maxLength={120}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/80 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-sans transition-all text-sm focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950"
                    id="input-project-desc"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 p-6 border-t border-slate-100 dark:border-slate-800/85">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4.5 py-2.5 text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer transition-all select-none"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  className="px-5 py-2.5 text-xs font-bold tracking-wide uppercase text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 rounded-xl cursor-pointer shadow-md shadow-indigo-100 dark:shadow-none transition-all active:scale-98 select-none"
                  id="btn-confirm-create"
                >
                  Create Project
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Project Modal */}
      <AnimatePresence>
        {projectToEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="edit-project-modal">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProjectToEdit(null)}
              className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-10"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/85">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 font-sans">
                    Edit Project
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Modify the project name and tag.
                  </p>
                </div>
                <button
                  onClick={() => setProjectToEdit(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Website Redesign"
                    value={editProjectName}
                    onChange={e => { setEditProjectName(e.target.value); setEditError(''); }}
                    onKeyDown={handleEditKeyDown}
                    autoFocus
                    maxLength={60}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/80 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-sans transition-all text-sm focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950"
                    id="input-edit-project-name"
                  />
                  {editError && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 mt-2 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {editError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-2">
                    Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Centralized Infrastructure, Decentralized Access"
                    value={editProjectTag}
                    onChange={e => setEditProjectTag(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    maxLength={120}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/80 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-sans transition-all text-sm focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950"
                    id="input-edit-project-desc"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 p-6 border-t border-slate-100 dark:border-slate-800/85">
                <button
                  onClick={() => setProjectToEdit(null)}
                  className="px-4.5 py-2.5 text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer transition-all select-none"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-5 py-2.5 text-xs font-bold tracking-wide uppercase text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 rounded-xl cursor-pointer shadow-md shadow-indigo-100 dark:shadow-none transition-all active:scale-98 select-none"
                  id="btn-confirm-edit-project"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
