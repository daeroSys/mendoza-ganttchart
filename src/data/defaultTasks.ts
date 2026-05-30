/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task } from '../types';

export const DEFAULT_TASKS: Task[] = [
  {
    id: 't-1',
    name: 'Project Kickoff & Requirements Gather',
    startDate: '2026-05-20',
    endDate: '2026-05-24',
    progress: 100,
    priority: 'High',
    assignee: ['Sarah Chen'],
    color: 'indigo',
    dependencies: [],
  },
  {
    id: 't-2',
    name: 'System Architecture & DB Design',
    startDate: '2026-05-23',
    endDate: '2026-05-27',
    progress: 90,
    priority: 'High',
    assignee: ['Marcus Vance'],
    color: 'blue',
    dependencies: ['t-1'],
  },
  {
    id: 't-3',
    name: 'Fidelity UI/UX Design Mockups',
    startDate: '2026-05-25',
    endDate: '2026-05-30',
    progress: 75,
    priority: 'Medium',
    assignee: ['Alex Rivera'],
    color: 'purple',
    dependencies: ['t-1'],
  },
  {
    id: 't-4',
    name: 'Core Backend API Setup',
    startDate: '2026-05-28',
    endDate: '2026-06-05',
    progress: 40,
    priority: 'High',
    assignee: ['Marcus Vance'],
    color: 'cyan',
    dependencies: ['t-2'],
  },
  {
    id: 't-5',
    name: 'Frontend View Implementation',
    startDate: '2026-05-30',
    endDate: '2026-06-09',
    progress: 25,
    priority: 'High',
    assignee: ['Alex Rivera'],
    color: 'teal',
    dependencies: ['t-3'],
  },
  {
    id: 't-6',
    name: 'E2E Testing & Quality Assurance',
    startDate: '2026-06-10',
    endDate: '2026-06-15',
    progress: 0,
    priority: 'Medium',
    assignee: ['Sarah Chen'],
    color: 'amber',
    dependencies: ['t-4', 't-5'],
  },
  {
    id: 't-7',
    name: 'Release Preparation & Deployment',
    startDate: '2026-06-16',
    endDate: '2026-06-20',
    progress: 0,
    priority: 'Low',
    assignee: ['Emma Watson'],
    color: 'emerald',
    dependencies: ['t-6'],
  },
];

export const COLOR_MAP: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800/80',
    accent: 'bg-indigo-600 dark:bg-indigo-500',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800/80',
    accent: 'bg-blue-600 dark:bg-blue-500',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800/80',
    accent: 'bg-purple-600 dark:bg-purple-500',
  },
  cyan: {
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-800/80',
    accent: 'bg-cyan-600 dark:bg-cyan-500',
  },
  teal: {
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800/80',
    accent: 'bg-teal-600 dark:bg-teal-500',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800/80',
    accent: 'bg-amber-600 dark:bg-amber-500',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/80',
    accent: 'bg-emerald-600 dark:bg-emerald-500',
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800/80',
    accent: 'bg-rose-600 dark:bg-rose-500',
  },
};
