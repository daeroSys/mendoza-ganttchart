/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
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
} from 'lucide-react';
import { ZoomLevel, FilterOptions, Priority } from '../types';

interface GanttChartHeaderProps {
  zoom: ZoomLevel;
  setZoom: (zoom: ZoomLevel) => void;
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  assignees: string[];
  onAddTask: () => void;
  onOpenExport: () => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  onScrollToToday: () => void;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  onOpenPersonnel?: () => void;
  onShare?: () => void;
  onOpenHistory?: () => void;
  restrictedMode?: boolean;
}

export default function GanttChartHeader({
  zoom,
  setZoom,
  filters,
  setFilters,
  assignees,
  onAddTask,
  onOpenExport,
  darkMode,
  setDarkMode,
  onScrollToToday,
  title = 'Project Gantt Chart Planner',
  subtitle = 'Centralized Infrastructure, Decentralized Access',
  onBack,
  onOpenPersonnel,
  onShare,
  onOpenHistory,
  restrictedMode = false,
}: GanttChartHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    });
  };

  const isFilterActive = filters.search !== '' || filters.priority !== 'All' || filters.assignee !== 'All';

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
          <div className="p-3 bg-indigo-600 dark:bg-indigo-500 rounded-2xl text-white shadow-lg shadow-indigo-100 dark:shadow-none" id="header-logo-container">
            <Calendar className="w-6 h-6 animate-pulse" id="header-logo-icon" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 font-display" id="header-title">
              {title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5" id="header-description">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Action Controls Group: Today, Importer, Exporters, Theme Toggle, Add Task */}
        <div className="flex flex-wrap items-center gap-2.5" id="header-action-row">
          <button
            onClick={onScrollToToday}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 shadow-xs cursor-pointer select-none transition-colors"
            title="Focus the timeline on today"
            id="btn-today-shortcut"
          >
            <Calendar className="w-4 h-4" />
            <span>Today</span>
          </button>



          <button
            onClick={onOpenExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 shadow-xs cursor-pointer select-none transition-colors"
            title="Export Gantt Chart as Image file"
            id="btn-export-image-trigger"
          >
            <Image className="w-4 h-4" />
            <span>Export</span>
          </button>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 self-center hidden sm:block" />

          {/* Personnel Manager Button */}
          {onOpenPersonnel && !restrictedMode && (
            <button
              onClick={onOpenPersonnel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl border border-violet-200 dark:border-violet-800/60 hover:bg-violet-50 dark:hover:bg-violet-950/30 text-violet-700 dark:text-violet-300 bg-white dark:bg-slate-800 shadow-xs cursor-pointer select-none transition-colors"
              title="Manage project personnel"
              id="btn-personnel"
            >
              <Users className="w-4 h-4" />
              <span>Personnel</span>
            </button>
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

          {/* New Task Trigger Button */}
          {!restrictedMode && (
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

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Filter Priority Dropdown */}
            <div className="relative flex-1 sm:flex-initial min-w-[120px]" id="priority-dropdown-container">
              <select
                value={filters.priority}
                onChange={handlePriorityChange}
                className="w-full pl-3.5 pr-8 py-1.5 text-sm appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-sans text-slate-700 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500 cursor-pointer shadow-2xs transition-colors"
              >
                <option value="All">All Priorities</option>
                <option value="High">🔴 High</option>
                <option value="Medium">🟡 Medium</option>
                <option value="Low">🟢 Low</option>
              </select>
              <div className="absolute top-[34%] right-3 pointer-events-none text-slate-400">
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Filter Assignee Dropdown */}
            <div className="relative flex-1 sm:flex-initial min-w-[140px]" id="assignee-dropdown-container">
              <select
                value={filters.assignee}
                onChange={handleAssigneeChange}
                className="w-full pl-3.5 pr-8 py-1.5 text-sm appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-sans text-slate-700 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500 cursor-pointer shadow-2xs transition-colors"
              >
                <option value="All">All Personnel</option>
                {assignees.map(assignee => (
                  <option key={assignee} value={assignee}>
                    👤 {assignee}
                  </option>
                ))}
              </select>
              <div className="absolute top-[34%] right-3 pointer-events-none text-slate-400">
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </div>
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
    </header>
  );
}
