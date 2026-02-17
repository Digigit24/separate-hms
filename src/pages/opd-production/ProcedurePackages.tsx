// src/pages/opd-production/ProcedurePackages.tsx
import React, { useState } from 'react';
import { useProcedurePackage } from '@/hooks/useProcedurePackage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumn } from '@/components/DataTable';
import { Loader2, Plus, Search, Package, TrendingDown, CheckCircle } from 'lucide-react';
import { ProcedurePackage, ProcedurePackageListParams } from '@/types/procedurePackage.types';
import { toast } from 'sonner';
import { ProcedurePackageFormDrawer } from '@/components/ProcedurePackageFormDrawer';

export const ProcedurePackages: React.FC = () => {
  const { useProcedurePackages, deletePackage } = useProcedurePackage();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);

  const queryParams: ProcedurePackageListParams = {
    page: currentPage,
    search: searchTerm || undefined,
    is_active: activeFilter,
  };

  const { data: packagesData, error, isLoading, mutate } = useProcedurePackages(queryParams);

  const packages = packagesData?.results || [];
  const totalCount = packagesData?.count || 0;
  const hasNext = !!packagesData?.next;
  const hasPrevious = !!packagesData?.previous;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleDelete = async (pkg: ProcedurePackage) => {
    if (window.confirm(`Delete package ${pkg.name}?`)) {
      try {
        await deletePackage(pkg.id);
        toast.success('Package deleted');
        mutate();
      } catch (error: any) {
        toast.error(error.message);
      }
    }
  };

  const columns: DataTableColumn<ProcedurePackage>[] = [
    {
      header: 'Package',
      key: 'name',
      cell: (pkg) => (
        <div className="flex flex-col">
          <span className="font-medium">{pkg.name}</span>
          <span className="text-xs text-muted-foreground font-mono">{pkg.code}</span>
        </div>
      ),
    },
    {
      header: 'Procedures',
      key: 'procedures',
      cell: (pkg) => {
        const count = pkg.procedures?.length ?? pkg.procedure_count ?? 0;
        return (
          <div className="flex flex-col text-xs">
            <span className="font-medium">{count} procedure{count !== 1 ? 's' : ''}</span>
            {pkg.procedures && pkg.procedures.length > 0 && (
              <>
                {pkg.procedures.slice(0, 2).map((proc, idx) => (
                  <span key={idx} className="text-muted-foreground truncate max-w-xs">
                    • {proc.name}
                  </span>
                ))}
                {pkg.procedures.length > 2 && (
                  <span className="text-muted-foreground">+{pkg.procedures.length - 2} more</span>
                )}
              </>
            )}
          </div>
        );
      },
    },
    {
      header: 'Pricing',
      key: 'pricing',
      cell: (pkg) => (
        <div className="flex flex-col text-sm">
          <span className="text-muted-foreground line-through">₹{pkg.total_charge}</span>
          <span className="font-medium text-green-600">₹{pkg.discounted_charge}</span>
          {pkg.discount_percent && (
            <Badge variant="outline" className="text-xs w-fit bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700">
              {parseFloat(pkg.discount_percent).toFixed(1)}% off
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Savings',
      key: 'savings_amount',
      cell: (pkg) => {
        const savings = pkg.savings_amount || pkg.savings;
        return (
          <span className="font-medium text-green-600">
            {savings ? `₹${savings}` : 'N/A'}
          </span>
        );
      },
    },
    {
      header: 'Status',
      key: 'is_active',
      cell: (pkg) => (
        <Badge variant={pkg.is_active ? 'default' : 'secondary'} className={pkg.is_active ? 'bg-neutral-900 dark:bg-neutral-200' : ''}>
          {pkg.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-5 w-full space-y-3">
      {/* Row 1: Title + inline stats + action */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-lg font-bold leading-none">Procedure Packages</h1>
          <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1"><Package className="h-3 w-3" /> <span className="font-semibold text-foreground">{totalCount}</span> Total</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> <span className="font-semibold text-foreground">{packages.filter(p => p.is_active).length}</span> Active</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><TrendingDown className="h-3 w-3" /> <span className="font-semibold text-foreground">{packages.length > 0 ? (packages.reduce((sum, p) => sum + parseFloat(p.discount_percent || '0'), 0) / packages.length).toFixed(1) : '0'}%</span> Avg Discount</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><Package className="h-3 w-3" /> <span className="font-semibold text-foreground">₹{packages.reduce((sum, p) => sum + parseFloat(p.savings_amount || p.savings || '0'), 0).toFixed(0)}</span> Savings</span>
          </div>
        </div>
        <Button onClick={() => { setDrawerMode('create'); setSelectedPackageId(null); setDrawerOpen(true); }} size="sm" className="w-full sm:w-auto h-7 text-[12px]">
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Package
        </Button>
      </div>

      {/* Mobile-only stats */}
      <div className="flex sm:hidden items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span><span className="font-semibold text-foreground">{totalCount}</span> Total</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{packages.filter(p => p.is_active).length}</span> Active</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{packages.length > 0 ? (packages.reduce((sum, p) => sum + parseFloat(p.discount_percent || '0'), 0) / packages.length).toFixed(1) : '0'}%</span> Avg Discount</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">₹{packages.reduce((sum, p) => sum + parseFloat(p.savings_amount || p.savings || '0'), 0).toFixed(0)}</span> Savings</span>
      </div>

      {/* Row 2: Search + filters */}
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
        <div className="flex gap-1 flex-wrap">
          <Button
            variant={activeFilter === undefined ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-[11px] px-2"
            onClick={() => setActiveFilter(undefined)}
          >
            All Status
          </Button>
          <Button
            variant={activeFilter === true ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-[11px] px-2"
            onClick={() => setActiveFilter(true)}
          >
            Active
          </Button>
          <Button
            variant={activeFilter === false ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-[11px] px-2"
            onClick={() => setActiveFilter(false)}
          >
            Inactive
          </Button>
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
                rows={packages}
                isLoading={isLoading}
                columns={columns}
                getRowId={(pkg) => pkg.id}
                getRowLabel={(pkg) => pkg.name}
                onView={(pkg) => { setDrawerMode('view'); setSelectedPackageId(pkg.id); setDrawerOpen(true); }}
                onEdit={(pkg) => { setDrawerMode('edit'); setSelectedPackageId(pkg.id); setDrawerOpen(true); }}
                onDelete={handleDelete}
                emptyTitle="No packages found"
                emptySubtitle="Try adjusting your filters"
              />

              {!isLoading && packages.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {packages.length} of {totalCount} package(s)
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={!hasPrevious} onClick={() => setCurrentPage((p) => p - 1)}>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => setCurrentPage((p) => p + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      <ProcedurePackageFormDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode={drawerMode}
        packageId={selectedPackageId}
        onSuccess={mutate}
      />
    </div>
  );
};

export default ProcedurePackages;
