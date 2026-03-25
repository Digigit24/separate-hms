// src/pages/diagnostics/DiagnosticTransactions.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useDiagnostics } from '@/hooks/useDiagnostics';
import { diagnosticsService } from '@/services/diagnosticsService';
import { DataTable, DataTableColumn } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { Search, Microscope, Clock, CheckCircle2, XCircle, Activity, IndianRupee, Phone, Loader2, Download } from 'lucide-react';
import { format } from 'date-fns';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import type { DiagnosticOrder } from '@/types/diagnostics.types';

const API_FETCH_SIZE = 200;

type DiagnosticOrderStatus = 'pending' | 'sample_collected' | 'processing' | 'completed' | 'cancelled';

const STATUS_OPTIONS: { value: DiagnosticOrderStatus; label: string; icon: React.ReactNode }[] = [
  { value: 'pending', label: 'Pending', icon: <Clock className="h-3 w-3" /> },
  { value: 'sample_collected', label: 'Sample Collected', icon: <Activity className="h-3 w-3" /> },
  { value: 'processing', label: 'Processing', icon: <Clock className="h-3 w-3" /> },
  { value: 'completed', label: 'Completed', icon: <CheckCircle2 className="h-3 w-3" /> },
  { value: 'cancelled', label: 'Cancelled', icon: <XCircle className="h-3 w-3" /> },
];

const STATUS_COLORS: Record<DiagnosticOrderStatus, string> = {
  pending: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
  sample_collected: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
  processing: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
  completed: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
  cancelled: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
};

export const DiagnosticTransactions: React.FC = () => {
  const navigate = useNavigate();
  const { useDiagnosticOrders } = useDiagnostics();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<DiagnosticOrderStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Fetch all diagnostic orders
  const queryParams = useMemo(() => ({
    page: 1,
    page_size: API_FETCH_SIZE,
    ordering: '-created_at',
  }), []);

  const { data: ordersData, isLoading } = useDiagnosticOrders(queryParams);

  // Accumulate all pages
  const [allPages, setAllPages] = useState<DiagnosticOrder[]>([]);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const fetchAbortRef = useRef(false);

  useEffect(() => {
    if (!ordersData) {
      setAllPages([]);
      return;
    }

    const firstPageResults = ordersData.results || [];
    const totalCount = ordersData.count || 0;

    if (!ordersData.next || firstPageResults.length >= totalCount) {
      setAllPages(firstPageResults);
      return;
    }

    fetchAbortRef.current = false;
    setAllPages(firstPageResults);
    setIsFetchingMore(true);

    const fetchRemainingPages = async () => {
      const accumulated = [...firstPageResults];
      let nextPage = 2;

      while (accumulated.length < totalCount) {
        if (fetchAbortRef.current) break;
        try {
          const response = await diagnosticsService.getDiagnosticOrders({
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordersData]);

  // Client-side filtering
  const orders = useMemo(() => {
    return allPages.filter((order) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const nameMatch = order.patient_name?.toLowerCase().includes(term);
        const phoneMatch = order.patient_mobile?.toLowerCase().includes(term);
        const investigationMatch = order.investigation_name?.toLowerCase().includes(term);
        if (!nameMatch && !phoneMatch && !investigationMatch) return false;
      }
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      if (dateRange?.from) {
        const orderDate = new Date(order.created_at);
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        if (orderDate < fromDate) return false;
      }
      if (dateRange?.to) {
        const orderDate = new Date(order.created_at);
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        if (orderDate > toDate) return false;
      }
      return true;
    });
  }, [allPages, searchTerm, statusFilter, dateRange]);

  // Stats
  const stats = useMemo(() => {
    const total = orders.length;
    const totalAmount = orders.reduce((sum, o) => sum + (parseFloat(o.price) || 0), 0);
    const completedOrders = orders.filter((o) => o.status === 'completed');
    const completedAmount = completedOrders.reduce((sum, o) => sum + (parseFloat(o.price) || 0), 0);
    const pendingOrders = orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');
    const pendingAmount = pendingOrders.reduce((sum, o) => sum + (parseFloat(o.price) || 0), 0);
    const cancelledOrders = orders.filter((o) => o.status === 'cancelled');
    const cancelledAmount = cancelledOrders.reduce((sum, o) => sum + (parseFloat(o.price) || 0), 0);
    return { total, totalAmount, completedCount: completedOrders.length, completedAmount, pendingCount: pendingOrders.length, pendingAmount, cancelledCount: cancelledOrders.length, cancelledAmount };
  }, [orders]);

  const hasFiltersApplied = !!(searchTerm || statusFilter !== 'all' || dateRange?.from);

  // Export to CSV
  const handleExportCSV = () => {
    if (orders.length === 0) return;

    const headers = ['Order #', 'Date', 'Investigation', 'Patient Name', 'Patient Mobile', 'Status', 'Amount'];
    const rows = orders.map((order) => [
      order.id,
      format(new Date(order.created_at), 'yyyy-MM-dd'),
      order.investigation_name,
      order.patient_name,
      order.patient_mobile || '',
      order.status,
      parseFloat(order.price) || 0,
    ]);

    // Add summary row
    rows.push([]);
    rows.push(['', '', '', '', '', 'Total', stats.totalAmount]);
    rows.push(['', '', '', '', '', 'Completed', stats.completedAmount]);
    rows.push(['', '', '', '', '', 'Pending', stats.pendingAmount]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => {
          const str = String(cell ?? '');
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    link.download = `investigation-transactions-${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Columns
  const columns: DataTableColumn<DiagnosticOrder>[] = [
    {
      header: 'Order #',
      key: 'id',
      accessor: (row) => row.id,
      cell: (row) => <span className="font-mono font-semibold text-sm">#{row.id}</span>,
      sortable: true,
    },
    {
      header: 'Date',
      key: 'created_at',
      accessor: (row) => row.created_at,
      cell: (row) => (
        <span className="text-sm">{format(new Date(row.created_at), 'MMM dd, yyyy')}</span>
      ),
      sortable: true,
    },
    {
      header: 'Investigation',
      key: 'investigation_name',
      accessor: (row) => row.investigation_name,
      cell: (row) => (
        <span className="font-medium flex items-center gap-1.5">
          <Microscope className="h-3.5 w-3.5 text-muted-foreground" />
          {row.investigation_name}
        </span>
      ),
      sortable: true,
      filterable: true,
    },
    {
      header: 'Patient',
      key: 'patient_name',
      accessor: (row) => row.patient_name,
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span
            className="text-sm font-medium cursor-pointer hover:underline text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/patients/${row.patient}`);
            }}
          >
            {row.patient_name}
          </span>
          {row.patient_mobile && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {row.patient_mobile}
            </span>
          )}
        </div>
      ),
      sortable: true,
      filterable: true,
    },
    {
      header: 'Status',
      key: 'status',
      accessor: (row) => row.status,
      cell: (row) => {
        const statusOption = STATUS_OPTIONS.find((s) => s.value === row.status);
        return (
          <Badge className={STATUS_COLORS[row.status]}>
            <span className="flex items-center gap-1">
              {statusOption?.icon}
              {statusOption?.label}
            </span>
          </Badge>
        );
      },
      sortable: true,
      filterable: true,
    },
    {
      header: 'Amount',
      key: 'price',
      accessor: (row) => parseFloat(row.price) || 0,
      cell: (row) => (
        <span className="text-sm font-semibold flex items-center gap-1">
          <IndianRupee className="h-3 w-3 text-muted-foreground" />
          {parseFloat(row.price).toLocaleString()}
        </span>
      ),
      sortable: true,
    },
  ];

  return (
    <div className="p-4 md:p-5 w-full space-y-3">
      {/* Row 1: Title + inline stats */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-lg font-bold leading-none">Investigation Transactions</h1>
          <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" /> Total <span className="font-semibold text-foreground">₹{stats.totalAmount.toLocaleString()}</span></span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Completed <span className="font-semibold text-foreground">₹{stats.completedAmount.toLocaleString()}</span> ({stats.completedCount})</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pending <span className="font-semibold text-foreground">₹{stats.pendingAmount.toLocaleString()}</span> ({stats.pendingCount})</span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[12px]"
          onClick={handleExportCSV}
          disabled={orders.length === 0}
        >
          <Download className="h-3.5 w-3.5 mr-1" />
          Export CSV
        </Button>
      </div>

      {/* Mobile-only stats */}
      <div className="flex sm:hidden items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span>Total <span className="font-semibold text-foreground">₹{stats.totalAmount.toLocaleString()}</span></span>
        <span className="text-border">|</span>
        <span>Completed <span className="font-semibold text-foreground">₹{stats.completedAmount.toLocaleString()}</span></span>
        <span className="text-border">|</span>
        <span>Pending <span className="font-semibold text-foreground">₹{stats.pendingAmount.toLocaleString()}</span></span>
      </div>

      {/* Row 2: Search + filters */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative w-full sm:w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-7 text-[12px]"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as DiagnosticOrderStatus | 'all')}
        >
          <SelectTrigger className="w-[160px] h-7 text-[12px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={(range) => setDateRange(range)}
          placeholder="Select date range"
        />
        {hasFiltersApplied && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] px-2 text-muted-foreground"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setDateRange(undefined);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {(isLoading || isFetchingMore) && (
            <div className="flex justify-end items-center gap-2 px-4 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isFetchingMore && (
                <span className="text-xs text-muted-foreground">
                  Loading {allPages.length} of {ordersData?.count || '...'} records...
                </span>
              )}
            </div>
          )}
          <DataTable
            rows={orders}
            columns={columns}
            isLoading={isLoading}
            getRowId={(row) => row.id}
            getRowLabel={(row) => `Order #${row.id}`}
            emptyTitle="No investigation transactions found"
            emptySubtitle="Investigation transactions will appear here once diagnostic orders are created"
            renderMobileCard={(row) => (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono font-semibold text-sm text-primary">#{row.id}</div>
                    <div className="font-medium mt-1 flex items-center gap-1.5">
                      <Microscope className="h-3.5 w-3.5 text-muted-foreground" />
                      {row.investigation_name}
                    </div>
                    <span
                      className="text-sm text-muted-foreground mt-0.5 hover:underline cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); navigate(`/patients/${row.patient}`); }}
                    >
                      {row.patient_name}
                    </span>
                    {row.patient_mobile && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" />
                        {row.patient_mobile}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={STATUS_COLORS[row.status]}>
                      <span className="flex items-center gap-1">
                        {STATUS_OPTIONS.find((s) => s.value === row.status)?.icon}
                        {STATUS_OPTIONS.find((s) => s.value === row.status)?.label}
                      </span>
                    </Badge>
                    <span className="text-sm font-semibold flex items-center gap-0.5">
                      <IndianRupee className="h-3 w-3" />
                      {parseFloat(row.price).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(row.created_at), 'MMM dd, yyyy')}
                </div>
              </div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default DiagnosticTransactions;
