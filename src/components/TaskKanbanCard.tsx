// src/components/TaskKanbanCard.tsx
import { useMemo } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { format, formatDistanceToNow, isValid } from 'date-fns';
import {
  Calendar,
  User,
  AlertCircle,
  Clock,
  CheckCircle2,
  MoreVertical,
  Tag,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { CRMTask, TaskPriority } from '@/types/crmTask.types';

interface TaskKanbanCardProps {
  task: CRMTask;
  index: number;
  onEdit?: (task: CRMTask) => void;
  onDelete?: (task: CRMTask) => void;
}

const priorityConfig: Record<TaskPriority, { label: string; className: string; icon: typeof AlertCircle }> = {
  urgent: {
    label: 'Urgent',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    icon: AlertCircle,
  },
  high: {
    label: 'High',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    icon: AlertCircle,
  },
  medium: {
    label: 'Medium',
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    icon: Clock,
  },
  low: {
    label: 'Low',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    icon: CheckCircle2,
  },
};

/**
 * Safely parse and format a date string.
 * Returns null if the date is invalid, preventing RangeError: Invalid time value.
 */
function safeParseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (!isValid(date)) return null;
    return date;
  } catch {
    return null;
  }
}

/**
 * Safely format a date string using date-fns format().
 * Falls back to a readable fallback string on invalid input.
 */
function safeFormatDate(dateStr: string | null | undefined, formatStr: string = 'dd MMM yyyy'): string {
  const date = safeParseDate(dateStr);
  if (!date) return '';
  try {
    return format(date, formatStr);
  } catch {
    return '';
  }
}

/**
 * Safely compute relative time (e.g. "2 days ago") from a date string.
 */
function safeFormatRelative(dateStr: string | null | undefined): string {
  const date = safeParseDate(dateStr);
  if (!date) return '';
  try {
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return '';
  }
}

/**
 * Check if a due date is overdue (in the past).
 */
function isOverdue(dateStr: string | null | undefined): boolean {
  const date = safeParseDate(dateStr);
  if (!date) return false;
  return date < new Date();
}

export function TaskKanbanCard({ task, index, onEdit, onDelete }: TaskKanbanCardProps) {
  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const PriorityIcon = priority.icon;

  const dueDateDisplay = useMemo(() => safeFormatDate(task.due_date, 'dd MMM'), [task.due_date]);
  const dueDateRelative = useMemo(() => safeFormatRelative(task.due_date), [task.due_date]);
  const overdue = useMemo(() => task.status !== 'done' && isOverdue(task.due_date), [task.due_date, task.status]);

  return (
    <Draggable draggableId={String(task.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="mb-2"
        >
          <Card
            className={`group transition-all duration-150 border ${
              snapshot.isDragging
                ? 'shadow-lg ring-2 ring-primary/30 rotate-1'
                : 'hover:shadow-md hover:border-primary/30'
            }`}
          >
            <CardContent className="p-3 space-y-2">
              {/* Header: Priority + Actions */}
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${priority.className}`}>
                  <PriorityIcon className="h-3 w-3 mr-1" />
                  {priority.label}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32">
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(task)} className="text-xs">
                        Edit
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem
                        onClick={() => onDelete(task)}
                        className="text-xs text-red-600 dark:text-red-400"
                      >
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Title */}
              <p className="text-sm font-medium leading-tight line-clamp-2">{task.title}</p>

              {/* Description */}
              {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
              )}

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {task.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {tag}
                    </span>
                  ))}
                  {task.tags.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{task.tags.length - 3}</span>
                  )}
                </div>
              )}

              {/* Footer: Due date + Assignee */}
              <div className="flex items-center justify-between pt-1 border-t border-border/50">
                {dueDateDisplay ? (
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] ${
                      overdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'
                    }`}
                    title={dueDateRelative || undefined}
                  >
                    <Calendar className="h-3 w-3" />
                    {dueDateDisplay}
                    {overdue && <span className="text-[10px]">(overdue)</span>}
                  </span>
                ) : (
                  <span />
                )}

                {task.assigned_to_name && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span className="truncate max-w-[80px]">{task.assigned_to_name}</span>
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
}
