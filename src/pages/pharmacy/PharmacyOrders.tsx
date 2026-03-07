// src/pages/pharmacy/PharmacyOrders.tsx
import React, { useState, useMemo } from 'react';
import { useDiagnostics } from '@/hooks/useDiagnostics';
import { DataTable, DataTableColumn } from '@/components/DataTable';
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
import { Search, Pill, Clock, CheckCircle2, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import type { Requisition, RequisitionStatus } from '@/types/diagnostics.types';

const STATUS_OPTIONS: { value: RequisitionStatus; label: string }[] = [
  { value: 'ordered', label: 'Ordered' },
  { value: 'sample_collected', label: 'Sample Collected' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const PharmacyOrders: React.FC = () => {
  const { useRequisitions } = useDiagnostics();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequisitionStatus | 'all'>('all');

  // Fetch all requisitions and filter client-side for medicine type
  const { data, isLoading } = useRequisitions();
  const medicineRequisitions: Requisition[] = useMemo(() => {
    return (data?.results || []).filter((req) => req.requisition_type === 'medicine');
  }, [data]);

  // Filtered requisitions
  const filteredOrders = useMemo(() => {
    return medicineRequisitions.filter((req) => {
      const matchesSearch =
        req.requisition_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.patient_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [medicineRequisitions, searchTerm, statusFilter]);

  // DataTable columns
  const columns: DataTableColumn<Requisition>[] = [
    {
      header: 'Req. Number',
      key: 'requisition_number',
      accessor: (row) => row.requisition_number,
      cell: (row) => <span className="font-mono font-semibold text-sm">{row.requisition_number}</span>,
      sortable: true,
      filterable: true,
    },
    {
      header: 'Patient',
      key: 'patient_name',
      accessor: (row) => row.patient_name,
      cell: (row) => <span className="font-medium">{row.patient_name}</span>,
      sortable: true,
      filterable: true,
    },
    {
      header: 'Order Date',
      key: 'order_date',
      accessor: (row) => row.order_date,
      cell: (row) => <span className="text-sm">{format(new Date(row.order_date), 'MMM dd, yyyy HH:mm')}</span>,
      sortable: true,
    },
    {
      header: 'Priority',
      key: 'priority',
      accessor: (row) => row.priority,
      cell: (row) => (
        <Badge variant={row.priority === 'stat' ? 'destructive' : 'outline'}>
          {row.priority === 'stat' ? 'STAT' : row.priority === 'urgent' ? 'Urgent' : 'Routine'}
        </Badge>
      ),
      sortable: true,
      filterable: true,
    },
    {
      header: 'Status',
      key: 'status',
      accessor: (row) => row.status,
      cell: (row) => {
        const statusLabel = STATUS_OPTIONS.find((s) => s.value === row.status)?.label || row.status;
        return (
          <Badge className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
            {statusLabel}
          </Badge>
        );
      },
      sortable: true,
      filterable: true,
    },
    {
      header: 'Medicines',
      key: 'medicine_orders',
      accessor: (row) => row.medicine_orders?.length || 0,
      cell: (row) => <span className="text-sm">{row.medicine_orders?.length || 0} items</span>,
      sortable: true,
    },
  ];

  // Stats
  const stats = useMemo(() => {
    const total = filteredOrders.length;
    const ordered = filteredOrders.filter((o) => o.status === 'ordered').length;
    const completed = filteredOrders.filter((o) => o.status === 'completed').length;
    return { total, ordered, completed };
  }, [filteredOrders]);

  return (
    <div className="p-4 md:p-5 w-full space-y-3">
      {/* Row 1: Title + inline stats */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-lg font-bold leading-none">Pharmacy Orders</h1>
          <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1"><ClipboardList className="h-3 w-3" /> <span className="font-semibold text-foreground">{stats.total}</span> Total</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> <span className="font-semibold text-foreground">{stats.ordered}</span> Ordered</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> <span className="font-semibold text-foreground">{stats.completed}</span> Completed</span>
          </div>
        </div>
      </div>

      {/* Mobile-only stats */}
      <div className="flex sm:hidden items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span><span className="font-semibold text-foreground">{stats.total}</span> Total</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{stats.ordered}</span> Ordered</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{stats.completed}</span> Completed</span>
      </div>

      {/* Row 2: Search + filters */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative w-full sm:w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-7 text-[12px]"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as RequisitionStatus | 'all')}
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
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            rows={filteredOrders}
            columns={columns}
            isLoading={isLoading}
            getRowId={(row) => row.id}
            getRowLabel={(row) => row.requisition_number}
            emptyTitle="No pharmacy orders found"
            emptySubtitle="Medicine requisitions will appear here"
            renderMobileCard={(row) => (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono font-semibold text-sm text-primary">{row.requisition_number}</div>
                    <div className="font-medium mt-1">{row.patient_name}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                      {STATUS_OPTIONS.find((s) => s.value === row.status)?.label || row.status}
                    </Badge>
                    <Badge variant={row.priority === 'stat' ? 'destructive' : 'outline'}>
                      {row.priority === 'stat' ? 'STAT' : row.priority === 'urgent' ? 'Urgent' : 'Routine'}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{format(new Date(row.order_date), 'MMM dd, yyyy')}</span>
                  <span>{row.medicine_orders?.length || 0} items</span>
                </div>
              </div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default PharmacyOrders;
