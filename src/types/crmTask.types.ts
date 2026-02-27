// src/types/crmTask.types.ts

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface CRMTask {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to?: string;
  assigned_to_name?: string;
  due_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  lead_id?: number | null;
  lead_name?: string;
  tags?: string[];
}

export interface CRMTaskFormData {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to?: string;
  due_date?: string;
  lead_id?: number | null;
  tags?: string[];
}

export interface CRMTaskFilters {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string;
  page?: number;
  page_size?: number;
}
