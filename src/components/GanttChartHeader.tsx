/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  Plus,
  Sun,
  Moon,
  Search,
  Calendar,
  Filter,
  Eye,
  SlidersHorizontal,
  ArrowLeft,
  Users,
  Image,
  Share2,
  History,
  LogOut,
  Bell,
  Send,
  Check,
  FileText,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ZoomLevel, FilterOptions, Priority } from '../types';

interface GanttChartHeaderProps {
  zoom: ZoomLevel;
  setZoom: (zoom: ZoomLevel) => void;
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  assignees: string[];
  availableRoles?: string[];
  onAddTask: () => void;
  onOpenExport: () => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  activeModule: 'gantt' | 'diagrams' | 'documents';
  setActiveModule: (module: 'gantt' | 'diagrams' | 'documents') => void;
  title?: string;
  subtitle?: string;
  logoUrl?: string;
  onLogoUpdate?: (logoBase64: string) => void;
  onBack?: () => void;
  onOpenPersonnel?: () => void;
  onShare?: () => void;
  onOpenHistory?: () => void;
  restrictedMode?: boolean;
  isViewerMode?: boolean;
  onLogout?: () => void;
  isNotifyMode?: boolean;
  onStartNotifyMode?: () => void;
  onCancelNotifyMode?: () => void;
  onNotifyNow?: () => void;
  selectedTaskCount?: number;
  isOwner?: boolean;
}

export default function GanttChartHeader({
  zoom,
  setZoom,
  filters,
  setFilters,
  assignees,
  availableRoles = [],
  onAddTask,
  onOpenExport,
  darkMode,
  setDarkMode,
  activeModule = 'gantt',
  setActiveModule,
  title = 'Project Gantt Chart Planner',
  subtitle = 'Centralized Infrastructure, Decentralized Access',
  logoUrl,
  onLogoUpdate,
  onBack,
  onOpenPersonnel,
  onShare,
  onOpenHistory,
  restrictedMode = false,
  isViewerMode = false,
  onLogout,
  isNotifyMode = false,
  onStartNotifyMode,
  onCancelNotifyMode,
  onNotifyNow,
  selectedTaskCount = 0,
  isOwner = true,
}: GanttChartHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isRolesDropdownOpen, setIsRolesDropdownOpen] = useState(false);
  const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);

  const toggleRoleFilter = (role: string) => {
    setFilters(prev => {
      const current = prev.roles || [];
      if (current.includes(role)) {
        return { ...prev, roles: current.filter(r => r !== role) };
      }
      return { ...prev, roles: [...current, role] };
    });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onLogoUpdate) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 200; // Small size for logo to ensure reliable DB sync
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Draw image directly to preserve transparency
            ctx.drawImage(img, 0, 0, width, height);

            // Compress to WEBP to ensure small payload while preserving transparency
            const dataUrl = canvas.toDataURL('image/webp', 0.85);
            onLogoUpdate(dataUrl);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: event.target.value }));
  };

  const handlePriorityChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, priority: event.target.value as Priority | 'All' }));
  };

  const handleAssigneeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, assignee: event.target.value }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      priority: 'All',
      assignee: 'All',
      roles: [],
    });
  };

  const isFilterActive = filters.search !== '' || filters.priority !== 'All' || filters.assignee !== 'All' || (filters.roles && filters.roles.length > 0);

  return (
    <header className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200" id="gantt-header">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Branding Title */}
        <div className="flex items-start gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors self-center mr-1"
              title="Back to all projects"
              id="btn-back-home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div
            className={`w-[56px] h-[56px] rounded-2xl flex items-center justify-center relative group shrink-0 transition-all duration-500 ${logoUrl ? `shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] bg-white dark:bg-slate-800 ${onLogoUpdate ? 'hover:shadow-[0_8px_30px_rgba(79,70,229,0.35)] hover:-translate-y-1 cursor-pointer' : ''}` : `bg-indigo-600 dark:bg-indigo-500 text-white shadow-lg shadow-indigo-100 dark:shadow-none overflow-hidden ${onLogoUpdate ? 'hover:scale-105 cursor-pointer' : ''}`}`}
            id="header-logo-container"
            onClick={() => { if (onLogoUpdate) logoInputRef.current?.click(); }}
          >
            {logoUrl ? (
              <div className="absolute inset-0 rounded-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
                <img src={logoUrl} alt="Project Logo" className="w-full h-full object-cover scale-[1.18] transition-transform duration-700 ease-out group-hover:scale-[1.25]" />
              </div>
            ) : (
              <Calendar className="w-6 h-6 animate-pulse" id="header-logo-icon" />
            )}

            {/* Hover overlay for changing logo */}
            {onLogoUpdate && (
              <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-2xl z-10">
                <Image className="w-5 h-5 text-white drop-shadow-md scale-75 group-hover:scale-100 transition-transform duration-300" />
              </div>
            )}
            <input
              type="file"
              ref={logoInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleLogoChange}
            />
          </div>

          <div className="flex flex-col justify-center h-[56px]">
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 font-serif antialiased drop-shadow-sm mb-1" id="header-title">
              {title}
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 font-sans leading-none" id="header-description">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Action Controls Group: View Toggle, Importer, Exporters, Theme Toggle, Add Task */}
        <div className="flex flex-wrap items-center gap-2.5" id="header-action-row">
          
          {/* Module Switcher Segmented Control */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold shadow-xs">
            <button
              onClick={() => setActiveModule('gantt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                activeModule === 'gantt'
                  ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Gantt Chart</span>
            </button>
            <button
              onClick={() => setActiveModule('diagrams')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                activeModule === 'diagrams'
                  ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Image className="w-4 h-4" />
              <span className="hidden sm:inline">Diagrams</span>
            </button>
            <button
              onClick={() => setActiveModule('documents')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                activeModule === 'documents'
                  ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Documents</span>
            </button>
          </div>



          {isOwner !== false && (
            <button
              onClick={onOpenExport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 shadow-xs cursor-pointer select-none transition-colors"
              title="Export Gantt Chart as Image file"
              id="btn-export-image-trigger"
            >
              <Image className="w-4 h-4" />
              <span>Export</span>
            </button>
          )}

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 self-center hidden sm:block" />

          {/* Personnel Manager Button */}
          {onOpenPersonnel && (
            <button
              onClick={onOpenPersonnel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl border border-violet-200 dark:border-violet-800/60 hover:bg-violet-50 dark:hover:bg-violet-950/30 text-violet-700 dark:text-violet-300 bg-white dark:bg-slate-800 shadow-xs cursor-pointer select-none transition-colors"
              title="Manage project collaborators"
              id="btn-personnel"
            >
              <Users className="w-4 h-4" />
              <span>Collaborators</span>
            </button>
          )}

          {/* Notify Team Button / Mode */}
          {onStartNotifyMode && !restrictedMode && isOwner !== false && (
            isNotifyMode ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onNotifyNow}
                  disabled={selectedTaskCount === 0}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl text-white shadow-xs select-none transition-colors ${selectedTaskCount === 0 ? 'bg-indigo-300 dark:bg-indigo-800/50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'}`}
                  title="Send notification emails"
                >
                  <Send className="w-4 h-4" />
                  <span>Notify Now ({selectedTaskCount})</span>
                </button>
                <button
                  onClick={onCancelNotifyMode}
                  className="px-3.5 py-2 text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-white cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={onStartNotifyMode}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl border border-sky-200 dark:border-sky-800/60 hover:bg-sky-50 dark:hover:bg-sky-950/30 text-sky-700 dark:text-sky-300 bg-white dark:bg-slate-800 shadow-xs cursor-pointer select-none transition-colors"
                title="Select tasks to notify team members"
              >
                <Bell className="w-4 h-4" />
                <span>Notify Team</span>
              </button>
            )
          )}

          {/* Share Button */}
          {onShare && (
            <button
              onClick={onShare}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 shadow-xs cursor-pointer select-none transition-colors"
              title="Copy collaboration link to clipboard"
              id="btn-share-link"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Link</span>
            </button>
          )}

          {/* History / Activity Feed Button */}
          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 shadow-xs cursor-pointer select-none transition-colors"
              title="View activity history log"
              id="btn-activity-history"
            >
              <History className="w-4 h-4" />
              <span>Activity</span>
            </button>
          )}

          {/* Theme Switcher Button */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-xs flex items-center justify-center cursor-pointer transition-colors"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            id="btn-theme-switcher"
          >
            {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Log Out Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-xs flex items-center justify-center cursor-pointer transition-colors"
              title="Log Out"
              id="btn-logout-gantt"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}

          {/* New Task Trigger Button */}
          {!restrictedMode && isOwner !== false && (
            <button
              onClick={onAddTask}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 dark:shadow-none font-sans cursor-pointer transition-all active:scale-98"
              id="btn-new-task-trigger"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid Filter Bar: Search, Filters, and Zoom Tabs */}
      {!isViewerMode && activeModule === 'gantt' && (
        <div className="flex flex-col gap-4 mt-6 xl:flex-row xl:items-center xl:justify-between bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60" id="filter-wrapper-bar">

          {/* Dynamic Filters Area */}
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto" id="filter-left-section">

            {/* Dynamic Search */}
            <div className="relative w-full sm:w-64" id="search-input-field">
              <Search className="absolute w-4.5 h-4.5 text-slate-400 left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={filters.search}
                onChange={handleSearchChange}
                className="w-full pl-9.5 pr-4 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-sans shadow-2xs transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {/* Filter Priority Custom Dropdown */}
              <div className="relative flex-1 sm:flex-initial min-w-[140px]" id="priority-dropdown-container">
                <button
                  type="button"
                  onClick={() => { setIsPriorityDropdownOpen(!isPriorityDropdownOpen); setIsAssigneeDropdownOpen(false); setIsRolesDropdownOpen(false); }}
                  className={`w-full pl-3.5 pr-8 py-1.5 text-sm bg-white dark:bg-slate-900 border ${isPriorityDropdownOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-800'} rounded-xl font-sans text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs transition-all text-left flex items-center justify-between`}
                >
                  <span className="truncate">
                    {filters.priority === 'All' ? 'All Priorities' : (
                      <span className="flex items-center gap-1.5">
                        {filters.priority === 'High' && '🔴'}
                        {filters.priority === 'Medium' && '🟡'}
                        {filters.priority === 'Low' && '🟢'}
                        {filters.priority}
                      </span>
                    )}
                  </span>
                </button>
                <div className="absolute top-[34%] right-3 pointer-events-none text-slate-400">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </div>

                <AnimatePresence>
                  {isPriorityDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsPriorityDropdownOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full mt-2 left-0 w-48 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-xl shadow-xl z-50 p-1.5 flex flex-col gap-0.5 overflow-hidden"
                      >
                        {[
                          { value: 'All', label: 'All Priorities' },
                          { value: 'High', label: '🔴 High' },
                          { value: 'Medium', label: '🟡 Medium' },
                          { value: 'Low', label: '🟢 Low' },
                        ].map(option => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setFilters(prev => ({ ...prev, priority: option.value as Priority | 'All' }));
                              setIsPriorityDropdownOpen(false);
                            }}
                            className={`flex items-center justify-between w-full text-left px-2.5 py-2 text-sm rounded-lg transition-colors ${filters.priority === option.value ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                          >
                            {option.label}
                            {filters.priority === option.value && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Filter Assignee Custom Dropdown */}
              <div className="relative flex-1 sm:flex-initial min-w-[160px]" id="assignee-dropdown-container">
                <button
                  type="button"
                  onClick={() => { setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen); setIsPriorityDropdownOpen(false); setIsRolesDropdownOpen(false); }}
                  className={`w-full pl-3.5 pr-8 py-1.5 text-sm bg-white dark:bg-slate-900 border ${isAssigneeDropdownOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-800'} rounded-xl font-sans text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs transition-all text-left flex items-center justify-between`}
                >
                  <span className="truncate">
                    {filters.assignee === 'All' ? 'All Collaborators' : `👤 ${filters.assignee}`}
                  </span>
                </button>
                <div className="absolute top-[34%] right-3 pointer-events-none text-slate-400">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </div>

                <AnimatePresence>
                  {isAssigneeDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsAssigneeDropdownOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full mt-2 left-0 w-56 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-xl shadow-xl z-50 p-1.5 flex flex-col gap-0.5 max-h-72 overflow-y-auto scrollbar-thin"
                      >
                        <button
                          onClick={() => {
                            setFilters(prev => ({ ...prev, assignee: 'All' }));
                            setIsAssigneeDropdownOpen(false);
                          }}
                          className={`flex items-center justify-between w-full text-left px-2.5 py-2 text-sm rounded-lg transition-colors ${filters.assignee === 'All' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                        >
                          All Collaborators
                          {filters.assignee === 'All' && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                        </button>

                        {assignees.length > 0 && <div className="h-px bg-slate-100 dark:bg-slate-700/50 my-1 mx-1" />}

                        {assignees.map(assignee => (
                          <button
                            key={assignee}
                            onClick={() => {
                              setFilters(prev => ({ ...prev, assignee }));
                              setIsAssigneeDropdownOpen(false);
                            }}
                            className={`flex items-center justify-between w-full text-left px-2.5 py-2 text-sm rounded-lg transition-colors ${filters.assignee === assignee ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                          >
                            <span className="truncate">👤 {assignee}</span>
                            {filters.assignee === assignee && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Filter Roles Custom Dropdown */}
              <div className="relative flex-1 sm:flex-initial min-w-[140px]" id="roles-dropdown-container">
                <button
                  type="button"
                  onClick={() => { setIsRolesDropdownOpen(!isRolesDropdownOpen); setIsAssigneeDropdownOpen(false); setIsPriorityDropdownOpen(false); }}
                  className={`w-full pl-3.5 pr-8 py-1.5 text-sm bg-white dark:bg-slate-900 border ${isRolesDropdownOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-800'} rounded-xl font-sans text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs transition-all text-left flex items-center justify-between`}
                >
                  <span className="truncate">
                    {filters.roles && filters.roles.length > 0
                      ? `${filters.roles.length} Role${filters.roles.length > 1 ? 's' : ''}`
                      : 'All Roles'}
                  </span>
                </button>
                <div className="absolute top-[34%] right-3 pointer-events-none text-slate-400">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </div>

                <AnimatePresence>
                  {isRolesDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsRolesDropdownOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full mt-2 left-0 w-52 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-xl shadow-xl z-50 p-1.5 flex flex-col gap-0.5 max-h-72 overflow-y-auto scrollbar-thin"
                      >
                        {availableRoles.map(role => {
                          const isSelected = (filters.roles || []).includes(role);
                          return (
                            <label key={role} className={`flex items-center gap-2.5 px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer transition-colors text-sm ${isSelected ? 'text-indigo-700 dark:text-indigo-300 font-semibold bg-indigo-50/50 dark:bg-indigo-500/5' : 'text-slate-700 dark:text-slate-200'}`}>
                              <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                              </div>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleRoleFilter(role)}
                                className="hidden"
                              />
                              <span className="truncate">{role}</span>
                            </label>
                          );
                        })}
                        {availableRoles.length === 0 && (
                          <p className="text-xs text-slate-400 text-center py-4">No roles available</p>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Reset Filters Shortcut */}
              {isFilterActive && (
                <button
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl cursor-pointer select-none transition-colors"
                  id="btn-reset-filters"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Right side: Zoom Selector Segmented Button */}
          <div className="flex items-center gap-2 self-start xl:self-auto" id="filter-right-section">
            <div className="flex p-1 bg-slate-200/60 dark:bg-slate-800 border border-slate-200/30 dark:border-slate-800/50 rounded-xl text-xs font-semibold" id="zoom-segmented-bar">
              {(['day', 'week', 'month'] as ZoomLevel[]).map(level => (
                <button
                  key={level}
                  onClick={() => setZoom(level)}
                  className={`px-3 py-1.5 rounded-lg select-none cursor-pointer transition-all duration-200 ${zoom === level
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  id={`btn-zoom-${level}`}
                >
                  <span className="capitalize">{level}</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      )}
    </header>
  );
}
