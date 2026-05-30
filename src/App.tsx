/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  Layers, 
  CheckCircle2, 
  Hourglass, 
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { Task, ZoomLevel, FilterOptions, Project } from './types';
import { DEFAULT_TASKS } from './data/defaultTasks';
import { calculateTimelineBounds, getDaysDiff, getPxPerDay, getTodayStr } from './utils/dateUtils';
import GanttChartHeader from './components/GanttChartHeader';
import GanttTimeline from './components/GanttTimeline';
import TaskModal from './components/TaskModal';
import PersonnelModal from './components/PersonnelModal';
import HomePage from './components/HomePage';
import ExportModal from './components/ExportModal';
import UserIdentityModal from './components/UserIdentityModal';
import ActivityLogPanel from './components/ActivityLogPanel';
import { exportElementAsImage } from './utils/exportUtils';

const STORAGE_ZOOM_KEY = 'gantt_planner_zoom';
const STORAGE_THEME_KEY = 'gantt_planner_theme';

const isDev = (import.meta as any).env.DEV;
const API_BASE = isDev ? `http://${window.location.hostname}:3001` : window.location.origin;
const WS_BASE = isDev ? `ws://${window.location.hostname}:3001` : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

export default function App() {
  // Router state
  const [currentView, setCurrentView] = useState<'home' | 'gantt'>('home');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [restrictedMode, setRestrictedMode] = useState<boolean>(false);
  const [isOwner] = useState<boolean>(() => {
    // Persist owner status via localStorage if they accessed the main URL
    const hasOwnerFlag = localStorage.getItem('gantt_owner') === 'true';
    const isMainUrl = !window.location.hash.startsWith('#/project/');
    if (isMainUrl) {
      localStorage.setItem('gantt_owner', 'true');
      return true;
    }
    return hasOwnerFlag;
  });

  // Projects
  const [projects, setProjects] = useState<Project[]>([]);

  // Gantt-level state
  const [zoom, setZoom] = useState<ZoomLevel>('day');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const storedTheme = localStorage.getItem(STORAGE_THEME_KEY);
      if (storedTheme) {
        return storedTheme === 'dark';
      }
    } catch { /* ignore */ }
    return true; // Default to dark mode if no setting is saved
  });
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    priority: 'All',
    assignee: 'All',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isPersonnelOpen, setIsPersonnelOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Identity and Activity states
  const [currentUser, setCurrentUser] = useState<string>(() => {
    let stored = localStorage.getItem('gantt_username');
    if (stored === 'Owner') {
      stored = null; // migrate old defaults
    }
    if (stored) return stored;
    if (isOwner) {
      localStorage.setItem('gantt_username', 'Cedric');
      return 'Cedric';
    }
    return '';
  });
  const [isIdentityOpen, setIsIdentityOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Trigger identity prompt for teammates on load
  useEffect(() => {
    if (!currentUser && !isOwner) {
      setIsIdentityOpen(true);
    }
  }, [currentUser, isOwner]);

  // 1. Initial State & Routing Load
  useEffect(() => {
    // Load zoom setting
    const storedZoom = localStorage.getItem(STORAGE_ZOOM_KEY);
    if (storedZoom) {
      setZoom(storedZoom as ZoomLevel);
    }

    const handleHashChange = async () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/project/')) {
        const projectId = hash.replace('#/project/', '');
        setRestrictedMode(true);
        setActiveProjectId(projectId);
        setCurrentView('gantt');

        // Fetch project from Server
        try {
          const res = await fetch(`${API_BASE}/api/projects/${projectId}`);
          if (res.ok) {
            const data = await res.json();
            setProjects(prev => {
              const exists = prev.some(p => p.id === projectId);
              if (exists) {
                return prev.map(p => p.id === projectId ? data : p);
              }
              return [...prev, data];
            });
          } else {
            console.error('Project not found on server');
            // If project doesn't exist on server, we try creating a default project in dashboard mode
            window.location.hash = '';
          }
        } catch (e) {
          console.error('Error fetching project:', e);
        }
      } else {
        setRestrictedMode(false);
        setCurrentView('home');
        setActiveProjectId(null);

        // Fetch all projects for dashboard
        try {
          const res = await fetch(`${API_BASE}/api/projects`);
          if (res.ok) {
            const data = await res.json();
            if (data.length === 0) {
              // Migrate existing local projects to the server
              const storedProjects = localStorage.getItem('gantt_projects');
              if (storedProjects) {
                const parsed = JSON.parse(storedProjects);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  for (const proj of parsed) {
                    await fetch(`${API_BASE}/api/projects`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(proj),
                    });
                  }
                  // Reload migrated projects from server
                  const reloadRes = await fetch(`${API_BASE}/api/projects`);
                  if (reloadRes.ok) {
                    setProjects(await reloadRes.json());
                    return;
                  }
                }
              }
            }
            setProjects(data);
          }
        } catch (e) {
          console.error('Error fetching all projects:', e);
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 2. Realtime WebSocket Collaboration Sync
  useEffect(() => {
    if (!activeProjectId) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const connectWebSocket = () => {
      const socket = new WebSocket(`${WS_BASE}/ws`);
      wsRef.current = socket;

      socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'join', projectId: activeProjectId }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'sync' && data.project && data.project.id === activeProjectId) {
            setProjects(prev =>
              prev.map(p => {
                if (p.id === activeProjectId) {
                  // Only update state if there's actually a difference to prevent cursors/input resetting
                  const hasTasksChanged = JSON.stringify(p.tasks) !== JSON.stringify(data.project.tasks);
                  const hasPersonnelChanged = JSON.stringify(p.personnel) !== JSON.stringify(data.project.personnel);
                  const hasNameChanged = p.name !== data.project.name;
                  const hasTagChanged = p.tag !== data.project.tag;

                  if (hasTasksChanged || hasPersonnelChanged || hasNameChanged || hasTagChanged) {
                    return {
                      ...p,
                      name: data.project.name,
                      tag: data.project.tag,
                      tasks: data.project.tasks,
                      personnel: data.project.personnel
                    };
                  }
                }
                return p;
              })
            );
          }
        } catch (err) {
          console.error('WebSocket sync parsing error:', err);
        }
      };

      socket.onclose = () => {
        // Automatically reconnect after 3 seconds if disconnected
        setTimeout(() => {
          if (activeProjectId && (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED)) {
            connectWebSocket();
          }
        }, 3000);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [activeProjectId]);

  // Helper function to broadcast updates to the WebSocket server
  const broadcastUpdate = (updatedProject: Project) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'update',
        projectId: updatedProject.id,
        project: updatedProject
      }));
    }
  };

  // 3. Synchronize theme selection class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(STORAGE_THEME_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(STORAGE_THEME_KEY, 'light');
    }
  }, [darkMode]);

  // 4. Dynamic document title
  useEffect(() => {
    if (currentView === 'home') {
      document.title = "Daero's Gantt Chart Repo";
    } else if (activeProject) {
      document.title = `${activeProject.name} — Daero's Gantt Chart Repo`;
    }
  }, [currentView, activeProjectId, projects]);

  // Get active project
  const activeProject = projects.find(p => p.id === activeProjectId) || null;
  const tasks = activeProject?.tasks || [];
  const personnel = activeProject?.personnel || [];

  // Update tasks for active project
  const handleSaveTasksState = async (
    newTasks: Task[],
    details?: string,
    actionType?: 'task_create' | 'task_update' | 'task_delete' | 'task_reschedule' | 'personnel_update' | 'project_update'
  ) => {
    if (!activeProjectId || !activeProject) return;

    let updatedLogs = activeProject.logs || [];
    if (details && actionType) {
      const newLogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        timestamp: new Date().toISOString(),
        user: currentUser || 'Anonymous',
        actionType,
        details,
      };
      updatedLogs = [newLogEntry, ...updatedLogs].slice(0, 100);
    }

    const updatedProject = { ...activeProject, tasks: newTasks, logs: updatedLogs };
    
    // Update local state immediately for responsive UI
    setProjects(prev => prev.map(p => p.id === activeProjectId ? updatedProject : p));
    broadcastUpdate(updatedProject);

    try {
      await fetch(`${API_BASE}/api/projects/${activeProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProject),
      });
    } catch (err) {
      console.error('Error saving tasks to server:', err);
    }
  };

  // Update personnel for active project
  const handleUpdatePersonnel = async (newPersonnel: string[]) => {
    if (!activeProjectId || !activeProject) return;
    
    const newLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toISOString(),
      user: currentUser || 'Anonymous',
      actionType: 'personnel_update' as const,
      details: 'updated project personnel list',
    };
    const updatedLogs = [newLogEntry, ...(activeProject.logs || [])].slice(0, 100);
    const updatedProject = { ...activeProject, personnel: newPersonnel, logs: updatedLogs };

    // Update local state immediately
    setProjects(prev => prev.map(p => p.id === activeProjectId ? updatedProject : p));
    broadcastUpdate(updatedProject);

    try {
      await fetch(`${API_BASE}/api/projects/${activeProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProject),
      });
    } catch (err) {
      console.error('Error saving personnel to server:', err);
    }
  };

  const handleZoomChange = (newZoom: ZoomLevel) => {
    setZoom(newZoom);
    localStorage.setItem(STORAGE_ZOOM_KEY, newZoom);
  };

  // Navigation
  const handleSelectProject = (projectId: string) => {
    window.location.hash = `#/project/${projectId}`;
  };

  const handleBackToHome = () => {
    window.location.hash = '';
  };

  const handleCreateProject = async (name: string, tag?: string) => {
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      tasks: [],
      personnel: [],
      tag: tag || 'Visualize, orchestrate, and trace project milestones and tasks interactively.',
    };

    setProjects(prev => [...prev, newProject]);

    try {
      await fetch(`${API_BASE}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });
    } catch (err) {
      console.error('Error saving new project to server:', err);
    }
  };

  const handleDeleteProject = async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    try {
      await fetch(`${API_BASE}/api/projects/${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Error deleting project from server:', err);
    }
  };

  const handleUpdateProject = async (id: string, name: string, tag?: string) => {
    const targetProject = projects.find(p => p.id === id);
    if (!targetProject) return;

    const newLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toISOString(),
      user: currentUser || 'Anonymous',
      actionType: 'project_update' as const,
      details: `modified project details (Name: "${name}")`,
    };
    const updatedLogs = [newLogEntry, ...(targetProject.logs || [])].slice(0, 100);
    const updatedProject = { ...targetProject, name, tag: tag || '', logs: updatedLogs };
    
    setProjects(prev => prev.map(p => p.id === id ? updatedProject : p));
    broadcastUpdate(updatedProject);

    try {
      await fetch(`${API_BASE}/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProject),
      });
    } catch (err) {
      console.error('Error updating project details on server:', err);
    }
  };

  // Timeline calculations (only used in gantt view)
  const bounds = calculateTimelineBounds(tasks, zoom);


  const handleScrollToToday = () => {
    if (timelineScrollRef.current) {
      const todayStr = getTodayStr();
      const todayOffsetDays = getDaysDiff(bounds.startDate, todayStr);
      const pxPerDay = getPxPerDay(zoom);
      const todayLeft = (todayOffsetDays + 0.5) * pxPerDay;
      const viewportWidth = timelineScrollRef.current.clientWidth;
      timelineScrollRef.current.scrollLeft = todayLeft - (viewportWidth / 2);
    }
  };

  useEffect(() => {
    if (currentView === 'gantt' && tasks.length > 0) {
      const timer = setTimeout(handleScrollToToday, 150);
      return () => clearTimeout(timer);
    }
  }, [zoom, tasks.length, currentView]);

  // Compute unique assignee values
  const assignees = Array.from(
    new Set(tasks.flatMap((t) => t.assignee).filter(Boolean))
  ).sort() as string[];

  // Filters
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                          task.assignee.some(a => a.toLowerCase().includes(filters.search.toLowerCase()));
    const matchesPriority = filters.priority === 'All' || task.priority === filters.priority;
    const matchesAssignee = filters.assignee === 'All' || task.assignee.includes(filters.assignee);
    return matchesSearch && matchesPriority && matchesAssignee;
  });

  // Stats
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.progress === 100).length;
  const pendingTasksCount = totalTasksCount - completedTasksCount;
  const averageProgress = totalTasksCount > 0
    ? Math.round(tasks.reduce((sum, current) => sum + current.progress, 0) / totalTasksCount)
    : 0;
  const blockedTasksCount = tasks.filter(task => {
    if (!task.dependencies || task.dependencies.length === 0) return false;
    return task.dependencies.some(depId => {
      const parent = tasks.find(t => t.id === depId);
      return parent && parent.progress < 100;
    });
  }).length;

  // Task management
  const handleAddTaskTrigger = () => {
    setTaskToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditTaskTrigger = (task: Task) => {
    setTaskToEdit(task);
    setIsModalOpen(true);
  };

  const handleDeleteTask = (id: string) => {
    const taskToDelete = tasks.find(t => t.id === id);
    const updated = tasks
      .filter(t => t.id !== id)
      .map(task => ({
        ...task,
        dependencies: task.dependencies ? task.dependencies.filter(depId => depId !== id) : [],
      }));

    const logDetails = taskToDelete ? `deleted task "${taskToDelete.name}"` : 'deleted a task';
    handleSaveTasksState(updated, logDetails, 'task_delete');
  };

  const handleSaveModalResult = (taskData: Omit<Task, 'id'> & { id?: string }) => {
    if (taskData.id) {
      const oldTask = tasks.find(t => t.id === taskData.id);
      const updated = tasks.map(t => (t.id === taskData.id ? { ...t, ...taskData } : t));
      
      let logDetails = `modified details of task "${taskData.name}"`;
      if (oldTask && oldTask.progress !== taskData.progress) {
        logDetails = `updated progress of task "${taskData.name}" to ${taskData.progress}%`;
      }
      handleSaveTasksState(updated as Task[], logDetails, 'task_update');
    } else {
      const newTaskEntry: Task = {
        ...taskData,
        id: `t-${Date.now()}`,
      };
      handleSaveTasksState([...tasks, newTaskEntry], `created new task "${taskData.name}"`, 'task_create');
    }
  };

  const handleUpdateTaskDates = (id: string, start: string, end: string) => {
    const task = tasks.find(t => t.id === id);
    const updated = tasks.map(t => (t.id === id ? { ...t, startDate: start, endDate: end } : t));
    
    const logDetails = task ? `rescheduled task "${task.name}" dates to ${start} - ${end}` : 'rescheduled a task';
    handleSaveTasksState(updated, logDetails, 'task_reschedule');
  };

  // Export/Import
  const handleExportJSON = () => {
    const dataString = JSON.stringify(tasks, null, 2);
    const blob = new Blob([dataString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${activeProject?.name || 'project'}_gantt_export_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.every(t => t.id && t.name && t.startDate && t.endDate)) {
          handleSaveTasksState(parsed as Task[]);
          alert('Project loaded successfully!');
        } else {
          alert('Error: Loaded JSON formatting is incorrect or incomplete.');
        }
      } catch {
        alert('Error: Parser failed to analyze chosen JSON file.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleExportCSV = () => {
    const headersList = ['ID', 'Task Name', 'Start Date', 'End Date', 'Progress %', 'Priority', 'Assignee', 'Dependencies'];
    const rowsList = tasks.map(t => [
      t.id,
      `"${t.name.replace(/"/g, '""')}"`,
      t.startDate,
      t.endDate,
      t.progress,
      t.priority,
      `"${t.assignee.join('; ').replace(/"/g, '""')}"`,
      `"${(t.dependencies || []).join(';')}"`
    ]);

    const csvContent = [headersList.join(','), ...rowsList.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${activeProject?.name || 'project'}_gantt_spreadsheet_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleExportConfirm = (format: 'png' | 'jpeg', filename: string) => {
    const el = document.getElementById('gantt-planner-container');
    if (el) {
      const title = `${activeProject?.name || 'Project'} Gantt Chart`;
      exportElementAsImage(el, filename, format, title);
    }
  };

  const handleShareProject = () => {
    if (!activeProjectId) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}#/project/${activeProjectId}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        alert('Collaboration link copied to clipboard! Send it to your teammates.');
      })
      .catch(err => {
        console.error('Failed to copy link:', err);
      });
  };

  // ── RENDER ────────────────────────────────────────────────

  // Homepage view
  if (currentView === 'home') {
    return (
      <HomePage
        projects={projects}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onDeleteProject={handleDeleteProject}
        onUpdateProject={handleUpdateProject}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
    );
  }

  // Gantt chart view
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200 font-sans pb-12 flex flex-col" id="applet-viewport">
      
      {/* Dynamic Header Component */}
      <GanttChartHeader
        zoom={zoom}
        setZoom={handleZoomChange}
        filters={filters}
        setFilters={setFilters}
        assignees={assignees}
        onAddTask={handleAddTaskTrigger}
        onOpenExport={() => setIsExportOpen(true)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onScrollToToday={handleScrollToToday}
        title={activeProject?.name || 'Project Gantt Chart'}
        subtitle={activeProject?.tag || "Visualize, orchestrate, and trace project milestones and tasks interactively."}
        onBack={isOwner ? handleBackToHome : undefined}
        onOpenPersonnel={() => setIsPersonnelOpen(true)}
        onShare={handleShareProject}
        onOpenHistory={() => setIsHistoryOpen(true)}
        restrictedMode={!isOwner}
      />

      {/* Main Stats Summary Strip & Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 mt-6 flex flex-col gap-6" id="dashboard-main-view">
        
        {/* KPI Stats Cards Strip */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-dashboard-grid">
          
          {/* Card 1: Total Project scope */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/85 p-5 rounded-2xl flex items-center gap-4 shadow-2xs" id="kpi-total-tasks">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl" id="kpi-logo-1">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Milestones Scope</p>
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{totalTasksCount} Active Tasks</h3>
            </div>
          </div>

          {/* Card 2: Average Deliverable completion rate */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/85 p-5 rounded-2xl shadow-2xs" id="kpi-project-progress">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl" id="kpi-logo-2">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Overall Progress</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{averageProgress}% Done</h3>
                </div>
              </div>
            </div>
            {/* Embedded Mini-tracker bar to show summary status visually */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${averageProgress}%` }} />
            </div>
          </div>

          {/* Card 3: Tasks fully resolved */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/85 p-5 rounded-2xl flex items-center gap-4 shadow-2xs" id="kpi-resolved-tasks">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl" id="kpi-logo-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Closed Out</p>
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{completedTasksCount} / {totalTasksCount} Completed</h3>
            </div>
          </div>

          {/* Card 4: Blocked Dependency warnings */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/85 p-5 rounded-2xl flex items-center gap-4 shadow-2xs" id="kpi-blocked-tasks">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl" id="kpi-logo-4">
              <Hourglass className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Halted Progress</p>
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{blockedTasksCount} Blocked Items</h3>
            </div>
          </div>

        </section>

        {/* Primary Timeline Section Dashboard Canvas */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 p-4.5 sm:p-6 rounded-3xl shadow-sm" id="gantt-chart-section">
          {/* Timeline and visual board elements */}
          <GanttTimeline
            tasks={tasks}
            filteredTasks={filteredTasks}
            bounds={bounds}
            zoom={zoom}
            onEditTask={handleEditTaskTrigger}
            onDeleteTask={handleDeleteTask}
            onUpdateTaskDates={handleUpdateTaskDates}
            timelineScrollRef={timelineScrollRef}
            restrictedMode={!isOwner}
          />
        </section>

        {/* Quick Instructions & Floating Help card */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/55 dark:border-slate-800/60 p-6 rounded-3xl" id="dashboard-instructions-card">
          <div className="flex gap-4">
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shrink-0 h-11.5 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 font-sans">Interactive Layout Adjustments</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans mt-1">
                You can drag any timeline bar to modify task durations. Hover over the bar boundaries to expose <strong>Left/Right resize controls</strong>. Drag the middle of the task box to shift entire task schedule blocks forward or backward.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shrink-0 h-11.5 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 font-sans">Dependency Trace Vectors</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans mt-1">
                To link tasks, click <strong>Add Task</strong> or edit an existing one, and choose a dependency target. Safe orthogonal vector lines will automatically draw across rows with arrows indicating visual workflow paths.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* Task Creation & Modification Panel Overlay Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModalResult}
        taskToEdit={taskToEdit}
        allTasks={tasks}
        personnel={personnel}
        restrictedMode={!isOwner}
      />

      {/* Personnel Management Modal */}
      <PersonnelModal
        isOpen={isPersonnelOpen}
        onClose={() => setIsPersonnelOpen(false)}
        personnel={personnel}
        onUpdatePersonnel={handleUpdatePersonnel}
        taskAssignees={tasks.flatMap(t => t.assignee)}
      />

      {/* Export Format Selector Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onConfirm={handleExportConfirm}
        defaultFilename={`${activeProject?.name || 'project'}_gantt_chart`}
        projectTitle={`${activeProject?.name || 'Project'} Gantt Chart`}
      />

      {/* User Identity Modal */}
      <UserIdentityModal
        isOpen={isIdentityOpen}
        onSave={(username) => {
          localStorage.setItem('gantt_username', username);
          setCurrentUser(username);
          setIsIdentityOpen(false);
        }}
      />

      {/* Activity Logs Sidebar Drawer Panel */}
      <ActivityLogPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        logs={activeProject?.logs || []}
      />

    </div>
  );
}
