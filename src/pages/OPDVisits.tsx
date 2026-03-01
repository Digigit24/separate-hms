// src/pages/OPDVisits.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOpdVisit } from '@/hooks/useOpdVisit';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumn } from '@/components/DataTable';
import OPDVisitFormDrawer from '@/components/OPDVisitFormDrawer';
import {
  Loader2,
  Plus,
  Search,
  Calendar,
  IndianRupee,
  Clock,
  CheckCircle2,
  Stethoscope,
} from 'lucide-react';
import { OpdVisit, OpdVisitListParams } from '@/types/opdVisit.types';
import { format } from 'date-fns';

export const OPDVisits: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasModuleAccess } = useAuth();
  const {
    hasHMSAccess,
    useOpdVisits,
    deleteOpdVisit,
    useOpdVisitStatistics,
  } = useOpdVisit();

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'waiting' | 'in_consultation' | 'completed' | 'cancelled' | ''>('');
  const [currentPage, setCurrentPage] = useState(1);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create'>('view');

  // Build query params
  const queryParams: OpdVisitListParams = {
    page: currentPage,
    search: searchTerm || undefined,
    status: statusFilter || undefined,
  };

  // Fetch visits
  const {
    data: visitsData,
    error: visitsError,
    isLoading: visitsLoading,
    mutate: mutateVisits
  } = useOpdVisits(queryParams);

  // Fetch statistics
  const { data: statistics } = useOpdVisitStatistics();

  const visits = visitsData?.results || [];
  const totalCount = visitsData?.count || 0;
  const hasNext = !!visitsData?.next;
  const hasPrevious = !!visitsData?.previous;

  // Handlers
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status: 'waiting' | 'in_consultation' | 'completed' | 'cancelled' | '') => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleView = (visit: OpdVisit) => {
    const visitIds = visits.map(v => v.id);
    navigate(`/opd/consultation/${visit.id}`, {
      state: { visitIds, from: '/opd/visits' }
    });
  };

  const handleEdit = (visit: OpdVisit) => {
    setSelectedVisitId(visit.id);
    setDrawerMode('edit');
    setDrawerOpen(true);
  };

  const handleCreate = () => {
    setSelectedVisitId(null);
    setDrawerMode('create');
    setDrawerOpen(true);
  };

  const handleDelete = async (visit: OpdVisit) => {
    try {
      await deleteOpdVisit(visit.id);
      mutateVisits();
    } catch (error: any) {
      console.error('Delete failed:', error);
    }
  };

  const handleDrawerSuccess = () => {
    mutateVisits();
  };

  const handleDrawerDelete = () => {
    mutateVisits();
  };

  const handleBilling = (visit: OpdVisit) => {
    // Navigate to consultation route with billing tab active
    const visitIds = visits.map(v => v.id);
    navigate(`/opd/consultation/${visit.id}`, {
      state: { visitIds, from: '/opd/visits', activeTab: 'billing' }
    });
  };

  const handleConsultation = (visit: OpdVisit) => {
    // Pass the list of visit IDs for navigation
    const visitIds = visits.map(v => v.id);
    navigate(`/opd/consultation/${visit.id}`, {
      state: { visitIds, from: '/opd/visits' }
    });
  };

  // Clean patient name - remove "None" parts from full_name
  const cleanName = (name: string | undefined) => {
    if (!name) return undefined;
    return name.replace(/\bNone\b/g, '').replace(/\s+/g, ' ').trim() || undefined;
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
  const columns: DataTableColumn<OpdVisit>[] = [
    {
      header: 'Visit',
      key: 'visit_number',
      className: 'w-[14%]',
      cell: (visit) => (
        <div className="flex flex-col">
          <span className="font-medium font-mono text-sm">{visit.visit_number}</span>
          {visit.queue_number && (
            <Badge variant="outline" className="text-xs w-fit mt-1">Queue #{visit.queue_number}</Badge>
          )}
          <span className="text-xs text-muted-foreground mt-1">
            {formatDateTime(visit.visit_date, visit.visit_time)}
          </span>
        </div>
      ),
    },
    {
      header: 'Patient',
      key: 'patient',
      className: 'w-[20%]',
      cell: (visit) => (
        <div className="flex flex-col">
          <span className="font-medium">{cleanName(visit.patient_details?.full_name) || cleanName(visit.patient_name) || 'N/A'}</span>
          <span className="text-xs text-muted-foreground">
            {visit.patient_details?.patient_id || visit.patient_id || 'N/A'}
            {visit.patient_details?.mobile_primary && ` • ${visit.patient_details.mobile_primary}`}
          </span>
        </div>
      ),
    },
    {
      header: 'Doctor',
      key: 'doctor',
      className: 'w-[20%]',
      cell: (visit) => (
        <div className="flex flex-col">
          <span className="font-medium">{visit.doctor_details?.full_name || visit.doctor_name || 'N/A'}</span>
          <span className="text-xs text-muted-foreground">
            {visit.doctor_details?.specialties?.slice(0, 1).map(s => s.name).join(', ')}
          </span>
        </div>
      ),
    },
    {
      header: 'Type',
      key: 'type',
      className: 'w-[13%]',
      cell: (visit) => (
        <div className="flex flex-col gap-1">
          <Badge variant="secondary" className="text-xs w-fit">
            {visit.visit_type ? visit.visit_type.replace('_', ' ').toUpperCase() : 'N/A'}
          </Badge>
          <Badge
            variant={visit.priority === 'urgent' || visit.priority === 'high' ? 'destructive' : 'outline'}
            className={`text-xs w-fit ${visit.priority === 'high' ? 'bg-neutral-600 dark:bg-neutral-500 text-white' : ''}`}
          >
            {visit.priority ? visit.priority.toUpperCase() : 'NORMAL'}
          </Badge>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      className: 'w-[11%]',
      cell: (visit) => {
        const statusConfig = {
          waiting: { label: 'Waiting', className: 'bg-neutral-600 dark:bg-neutral-500' },
          in_consultation: { label: 'In Consultation', className: 'bg-neutral-800 dark:bg-neutral-300' },
          completed: { label: 'Completed', className: 'bg-neutral-900 dark:bg-neutral-200' },
          cancelled: { label: 'Cancelled', className: 'bg-neutral-500' },
          no_show: { label: 'No Show', className: 'bg-neutral-400 dark:bg-neutral-600' },
        };
        const config = visit.status ? statusConfig[visit.status] : { label: 'Unknown', className: 'bg-neutral-400 dark:bg-neutral-600' };
        return (
          <Badge variant="default" className={`w-fit ${config.className}`}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      header: 'Payment',
      key: 'payment',
      className: 'w-[12%]',
      cell: (visit) => (
        <div className="flex flex-col text-sm">
          <span className="font-medium">₹{visit.total_amount || '0'}</span>
          <Badge
            variant={visit.payment_status === 'paid' ? 'default' : 'secondary'}
            className={`text-xs w-fit ${visit.payment_status === 'paid' ? 'bg-neutral-900 dark:bg-neutral-200' : ''}`}
          >
            {visit.payment_status ? visit.payment_status.replace('_', ' ').toUpperCase() : 'PENDING'}
          </Badge>
        </div>
      ),
    },
  ];

  // Mobile card renderer
  const renderMobileCard = (visit: OpdVisit, actions: any) => {
    return (
      <>
        {/* Header Row */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm font-mono">{visit.visit_number}</h3>
            {visit.queue_number && (
              <Badge variant="outline" className="text-xs mt-1">Queue #{visit.queue_number}</Badge>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {formatDateTime(visit.visit_date, visit.visit_time)}
            </p>
          </div>
          <Badge
            variant="default"
            className={
              visit.status === 'completed'
                ? 'bg-neutral-900 dark:bg-neutral-200'
                : visit.status === 'in_consultation'
                ? 'bg-neutral-800 dark:bg-neutral-300'
                : visit.status === 'waiting'
                ? 'bg-neutral-600 dark:bg-neutral-500'
                : visit.status === 'cancelled' || visit.status === 'no_show'
                ? 'bg-neutral-500'
                : 'bg-neutral-400 dark:bg-neutral-600'
            }
          >
            {visit.status ? visit.status.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
          </Badge>
        </div>

        {/* Patient & Doctor */}
        <div className="space-y-1">
          <div className="text-sm">
            <span className="text-muted-foreground">Patient: </span>
            <span className="font-medium">{cleanName(visit.patient_details?.full_name) || cleanName(visit.patient_name) || 'N/A'}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Doctor: </span>
            <span className="font-medium">{visit.doctor_details?.full_name || visit.doctor_name || 'N/A'}</span>
          </div>
        </div>

        {/* Details Row */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs">
            {visit.visit_type ? visit.visit_type.replace('_', ' ').toUpperCase() : 'N/A'}
          </Badge>
          <Badge
            variant={visit.priority === 'urgent' || visit.priority === 'high' ? 'destructive' : 'outline'}
            className={`text-xs ${visit.priority === 'high' ? 'bg-neutral-600 dark:bg-neutral-500 text-white' : ''}`}
          >
            {visit.priority ? visit.priority.toUpperCase() : 'NORMAL'}
          </Badge>
          <Badge
            variant={visit.payment_status === 'paid' ? 'default' : 'secondary'}
            className={`text-xs ${visit.payment_status === 'paid' ? 'bg-neutral-900 dark:bg-neutral-200' : ''}`}
          >
            ₹{visit.total_amount || '0'} • {visit.payment_status ? visit.payment_status.replace('_', ' ').toUpperCase() : 'PENDING'}
          </Badge>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleBilling(visit);
            }}
            className="flex-1"
          >
            <IndianRupee className="h-3.5 w-3.5 mr-1.5" />
            Billing
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleConsultation(visit);
            }}
            className="flex-1"
          >
            <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
            Consult
          </Button>
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
          <h1 className="text-lg font-bold leading-none">OPD Visits</h1>
          <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> <span className="font-semibold text-foreground">{totalCount}</span> total</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> <span className="font-semibold text-foreground">{statistics?.waiting_patients || 0}</span> waiting</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> <span className="font-semibold text-foreground">{statistics?.today_visits || 0}</span> today</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" /> <span className="font-semibold text-foreground">₹{statistics?.revenue_today || '0'}</span></span>
          </div>
        </div>
        <Button onClick={handleCreate} size="sm" className="w-full sm:w-auto h-7 text-[12px]">
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Visit
        </Button>
      </div>

      {/* Mobile-only stats (hidden on desktop since they're inline above) */}
      <div className="flex sm:hidden items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span><span className="font-semibold text-foreground">{totalCount}</span> total</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{statistics?.waiting_patients || 0}</span> waiting</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{statistics?.today_visits || 0}</span> today</span>
        <span className="text-border">|</span>
        <span>₹<span className="font-semibold text-foreground">{statistics?.revenue_today || '0'}</span></span>
      </div>

      {/* Row 2: Search + filters on same line */}
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
            { value: 'waiting', label: 'Waiting' },
            { value: 'in_consultation', label: 'Consulting' },
            { value: 'completed', label: 'Done' },
          ].map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-[11px] px-2"
              onClick={() => handleStatusFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Visits Table */}
      <Card>
        <CardContent className="p-0">
          {visitsError ? (
            <div className="p-8 text-center">
              <p className="text-destructive">{visitsError.message}</p>
            </div>
          ) : (
            <>
              {visitsLoading && <div className="flex justify-end px-4 py-2"><Loader2 className="h-4 w-4 animate-spin" /></div>}
              <DataTable
                rows={visits}
                isLoading={visitsLoading}
                columns={columns}
                renderMobileCard={renderMobileCard}
                getRowId={(visit) => visit.id}
                getRowLabel={(visit) => visit.visit_number}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onConsultation={handleConsultation}
                onBilling={handleBilling}
                emptyTitle="No visits found"
                emptySubtitle="Try adjusting your search or filters, or create a new visit"
              />

              {/* Pagination */}
              {!visitsLoading && visits.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {visits.length} of {totalCount} visit(s)
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

      {/* Drawer */}
      <OPDVisitFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        visitId={selectedVisitId}
        mode={drawerMode}
        onSuccess={handleDrawerSuccess}
        onDelete={handleDrawerDelete}
        onModeChange={(newMode) => setDrawerMode(newMode)}
      />
    </div>
  );
};

export default OPDVisits;
