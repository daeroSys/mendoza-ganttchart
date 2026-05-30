/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Edit, 
  Trash2, 
  Link2, 
  User, 
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { Task, ZoomLevel, DragState } from '../types';
import { COLOR_MAP } from '../data/defaultTasks';
import { 
  TimelineBounds, 
  generateHeaderCells, 
  getPxPerDay, 
  getDaysDiff, 
  addDays, 
  formatHumanDate,
  getTodayStr
} from '../utils/dateUtils';

interface GanttTimelineProps {
  tasks: Task[];
  filteredTasks: Task[];
  bounds: TimelineBounds;
  zoom: ZoomLevel;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTaskDates: (id: string, start: string, end: string) => void;
  timelineScrollRef: React.RefObject<HTMLDivElement | null>;
  restrictedMode?: boolean;
}

export default function GanttTimeline({
  tasks,
  filteredTasks,
  bounds,
  zoom,
  onEditTask,
  onDeleteTask,
  onUpdateTaskDates,
  timelineScrollRef,
  restrictedMode = false,
}: GanttTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [draggedTaskDates, setDraggedTaskDates] = useState<{ id: string; start: string; end: string } | null>(null);

  const pxPerDay = getPxPerDay(zoom);
  const totalWidth = bounds.totalDays * pxPerDay;
  const rowHeight = 56; // Matching h-14 row height pixel-perfectly
  const todayStr = getTodayStr();

  // Calculate coordinates for SVG dependency lines
  const getTaskCoordinates = (taskId: string, index: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;

    const isDragging = draggedTaskDates && draggedTaskDates.id === taskId;
    const startDate = isDragging ? draggedTaskDates.start : task.startDate;
    const endDate = isDragging ? draggedTaskDates.end : task.endDate;

    const startDaysOffset = getDaysDiff(bounds.startDate, startDate);
    const durationDays = getDaysDiff(startDate, endDate) + 1;

    const left = startDaysOffset * pxPerDay;
    const width = durationDays * pxPerDay;

    return {
      xStart: left,
      xEnd: left + width,
      y: index * rowHeight + (rowHeight / 2),
    };
  };

  // Drag operations
  const startDrag = (
    e: React.MouseEvent,
    task: Task,
    action: 'move' | 'resize-start' | 'resize-end'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setDragState({
      taskId: task.id,
      action,
      initialMouseX: e.clientX,
      initialStartDate: task.startDate,
      initialEndDate: task.endDate,
    });
    setDraggedTaskDates({
      id: task.id,
      start: task.startDate,
      end: task.endDate,
    });
  };

  useEffect(() => {
    if (!dragState) return;

    let finalStart = dragState.initialStartDate;
    let finalEnd = dragState.initialEndDate;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragState.initialMouseX;
      const deltaDays = Math.round(deltaX / pxPerDay);

      const currentTask = tasks.find(t => t.id === dragState.taskId);
      if (!currentTask) return;

      let newStart = currentTask.startDate;
      let newEnd = currentTask.endDate;

      if (dragState.action === 'move') {
        newStart = addDays(dragState.initialStartDate, deltaDays);
        newEnd = addDays(dragState.initialEndDate, deltaDays);
      } else if (dragState.action === 'resize-start') {
        newStart = addDays(dragState.initialStartDate, deltaDays);
        // Ensure starting date is not after ending date
        if (getDaysDiff(newStart, currentTask.endDate) < 0) {
          newStart = currentTask.endDate;
        }
      } else if (dragState.action === 'resize-end') {
        newEnd = addDays(dragState.initialEndDate, deltaDays);
        // Ensure ending date is not before starting date
        if (getDaysDiff(currentTask.startDate, newEnd) < 0) {
          newEnd = currentTask.startDate;
        }
      }

      finalStart = newStart;
      finalEnd = newEnd;

      setDraggedTaskDates({
        id: dragState.taskId,
        start: newStart,
        end: newEnd,
      });
    };

    const handleMouseUp = () => {
      // Trigger parent update ONLY if dates actually changed
      const currentTask = tasks.find(t => t.id === dragState.taskId);
      if (currentTask && (finalStart !== currentTask.startDate || finalEnd !== currentTask.endDate)) {
        onUpdateTaskDates(dragState.taskId, finalStart, finalEnd);
      }
      setDragState(null);
      setDraggedTaskDates(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, pxPerDay, tasks, onUpdateTaskDates]);

  // Headers calculations
  const { primaryHeaders, secondaryHeaders } = generateHeaderCells(bounds, zoom);

  // Position of today indicator line (centered in today's column)
  const todayOffsetDays = getDaysDiff(bounds.startDate, todayStr);
  const todayLeftPosition = (todayOffsetDays + 0.5) * pxPerDay;
  const isTodayVisible = todayOffsetDays >= 0 && todayOffsetDays <= bounds.totalDays;

  // Track coordinates and details of loaded dependency lines
  const dependencyLinesToDraw: {
    key: string;
    path: string;
    color: string;
  }[] = [];

  // Compute dependency geometries
  filteredTasks.forEach((task, bIndex) => {
    if (task.dependencies && task.dependencies.length > 0) {
      task.dependencies.forEach(depId => {
        const aIndex = filteredTasks.findIndex(t => t.id === depId);
        if (aIndex !== -1) {
          const coordsA = getTaskCoordinates(depId, aIndex);
          const coordsB = getTaskCoordinates(task.id, bIndex);

          if (coordsA && coordsB) {
            // Draw clean, non-overlapping orthogonal layout (classic elbow lines)
            const x1 = coordsA.xEnd;
            const y1 = coordsA.y;
            const x2 = coordsB.xStart;
            const y2 = coordsB.y;

            let path = '';
            if (x2 > x1) {
              // Forward flow: Offset horizontal elbows dynamically to prevent overlaps
              const spacing = 8 + ((aIndex + bIndex) % 4) * 6;
              const elbowX = x1 + spacing;
              path = `M ${x1} ${y1} L ${elbowX} ${y1} L ${elbowX} ${y2} L ${x2} ${y2}`;
            } else {
              // Backward flow: Offset horizontal elbow and vertical segments to prevent overlaps
              const spacingA = 8 + (aIndex % 3) * 5;
              const spacingB = 8 + (bIndex % 3) * 5;
              const leftElbow = x1 + spacingA;
              const rightElbow = x2 - spacingB;
              const midY = (y1 + y2) / 2 + ((aIndex + bIndex) % 3 - 1) * 6;
              path = `M ${x1} ${y1} L ${leftElbow} ${y1} L ${leftElbow} ${midY} L ${rightElbow} ${midY} L ${rightElbow} ${y2} L ${x2} ${y2}`;
            }

            // Colors match dependency line styles nicely
            const colorClass = COLOR_MAP[task.color]?.text || 'text-slate-400';

            dependencyLinesToDraw.push({
              key: `dep-${depId}-${task.id}`,
              path,
              color: colorClass,
            });
          }
        }
      });
    }
  });

  return (
    <div 
      className="flex flex-col lg:flex-row border border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-950 overflow-hidden shadow-xs relative" 
      ref={containerRef}
      id="gantt-planner-container"
    >
      {/* 1. Left Sidebar: Task list description */}
      <div 
        className="w-full lg:w-96 shrink-0 bg-white dark:bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 flex flex-col z-10"
        id="side-task-table"
      >
        <div 
          className="h-[89px] px-6 border-b border-rose-100/10 border-slate-200 dark:border-slate-800 flex items-center text-xs font-bold text-slate-500 dark:text-slate-500 dark:bg-slate-900/50 uppercase tracking-wider bg-slate-50/50"
          id="side-table-header"
        >
          <span>Active Task Information</span>
        </div>

        {/* Task Items list scroll list */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800" id="side-table-body">
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center" id="no-tasks-alert">
              <AlertTriangle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No tasks match criteria</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try resetting search filters.</p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const priorityStyles = {
                High: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40',
                Medium: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40',
                Low: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40',
              };

              return (
                <div 
                  key={task.id} 
                  className={`h-14 px-6 flex items-center justify-between gap-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20 select-none group`}
                  id={`side-row-${task.id}`}
                >
                  <div className="flex-1 min-w-0 pr-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5" title={task.name}>
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${COLOR_MAP[task.color]?.accent || 'bg-slate-500'}`} />
                      <span className="truncate">{task.name}</span>
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-mono">
                      <span className="truncate">👤 {task.assignee.join(', ')}</span>
                      <span>·</span>
                      <span className={`px-1.5 py-0.2 border rounded-md font-sans text-[9px] font-bold uppercase tracking-wide ${priorityStyles[task.priority]}`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>

                  {/* Actions buttons on hovering */}
                  {!restrictedMode && (
                    <div className="flex items-center gap-1 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0" id={`row-actions-${task.id}`}>
                      <button
                        onClick={() => onEditTask(task)}
                        className="p-1.5 hover:bg-slate-150 dark:hover:bg-slate-800/70 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg cursor-pointer transition-colors"
                        title="Edit task config"
                        id={`btn-edit-${task.id}`}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg cursor-pointer transition-colors"
                        title="Delete task"
                        id={`btn-delete-${task.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Right Workspace: Dynamic Scrollable Canvas Gantt Graph */}
      <div 
        ref={timelineScrollRef}
        className="flex-1 overflow-x-auto overflow-y-hidden select-none bg-white dark:bg-slate-900 scrollbar-thin divide-y divide-slate-100 dark:divide-slate-800"
        style={{ scrollBehavior: 'smooth' }}
        id="timeline-scroll-axis"
      >
        {/* Dynamic Headers: Consolidated into identical height layout */}
        <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 shadow-horizontal-line" style={{ width: `${totalWidth}px` }} id="timeline-rhythm-headers">
          
          {/* Primary Row Headers: Year / Months */}
          <div className="h-[44px] flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20" id="primary-headers-row">
            {primaryHeaders.map(cell => (
              <div
                key={cell.key}
                style={{ width: `${cell.width}px` }}
                className="shrink-0 border-r border-slate-200/55 dark:border-slate-800/40 text-xs font-bold text-slate-800 dark:text-slate-400 flex items-center pl-4.5 font-sans"
              >
                {cell.label}
              </div>
            ))}
          </div>

          {/* Secondary Row Headers: Calendar increments (Days/Weeks) */}
          <div className="h-[44px] flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20" id="secondary-headers-row">
            {secondaryHeaders.map(cell => (
              <div
                key={cell.key}
                style={{ width: `${cell.width}px` }}
                className={`shrink-0 border-r border-slate-100 dark:border-slate-800/60 text-[11px] flex flex-col justify-center items-center font-semibold ${
                  cell.isToday 
                    ? 'bg-indigo-50/60 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 font-bold' 
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <span>{cell.label}</span>
                {cell.subLabel && <span className="text-[9px] text-slate-400 tracking-tight dark:text-slate-500 mt-0.5">{cell.subLabel}</span>}
              </div>
            ))}
          </div>

        </div>

        {/* Dynamic Grid Body Container */}
        <div 
          className="relative divide-y divide-slate-100 dark:divide-slate-800"
          style={{ width: `${totalWidth}px` }}
          id="timeline-grid-body"
        >
          {/* Overlay Today indicator line if visible */}
          {isTodayVisible && (
            <div 
              className="absolute top-0 bottom-0 border-l-2 border-dashed border-indigo-500 dark:border-indigo-400 z-10 pointer-events-none flex flex-col items-center"
              style={{ left: `${todayLeftPosition}px` }}
              id="today-indicator-line"
            >
              <div className="px-2 py-0.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md text-[9px] font-bold tracking-wider uppercase shadow-md select-none sticky top-22 -translate-x-[48%]" id="today-flag-badge">
                Today
              </div>
            </div>
          )}

          {/* SVG Overlay canvas for connectors */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="absolute inset-0 pointer-events-none z-0"
            style={{ width: `${totalWidth}px`, height: `${filteredTasks.length * rowHeight}px` }}
            id="dependency-svg-container"
          >
            <defs>
              <marker
                id="marker-arrow"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 7 5 L 0 8.5 z" fill="currentColor" className="opacity-90" />
              </marker>
            </defs>

            {dependencyLinesToDraw.map(line => (
              <g key={line.key}>
                {/* Secondary thick background track for contrast */}
                <path
                  d={line.path}
                  fill="none"
                  stroke="rgba(241, 245, 249, 0.45)"
                  strokeWidth="5"
                  className="stroke-slate-200/40 dark:stroke-slate-800/10"
                />
                {/* Active vector path */}
                <path
                  d={line.path}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.85"
                  className={`${line.color} opacity-65 dark:opacity-50 transition-all`}
                  markerEnd="url(#marker-arrow)"
                />
              </g>
            ))}
          </svg>

          {/* Render Timeline rows */}
          {filteredTasks.length === 0 ? (
            <div className="h-40" />
          ) : (
            filteredTasks.map((task, index) => {
              // Convert dates offsets
              const isDragging = draggedTaskDates && draggedTaskDates.id === task.id;
              const startDate = isDragging ? draggedTaskDates.start : task.startDate;
              const endDate = isDragging ? draggedTaskDates.end : task.endDate;

              const startDays = getDaysDiff(bounds.startDate, startDate);
              const durationDays = getDaysDiff(startDate, endDate) + 1;

              const leftPos = startDays * pxPerDay;
              const barWidth = durationDays * pxPerDay;

              const mapping = COLOR_MAP[task.color] || COLOR_MAP.indigo;

              return (
                <div 
                  key={task.id} 
                  className="h-14 relative flex items-center border-r border-slate-100 dark:border-slate-800"
                  id={`timeline-row-${task.id}`}
                >
                  {/* Grid background day vertical dividers */}
                  <div className="absolute inset-0 flex pointer-events-none z-0" id={`row-grid-bg-${task.id}`}>
                    {Array.from({ length: bounds.totalDays }).map((_, colI) => (
                      <div
                        key={colI}
                        style={{ width: `${pxPerDay}px` }}
                        className="h-full shrink-0 border-r border-slate-100/50 dark:border-slate-800/10"
                      />
                    ))}
                  </div>

                  {/* Absolute task visual bar inside grid */}
                  <div
                    style={{ 
                      left: `${leftPos}px`, 
                      width: `${barWidth}px`,
                    }}
                    className={`h-[34px] absolute rounded-xl border border-solid ${mapping.bg} ${mapping.border} hover:shadow-md transition-all group overflow-visible z-10`}
                    id={`task-bar-${task.id}`}
                  >
                    
                    {/* Resizable Left Drag Handles */}
                    {!restrictedMode && (
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-2.5 z-20 cursor-ew-resize hover:bg-slate-300/30 dark:hover:bg-slate-600/30 group-hover:bg-slate-300 dark:group-hover:bg-slate-700 rounded-l-xl transition-all"
                        onMouseDown={(e) => startDrag(e, task, 'resize-start')}
                        title="Drag to resize start date"
                        id={`bar-drag-left-${task.id}`}
                      />
                    )}

                    {/* Draggable container box (Middle) */}
                    <div 
                      className={`absolute ${restrictedMode ? 'left-0 right-0' : 'left-2.5 right-2.5'} top-0 bottom-0 ${restrictedMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} flex items-center pr-2 pl-3 select-none overflow-hidden z-10`}
                      onMouseDown={(e) => !restrictedMode && startDrag(e, task, 'move')}
                      onClick={() => {
                        if (restrictedMode) {
                          onEditTask(task);
                        }
                      }}
                      title={restrictedMode ? `Click to view task or update progress (${task.name})` : `Drag bar left/right to move dates (${task.startDate} to ${task.endDate})`}
                      id={`bar-drag-middle-${task.id}`}
                    >
                      <div className="w-full flex items-center justify-between pointer-events-none" id={`bar-meta-content-${task.id}`}>
                        <span className={`text-[11px] font-bold ${mapping.text} truncate max-w-[85%] truncate`}>
                          {task.name}
                        </span>
                        <span className={`text-[9px] font-bold ${mapping.text} font-mono shrink-0 bg-white/70 dark:bg-slate-900/60 px-1 py-0.2 rounded`}>
                          {task.progress}%
                        </span>
                      </div>

                      {/* Floating hover date-range bubble utility */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-slate-900 dark:bg-slate-800 text-white rounded-lg text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md flex flex-col items-center gap-0.5 z-40 whitespace-nowrap whitespace-pre">
                        <span>{formatHumanDate(task.startDate)} - {formatHumanDate(task.endDate)}</span>
                        <span className="text-slate-400 text-[9px] font-light">Duration: {durationDays} {durationDays === 1 ? 'day' : 'days'} ({task.progress}% done)</span>
                      </div>
                    </div>

                    {/* Progress tracking indicator (Inner fill) */}
                    <div 
                      className={`absolute left-0 top-0 bottom-0 rounded-l-lg ${mapping.accent} opacity-20 pointer-events-none z-0`}
                      style={{ width: `${task.progress}%` }}
                      id={`bar-inner-fill-${task.id}`}
                    />

                    {/* Resizable Right Drag Handles */}
                    {!restrictedMode && (
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-2.5 z-20 cursor-ew-resize hover:bg-slate-300/30 dark:hover:bg-slate-600/30 group-hover:bg-slate-300 dark:group-hover:bg-slate-700 rounded-r-xl transition-all"
                        onMouseDown={(e) => startDrag(e, task, 'resize-end')}
                        title="Drag to resize end date"
                        id={`bar-drag-right-${task.id}`}
                      />
                    )}

                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
