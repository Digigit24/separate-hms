// src/pages/Appointments.tsx
import React, { useState } from 'react';
import { useAppointment } from '@/hooks/useAppointment';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, DataTableColumn } from '@/components/DataTable';
import AppointmentFormDrawer from '@/components/AppointmentFormDrawer';
import AppointmentCalendarView from '@/components/AppointmentCalendarView';
import AppointmentTypes from '@/components/AppointmentTypes';
import { formatCurrency } from '@/lib/currencyConfig';
import {
  Loader2,
  Plus,
  Search,
  Calendar,
  IndianRupee,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  List,
  CalendarDays,
  Tag,
} from 'lucide-react';
import { Appointment, AppointmentListParams } from '@/types/appointment.types';
import { format } from 'date-fns';

export const Appointments: React.FC = () => {
  const { user, hasModuleAccess } = useAuth();
  const {
    hasHMSAccess,
    useAppointments,
    deleteAppointment,
    useAppointmentStatistics,
  } = useAppointment();

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [activeTab, setActiveTab] = useState<'appointments' | 'types'>('appointments');

  // Debug logging
  console.log('Appointments component rendering...');
  console.log('HMS Access:', hasHMSAccess);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create'>('view');

  // Build query params
  const queryParams: AppointmentListParams = {
    page: currentPage,
    search: searchTerm || undefined,
    status: statusFilter || undefined,
  };

  // Fetch appointments
  const {
    data: appointmentsData,
    error: appointmentsError,
    isLoading: appointmentsLoading,
    mutate: mutateAppointments
  } = useAppointments(queryParams);

  // Fetch statistics
  const { data: statistics } = useAppointmentStatistics();

  const appointments = appointmentsData?.results || [];
  const totalCount = appointmentsData?.count || 0;
  const hasNext = !!appointmentsData?.next;
  const hasPrevious = !!appointmentsData?.previous;

  // Debug logging
  console.log('Appointments data:', { appointments, totalCount, isLoading: appointmentsLoading, error: appointmentsError });

  // Handlers
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page
  };

  const handleStatusFilter = (status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | '') => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleView = (appointment: Appointment) => {
    setSelectedAppointmentId(appointment.id);
    setDrawerMode('view');
    setDrawerOpen(true);
  };

  const handleEdit = (appointment: Appointment) => {
    setSelectedAppointmentId(appointment.id);
    setDrawerMode('edit');
    setDrawerOpen(true);
  };

  const handleCreate = () => {
    setSelectedAppointmentId(null);
    setDrawerMode('create');
    setDrawerOpen(true);
  };

  const handleDelete = async (appointment: Appointment) => {
    try {
      await deleteAppointment(appointment.id);
      mutateAppointments();
    } catch (error: any) {
      console.error('Delete failed:', error);
    }
  };

  const handleDrawerSuccess = () => {
    mutateAppointments();
  };

  const handleDrawerDelete = () => {
    mutateAppointments();
  };

  // Format date and time for display
  const formatDateTime = (date: string, time: string) => {
    try {
      const dateTime = new Date(`${date}T${time}`);
      return format(dateTime, 'MMM dd, yyyy • hh:mm a');
    } catch {
      return `${date} • ${time}`;
    }
  };

  // DataTable columns configuration
  const columns: DataTableColumn<Appointment>[] = [
    {
      header: 'Appointment',
      key: 'appointment_number',
      cell: (appointment) => (
        <div className="flex flex-col">
          <span className="font-medium font-mono text-sm">{appointment.appointment_number}</span>
          <span className="text-xs text-muted-foreground">
            {formatDateTime(appointment.appointment_date, appointment.appointment_time)}
          </span>
        </div>
      ),
    },
    {
      header: 'Doctor',
      key: 'doctor',
      cell: (appointment) => (
        <div className="flex flex-col">
          <span className="font-medium">{appointment.doctor?.full_name || 'N/A'}</span>
          <span className="text-xs text-muted-foreground">
            {appointment.doctor?.specialties?.slice(0, 2).map(s => s.name).join(', ')}
          </span>
        </div>
      ),
    },
    {
      header: 'Patient',
      key: 'patient',
      cell: (appointment) => (
        <div className="flex flex-col">
          <span className="font-medium">{appointment.patient?.full_name || 'N/A'}</span>
          <span className="text-xs text-muted-foreground">{appointment.patient?.phone}</span>
        </div>
      ),
    },
    {
      header: 'Type',
      key: 'type',
      cell: (appointment) => (
        <Badge variant="secondary" className="text-xs">
          {appointment.appointment_type?.replace('_', ' ').toUpperCase() || 'N/A'}
        </Badge>
      ),
    },
    {
      header: 'Mode',
      key: 'mode',
      cell: (appointment) => (
        <Badge variant={appointment.consultation_mode === 'online' ? 'default' : 'outline'} className="text-xs">
          {appointment.consultation_mode?.toUpperCase() || 'N/A'}
        </Badge>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      cell: (appointment) => {
        const statusConfig = {
          scheduled: { label: 'Scheduled', className: 'bg-neutral-800 dark:bg-neutral-300' },
          confirmed: { label: 'Confirmed', className: 'bg-neutral-700 dark:bg-neutral-400' },
          in_progress: { label: 'In Progress', className: 'bg-neutral-600 dark:bg-neutral-500' },
          completed: { label: 'Completed', className: 'bg-neutral-900 dark:bg-neutral-200' },
          cancelled: { label: 'Cancelled', className: 'bg-neutral-500' },
          no_show: { label: 'No Show', className: 'bg-neutral-400 dark:bg-neutral-600' },
        };
        const config = statusConfig[appointment.status];
        return (
          <Badge variant="default" className={config.className}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      header: 'Payment',
      key: 'payment',
      cell: (appointment) => (
        <div className="flex flex-col text-sm">
          <span className="font-medium">{formatCurrency(appointment.fee_amount ?? 0)}</span>
          <Badge
            variant={appointment.payment_status === 'paid' ? 'default' : 'secondary'}
            className={`text-xs ${appointment.payment_status === 'paid' ? 'bg-neutral-900 dark:bg-neutral-200' : ''}`}
          >
            {appointment.payment_status?.replace('_', ' ').toUpperCase() || 'N/A'}
          </Badge>
        </div>
      ),
    },
  ];

  // Mobile card renderer
  const renderMobileCard = (appointment: Appointment, actions: any) => {
    return (
      <>
        {/* Header Row */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm font-mono">{appointment.appointment_number}</h3>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(appointment.appointment_date, appointment.appointment_time)}
            </p>
          </div>
          <Badge
            variant="default"
            className={
              appointment.status === 'completed'
                ? 'bg-neutral-900 dark:bg-neutral-200'
                : appointment.status === 'in_progress'
                ? 'bg-neutral-600 dark:bg-neutral-500'
                : appointment.status === 'confirmed'
                ? 'bg-neutral-700 dark:bg-neutral-400'
                : appointment.status === 'cancelled' || appointment.status === 'no_show'
                ? 'bg-neutral-500'
                : 'bg-neutral-800 dark:bg-neutral-300'
            }
          >
            {appointment.status?.replace('_', ' ').toUpperCase() || 'N/A'}
          </Badge>
        </div>

        {/* Doctor & Patient */}
        <div className="space-y-1">
          <div className="text-sm">
            <span className="text-muted-foreground">Doctor: </span>
            <span className="font-medium">{appointment.doctor?.full_name}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Patient: </span>
            <span className="font-medium">{appointment.patient?.full_name}</span>
          </div>
        </div>

        {/* Details Row */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs">
            {appointment.appointment_type?.replace('_', ' ').toUpperCase() || 'N/A'}
          </Badge>
          <Badge variant={appointment.consultation_mode === 'online' ? 'default' : 'outline'} className="text-xs">
            {appointment.consultation_mode?.toUpperCase() || 'N/A'}
          </Badge>
          <Badge
            variant={appointment.payment_status === 'paid' ? 'default' : 'secondary'}
            className={`text-xs ${appointment.payment_status === 'paid' ? 'bg-neutral-900 dark:bg-neutral-200' : ''}`}
          >
            {formatCurrency(appointment.fee_amount ?? 0)} • {appointment.payment_status?.replace('_', ' ').toUpperCase() || 'N/A'}
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {actions.view && (
            <Button size="sm" variant="outline" onClick={actions.view} className="flex-1">
              View
            </Button>
          )}
          {actions.edit && (
            <Button size="sm" variant="outline" onClick={actions.edit} className="flex-1">
              Edit
            </Button>
          )}
          {actions.askDelete && (
            <Button size="sm" variant="destructive" onClick={actions.askDelete}>
              Delete
            </Button>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="p-4 md:p-5 w-full space-y-3">
      {/* Row 1: Title + inline stats + action */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-lg font-bold leading-none">Appointments</h1>
          <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> <span className="font-semibold text-foreground">{totalCount}</span> total</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> <span className="font-semibold text-foreground">{statistics?.upcoming_count || 0}</span> upcoming</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> <span className="font-semibold text-foreground">{appointments.filter((a) => a.status === 'completed').length}</span> completed</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" /> <span className="font-semibold text-foreground">{appointments.filter((a) => a.payment_status === 'pending').length}</span> unpaid</span>
          </div>
        </div>
        {activeTab === 'appointments' && (
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="flex border rounded-lg p-0.5">
              <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="h-7 text-[11px] px-2 gap-1">
                <List className="h-3 w-3" />
                <span className="hidden sm:inline">List</span>
              </Button>
              <Button variant={viewMode === 'calendar' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('calendar')} className="h-7 text-[11px] px-2 gap-1">
                <CalendarDays className="h-3 w-3" />
                <span className="hidden sm:inline">Calendar</span>
              </Button>
            </div>
            <Button onClick={handleCreate} size="sm" className="flex-1 sm:flex-initial h-7 text-[12px]">
              <Plus className="h-3.5 w-3.5 mr-1" />
              New
            </Button>
          </div>
        )}
      </div>

      {/* Mobile-only stats */}
      <div className="flex sm:hidden items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span><span className="font-semibold text-foreground">{totalCount}</span> total</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{statistics?.upcoming_count || 0}</span> upcoming</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{appointments.filter((a) => a.status === 'completed').length}</span> done</span>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'appointments' | 'types')}>
        <TabsList className="grid w-full max-w-xs grid-cols-2 h-8">
          <TabsTrigger value="appointments" className="gap-1.5 text-[12px] h-7">
            <Calendar className="h-3 w-3" />
            Appointments
          </TabsTrigger>
          <TabsTrigger value="types" className="gap-1.5 text-[12px] h-7">
            <Tag className="h-3 w-3" />
            Types
          </TabsTrigger>
        </TabsList>

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="space-y-3 mt-3">

      {/* Search + filters */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative w-full sm:w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={handleSearch}
            className="pl-8 h-7 text-[12px]"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {[
            { value: '', label: 'All' },
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Done' },
          ].map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-[11px] px-2"
              onClick={() => handleStatusFilter(f.value as any)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Appointments View - List or Calendar */}
      {viewMode === 'list' ? (
        <Card>
          <CardContent className="p-0">
            {appointmentsError ? (
              <div className="p-8 text-center">
                <p className="text-destructive">{appointmentsError.message}</p>
              </div>
            ) : (
              <>
                {appointmentsLoading && <div className="flex justify-end px-4 py-2"><Loader2 className="h-4 w-4 animate-spin" /></div>}
                <DataTable
                  rows={appointments}
                  isLoading={appointmentsLoading}
                  columns={columns}
                  renderMobileCard={renderMobileCard}
                  getRowId={(appointment) => appointment.id}
                  getRowLabel={(appointment) => appointment.appointment_number}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  emptyTitle="No appointments found"
                  emptySubtitle="Try adjusting your search or filters, or create a new appointment"
                />

                {/* Pagination */}
                {!appointmentsLoading && appointments.length > 0 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing {appointments.length} of {totalCount} appointment(s)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!hasPrevious}
                        onClick={() => setCurrentPage((p) => p - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!hasNext}
                        onClick={() => setCurrentPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <AppointmentCalendarView
          appointments={appointments}
          onAppointmentClick={handleView}
          isLoading={appointmentsLoading}
        />
      )}
        </TabsContent>

        {/* Appointment Types Tab */}
        <TabsContent value="types" className="mt-6">
          <AppointmentTypes />
        </TabsContent>
      </Tabs>

      {/* Drawer */}
      <AppointmentFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        appointmentId={selectedAppointmentId}
        mode={drawerMode}
        onSuccess={handleDrawerSuccess}
        onDelete={handleDrawerDelete}
        onModeChange={(newMode) => setDrawerMode(newMode)}
      />
    </div>
  );
};

export default Appointments;
