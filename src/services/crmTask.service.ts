// src/services/crmTask.service.ts
import { crmClient } from '@/lib/client';
import { API_CONFIG, buildQueryString } from '@/lib/apiConfig';
import type {
  CRMTask,
  CRMTaskFormData,
  CRMTaskFilters,
  TaskStatus,
} from '@/types/crmTask.types';

interface PaginatedTaskResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CRMTask[];
}

class CRMTaskService {
  async getTasks(params?: CRMTaskFilters): Promise<PaginatedTaskResponse> {
    try {
      const queryString = buildQueryString(params);
      const response = await crmClient.get<PaginatedTaskResponse>(
        `${API_CONFIG.CRM.TASKS.LIST}${queryString}`
      );
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to fetch tasks';
      throw new Error(message);
    }
  }

  async getTask(id: number): Promise<CRMTask> {
    try {
      const response = await crmClient.get<any>(
        API_CONFIG.CRM.TASKS.DETAIL.replace(':id', id.toString())
      );
      return response.data?.data || response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to fetch task';
      throw new Error(message);
    }
  }

  async createTask(data: CRMTaskFormData): Promise<CRMTask> {
    try {
      const response = await crmClient.post<CRMTask>(
        API_CONFIG.CRM.TASKS.CREATE,
        data
      );
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to create task';
      throw new Error(message);
    }
  }

  async updateTask(id: number, data: Partial<CRMTaskFormData>): Promise<CRMTask> {
    try {
      const response = await crmClient.patch<CRMTask>(
        API_CONFIG.CRM.TASKS.UPDATE.replace(':id', id.toString()),
        data
      );
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to update task';
      throw new Error(message);
    }
  }

  async updateTaskStatus(id: number, status: TaskStatus): Promise<CRMTask> {
    return this.updateTask(id, { status });
  }

  async deleteTask(id: number): Promise<void> {
    try {
      await crmClient.delete(
        API_CONFIG.CRM.TASKS.DELETE.replace(':id', id.toString())
      );
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to delete task';
      throw new Error(message);
    }
  }
}

export const crmTaskService = new CRMTaskService();
