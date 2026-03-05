// src/pages/opd-production/FollowUps.tsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOpdVisit } from '@/hooks/useOpdVisit';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumn } from '@/components/DataTable';
import {
  Loader2,
  Search,
  Calendar,
  Phone,
  Stethoscope,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CalendarPlus,
} from 'lucide-react';
import { OpdVisit, OpdVisitListParams } from '@/types/opdVisit.types';
import { format, isToday, isBefore, startOfDay } from 'date-fns';
import { toast } from 'sonner';

type FollowUpFilter = 'all' | 'today' | 'overdue' | 'upcoming' | 'completed';

export const FollowUps: React.FC = () => {
  const navigate = useNavigate();
  const { useOpdVisits, patchOpdVisit } = useOpdVisit();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FollowUpFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingVisitId, setEditingVisitId] = useState<number | null>(null);
  const [followUpDateInput, setFollowUpDateInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch visits — use follow_up_required param if backend supports it,
  // otherwise we filter client-side as a fallback
  const queryParams: OpdVisitListParams = {
    page: currentPage,
    search: searchTerm || undefined,
    follow_up_required: true,
  };

  const {
    data: visitsData,
    error: visitsError,
    isLoading: visitsLoading,
    mutate: mutateVisits,
  } = useOpdVisits(queryParams);

  // Filter client-side to ensure only follow-up visits are shown
  // (in case backend ignores the follow_up_required param)
  const allVisits = (visitsData?.results || []).filter(v => v.follow_up_required);
  const totalCount = visitsData?.count || 0;
  const hasNext = !!visitsData?.next;
  const hasPrevious = !!visitsData?.previous;

  // Compute follow-up status for each visit
  const getFollowUpStatus = (visit: OpdVisit): 'overdue' | 'today' | 'upcoming' | 'no_date' | 'completed' => {
    if (visit.status === 'completed' && !visit.follow_up_date) return 'completed';
    if (!visit.follow_up_date) return 'no_date';
    const fuDate = startOfDay(new Date(visit.follow_up_date));
    const today = startOfDay(new Date());
    if (isToday(fuDate)) return 'today';
    if (isBefore(fuDate, today)) return 'overdue';
    return 'upcoming';
  };

  // Client-side filter on follow-up status
  const filteredVisits = useMemo(() => {
    if (activeFilter === 'all') return allVisits;
    return allVisits.filter((v) => {
      const status = getFollowUpStatus(v);
      if (activeFilter === 'completed') return status === 'completed';
      if (activeFilter === 'today') return status === 'today';
      if (activeFilter === 'overdue') return status === 'overdue';
      if (activeFilter === 'upcoming') return status === 'upcoming';
      return true;
    });
  }, [allVisits, activeFilter]);

  // Stats
  const stats = useMemo(() => {
    let todayCount = 0, overdueCount = 0, upcomingCount = 0;
    allVisits.forEach((v) => {
      const s = getFollowUpStatus(v);
      if (s === 'today') todayCount++;
      if (s === 'overdue') overdueCount++;
      if (s === 'upcoming') upcomingCount++;
    });
    return { todayCount, overdueCount, upcomingCount, total: allVisits.length };
  }, [allVisits]);

  // Handlers
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleConsultation = (visit: OpdVisit) => {
    navigate(`/opd/consultation/${visit.id}`, {
      state: { from: '/opd/follow-ups' },
    });
  };

  const handleSetFollowUp = async (visitId: number) => {
    if (!followUpDateInput) {
      toast.error('Please select a follow-up date');
      return;
    }
    setSaving(true);
    try {
      await patchOpdVisit(visitId, {
        follow_up_required: true,
        follow_up_date: followUpDateInput,
      });
      toast.success('Follow-up date updated');
      setEditingVisitId(null);
      setFollowUpDateInput('');
      mutateVisits();
    } catch {
      toast.error('Failed to update follow-up date');
    } finally {
      setSaving(false);
    }
  };

  const handleClearFollowUp = async (visitId: number) => {
    setSaving(true);
    try {
      await patchOpdVisit(visitId, {
        follow_up_required: false,
        follow_up_date: undefined,
      });
      toast.success('Follow-up cleared');
      mutateVisits();
    } catch {
      toast.error('Failed to clear follow-up');
    } finally {
      setSaving(false);
    }
  };

  const followUpStatusBadge = (visit: OpdVisit) => {
    const status = getFollowUpStatus(visit);
    switch (status) {
      case 'overdue':
        return <Badge variant="destructive" className="text-xs">Overdue</Badge>;
      case 'today':
        return <Badge variant="default" className="text-xs bg-amber-600">Today</Badge>;
      case 'upcoming':
        return <Badge variant="secondary" className="text-xs">Upcoming</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-xs">Done</Badge>;
      default:
        return <Badge variant="outline" className="text-xs text-muted-foreground">No Date</Badge>;
    }
  };

  // Table columns
  const columns: DataTableColumn<OpdVisit>[] = [
    {
      header: '#',
      key: 'index',
      className: 'w-[50px]',
      cell: (visit) => (
        <span className="text-muted-foreground text-sm font-mono">
          {(currentPage - 1) * 50 + filteredVisits.indexOf(visit) + 1}
        </span>
      ),
    },
    {
      header: 'Patient',
      key: 'patient',
      className: 'w-[22%]',
      cell: (visit) => {
        const name = visit.patient_details?.full_name || visit.patient_name || 'N/A';
        const pid = visit.patient_details?.patient_id || visit.patient_id || '';
        const phone = visit.patient_details?.mobile_primary || '';
        return (
          <div className="flex flex-col">
            <span className="font-medium">{name}</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              {pid && <span>{pid}</span>}
              {phone && (
                <a
                  href={`tel:${phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-0.5 text-blue-600 hover:underline"
                >
                  <Phone className="h-3 w-3" />
                  {phone}
                </a>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Doctor',
      key: 'doctor',
      className: 'w-[15%]',
      cell: (visit) => (
        <span className="text-sm">{visit.doctor_details?.full_name || visit.doctor_name || 'N/A'}</span>
      ),
    },
    {
      header: 'Visit Date',
      key: 'visit_date',
      className: 'w-[12%]',
      cell: (visit) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(visit.visit_date), 'dd MMM yyyy')}
        </span>
      ),
    },
    {
      header: 'Follow-Up Date',
      key: 'follow_up_date',
      className: 'w-[20%]',
      cell: (visit) => {
        if (editingVisitId === visit.id) {
          return (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Input
                type="datetime-local"
                value={followUpDateInput}
                onChange={(e) => setFollowUpDateInput(e.target.value)}
                className="h-7 text-xs w-44"
              />
              <Button
                size="sm"
                className="h-7 text-xs px-2"
                onClick={(e) => { e.stopPropagation(); handleSetFollowUp(visit.id); }}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Set'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs px-1"
                onClick={(e) => { e.stopPropagation(); setEditingVisitId(null); }}
              >
                X
              </Button>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              {visit.follow_up_date ? (
                <span className="text-sm font-medium">
                  {format(new Date(visit.follow_up_date), 'dd MMM yyyy')}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground italic">Not set</span>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              title="Set follow-up date"
              onClick={(e) => {
                e.stopPropagation();
                setEditingVisitId(visit.id);
                setFollowUpDateInput(visit.follow_up_date || '');
              }}
            >
              <CalendarPlus className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
    },
    {
      header: 'Status',
      key: 'follow_up_status',
      className: 'w-[10%]',
      cell: (visit) => followUpStatusBadge(visit),
    },
    {
      header: 'Notes',
      key: 'follow_up_notes',
      className: 'w-[15%]',
      cell: (visit) => (
        <span className="text-xs text-muted-foreground line-clamp-2">
          {visit.follow_up_notes || '-'}
        </span>
      ),
    },
  ];

  // Mobile card
  const renderMobileCard = (visit: OpdVisit) => {
    const patientName = visit.patient_details?.full_name || visit.patient_name || 'N/A';
    const phone = visit.patient_details?.mobile_primary || '';
    const pid = visit.patient_details?.patient_id || visit.patient_id || '';
    const doctorName = visit.doctor_details?.full_name || visit.doctor_name || 'N/A';

    return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-sm">{patientName}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pid}
            {phone && (
              <> &bull; <a href={`tel:${phone}`} className="text-blue-600">{phone}</a></>
            )}
          </p>
        </div>
        {followUpStatusBadge(visit)}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs mt-2">
        <div>
          <span className="text-muted-foreground">Doctor: </span>
          <span className="font-medium">{doctorName}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Visit: </span>
          <span>{format(new Date(visit.visit_date), 'dd MMM yyyy')}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Follow-up: </span>
          <span className="font-medium">
            {visit.follow_up_date ? format(new Date(visit.follow_up_date), 'dd MMM yyyy') : 'Not set'}
          </span>
        </div>
      </div>

      {visit.follow_up_notes && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{visit.follow_up_notes}</p>
      )}

      <div className="flex gap-2 pt-2">
        {phone && (
          <a
            href={`tel:${phone}`}
            className="flex-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Button size="sm" variant="outline" className="w-full">
              <Phone className="h-3.5 w-3.5 mr-1.5" />
              Call
            </Button>
          </a>
        )}
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={(e) => { e.stopPropagation(); handleConsultation(visit); }}
        >
          <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
          Consult
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            setEditingVisitId(visit.id);
            setFollowUpDateInput(visit.follow_up_date || '');
          }}
        >
          <CalendarPlus className="h-3.5 w-3.5 mr-1.5" />
          Schedule
        </Button>
      </div>
    </>
  );
  };

  const filterTabs: { value: FollowUpFilter; label: string; count?: number; icon: React.ReactNode }[] = [
    { value: 'all', label: 'All', count: stats.total, icon: <Calendar className="h-3 w-3" /> },
    { value: 'overdue', label: 'Overdue', count: stats.overdueCount, icon: <AlertTriangle className="h-3 w-3" /> },
    { value: 'today', label: 'Today', count: stats.todayCount, icon: <Clock className="h-3 w-3" /> },
    { value: 'upcoming', label: 'Upcoming', count: stats.upcomingCount, icon: <CalendarClock className="h-3 w-3" /> },
    { value: 'completed', label: 'Done', icon: <CheckCircle2 className="h-3 w-3" /> },
  ];

  return (
    <div className="p-4 md:p-5 w-full space-y-3">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-lg font-bold leading-none">Follow-Ups</h1>
          <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-destructive" />
              <span className="font-semibold text-destructive">{stats.overdueCount}</span> overdue
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span className="font-semibold text-foreground">{stats.todayCount}</span> today
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              <span className="font-semibold text-foreground">{stats.upcomingCount}</span> upcoming
            </span>
          </div>
        </div>
      </div>

      {/* Mobile stats */}
      <div className="flex sm:hidden items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span><span className="font-semibold text-destructive">{stats.overdueCount}</span> overdue</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{stats.todayCount}</span> today</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{stats.upcomingCount}</span> upcoming</span>
      </div>

      {/* Search + Filters */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative w-full sm:w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search patient, doctor..."
            value={searchTerm}
            onChange={handleSearch}
            className="pl-8 h-7 text-[12px]"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {filterTabs.map((f) => (
            <Button
              key={f.value}
              variant={activeFilter === f.value ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-[11px] px-2 gap-1"
              onClick={() => { setActiveFilter(f.value); setCurrentPage(1); }}
            >
              {f.icon}
              {f.label}
              {f.count !== undefined && f.count > 0 && (
                <span className="ml-0.5 text-[10px] opacity-70">({f.count})</span>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {visitsError ? (
            <div className="p-8 text-center">
              <p className="text-destructive">{visitsError.message}</p>
            </div>
          ) : (
            <>
              {visitsLoading && (
                <div className="flex justify-end px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
              <DataTable
                rows={filteredVisits}
                isLoading={visitsLoading}
                columns={columns}
                renderMobileCard={renderMobileCard}
                getRowId={(visit) => visit.id}
                getRowLabel={(visit) => visit.patient_details?.full_name || visit.visit_number}
                onView={handleConsultation}
                onConsultation={handleConsultation}
                emptyTitle="No follow-ups found"
                emptySubtitle="No visits with follow-up required matching your filters"
              />

              {/* Pagination */}
              {!visitsLoading && filteredVisits.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredVisits.length} of {totalCount} follow-up(s)
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
    </div>
  );
};

export default FollowUps;
