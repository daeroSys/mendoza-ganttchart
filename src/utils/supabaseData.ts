import { supabase } from './supabaseClient';
import { Project, Task, ProjectDiagram, ProjectDocument, ActivityLog } from '../types';

// Helper to map DB task to Frontend task
export const mapDbTask = (dbTask: any): Task => ({
  id: dbTask.id,
  name: dbTask.name,
  startDate: dbTask.start_date,
  endDate: dbTask.end_date,
  progress: dbTask.progress,
  priority: dbTask.priority,
  assignee: dbTask.assignee || [],
  color: dbTask.color,
  dependencies: dbTask.dependencies || [],
  sortOrder: dbTask.sort_order || 0,
  description: dbTask.description,
  parentId: dbTask.parent_id || undefined
});

// Helper to map Frontend task to DB task
export const mapTaskToDb = (task: Task, projectId: string) => ({
  id: task.id,
  project_id: projectId,
  name: task.name,
  start_date: task.startDate,
  end_date: task.endDate,
  progress: task.progress,
  priority: task.priority,
  assignee: task.assignee,
  color: task.color,
  dependencies: task.dependencies,
  sort_order: task.sortOrder || 0,
  description: task.description,
  parent_id: task.parentId || null
});

export const fetchAllProfiles = async (): Promise<{ id: string, email: string, full_name: string }[]> => {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) {
    console.error('Error fetching profiles:', error);
    return [];
  }
  return data || [];
};

export const fetchAllProjects = async (): Promise<Project[]> => {
  const [projectsRes, tasksRes] = await Promise.all([
    supabase.from('projects').select('*'),
    supabase.from('tasks').select('*')
  ]);

  if (projectsRes.error) {
    console.error('Error fetching projects:', projectsRes.error);
    return [];
  }

  const allTasks = tasksRes.data || [];

  return projectsRes.data.map(p => {
    const projectTasks = allTasks.filter(t => t.project_id === p.id);
    
    return {
      id: p.id,
      name: p.name,
      createdAt: p.created_at,
      tag: p.tag,
      tasks: projectTasks.map(mapDbTask),
      personnel: p.personnel || [],
      availableRoles: p.available_roles || [],
      roles: p.roles || {},
      logs: [],
      diagrams: [],
      documents: (p.documents || []) as ProjectDocument[],
      shareToken: p.share_token,
      collaborators: p.collaborators || []
    };
  });
};

export const fetchProjectDetails = async (projectId: string): Promise<Project | null> => {
  const [projRes, tasksRes, logsRes, diagramsRes, profilesRes] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).single(),
    supabase.from('tasks').select('*').eq('project_id', projectId),
    supabase.from('activity_logs').select('*').eq('project_id', projectId).order('timestamp', { ascending: false }),
    supabase.from('project_diagrams').select('*').eq('project_id', projectId),
    supabase.from('profiles').select('id, email, full_name')
  ]);

  if (projRes.error) {
    console.error('Error fetching project:', projRes.error);
    return null;
  }

  const profiles = profilesRes.data || [];

  const result: Project = {
    id: projRes.data.id,
    name: projRes.data.name,
    createdAt: projRes.data.created_at,
    tag: projRes.data.tag,
    personnel: projRes.data.personnel || [],
    availableRoles: projRes.data.available_roles || [],
    roles: projRes.data.roles || {},
    shareToken: projRes.data.share_token,
    collaborators: projRes.data.collaborators || [],
    tasks: (tasksRes.data || []).map(mapDbTask),
    logs: (logsRes.data || []).map((l: any) => {
      const profile = profiles.find(p => p.id === l.user_id);
      let userName = l.user_id;
      if (profile) {
        userName = profile.full_name || profile.email.split('@')[0];
      }
      return {
        id: l.id,
        timestamp: l.timestamp,
        user: userName,
        actionType: l.action_type,
        details: l.details
      };
    }),
    diagrams: (diagramsRes.data || []).map((d: any) => ({
      id: d.id,
      title: d.title,
      imageUrl: d.image_url,
      description: d.description,
      type: d.type || 'image',
      mermaidCode: d.mermaid_code || undefined,
    })),
    documents: (projRes.data.documents || []) as ProjectDocument[],
    logoUrl: undefined,
  };

  const logoArray = projRes.data.roles?.['__PROJECT_LOGO__'];
  if (Array.isArray(logoArray) && logoArray.length > 0) {
    result.logoUrl = logoArray[0];
    delete result.roles['__PROJECT_LOGO__']; // Hide it from actual roles list
  }
  
  return result;
};

export const createProject = async (name: string, tag: string, ownerId: string, availableRoles: string[] = []): Promise<Project | null> => {
  const { data, error } = await supabase.from('projects').insert([{
    name,
    tag,
    owner_id: ownerId,
    available_roles: availableRoles,
    roles: {}
  }]).select().single();

  if (error) {
    console.error('Error creating project:', error);
    return null;
  }

  // Also insert default diagrams
  const defaultDiagrams = [
    {
      id: `diag-flowchart-${Date.now()}`,
      project_id: data.id,
      title: 'Flowchart',
      image_url: '',
      description: 'System-level architecture showing process flow and data routing logic between cellular clients and core nodes.'
    },
    {
      id: `diag-dfd-${Date.now()}`,
      project_id: data.id,
      title: 'DFD',
      image_url: '',
      description: 'Data Flow Diagram highlighting data exchange checkpoints from user interfaces, SMS relay gateways, and smart contracts.'
    },
    {
      id: `diag-erd-${Date.now()}`,
      project_id: data.id,
      title: 'ERD',
      image_url: '',
      description: 'Entity Relationship Diagram describing metadata tables, task fields, activity trace logs, and database linkages.'
    }
  ];
  await supabase.from('project_diagrams').insert(defaultDiagrams);

  return {
    id: data.id,
    name: data.name,
    createdAt: data.created_at,
    tag: data.tag,
    tasks: [],
    personnel: [],
    availableRoles: data.available_roles || [],
    roles: data.roles || {},
    shareToken: data.share_token,
    collaborators: data.collaborators || [],
    logs: [],
    diagrams: defaultDiagrams.map(d => ({
      id: d.id,
      title: d.title,
      imageUrl: d.image_url,
      description: d.description
    }))
  };
};

export const deleteProject = async (id: string) => {
  await supabase.from('projects').delete().eq('id', id);
};

export const updateProjectDetails = async (id: string, name: string, tag: string) => {
  await supabase.from('projects').update({ name, tag }).eq('id', id);
};
