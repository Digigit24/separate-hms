// src/pages/Transactions.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { usePayment } from '@/hooks/usePayment';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import type { RowActions } from '@/components/DataTable';
import TransactionDetailsDrawer from '@/components/transaction-drawer/TransactionDetailsDrawer';
import {
  Plus,
  CreditCard,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';
import { Transaction } from '@/types/payment.types';
import { format } from 'date-fns';
import { toast } from 'sonner';

type DrawerMode = 'view' | 'edit' | 'create';

export const Transactions: React.FC = () => {
  const {
    useTransactions,
    useTransactionStatistics,
    deleteTransaction,
  } = usePayment();

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('view');

  // Build query params
  const queryParams = {
    page: currentPage,
    page_size: 20,
    ordering: '-created_at',
  };

  // Fetch transactions
  const {
    data: transactionsData,
    error: transactionsError,
    isLoading: transactionsLoading,
    mutate: mutateTransactions
  } = useTransactions(queryParams);

  // Fetch statistics
  const {
    data: stats,
    isLoading: statsLoading
  } = useTransactionStatistics();

  const transactions = transactionsData?.results || [];
  const totalCount = transactionsData?.count || 0;

  // Handlers
  const handleCreateTransaction = useCallback(() => {
    setSelectedTransactionId(null);
    setDrawerMode('create');
    setDrawerOpen(true);
  }, []);

  const handleViewTransaction = useCallback((transaction: Transaction) => {
    setSelectedTransactionId(transaction.id);
    setDrawerMode('view');
    setDrawerOpen(true);
  }, []);

  const handleEditTransaction = useCallback((transaction: Transaction) => {
    setSelectedTransactionId(transaction.id);
    setDrawerMode('edit');
    setDrawerOpen(true);
  }, []);

  const handleDeleteTransaction = useCallback(
    async (transaction: Transaction) => {
      try {
        await deleteTransaction(transaction.id);
        toast.success(`Transaction "${transaction.transaction_number}" deleted successfully`);
        mutateTransactions();
      } catch (error: any) {
        toast.error(error?.message || 'Failed to delete transaction');
        throw error;
      }
    },
    [deleteTransaction, mutateTransactions]
  );

  const handleDrawerSuccess = useCallback(() => {
    mutateTransactions();
  }, [mutateTransactions]);

  const handleModeChange = useCallback((mode: DrawerMode) => {
    setDrawerMode(mode);
  }, []);

  // Transaction type badge
  const getTransactionTypeBadge = (type: string) => {
    switch (type) {
      case 'payment':
        return <Badge className="bg-neutral-900 dark:bg-neutral-200 text-white dark:text-neutral-900">Payment</Badge>;
      case 'refund':
        return <Badge className="bg-neutral-700 dark:bg-neutral-400 text-white dark:text-neutral-900">Refund</Badge>;
      case 'expense':
        return <Badge className="bg-neutral-500 dark:bg-neutral-500 text-white">Expense</Badge>;
      case 'adjustment':
        return <Badge className="bg-neutral-600 dark:bg-neutral-500 text-white">Adjustment</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  // Payment method badge
  const getPaymentMethodBadge = (method?: string) => {
    if (!method) return null;
    return <Badge variant="outline">{method.toUpperCase()}</Badge>;
  };

  // Column definitions
  const columns: DataTableColumn<Transaction>[] = useMemo(
    () => [
      {
        header: 'Transaction #',
        key: 'transaction_number',
        cell: (transaction) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{transaction.transaction_number}</span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(transaction.created_at), 'MMM dd, yyyy')}
            </span>
          </div>
        ),
        className: 'w-[180px]',
        sortable: true,
        filterable: true,
        accessor: (transaction) => transaction.transaction_number,
      },
      {
        header: 'Type',
        key: 'type',
        cell: (transaction) => (
          <div className="flex flex-col gap-1">
            {getTransactionTypeBadge(transaction.transaction_type)}
            {transaction.payment_method && getPaymentMethodBadge(transaction.payment_method)}
          </div>
        ),
        sortable: true,
        filterable: true,
        accessor: (transaction) => transaction.transaction_type,
      },
      {
        header: 'Category',
        key: 'category',
        cell: (transaction) => (
          <div className="flex flex-col">
            <span className="font-medium">{transaction.category.name}</span>
            <span className="text-xs text-muted-foreground capitalize">
              {transaction.category.category_type}
            </span>
          </div>
        ),
        sortable: true,
        filterable: true,
        accessor: (transaction) => transaction.category.name,
      },
      {
        header: 'Amount',
        key: 'amount',
        cell: (transaction) => (
          <div className="flex items-center gap-1.5">
            <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold">
              ₹{parseFloat(transaction.amount).toLocaleString()}
            </span>
          </div>
        ),
        className: 'text-right',
        sortable: true,
        filterable: false,
        accessor: (transaction) => parseFloat(transaction.amount),
      },
      {
        header: 'Description',
        key: 'description',
        cell: (transaction) => (
          <span className="text-sm text-muted-foreground truncate max-w-[300px] block">
            {transaction.description || '-'}
          </span>
        ),
        sortable: false,
        filterable: true,
        accessor: (transaction) => transaction.description || '',
      },
      {
        header: 'Status',
        key: 'status',
        cell: (transaction) => (
          <div>
            {transaction.is_reconciled ? (
              <Badge variant="outline" className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700">
                Reconciled
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700">
                Pending
              </Badge>
            )}
          </div>
        ),
        sortable: true,
        filterable: false,
        accessor: (transaction) => (transaction.is_reconciled ? 'reconciled' : 'pending'),
      },
    ],
    []
  );

  // Mobile card renderer
  const renderMobileCard = (transaction: Transaction, actions: RowActions<Transaction>) => (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base">{transaction.transaction_number}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(transaction.created_at), 'MMM dd, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {getTransactionTypeBadge(transaction.transaction_type)}
        </div>
      </div>

      {/* Category & Payment Method */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{transaction.category.name}</span>
        {transaction.payment_method && getPaymentMethodBadge(transaction.payment_method)}
      </div>

      {/* Amount */}
      <div className="flex items-center gap-1.5">
        <IndianRupee className="h-4 w-4 text-muted-foreground" />
        <span className="text-lg font-semibold">
          ₹{parseFloat(transaction.amount).toLocaleString()}
        </span>
      </div>

      {/* Description */}
      {transaction.description && (
        <p className="text-sm text-muted-foreground">{transaction.description}</p>
      )}

      {/* Status */}
      <div className="flex items-center gap-2">
        {transaction.is_reconciled ? (
          <Badge variant="outline" className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700">
            Reconciled
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700">
            Pending
          </Badge>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t">
        <span className="text-xs text-muted-foreground">
          {format(new Date(transaction.updated_at), 'MMM dd, yyyy h:mm a')}
        </span>
        <div className="flex gap-2">
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
      </div>
    </>
  );

  return (
    <div className="p-4 md:p-5 w-full space-y-3">
      {/* Row 1: Title + inline stats + action */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-lg font-bold leading-none">Transactions</h1>
          {stats && (
            <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
              <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> <span className="font-semibold text-foreground">₹{stats.overall_stats.total_payments.toLocaleString()}</span> payments</span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1"><TrendingDown className="h-3 w-3" /> <span className="font-semibold text-foreground">₹{stats.overall_stats.total_expenses.toLocaleString()}</span> expenses</span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" /> <span className="font-semibold text-foreground">{stats.overall_stats.total_transactions}</span> txns</span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" /> net <span className="font-semibold text-foreground">₹{stats.overall_stats.total_amount.toLocaleString()}</span></span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutateTransactions()}
            disabled={transactionsLoading}
            className="h-7 text-[12px]"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${transactionsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleCreateTransaction} size="sm" className="w-full sm:w-auto h-7 text-[12px]">
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Transaction
          </Button>
        </div>
      </div>

      {/* Mobile-only stats */}
      {stats && (
        <div className="flex sm:hidden items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
          <span>₹<span className="font-semibold text-foreground">{stats.overall_stats.total_payments.toLocaleString()}</span> in</span>
          <span className="text-border">|</span>
          <span>₹<span className="font-semibold text-foreground">{stats.overall_stats.total_expenses.toLocaleString()}</span> out</span>
          <span className="text-border">|</span>
          <span><span className="font-semibold text-foreground">{stats.overall_stats.total_transactions}</span> txns</span>
        </div>
      )}

      {/* Main Content */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            rows={transactions}
            isLoading={transactionsLoading}
            columns={columns}
            renderMobileCard={renderMobileCard}
            getRowId={(transaction) => transaction.id}
            getRowLabel={(transaction) => transaction.transaction_number}
            onView={handleViewTransaction}
            onEdit={handleEditTransaction}
            onDelete={handleDeleteTransaction}
            emptyTitle="No transactions found"
            emptySubtitle="Get started by creating your first transaction"
          />

          {/* Pagination */}
          {!transactionsLoading && transactionsData && transactionsData.count > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {transactions.length} of {totalCount} transaction(s)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!transactionsData.previous}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!transactionsData.next}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Drawer */}
      <TransactionDetailsDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        transactionId={selectedTransactionId}
        mode={drawerMode}
        onSuccess={handleDrawerSuccess}
        onDelete={(id) => {
          // Already handled in handleDeleteTransaction
        }}
        onModeChange={handleModeChange}
      />
    </div>
  );
};

export default Transactions;
