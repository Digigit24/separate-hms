// src/pages/opd-production/ProcedureBills.tsx
import React, { useState } from 'react';
import { useProcedureMaster } from '@/hooks/useProcedureMaster';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumn } from '@/components/DataTable';
import { ServerPagination } from '@/components/ServerPagination';
import { Plus, Search, Briefcase, IndianRupee } from 'lucide-react';
import { ProcedureMaster, ProcedureMasterListParams, ProcedureCategory } from '@/types/procedureMaster.types';
import { toast } from 'sonner';
import { ProcedureMasterFormDrawer } from '@/components/ProcedureMasterFormDrawer';

export const ProcedureBills: React.FC = () => {
  const { useProcedureMasters, deleteProcedure } = useProcedureMaster();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ProcedureCategory | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedProcedureId, setSelectedProcedureId] = useState<number | null>(null);

  const queryParams: ProcedureMasterListParams = {
    page: currentPage,
    search: searchTerm || undefined,
    category: categoryFilter || undefined,
  };

  const { data: proceduresData, error, isLoading, mutate } = useProcedureMasters(queryParams);

  const procedures = proceduresData?.results || [];
  const totalCount = proceduresData?.count || 0;
  const hasNext = !!proceduresData?.next;
  const hasPrevious = !!proceduresData?.previous;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleDelete = async (procedure: ProcedureMaster) => {
    if (window.confirm(`Delete procedure ${procedure.name}?`)) {
      try {
        await deleteProcedure(procedure.id);
        toast.success('Procedure deleted');
        mutate();
      } catch (error: any) {
        toast.error(error.message);
      }
    }
  };

  const getCategoryColor = (category: ProcedureCategory) => {
    const colors: Record<ProcedureCategory, string> = {
      laboratory: 'bg-neutral-800 dark:bg-neutral-300',
      radiology: 'bg-neutral-700 dark:bg-neutral-400',
      cardiology: 'bg-neutral-500',
      pathology: 'bg-neutral-900 dark:bg-neutral-200',
      ultrasound: 'bg-neutral-600 dark:bg-neutral-500',
      ct_scan: 'bg-neutral-600 dark:bg-neutral-500',
      mri: 'bg-neutral-500 dark:bg-neutral-500',
      ecg: 'bg-neutral-500 dark:bg-neutral-500',
      xray: 'bg-cyan-600',
      other: 'bg-neutral-400 dark:bg-neutral-600',
    };
    return colors[category] || 'bg-neutral-400 dark:bg-neutral-600';
  };

  const columns: DataTableColumn<ProcedureMaster>[] = [
    {
      header: 'Procedure',
      key: 'name',
      cell: (procedure) => (
        <div className="flex flex-col">
          <span className="font-medium">{procedure.name}</span>
          <span className="text-xs text-muted-foreground font-mono">{procedure.code}</span>
        </div>
      ),
    },
    {
      header: 'Category',
      key: 'category',
      cell: (procedure) => (
        <Badge variant="default" className={`${getCategoryColor(procedure.category)} text-xs`}>
          {procedure.category.replace('_', ' ').toUpperCase()}
        </Badge>
      ),
    },
    {
      header: 'Description',
      key: 'description',
      cell: (procedure) => (
        <div className="max-w-md">
          <p className="text-sm truncate">{procedure.description || 'N/A'}</p>
        </div>
      ),
    },
    {
      header: 'Charge',
      key: 'default_charge',
      cell: (procedure) => (
        <span className="font-medium">₹{procedure.default_charge}</span>
      ),
    },
    {
      header: 'Status',
      key: 'is_active',
      cell: (procedure) => (
        <Badge variant={procedure.is_active ? 'default' : 'secondary'} className={procedure.is_active ? 'bg-neutral-900 dark:bg-neutral-200' : ''}>
          {procedure.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-5 w-full space-y-3">
      {/* Row 1: Title + inline stats + action */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-lg font-bold leading-none">Procedures</h1>
          <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> <span className="font-semibold text-foreground">{totalCount}</span> Total</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" /> Avg <span className="font-semibold text-foreground">₹{procedures.length > 0 ? (procedures.reduce((sum, p) => sum + parseFloat(p.default_charge || '0'), 0) / procedures.length).toFixed(0) : '0'}</span></span>
          </div>
        </div>
        <Button onClick={() => { setDrawerMode('create'); setSelectedProcedureId(null); setDrawerOpen(true); }} size="sm" className="w-full sm:w-auto h-7 text-[12px]">
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Procedure
        </Button>
      </div>

      {/* Mobile-only stats */}
      <div className="flex sm:hidden items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span><span className="font-semibold text-foreground">{totalCount}</span> Total</span>
        <span className="text-border">|</span>
        <span>Avg <span className="font-semibold text-foreground">₹{procedures.length > 0 ? (procedures.reduce((sum, p) => sum + parseFloat(p.default_charge || '0'), 0) / procedures.length).toFixed(0) : '0'}</span></span>
      </div>

      {/* Row 2: Search */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative w-full sm:w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, code..."
            value={searchTerm}
            onChange={handleSearch}
            className="pl-8 h-7 text-[12px]"
          />
        </div>
      </div>

      {/* Table Card */}
      <Card>
        <CardContent className="p-0">
          {error ? (
            <div className="p-8 text-center">
              <p className="text-destructive">{error.message}</p>
            </div>
          ) : (
            <>
              <DataTable
                rows={procedures}
                isLoading={isLoading}
                columns={columns}
                getRowId={(procedure) => procedure.id}
                getRowLabel={(procedure) => procedure.name}
                onView={(procedure) => { setDrawerMode('view'); setSelectedProcedureId(procedure.id); setDrawerOpen(true); }}
                onEdit={(procedure) => { setDrawerMode('edit'); setSelectedProcedureId(procedure.id); setDrawerOpen(true); }}
                onDelete={handleDelete}
                emptyTitle="No procedures found"
                emptySubtitle="Try adjusting your search"
                disableClientPagination
              />

              {!isLoading && procedures.length > 0 && (
                <ServerPagination
                  currentPage={currentPage}
                  totalCount={totalCount}
                  pageSize={procedures.length}
                  hasNext={hasNext}
                  hasPrevious={hasPrevious}
                  onPrevious={() => setCurrentPage((p) => p - 1)}
                  onNext={() => setCurrentPage((p) => p + 1)}
                  itemLabel="procedure(s)"
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
      <ProcedureMasterFormDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode={drawerMode}
        procedureId={selectedProcedureId}
        onSuccess={mutate}
      />
    </div>
  );
};

export default ProcedureBills;
