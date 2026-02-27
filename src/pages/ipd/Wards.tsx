// src/pages/ipd/Wards.tsx
import { useMemo, useState } from 'react';
import { DataTable, DataTableColumn } from '@/components/DataTable';
import { useIPD } from '@/hooks/useIPD';
import { Ward, WARD_TYPE_LABELS } from '@/types/ipd.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Plus, Bed as BedIcon, Building, Search, CheckCircle, XCircle } from 'lucide-react';
import { WardFormDrawer } from '@/components/ipd/WardFormDrawer';
import { Card, CardContent } from '@/components/ui/card';

export default function Wards() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { useWards, deleteWard } = useIPD();
  const { data: wardsData, isLoading, error: fetchError, mutate } = useWards({ search: searchQuery });

  const wards = wardsData?.results || [];

  // Show error state if data fetch fails
  if (fetchError && !isLoading && wards.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 md:p-5">
          <h1 className="text-lg font-bold leading-none">Ward Management</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-destructive">Failed to load wards</p>
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
  const handleDelete = async (ward: Ward) => {
    try {
      await deleteWard(ward.id);
      toast({
        title: 'Success',
        description: 'Ward deleted successfully',
      });
      mutate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete ward',
        variant: 'destructive',
      });
    }
  };

  // Open Create Drawer
  const openCreateDrawer = () => {
    setSelectedWard(null);
    setDrawerMode('create');
    setIsDrawerOpen(true);
  };

  // Open Edit Drawer
  const openEditDrawer = (ward: Ward) => {
    setSelectedWard(ward);
    setDrawerMode('edit');
    setIsDrawerOpen(true);
  };

  // Stats
  const wardStats = useMemo(() => {
    const total = wards.length;
    const active = wards.filter((w) => w.is_active).length;
    const inactive = wards.filter((w) => !w.is_active).length;
    const totalBeds = wards.reduce((sum, w) => sum + (w.total_beds || 0), 0);

    return { total, active, inactive, totalBeds };
  }, [wards]);

  // DataTable columns
  const columns: DataTableColumn<Ward>[] = [
    {
      header: 'Ward Name',
      key: 'name',
      sortable: true,
      filterable: true,
      accessor: (row) => row.name,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      header: 'Type',
      key: 'type',
      sortable: true,
      filterable: true,
      accessor: (row) => row.type,
      cell: (row) => (
        <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs">
          {WARD_TYPE_LABELS[row.type]}
        </span>
      ),
    },
    {
      header: 'Floor',
      key: 'floor',
      sortable: true,
      filterable: true,
      accessor: (row) => row.floor,
      cell: (row) => <span>{row.floor || '-'}</span>,
    },
    {
      header: 'Total Beds',
      key: 'total_beds',
      sortable: true,
      accessor: (row) => row.total_beds,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <BedIcon className="h-4 w-4 text-muted-foreground" />
          <span>{row.total_beds}</span>
        </div>
      ),
    },
    {
      header: 'Available',
      key: 'available_beds_count',
      sortable: true,
      accessor: (row) => row.available_beds_count || 0,
      cell: (row) => (
        <span className="text-foreground font-medium">
          {row.available_beds_count || 0}
        </span>
      ),
    },
    {
      header: 'Occupied',
      key: 'occupied_beds_count',
      sortable: true,
      accessor: (row) => row.occupied_beds_count || 0,
      cell: (row) => (
        <span className="text-foreground font-medium">
          {row.occupied_beds_count || 0}
        </span>
      ),
    },
    {
      header: 'Status',
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
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-5 w-full space-y-3">
      {/* Row 1: Title + inline stats + action */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-lg font-bold leading-none">Ward Management</h1>
          <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1"><Building className="h-3 w-3" /> <span className="font-semibold text-foreground">{wardStats.total}</span> Total</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> <span className="font-semibold text-foreground">{wardStats.active}</span> Active</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><XCircle className="h-3 w-3" /> <span className="font-semibold text-foreground">{wardStats.inactive}</span> Inactive</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><BedIcon className="h-3 w-3" /> <span className="font-semibold text-foreground">{wardStats.totalBeds}</span> Beds</span>
          </div>
        </div>
        <Button size="sm" className="w-full sm:w-auto h-7 text-[12px]" onClick={openCreateDrawer}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Ward
        </Button>
      </div>

      {/* Mobile-only stats */}
      <div className="flex sm:hidden items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span><span className="font-semibold text-foreground">{wardStats.total}</span> Total</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{wardStats.active}</span> Active</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{wardStats.inactive}</span> Inactive</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{wardStats.totalBeds}</span> Beds</span>
      </div>

      {/* Row 2: Search */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative w-full sm:w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search wards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-7 text-[12px]"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            rows={wards}
            isLoading={isLoading}
            columns={columns}
            getRowId={(row) => row.id}
            getRowLabel={(row) => row.name}
            onEdit={openEditDrawer}
            onDelete={handleDelete}
            renderMobileCard={(row, actions) => (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">{row.name}</span>
                  </div>
                  {actions.dropdown}
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-xs">
                      {WARD_TYPE_LABELS[row.type]}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Floor:</span>
                    <span>{row.floor || '-'}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Beds:</span>
                    <span>{row.total_beds}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Available:</span>
                    <span className="text-foreground font-medium">
                      {row.available_beds_count || 0}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Occupied:</span>
                    <span className="text-foreground font-medium">
                      {row.occupied_beds_count || 0}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        row.is_active
                          ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      {row.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            )}
            emptyTitle="No wards found"
            emptySubtitle="Create your first ward to get started"
          />
        </CardContent>
      </Card>

      {/* Ward Form Drawer */}
      <WardFormDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        ward={selectedWard}
        mode={drawerMode}
        onSuccess={() => mutate()}
      />
    </div>
  );
}
