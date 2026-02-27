// src/pages/CRMTasks.tsx
import { useState, useCallback } from 'react';
import { Loader2, AlertCircle, Plus, Search, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCRMTask } from '@/hooks/useCRMTask';
import { TaskKanbanBoard } from '@/components/TaskKanbanBoard';
import type { CRMTask, TaskStatus, TaskPriority } from '@/types/crmTask.types';

export function CRMTasks() {
  const { toast } = useToast();
  const { useTasks, updateTaskStatus, deleteTask } = useCRMTask();

  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const { data: tasksData, isLoading, error: fetchError, mutate } = useTasks({
    search: searchQuery || undefined,
    priority: priorityFilter !== 'all' ? (priorityFilter as TaskPriority) : undefined,
  });

  const tasks = tasksData?.results || [];

  const handleStatusChange = useCallback(
    async (taskId: number, newStatus: TaskStatus) => {
      // Optimistic update
      const previousTasks = tasksData;
      if (tasksData) {
        mutate(
          {
            ...tasksData,
            results: tasksData.results.map((t) =>
              t.id === taskId ? { ...t, status: newStatus } : t
            ),
          },
          false
        );
      }

      try {
        await updateTaskStatus(taskId, newStatus);
        mutate();
      } catch {
        // Revert on failure
        if (previousTasks) mutate(previousTasks, false);
        toast({
          title: 'Error',
          description: 'Failed to update task status.',
          variant: 'destructive',
        });
      }
    },
    [tasksData, mutate, updateTaskStatus, toast]
  );

  const handleEdit = useCallback((task: CRMTask) => {
    toast({
      title: 'Edit task',
      description: `Editing: ${task.title}`,
    });
  }, [toast]);

  const handleDelete = useCallback(
    async (task: CRMTask) => {
      try {
        await deleteTask(task.id);
        mutate();
        toast({ title: 'Task deleted', description: `"${task.title}" has been deleted.` });
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to delete task.',
          variant: 'destructive',
        });
      }
    },
    [deleteTask, mutate, toast]
  );

  if (fetchError) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <p className="text-sm text-muted-foreground">Failed to load tasks</p>
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h1 className="text-lg font-semibold">Tasks</h1>
          <p className="text-xs text-muted-foreground">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 py-3 border-b bg-muted/20">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <Filter className="h-3 w-3 mr-1.5" />
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <TaskKanbanBoard
            tasks={tasks}
            onStatusChange={handleStatusChange}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}

export default CRMTasks;
