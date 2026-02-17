// src/pages/AccountingPeriods.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { usePayment } from '@/hooks/usePayment';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import type { RowActions } from '@/components/DataTable';
import AccountingPeriodDetailsDrawer from '@/components/accounting-period-drawer/AccountingPeriodDetailsDrawer';
import {
  Plus,
  Calendar,
  RefreshCw,
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { AccountingPeriod } from '@/types/payment.types';
import { format } from 'date-fns';
import { toast } from 'sonner';

type DrawerMode = 'view' | 'edit' | 'create';

export const AccountingPeriods: React.FC = () => {
  const {
    useAccountingPeriods,
    deleteAccountingPeriod,
  } = usePayment();

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('view');

  // Build query params
  const queryParams = {
    page: currentPage,
    page_size: 20,
    ordering: '-start_date',
  };

  // Fetch accounting periods
  const {
    data: periodsData,
    error: periodsError,
    isLoading: periodsLoading,
    mutate: mutatePeriods,
  } = useAccountingPeriods(queryParams);

  const periods = periodsData?.results || [];
  const totalCount = periodsData?.count || 0;

  // Handlers
  const handleCreatePeriod = useCallback(() => {
    setSelectedPeriodId(null);
    setDrawerMode('create');
    setDrawerOpen(true);
  }, []);

  const handleViewPeriod = useCallback((period: AccountingPeriod) => {
    setSelectedPeriodId(period.id);
    setDrawerMode('view');
    setDrawerOpen(true);
  }, []);

  const handleEditPeriod = useCallback((period: AccountingPeriod) => {
    setSelectedPeriodId(period.id);
    setDrawerMode('edit');
    setDrawerOpen(true);
  }, []);

  const handleDeletePeriod = useCallback(
    async (period: AccountingPeriod) => {
      try {
        await deleteAccountingPeriod(period.id);
        toast.success(`Period "${period.name}" deleted successfully`);
        mutatePeriods();
      } catch (error: any) {
        toast.error(error?.message || 'Failed to delete period');
        throw error;
      }
    },
    [deleteAccountingPeriod, mutatePeriods]
  );

  const handleDrawerSuccess = useCallback(() => {
    mutatePeriods();
  }, [mutatePeriods]);

  const handleModeChange = useCallback((mode: DrawerMode) => {
    setDrawerMode(mode);
  }, []);

  // Period type badge
  const getPeriodTypeBadge = (type: string) => {
    switch (type) {
      case 'monthly':
        return <Badge variant="outline">Monthly</Badge>;
      case 'quarterly':
        return <Badge variant="outline">Quarterly</Badge>;
      case 'annual':
        return <Badge variant="outline">Annual</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Column definitions
  const columns: DataTableColumn<AccountingPeriod>[] = useMemo(
    () => [
      {
        header: 'Period Name',
        key: 'name',
        cell: (period) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{period.name}</span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(period.start_date), 'MMM dd, yyyy')} - {format(new Date(period.end_date), 'MMM dd, yyyy')}
            </span>
          </div>
        ),
        className: 'w-[200px]',
        sortable: true,
        filterable: true,
        accessor: (period) => period.name,
      },
      {
        header: 'Type',
        key: 'type',
        cell: (period) => (
          <div className="flex flex-col gap-1">
            {getPeriodTypeBadge(period.period_type)}
            {period.is_closed ? (
              <Badge className="bg-neutral-500 w-fit">
                <Lock className="mr-1 h-3 w-3" />
                Closed
              </Badge>
            ) : (
              <Badge className="bg-neutral-900 dark:bg-neutral-200 text-white dark:text-neutral-900 w-fit">
                <Unlock className="mr-1 h-3 w-3" />
                Open
              </Badge>
            )}
          </div>
        ),
        sortable: true,
        filterable: true,
        accessor: (period) => period.period_type,
      },
      {
        header: 'Income',
        key: 'income',
        cell: (period) => (
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-green-600" />
            <span className="font-semibold text-green-600">
              ₹{parseFloat(period.total_income).toLocaleString()}
            </span>
          </div>
        ),
        className: 'text-right',
        sortable: true,
        filterable: false,
        accessor: (period) => parseFloat(period.total_income),
      },
      {
        header: 'Expenses',
        key: 'expenses',
        cell: (period) => (
          <div className="flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5 text-red-600" />
            <span className="font-semibold text-red-600">
              ₹{parseFloat(period.total_expenses).toLocaleString()}
            </span>
          </div>
        ),
        className: 'text-right',
        sortable: true,
        filterable: false,
        accessor: (period) => parseFloat(period.total_expenses),
      },
      {
        header: 'Net Profit',
        key: 'profit',
        cell: (period) => {
          const netProfit = parseFloat(period.net_profit);
          const isPositive = netProfit >= 0;
          return (
            <div className="flex items-center gap-1.5">
              {isPositive ? (
                <TrendingUp className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-600" />
              )}
              <span className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                ₹{netProfit.toLocaleString()}
              </span>
            </div>
          );
        },
        className: 'text-right',
        sortable: true,
        filterable: false,
        accessor: (period) => parseFloat(period.net_profit),
      },
    ],
    []
  );

  // Mobile card renderer
  const renderMobileCard = (period: AccountingPeriod, actions: RowActions<AccountingPeriod>) => (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base">{period.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(period.start_date), 'MMM dd, yyyy')} - {format(new Date(period.end_date), 'MMM dd, yyyy')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {getPeriodTypeBadge(period.period_type)}
          {period.is_closed ? (
            <Badge className="bg-neutral-500 dark:bg-neutral-500 text-white">
              <Lock className="mr-1 h-3 w-3" />
              Closed
            </Badge>
          ) : (
            <Badge className="bg-neutral-900 dark:bg-neutral-200 text-white dark:text-neutral-900">
              <Unlock className="mr-1 h-3 w-3" />
              Open
            </Badge>
          )}
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Income</p>
          <p className="text-sm font-semibold text-green-600">
            ₹{parseFloat(period.total_income).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Expenses</p>
          <p className="text-sm font-semibold text-red-600">
            ₹{parseFloat(period.total_expenses).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Net Profit</p>
          <p className={`text-sm font-semibold ${parseFloat(period.net_profit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ₹{parseFloat(period.net_profit).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end pt-2 border-t gap-2">
        {actions.edit && (
          <Button variant="outline" size="sm" onClick={actions.edit}>
            Edit
          </Button>
        )}
        {actions.view && (
          <Button variant="default" size="sm" onClick={actions.view}>
            View
          </Button>
        )}
      </div>
    </>
  );

  // Calculate stats
  const stats = useMemo(() => {
    const openPeriods = periods.filter(p => !p.is_closed);
    const closedPeriods = periods.filter(p => p.is_closed);
    const totalIncome = periods.reduce((sum, p) => sum + parseFloat(p.total_income), 0);
    const totalExpenses = periods.reduce((sum, p) => sum + parseFloat(p.total_expenses), 0);
    const netProfit = totalIncome - totalExpenses;

    return {
      openCount: openPeriods.length,
      closedCount: closedPeriods.length,
      totalIncome,
      totalExpenses,
      netProfit,
    };
  }, [periods]);

  return (
    <div className="p-4 md:p-5 w-full space-y-3">
      {/* Row 1: Title + inline stats + action */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-lg font-bold leading-none">Accounting Periods</h1>
          {periodsData && (
            <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> <span className="font-semibold text-foreground">{totalCount}</span> total</span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1"><Unlock className="h-3 w-3" /> <span className="font-semibold text-foreground">{stats.openCount}</span> open</span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> <span className="font-semibold text-foreground">{stats.closedCount}</span> closed</span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1">{stats.netProfit >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />} net <span className="font-semibold text-foreground">₹{stats.netProfit.toLocaleString()}</span></span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutatePeriods()}
            disabled={periodsLoading}
            className="h-7 text-[12px]"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${periodsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleCreatePeriod} size="sm" className="w-full sm:w-auto h-7 text-[12px]">
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Period
          </Button>
        </div>
      </div>

      {/* Mobile-only stats */}
      {periodsData && (
        <div className="flex sm:hidden items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
          <span><span className="font-semibold text-foreground">{totalCount}</span> total</span>
          <span className="text-border">|</span>
          <span><span className="font-semibold text-foreground">{stats.openCount}</span> open</span>
          <span className="text-border">|</span>
          <span><span className="font-semibold text-foreground">{stats.closedCount}</span> closed</span>
          <span className="text-border">|</span>
          <span>net ₹<span className="font-semibold text-foreground">{stats.netProfit.toLocaleString()}</span></span>
        </div>
      )}

      {/* Main Content */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            rows={periods}
            isLoading={periodsLoading}
            columns={columns}
            renderMobileCard={renderMobileCard}
            getRowId={(period) => period.id}
            getRowLabel={(period) => period.name}
            onView={handleViewPeriod}
            onEdit={handleEditPeriod}
            onDelete={handleDeletePeriod}
            emptyTitle="No accounting periods found"
            emptySubtitle="Get started by creating your first accounting period"
          />

          {/* Pagination */}
          {!periodsLoading && periodsData && periodsData.count > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {periods.length} of {totalCount} period{totalCount === 1 ? '' : 's'}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!periodsData.previous}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!periodsData.next}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Period Drawer */}
      <AccountingPeriodDetailsDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        periodId={selectedPeriodId}
        mode={drawerMode}
        onSuccess={handleDrawerSuccess}
        onDelete={(id) => {
          // Already handled in handleDeletePeriod
        }}
        onModeChange={handleModeChange}
      />
    </div>
  );
};

export default AccountingPeriods;
