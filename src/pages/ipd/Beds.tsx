// src/pages/ipd/Beds.tsx
import { useMemo, useState } from 'react';
import { DataTable, DataTableColumn } from '@/components/DataTable';
import { useIPD } from '@/hooks/useIPD';
import { Bed, BED_TYPE_LABELS, BED_STATUS_LABELS } from '@/types/ipd.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Plus, Bed as BedIcon, Wind, Activity, Search, CheckCircle, XCircle } from 'lucide-react';
import { BedFormDrawer } from '@/components/ipd/BedFormDrawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

export default function Beds() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [wardFilter, setWardFilter] = useState<number | undefined>(undefined);

  const { useBeds, useWards, deleteBed } = useIPD();
  const { data: bedsData, isLoading, error: fetchError, mutate } = useBeds({
    search: searchQuery,
    ward: wardFilter,
  });
  const { data: wardsData } = useWards();

  const beds = bedsData?.results || [];
  const wards = wardsData?.results || wardsData || [];

  // Show error state if data fetch fails
  if (fetchError && !isLoading && beds.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 md:p-5">
          <h1 className="text-lg font-bold leading-none">Bed Management</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-destructive">Failed to load beds</p>
            <p className="text-sm text-muted-foreground mt-2">{fetchError.message || 'An error occurred'}</p>
            <Button className="mt-4" onClick={() => mutate()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Handle Delete
  const handleDelete = async (bed: Bed) => {
    try {
      await deleteBed(bed.id);
      toast({
        title: 'Success',
        description: 'Bed deleted successfully',
      });
      mutate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete bed',
        variant: 'destructive',
      });
    }
  };

  // Open Create Drawer
  const openCreateDrawer = () => {
    setSelectedBed(null);
    setDrawerMode('create');
    setIsDrawerOpen(true);
  };

  // Open Edit Drawer
  const openEditDrawer = (bed: Bed) => {
    setSelectedBed(bed);
    setDrawerMode('edit');
    setIsDrawerOpen(true);
  };

  // Stats
  const occupancyStats = useMemo(() => {
    const total = beds.length;
    const occupied = beds.filter((b) => b.status === 'occupied').length;
    const available = beds.filter((b) => b.status === 'available').length;
    const maintenance = beds.filter((b) => b.status === 'maintenance').length;

    return { total, occupied, available, maintenance };
  }, [beds]);

  // DataTable columns
  const columns: DataTableColumn<Bed>[] = [
    {
      header: 'Bed Number',
      key: 'bed_number',
      sortable: true,
      filterable: true,
      accessor: (row) => row.bed_number,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <BedIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.bed_number}</span>
        </div>
      ),
    },
    {
      header: 'Ward',
      key: 'ward_name',
      sortable: true,
      filterable: true,
      accessor: (row) => row.ward_name || '',
      cell: (row) => <span>{row.ward_name}</span>,
    },
    {
      header: 'Type',
      key: 'bed_type',
      sortable: true,
      filterable: true,
      accessor: (row) => row.bed_type,
      cell: (row) => (
        <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs">
          {BED_TYPE_LABELS[row.bed_type]}
        </span>
      ),
    },
    {
      header: 'Daily Charge',
      key: 'daily_charge',
      sortable: true,
      accessor: (row) => parseFloat(row.daily_charge),
      cell: (row) => (
        <span className="font-medium">₹{parseFloat(row.daily_charge).toFixed(2)}</span>
      ),
    },
    {
      header: 'Features',
      key: 'features',
      cell: (row) => (
        <div className="flex gap-2">
          {row.has_oxygen && (
            <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded text-xs flex items-center gap-1">
              <Wind className="h-3 w-3" />
              O2
            </span>
          )}
          {row.has_ventilator && (
            <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded text-xs flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Vent
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      sortable: true,
      accessor: (row) => row.status,
      cell: (row) => (
        <span
          className={`px-2 py-1 rounded text-xs ${
            row.status === 'available'
              ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              : row.status === 'occupied'
              ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              : row.status === 'maintenance'
              ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
          }`}
        >
          {BED_STATUS_LABELS[row.status]}
        </span>
      ),
    },
    {
      header: 'Active',
      key: 'is_active',
      sortable: true,
      accessor: (row) => row.is_active,
      cell: (row) => (
        <span
          className={`px-2 py-1 rounded text-xs ${
            row.is_active
              ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
          }`}
        >
          {row.is_active ? 'Yes' : 'No'}
        </span>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-5 w-full space-y-3">
      {/* Row 1: Title + inline stats + action */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-lg font-bold leading-none">Bed Management</h1>
          <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1"><BedIcon className="h-3 w-3" /> <span className="font-semibold text-foreground">{occupancyStats.total}</span> Total</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> <span className="font-semibold text-foreground">{occupancyStats.available}</span> Available</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><XCircle className="h-3 w-3" /> <span className="font-semibold text-foreground">{occupancyStats.occupied}</span> Occupied</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> <span className="font-semibold text-foreground">{occupancyStats.maintenance}</span> Maintenance</span>
          </div>
        </div>
        <Button size="sm" className="w-full sm:w-auto h-7 text-[12px]" onClick={openCreateDrawer}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Bed
        </Button>
      </div>

      {/* Mobile-only stats */}
      <div className="flex sm:hidden items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span><span className="font-semibold text-foreground">{occupancyStats.total}</span> Total</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{occupancyStats.available}</span> Available</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{occupancyStats.occupied}</span> Occupied</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{occupancyStats.maintenance}</span> Maint.</span>
      </div>

      {/* Row 2: Search + filters */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative w-full sm:w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search beds..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-7 text-[12px]"
          />
        </div>
        <Select
          value={wardFilter ? String(wardFilter) : 'all'}
          onValueChange={(val) =>
            setWardFilter(val === 'all' ? undefined : Number(val))
          }
        >
          <SelectTrigger className="w-[180px] h-7 text-[12px]">
            <SelectValue placeholder="Filter by ward" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Wards</SelectItem>
            {wards.map((w: any) => (
              <SelectItem key={w.id} value={String(w.id)}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            rows={beds}
            isLoading={isLoading}
            columns={columns}
            getRowId={(row) => row.id}
            getRowLabel={(row) => `${row.ward_name} - ${row.bed_number}`}
            onEdit={openEditDrawer}
            onDelete={handleDelete}
            renderMobileCard={(row, actions) => (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <BedIcon className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">{row.bed_number}</span>
                  </div>
                  {actions.dropdown}
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ward:</span>
                    <span>{row.ward_name}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-xs">
                      {BED_TYPE_LABELS[row.bed_type]}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Daily Charge:</span>
                    <span className="font-medium">₹{parseFloat(row.daily_charge).toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Features:</span>
                    <div className="flex gap-1">
                      {row.has_oxygen && (
                        <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded text-xs">
                          O2
                        </span>
                      )}
                      {row.has_ventilator && (
                        <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded text-xs">
                          Vent
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        row.status === 'available'
                          ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                          : row.status === 'occupied'
                          ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      {BED_STATUS_LABELS[row.status]}
                    </span>
                  </div>
                </div>
              </div>
            )}
            emptyTitle="No beds found"
            emptySubtitle="Create your first bed to get started"
          />
        </CardContent>
      </Card>

      {/* Bed Form Drawer */}
      <BedFormDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        bed={selectedBed}
        mode={drawerMode}
        onSuccess={() => mutate()}
      />
    </div>
  );
}
