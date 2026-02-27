// src/components/TaskKanbanBoard.tsx
import { useCallback, useMemo } from 'react';
import {
  DragDropContext,
  Droppable,
  type DropResult,
} from '@hello-pangea/dnd';
import {
  ListTodo,
  PlayCircle,
  Eye,
  CheckCircle,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskKanbanCard } from '@/components/TaskKanbanCard';
import type { CRMTask, TaskStatus } from '@/types/crmTask.types';

interface KanbanColumn {
  id: TaskStatus;
  label: string;
  icon: typeof ListTodo;
  headerClass: string;
  countClass: string;
}

const columns: KanbanColumn[] = [
  {
    id: 'todo',
    label: 'To Do',
    icon: ListTodo,
    headerClass: 'border-t-blue-500',
    countClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    icon: PlayCircle,
    headerClass: 'border-t-yellow-500',
    countClass: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  {
    id: 'review',
    label: 'Review',
    icon: Eye,
    headerClass: 'border-t-purple-500',
    countClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  {
    id: 'done',
    label: 'Done',
    icon: CheckCircle,
    headerClass: 'border-t-green-500',
    countClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
];

interface TaskKanbanBoardProps {
  tasks: CRMTask[];
  onStatusChange?: (taskId: number, newStatus: TaskStatus) => void;
  onEdit?: (task: CRMTask) => void;
  onDelete?: (task: CRMTask) => void;
}

export function TaskKanbanBoard({ tasks, onStatusChange, onEdit, onDelete }: TaskKanbanBoardProps) {
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, CRMTask[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };
    for (const task of tasks) {
      const status = grouped[task.status] ? task.status : 'todo';
      grouped[status].push(task);
    }
    return grouped;
  }, [tasks]);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { draggableId, destination } = result;
      if (!destination) return;

      const newStatus = destination.droppableId as TaskStatus;
      const taskId = Number(draggableId);

      if (onStatusChange) {
        onStatusChange(taskId, newStatus);
      }
    },
    [onStatusChange],
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 h-full">
        {columns.map((column) => {
          const columnTasks = tasksByStatus[column.id];
          const ColumnIcon = column.icon;

          return (
            <div
              key={column.id}
              className={`flex flex-col rounded-lg border border-border bg-muted/30 border-t-2 ${column.headerClass}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <ColumnIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{column.label}</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${column.countClass}`}>
                  {columnTasks.length}
                </span>
              </div>

              {/* Column Content */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 min-h-[200px] p-2 transition-colors ${
                      snapshot.isDraggingOver ? 'bg-primary/5' : ''
                    }`}
                  >
                    <ScrollArea className="h-full">
                      {columnTasks.map((task, index) => (
                        <TaskKanbanCard
                          key={task.id}
                          task={task}
                          index={index}
                          onEdit={onEdit}
                          onDelete={onDelete}
                        />
                      ))}
                      {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
                          No tasks
                        </div>
                      )}
                      {provided.placeholder}
                    </ScrollArea>
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
