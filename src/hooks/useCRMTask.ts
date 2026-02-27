// src/hooks/useCRMTask.ts
import { useState } from 'react';
import useSWR from 'swr';
import { crmTaskService } from '@/services/crmTask.service';
import type {
  CRMTask,
  CRMTaskFormData,
  CRMTaskFilters,
  TaskStatus,
} from '@/types/crmTask.types';
import { useAuth } from './useAuth';

export const useCRMTask = () => {
  const { hasModuleAccess } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasCRMAccess = hasModuleAccess('crm');

  const useTasks = (params?: CRMTaskFilters) => {
    const key = hasCRMAccess ? ['crm-tasks', params] : null;

    return useSWR(
      key,
      () => crmTaskService.getTasks(params),
      {
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        shouldRetryOnError: false,
        keepPreviousData: true,
        onError: (err) => {
          console.error('Failed to fetch CRM tasks:', err);
          setError(err.message || 'Failed to fetch tasks');
        },
      }
    );
  };

  const createTask = async (data: CRMTaskFormData): Promise<CRMTask> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await crmTaskService.createTask(data);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTask = async (id: number, data: Partial<CRMTaskFormData>): Promise<CRMTask> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await crmTaskService.updateTask(id, data);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTaskStatus = async (id: number, status: TaskStatus): Promise<CRMTask> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await crmTaskService.updateTaskStatus(id, status);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTask = async (id: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await crmTaskService.deleteTask(id);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    hasCRMAccess,
    isLoading,
    error,
    useTasks,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
  };
};
