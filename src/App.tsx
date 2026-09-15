/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Layers, 
  CheckCircle2, 
  Hourglass
} from 'lucide-react';
import { Task, ZoomLevel, FilterOptions, Project, ProjectDiagram } from './types';
import { calculateTimelineBounds, getDaysDiff, getPxPerDay, getTodayStr } from './utils/dateUtils';
import GanttChartHeader from './components/GanttChartHeader';
import GanttTimeline from './components/GanttTimeline';
import TaskModal from './components/TaskModal';
import PersonnelModal from './components/PersonnelModal';
import TaskDetailsModal from './components/TaskDetailsModal';
import HomePage from './components/HomePage';
import ExportModal from './components/ExportModal';
import UserIdentityModal from './components/UserIdentityModal';
import ActivityLogPanel from './components/ActivityLogPanel';
import DiagramsHub from './components/DiagramsHub';
import { exportElementAsImage } from './utils/exportUtils';
import { supabase } from './utils/supabaseClient';
import Auth from './components/Auth';
import { fetchAllProjects, fetchProjectDetails, createProject, deleteProject, updateProjectDetails, mapTaskToDb, fetchAllProfiles } from './utils/supabaseData';
import { sendTaskAssignmentEmail } from './utils/emailService';

const STORAGE_ZOOM_KEY = 'gantt_planner_zoom';
const STORAGE_THEME_KEY = 'gantt_theme_preference';

export type UserRole = 'owner' | 'collaborator' | 'viewer';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const isGlobalOwner = session?.user?.email === 'cedricpaulmendoza11@gmail.com';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Router state
  const [currentView, setCurrentView] = useState<'home' | 'gantt'>('home');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('viewer');
  const restrictedMode = userRole !== 'owner';
  const isViewerMode = userRole === 'viewer';

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
    return true; // Default to dark mode
  });
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    priority: 'All',
    assignee: 'All',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isPersonnelOpen, setIsPersonnelOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Notify Mode
  const [isNotifyMode, setIsNotifyMode] = useState(false);
  const [selectedTaskIdsForNotify, setSelectedTaskIdsForNotify] = useState<string[]>([]);

  // Identity and Activity states
  const [currentUser, setCurrentUser] = useState<string>(() => {
    let stored = localStorage.getItem('gantt_username');
    if (stored === 'Owner') stored = null;
    return stored || '';
  });
  const [isIdentityOpen, setIsIdentityOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Static image generation for viewers
  const [staticGanttImage, setStaticGanttImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const timelineScrollRef = useRef<HTMLDivElement | null>(null);

  // Trigger identity prompt
  useEffect(() => {
    if (!currentUser && session) {
      // Prioritize full_name from signup, fallback to email prefix
      const defaultName = session.user?.user_metadata?.full_name || session.user?.email?.split('@')[0] || 'User';
      setCurrentUser(defaultName);
      localStorage.setItem('gantt_username', defaultName);
    }
  }, [currentUser, session]);

  // 1. Initial State & Routing Load
  useEffect(() => {
    if (!session) return;
    const storedZoom = localStorage.getItem(STORAGE_ZOOM_KEY);
    if (storedZoom) {
      setZoom(storedZoom as ZoomLevel);
    }

    const handleHashChange = async () => {
      const hash = window.location.hash;
      
      if (hash.startsWith('#/invite/')) {
        const token = hash.replace('#/invite/', '');
        const { data, error } = await supabase.from('projects').select('id, collaborators').eq('share_token', token).single();
        if (data) {
          const updatedCollaborators = Array.from(new Set([...(data.collaborators || []), session.user.id]));
          await supabase.from('projects').update({ collaborators: updatedCollaborators }).eq('id', data.id);
          window.location.hash = `#/project/${data.id}`;
        } else {
          alert('Invalid or expired invitation link.');
          window.location.hash = '';
        }
      } else if (hash.startsWith('#/project/')) {
        const projectId = hash.replace('#/project/', '');
        setActiveProjectId(projectId);
        setCurrentView('gantt');

        const data = await fetchProjectDetails(projectId);
        if (data) {
          const userName = session.user?.user_metadata?.full_name || session.user?.email?.split('@')[0] || 'User';
          const isCollaborator = 
            data.collaborators?.includes(session.user.id) ||
            data.personnel?.some((p: string) => 
              p.toLowerCase() === session.user?.email?.toLowerCase() ||
              p.toLowerCase() === userName.toLowerCase()
            );

          let role: UserRole = 'viewer';
          if (isGlobalOwner) role = 'owner';
          else if (isCollaborator) role = 'collaborator';
          setUserRole(role);

          setProjects(prev => {
            const exists = prev.some(p => p.id === projectId);
            if (exists) return prev.map(p => p.id === projectId ? data : p);
            return [...prev, data];
          });
        } else {
          console.error('Project not found');
          window.location.hash = '';
        }
      } else {
        setUserRole('viewer');
        setCurrentView('home');
        setActiveProjectId(null);

        const data = await fetchAllProjects();
        setProjects(data);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [session]);

  // 2. Supabase Realtime Sync
  useEffect(() => {
    if (!activeProjectId) return;

    const channel = supabase.channel(`room_${activeProjectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', filter: `project_id=eq.${activeProjectId}` }, () => {
        fetchProjectDetails(activeProjectId).then(data => {
          if (data) setProjects(prev => prev.map(p => p.id === activeProjectId ? data : p));
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${activeProjectId}` }, () => {
        fetchProjectDetails(activeProjectId).then(data => {
          if (data) setProjects(prev => prev.map(p => p.id === activeProjectId ? data : p));
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeProjectId]);

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
  const activeProject = projects.find(p => p.id === activeProjectId) || null;
  useEffect(() => {
    if (currentView === 'home') {
      document.title = "Daero's Gantt Chart Repo";
    } else if (activeProject) {
      document.title = `${activeProject.name} — Daero's Gantt Chart Repo`;
    }
  }, [currentView, activeProject]);

  // 5. Force week zoom for restricted mode static capture
  useEffect(() => {
    if (isViewerMode && zoom !== 'week') {
      setZoom('week');
    }
  }, [isViewerMode, zoom]);

  const tasks = activeProject?.tasks || [];
  const personnel = activeProject?.personnel || [];

  // Log action helper
  const logAction = async (actionType: string, details: string) => {
    if (!activeProjectId) return;
    const logEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      project_id: activeProjectId,
      user_id: session?.user?.id || 'unknown',
      action_type: actionType,
      details,
      timestamp: new Date().toISOString()
    };
    await supabase.from('activity_logs').insert(logEntry);
  };

  // Update personnel for active project
  const handleUpdatePersonnel = async (newPersonnel: string[]) => {
    if (!activeProjectId || !activeProject) return;
    const updatedProject = { ...activeProject, personnel: newPersonnel };
    setProjects(prev => prev.map(p => p.id === activeProjectId ? updatedProject : p));
    await supabase.from('projects').update({ personnel: newPersonnel }).eq('id', activeProjectId);
    logAction('personnel_update', 'updated project personnel list');
  };

  const handleUpdateDiagrams = async (newDiagrams: ProjectDiagram[], details: string) => {
    if (!activeProjectId || !activeProject) return;
    const updatedProject = { ...activeProject, diagrams: newDiagrams };
    setProjects(prev => prev.map(p => p.id === activeProjectId ? updatedProject : p));
    
    for (const d of newDiagrams) {
      await supabase.from('project_diagrams').upsert({
        id: d.id,
        project_id: activeProjectId,
        title: d.title,
        image_url: d.imageUrl,
        description: d.description
      });
    }
    logAction('project_update', details);
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
    if (!session?.user?.id) return;
    const newProject = await createProject(name, tag || 'Visualize, orchestrate, and trace project milestones.', session.user.id);
    if (newProject) {
      setProjects(prev => [...prev, newProject]);
    }
  };

  const handleDeleteProject = async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    await deleteProject(id);
  };

  const handleUpdateProject = async (id: string, name: string, tag?: string) => {
    const targetProject = projects.find(p => p.id === id);
    if (!targetProject) return;
    const updatedProject = { ...targetProject, name, tag: tag || '' };
    setProjects(prev => prev.map(p => p.id === id ? updatedProject : p));
    await updateProjectDetails(id, name, tag || '');
    if (activeProjectId === id) {
      logAction('project_update', `modified project details (Name: "${name}")`);
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

  // Generate static image for restricted users
  useEffect(() => {
    if (isViewerMode && currentView === 'gantt' && tasks.length > 0) {
      setIsGeneratingImage(true);
      
      const generateTimer = setTimeout(async () => {
        const el = document.getElementById('gantt-planner-container');
        if (el) {
          try {
            const { generateExportImage } = await import('./utils/exportUtils');
            const dataUrl = await generateExportImage(el, 'png');
            setStaticGanttImage(dataUrl);
          } catch (error) {
            console.error('Failed to generate static viewer image:', error);
          }
        }
        setIsGeneratingImage(false);
      }, 800); // Wait for fonts, layouts, and handleScrollToToday to finish

      return () => clearTimeout(generateTimer);
    } else {
      setStaticGanttImage(null);
    }
  }, [isViewerMode, currentView, tasks, zoom, filters, activeProjectId]);

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
  }).sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    }
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
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

  const handleDeleteTask = async (id: string) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (!taskToDelete) return;
    
    // Optimistic UI
    const updatedTasks = tasks.filter(t => t.id !== id).map(task => ({
      ...task,
      dependencies: task.dependencies ? task.dependencies.filter(depId => depId !== id) : [],
    }));
    if (activeProject) {
      setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, tasks: updatedTasks } : p));
    }

    await supabase.from('tasks').delete().eq('id', id);
    logAction('task_delete', `deleted task "${taskToDelete.name}"`);
  };

  const handleSaveModalResult = async (taskData: Omit<Task, 'id'> & { id?: string }) => {
    let isUpdate = !!taskData.id;
    let finalTask: Task;
    
    if (isUpdate) {
      finalTask = { ...taskData } as Task;
      const oldTask = tasks.find(t => t.id === finalTask.id);
      
      // Optimistic UI
      const updatedTasks = tasks.map(t => (t.id === finalTask.id ? finalTask : t));
      if (activeProject) {
        setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, tasks: updatedTasks } : p));
      }

      await supabase.from('tasks').update(mapTaskToDb(finalTask, activeProjectId!)).eq('id', finalTask.id);
      
      let logDetails = `modified details of task "${finalTask.name}"`;
      if (oldTask && oldTask.progress !== finalTask.progress) {
        logDetails = `updated progress of task "${finalTask.name}" to ${finalTask.progress}%`;
      }
      logAction('task_update', logDetails);
    } else {
      finalTask = { ...taskData, id: `t-${Date.now()}` } as Task;
      
      // Optimistic UI
      if (activeProject) {
        setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, tasks: [...p.tasks, finalTask] } : p));
      }

      await supabase.from('tasks').insert(mapTaskToDb(finalTask, activeProjectId!));
      logAction('task_create', `created new task "${finalTask.name}"`);
    }

  };

  const handleUpdateTaskDates = async (id: string, start: string, end: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    const updatedTask = { ...task, startDate: start, endDate: end };
    
    // Optimistic UI
    const updatedTasks = tasks.map(t => (t.id === id ? updatedTask : t));
    if (activeProject) {
      setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, tasks: updatedTasks } : p));
    }

    await supabase.from('tasks').update({ start_date: start, end_date: end }).eq('id', id);
    logAction('task_reschedule', `rescheduled task "${task.name}" dates to ${start} - ${end}`);
  };

  const handleReorderTasks = async (sourceId: string, targetId: string) => {
    if (!activeProjectId) return;
    const sourceIndex = filteredTasks.findIndex(t => t.id === sourceId);
    const targetIndex = filteredTasks.findIndex(t => t.id === targetId);
    
    if (sourceIndex === -1 || targetIndex === -1) return;
    
    const newOrderedTasks = [...filteredTasks];
    const [movedTask] = newOrderedTasks.splice(sourceIndex, 1);
    newOrderedTasks.splice(targetIndex, 0, movedTask);
    
    const updates = newOrderedTasks.map((t, index) => ({
      id: t.id,
      sort_order: index,
    }));
    
    // Optimistic UI update
    setProjects(prev => prev.map(p => {
      if (p.id !== activeProjectId) return p;
      return {
        ...p,
        tasks: p.tasks.map(t => {
          const update = updates.find(u => u.id === t.id);
          if (update) return { ...t, sortOrder: update.sort_order };
          return t;
        })
      };
    }));
    
    for (const update of updates) {
      await supabase.from('tasks').update({ sort_order: update.sort_order }).eq('id', update.id);
    }
    logAction('task_update', `reordered tasks manually`);
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

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeProjectId) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.every(t => t.id && t.name && t.startDate && t.endDate)) {
          // Add all tasks to DB
          const dbTasks = parsed.map(t => mapTaskToDb(t, activeProjectId));
          await supabase.from('tasks').insert(dbTasks);
          
          // Refetch to sync UI properly
          const data = await fetchProjectDetails(activeProjectId);
          if (data) {
            setProjects(prev => prev.map(p => p.id === activeProjectId ? data : p));
          }
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

  const handleNotifyNow = async () => {
    if (!activeProject || selectedTaskIdsForNotify.length === 0) return;
    
    // Group selected tasks by assignee
    const selectedTasks = tasks.filter(t => selectedTaskIdsForNotify.includes(t.id));
    const assigneesMap: Record<string, Task[]> = {};
    
    selectedTasks.forEach(task => {
      task.assignee.forEach(a => {
        if (!assigneesMap[a]) assigneesMap[a] = [];
        assigneesMap[a].push(task);
      });
    });

    const profiles = await fetchAllProfiles();
    
    Object.entries(assigneesMap).forEach(([assigneeName, usersSelectedTasks]) => {
      const profile = profiles.find(p => {
         const firstName = p.full_name ? p.full_name.split(' ')[0] : p.email.split('@')[0];
         return firstName.toLowerCase() === assigneeName.toLowerCase();
      });
      
      if (profile) {
        const allTasksString = usersSelectedTasks.map(t => `- ${t.name}`).join('\n');
        sendTaskAssignmentEmail(
          profile.email, 
          profile.full_name || assigneeName, 
          activeProject.name, 
          "Multiple Tasks", // Not used in this template since we switched to {{all_tasks}}
          allTasksString
        ).catch(err => console.error("Could not send assignment email", err));
      }
    });

    // Exit mode
    setIsNotifyMode(false);
    setSelectedTaskIdsForNotify([]);
    alert("Notification emails have been queued for sending!");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    window.location.hash = '';
  };

  const handleShareProject = () => {
    if (!activeProjectId || !activeProject) return;
    
    // Fallback to project ID if shareToken isn't set up on the DB yet
    const token = activeProject.shareToken || activeProject.id;
    const shareUrl = `${window.location.origin}${window.location.pathname}#/invite/${token}`;
    
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        alert('Collaboration invite link copied to clipboard! Anyone with this link can edit this project.');
      })
      .catch(err => {
        console.error('Failed to copy link:', err);
      });
  };

  // ── RENDER ────────────────────────────────────────────────

  if (!session) {
    return <Auth />;
  }

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
        isOwner={isGlobalOwner}
        onLogout={handleLogout}
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
        onBack={handleBackToHome}
        onOpenPersonnel={() => setIsPersonnelOpen(true)}
        onShare={handleShareProject}
        onOpenHistory={() => setIsHistoryOpen(true)}
        restrictedMode={restrictedMode}
        onLogout={handleLogout}
        isNotifyMode={isNotifyMode}
        onStartNotifyMode={() => { setIsNotifyMode(true); setSelectedTaskIdsForNotify([]); }}
        onCancelNotifyMode={() => { setIsNotifyMode(false); setSelectedTaskIdsForNotify([]); }}
        onNotifyNow={handleNotifyNow}
        selectedTaskCount={selectedTaskIdsForNotify.length}
        isOwner={isGlobalOwner}
      />

      {/* Main Stats Summary Strip & Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 mt-6 flex flex-col gap-6" id="dashboard-main-view">
        
        {/* KPI Stats Cards Strip */}
        {!isViewerMode && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-dashboard-grid">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/85 p-5 rounded-2xl flex items-center gap-4 shadow-2xs">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Milestones Scope</p>
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{totalTasksCount} Active Tasks</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/85 p-5 rounded-2xl shadow-2xs">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Overall Progress</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{averageProgress}% Done</h3>
                </div>
              </div>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${averageProgress}%` }} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/85 p-5 rounded-2xl flex items-center gap-4 shadow-2xs">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Closed Out</p>
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{completedTasksCount} / {totalTasksCount} Completed</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/85 p-5 rounded-2xl flex items-center gap-4 shadow-2xs">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
              <Hourglass className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Halted Progress</p>
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{blockedTasksCount} Blocked Items</h3>
            </div>
          </div>

        </section>
        )}

        {/* Primary Timeline Section Dashboard Canvas */}
        {isViewerMode ? (
          <section className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 p-4 sm:p-6 rounded-3xl shadow-sm overflow-hidden flex items-center justify-center min-h-[300px]" id="gantt-chart-static-section">
            {isGeneratingImage ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-indigo-200 dark:border-indigo-900/50 border-t-indigo-600 dark:border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 animate-pulse">Rendering Gantt Chart Image...</p>
              </div>
            ) : staticGanttImage ? (
              <div className="w-full h-full max-h-[75vh] overflow-auto scrollbar-thin flex justify-center">
                <img 
                  src={staticGanttImage} 
                  alt="Static Gantt Chart Export" 
                  className="max-w-max object-contain shadow-sm border border-slate-200/50 dark:border-slate-800/50 rounded-xl"
                />
              </div>
            ) : (
              <p className="text-sm text-slate-500">Failed to render static image. Please refresh the page.</p>
            )}
            
            {/* Hidden DOM element for html2canvas to capture */}
            <div className="absolute top-[-9999px] left-[-9999px] opacity-0 pointer-events-none">
              <GanttTimeline
                tasks={tasks}
                filteredTasks={filteredTasks}
                bounds={bounds}
                zoom={zoom}
                onEditTask={handleEditTaskTrigger}
                onDeleteTask={handleDeleteTask}
                onUpdateTaskDates={handleUpdateTaskDates}
                timelineScrollRef={timelineScrollRef}
                restrictedMode={restrictedMode}
                personnel={personnel}
                onViewTaskDetails={(task) => {
                  setTaskToEdit(task);
                  setIsTaskDetailsOpen(true);
                }}
                isNotifyMode={isNotifyMode}
                selectedTaskIds={selectedTaskIdsForNotify}
              />
            </div>
          </section>
        ) : (
          <section className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 p-4.5 sm:p-6 rounded-3xl shadow-sm" id="gantt-chart-section">
            <GanttTimeline
              tasks={tasks}
              filteredTasks={filteredTasks}
              bounds={bounds}
              zoom={zoom}
              onEditTask={handleEditTaskTrigger}
              onDeleteTask={handleDeleteTask}
              onUpdateTaskDates={handleUpdateTaskDates}
              timelineScrollRef={timelineScrollRef}
              restrictedMode={restrictedMode}
              personnel={personnel}
              onViewTaskDetails={(task) => {
                setTaskToEdit(task);
                setIsTaskDetailsOpen(true);
              }}
              isNotifyMode={isNotifyMode}
              selectedTaskIds={selectedTaskIdsForNotify}
              onToggleTaskSelection={(id) => {
                setSelectedTaskIdsForNotify(prev => 
                  prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
                );
              }}
              onReorderTasks={handleReorderTasks}
            />
          </section>
        )}

        {/* Project Architecture & Design Diagrams Hub */}
        <DiagramsHub
          diagrams={activeProject?.diagrams || []}
          onUpdateDiagrams={handleUpdateDiagrams}
          restrictedMode={restrictedMode}
          isViewerMode={isViewerMode}
          isOwner={isGlobalOwner}
        />

      </main>

      {/* Task Creation & Modification Panel Overlay Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModalResult}
        taskToEdit={taskToEdit}
        allTasks={tasks}
        personnel={personnel}
        restrictedMode={restrictedMode}
        currentUser={currentUser}
        userEmail={session?.user?.email}
        userName={session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0]}
      />

      {/* Task Details Display Modal (Read-Only) */}
      <TaskDetailsModal
        isOpen={isTaskDetailsOpen}
        onClose={() => setIsTaskDetailsOpen(false)}
        task={taskToEdit}
      />

      {/* Personnel Management Modal */}
      <PersonnelModal
        isOpen={isPersonnelOpen}
        onClose={() => setIsPersonnelOpen(false)}
        personnel={personnel}
        onUpdatePersonnel={handleUpdatePersonnel}
        taskAssignees={tasks.flatMap(t => t.assignee)}
        projectName={activeProject?.name || 'Project'}
        isOwner={isGlobalOwner}
      />

      {/* Export Format Selector Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onConfirm={handleExportConfirm}
        defaultFilename={`${activeProject?.name || 'project'}_gantt_chart`}
        projectTitle={`${activeProject?.name || 'Project'} Gantt Chart`}
      />

      {/* User Identity Modal (Keep for custom display name logic if needed, though session handles Auth) */}
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
