// src/pages/OPDVisits.tsx
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOpdVisit } from '@/hooks/useOpdVisit';
import { useDoctor } from '@/hooks/useDoctor';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumn } from '@/components/DataTable';
import OPDVisitFormDrawer from '@/components/OPDVisitFormDrawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2,
  Plus,
  Search,
  Calendar,
  IndianRupee,
  Clock,
  CheckCircle2,
  Stethoscope,
  Download,
  X,
} from 'lucide-react';
import { OpdVisit, OpdVisitListParams } from '@/types/opdVisit.types';
import { opdVisitService } from '@/services/opdVisit.service';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const API_FETCH_SIZE = 200;

export const OPDVisits: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasModuleAccess } = useAuth();
  const {
    hasHMSAccess,
    useOpdVisits,
    deleteOpdVisit,
    useOpdVisitStatistics,
  } = useOpdVisit();
  const { useDoctors } = useDoctor();

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'waiting' | 'in_consultation' | 'completed' | 'cancelled' | ''>('');
  const [doctorFilter, setDoctorFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Export state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportCancelledRef = useRef(false);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create'>('view');

  // Fetch doctors for filter dropdown
  const { data: doctorsData } = useDoctors({ page_size: 100 });
  const doctors = doctorsData?.results || [];

  // Build query params for first page
  // Send filters to API (search & status work server-side)
  // Doctor and date filters are applied client-side as fallback
  const queryParams: OpdVisitListParams = {
    page: 1,
    page_size: API_FETCH_SIZE,
    search: searchTerm || undefined,
    status: statusFilter || undefined,
    doctor_id: doctorFilter ? Number(doctorFilter) : undefined,
    visit_date__gte: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
    visit_date__lte: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
  };

  // Fetch first page of visits
  const {
    data: visitsData,
    error: visitsError,
    isLoading: visitsLoading,
    mutate: mutateVisits
  } = useOpdVisits(queryParams);

  // Fetch statistics
  const { data: statistics } = useOpdVisitStatistics();

  // State to accumulate all pages
  const [allPages, setAllPages] = useState<OpdVisit[]>([]);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const fetchAbortRef = useRef(false);

  // When first page data changes, fetch remaining pages if any
  useEffect(() => {
    if (!visitsData) {
      setAllPages([]);
      return;
    }

    const firstPageResults = visitsData.results || [];
    const totalCount = visitsData.count || 0;

    // If all data fits in first page, no need to fetch more
    if (!visitsData.next || firstPageResults.length >= totalCount) {
      setAllPages(firstPageResults);
      return;
    }

    // There are more pages - fetch them all
    fetchAbortRef.current = false;
    setAllPages(firstPageResults);
    setIsFetchingMore(true);

    const fetchRemainingPages = async () => {
      const accumulated = [...firstPageResults];
      let nextPage = 2;

      while (accumulated.length < totalCount) {
        if (fetchAbortRef.current) break;

        try {
          const response = await opdVisitService.getOpdVisits({
            ...queryParams,
            page: nextPage,
            page_size: API_FETCH_SIZE,
          });
          accumulated.push(...response.results);
          setAllPages([...accumulated]);

          if (!response.next) break;
          nextPage++;
        } catch {
          break;
        }
      }

      setIsFetchingMore(false);
    };

    fetchRemainingPages();

    return () => {
      fetchAbortRef.current = true;
    };
  // Re-fetch when visitsData identity changes (triggered by filter/search changes)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitsData]);

  const rawVisits = allPages;

  // Client-side filtering for doctor and date range
  // (applied as fallback in case backend doesn't support these filters)
  const allFetchedVisits = useMemo(() => {
    return rawVisits.filter((visit) => {
      // Doctor filter
      if (doctorFilter && visit.doctor !== Number(doctorFilter)) {
        return false;
      }
      // Date range filter
      if (dateRange?.from) {
        const visitDate = new Date(visit.visit_date);
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        if (visitDate < fromDate) return false;
      }
      if (dateRange?.to) {
        const visitDate = new Date(visit.visit_date);
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        if (visitDate > toDate) return false;
      }
      return true;
    });
  }, [rawVisits, doctorFilter, dateRange]);

  const totalCount = allFetchedVisits.length;

  // Check if any filter is applied
  const hasFiltersApplied = !!(searchTerm || statusFilter || doctorFilter || dateRange?.from);

  // Build filter params (without pagination) for export
  const getFilterParams = useCallback((): OpdVisitListParams => {
    return {
      search: searchTerm || undefined,
      status: statusFilter || undefined,
      doctor_id: doctorFilter ? Number(doctorFilter) : undefined,
      visit_date__gte: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
      visit_date__lte: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
    };
  }, [searchTerm, statusFilter, doctorFilter, dateRange]);

  // Handlers
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusFilter = (status: 'waiting' | 'in_consultation' | 'completed' | 'cancelled' | '') => {
    setStatusFilter(status);
  };

  const handleDoctorFilter = (value: string) => {
    setDoctorFilter(value === 'all' ? '' : value);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
  };

  const handleView = (visit: OpdVisit) => {
    const visitIds = allFetchedVisits.map(v => v.id);
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
    const visitIds = allFetchedVisits.map(v => v.id);
    navigate(`/opd/consultation/${visit.id}`, {
      state: { visitIds, from: '/opd/visits', activeTab: 'billing' }
    });
  };

  const handleConsultation = (visit: OpdVisit) => {
    const visitIds = allFetchedVisits.map(v => v.id);
    navigate(`/opd/consultation/${visit.id}`, {
      state: { visitIds, from: '/opd/visits' }
    });
  };

  // --- Export ---
  const handleExportClick = () => {
    setExportDialogOpen(true);
  };

  const generateCsvFromVisits = (data: OpdVisit[]) => {
    const csvData = data.map((visit) => ({
      'Visit Number': visit.visit_number,
      'Visit Date': visit.visit_date,
      'Visit Time': visit.visit_time,
      'Patient Name': visit.patient_details?.full_name || visit.patient_name || '',
      'Patient ID': visit.patient_details?.patient_id || visit.patient_id || '',
      'Patient Mobile': visit.patient_details?.mobile_primary || '',
      'Doctor': visit.doctor_details?.full_name || visit.doctor_name || '',
      'Visit Type': visit.visit_type || '',
      'Priority': visit.priority || '',
      'Status': visit.status || '',
      'Chief Complaint': visit.chief_complaint || '',
      'Diagnosis': visit.diagnosis || '',
      'Consultation Fee': visit.consultation_fee || '0',
      'Additional Charges': visit.additional_charges || '0',
      'Total Amount': visit.total_amount || '0',
      'Payment Status': visit.payment_status || '',
      'Payment Method': visit.payment_method || '',
      'Queue Number': visit.queue_number || '',
      'Follow Up Required': visit.follow_up_required ? 'Yes' : 'No',
      'Follow Up Date': visit.follow_up_date || '',
      'Created At': visit.created_at || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(csvData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'OPD Visits');

    worksheet['!cols'] = [
      { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 22 }, { wch: 14 },
      { wch: 14 }, { wch: 22 }, { wch: 12 }, { wch: 10 }, { wch: 16 },
      { wch: 25 }, { wch: 25 }, { wch: 14 }, { wch: 16 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 12 },
      { wch: 20 },
    ];

    const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');
    XLSX.writeFile(workbook, `opd_visits_${timestamp}.csv`, { bookType: 'csv' });
  };

  const handleExport = useCallback(async (mode: 'filtered' | 'all') => {
    setExportDialogOpen(false);
    setIsExporting(true);
    exportCancelledRef.current = false;

    const params: OpdVisitListParams = mode === 'filtered' ? getFilterParams() : {};
    const allVisits: OpdVisit[] = [];
    let page = 1;
    const batchSize = 200;

    // First call to get the total count
    const progressToastId = toast.loading(
      'Preparing export...',
      { duration: Infinity }
    );

    try {
      while (true) {
        if (exportCancelledRef.current) {
          toast.dismiss(progressToastId);
          toast.info('Export cancelled');
          setIsExporting(false);
          return;
        }

        const response = await opdVisitService.getOpdVisits({
          ...params,
          page,
          page_size: batchSize,
        });

        allVisits.push(...response.results);
        const total = response.count;

        const percent = Math.round((allVisits.length / total) * 100);
        toast.loading(
          `Exporting... ${allVisits.length} of ${total} fetched (${percent}%)`,
          { id: progressToastId, duration: Infinity }
        );

        if (!response.next) break;
        page++;
      }

      if (exportCancelledRef.current) {
        toast.dismiss(progressToastId);
        toast.info('Export cancelled');
        setIsExporting(false);
        return;
      }

      generateCsvFromVisits(allVisits);
      toast.success(`Exported ${allVisits.length} visit(s) successfully`, {
        id: progressToastId,
      });
    } catch (error: any) {
      toast.error(error.message || 'Export failed', {
        id: progressToastId,
      });
    } finally {
      setIsExporting(false);
    }
  }, [getFilterParams]);

  const handleCancelExport = useCallback(() => {
    exportCancelledRef.current = true;
  }, []);

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
          <span className="font-medium">{visit.patient_details?.full_name || visit.patient_name || 'N/A'}</span>
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
            <span className="font-medium">{visit.patient_details?.full_name || visit.patient_name || 'N/A'}</span>
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

  // Build filter summary for export dialog
  const getFilterSummary = () => {
    const parts: string[] = [];
    if (searchTerm) parts.push(`Search: "${searchTerm}"`);
    if (statusFilter) parts.push(`Status: ${statusFilter.replace('_', ' ')}`);
    if (doctorFilter) {
      const doc = doctors.find(d => d.id === Number(doctorFilter));
      parts.push(`Doctor: ${doc?.full_name || doctorFilter}`);
    }
    if (dateRange?.from) parts.push(`From: ${format(dateRange.from, 'dd MMM yyyy')}`);
    if (dateRange?.to) parts.push(`To: ${format(dateRange.to, 'dd MMM yyyy')}`);
    return parts;
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
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            onClick={handleExportClick}
            variant="outline"
            size="sm"
            className="h-7 text-[12px]"
            disabled={totalCount === 0 || isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5 mr-1" />
                Export CSV
              </>
            )}
          </Button>
          <Button onClick={handleCreate} size="sm" className="flex-1 sm:flex-none h-7 text-[12px]">
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Visit
          </Button>
        </div>
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

      {/* Row 3: Doctor + Date filters */}
      <div className="flex gap-2 items-center flex-wrap">
        <Select value={doctorFilter || 'all'} onValueChange={handleDoctorFilter}>
          <SelectTrigger className="w-full sm:w-[200px] h-7 text-[12px]">
            <SelectValue placeholder="All Doctors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Doctors</SelectItem>
            {doctors.map((doc) => (
              <SelectItem key={doc.id} value={String(doc.id)}>
                {doc.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
          placeholder="Select date range"
        />
        {hasFiltersApplied && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] px-2 text-muted-foreground"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
              setDoctorFilter('');
              setDateRange(undefined);
            }}
          >
            Clear filters
          </Button>
        )}
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
              {(visitsLoading || isFetchingMore) && (
                <div className="flex justify-end items-center gap-2 px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isFetchingMore && (
                    <span className="text-xs text-muted-foreground">
                      Loading {allPages.length} of {visitsData?.count || '...'} records...
                    </span>
                  )}
                </div>
              )}
              <DataTable
                rows={allFetchedVisits}
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

      {/* Export Confirmation Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Export OPD Visits</DialogTitle>
            <DialogDescription>
              Choose to export filtered data or all records.
            </DialogDescription>
          </DialogHeader>

          {hasFiltersApplied && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Active filters:</p>
              <div className="space-y-1.5 text-sm">
                {getFilterSummary().map((filter, i) => (
                  <div key={i} className="flex items-center gap-2 text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                    {filter}
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Matching records: <span className="font-semibold text-foreground">{totalCount}</span>
              </p>
            </div>
          )}

          {!hasFiltersApplied && (
            <p className="text-sm text-muted-foreground">
              No filters applied. Total records: <span className="font-semibold text-foreground">{totalCount}</span>
            </p>
          )}

          <div className="flex flex-col gap-2 pt-2">
            {hasFiltersApplied && (
              <Button
                className="w-full justify-start h-auto py-3 px-4"
                variant="outline"
                onClick={() => handleExport('filtered')}
              >
                <div className="flex flex-col items-start gap-0.5">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Download className="h-3.5 w-3.5" />
                    Export Filtered Data
                  </div>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    Export {totalCount} matching record(s) with current filters
                  </span>
                </div>
              </Button>
            )}
            <Button
              className="w-full justify-start h-auto py-3 px-4"
              onClick={() => handleExport('all')}
            >
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex items-center gap-1.5 font-medium">
                  <Download className="h-3.5 w-3.5" />
                  Export All Data
                </div>
                <span className="text-[11px] text-muted-foreground font-normal">
                  Export all visit records without any filters
                </span>
              </div>
            </Button>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setExportDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Progress Bar (fixed bottom) */}
      {isExporting && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 min-w-[320px] max-w-[420px]">
          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
          <span className="text-sm text-muted-foreground flex-1">Exporting visits...</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[12px] text-muted-foreground hover:text-destructive"
            onClick={handleCancelExport}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

export default OPDVisits;
