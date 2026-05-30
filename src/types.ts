/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Priority = 'Low' | 'Medium' | 'High';

export interface Task {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  progress: number;  // 0 - 100
  priority: Priority;
  assignee: string[];
  color: string;      // Tailwind color names or Hex values
  dependencies: string[]; // Parent Task IDs
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  actionType: 'task_create' | 'task_update' | 'task_delete' | 'task_reschedule' | 'personnel_update' | 'project_update';
  details: string;
}

export interface ProjectDiagram {
  id: string;
  title: string;
  imageUrl: string;
  description?: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  tasks: Task[];
  personnel: string[];
  tag?: string;
  logs?: ActivityLog[];
  diagrams?: ProjectDiagram[];
}

export type ZoomLevel = 'day' | 'week' | 'month';

export interface FilterOptions {
  search: string;
  priority: Priority | 'All';
  assignee: string | 'All';
}

export interface DragState {
  taskId: string;
  action: 'move' | 'resize-start' | 'resize-end';
  initialMouseX: number;
  initialStartDate: string;
  initialEndDate: string;
}
