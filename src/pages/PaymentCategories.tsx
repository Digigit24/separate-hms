// src/pages/PaymentCategories.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { usePayment } from '@/hooks/usePayment';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import type { RowActions } from '@/components/DataTable';
import PaymentCategoryDetailsDrawer from '@/components/payment-category-drawer/PaymentCategoryDetailsDrawer';
import {
  Plus,
  Package,
  RefreshCw,
} from 'lucide-react';
import { PaymentCategory } from '@/types/payment.types';
import { toast } from 'sonner';

type DrawerMode = 'view' | 'edit' | 'create';

export const PaymentCategories: React.FC = () => {
  const {
    usePaymentCategories,
    deletePaymentCategory,
  } = usePayment();

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('view');

  // Build query params
  const queryParams = {
    page: currentPage,
    page_size: 20,
  };

  // Fetch categories
  const {
    data: categoriesData,
    error: categoriesError,
    isLoading: categoriesLoading,
    mutate: mutateCategories,
  } = usePaymentCategories(queryParams);

  const categories = categoriesData?.results || [];
  const totalCount = categoriesData?.count || 0;

  // Handlers
  const handleCreateCategory = useCallback(() => {
    setSelectedCategoryId(null);
    setDrawerMode('create');
    setDrawerOpen(true);
  }, []);

  const handleViewCategory = useCallback((category: PaymentCategory) => {
    setSelectedCategoryId(category.id);
    setDrawerMode('view');
    setDrawerOpen(true);
  }, []);

  const handleEditCategory = useCallback((category: PaymentCategory) => {
    setSelectedCategoryId(category.id);
    setDrawerMode('edit');
    setDrawerOpen(true);
  }, []);

  const handleDeleteCategory = useCallback(
    async (category: PaymentCategory) => {
      try {
        await deletePaymentCategory(category.id);
        toast.success(`Category "${category.name}" deleted successfully`);
        mutateCategories();
      } catch (error: any) {
        toast.error(error?.message || 'Failed to delete category');
        throw error;
      }
    },
    [deletePaymentCategory, mutateCategories]
  );

  const handleDrawerSuccess = useCallback(() => {
    mutateCategories();
  }, [mutateCategories]);

  const handleModeChange = useCallback((mode: DrawerMode) => {
    setDrawerMode(mode);
  }, []);

  // Category type badge
  const getCategoryTypeBadge = (type: string) => {
    switch (type) {
      case 'income':
        return <Badge className="bg-neutral-900 dark:bg-neutral-200 text-white dark:text-neutral-900">Income</Badge>;
      case 'expense':
        return <Badge className="bg-neutral-500 dark:bg-neutral-500 text-white">Expense</Badge>;
      case 'refund':
        return <Badge className="bg-neutral-700 dark:bg-neutral-400 text-white dark:text-neutral-900">Refund</Badge>;
      case 'adjustment':
        return <Badge className="bg-neutral-600 dark:bg-neutral-500 text-white">Adjustment</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  // Column definitions
  const columns: DataTableColumn<PaymentCategory>[] = useMemo(
    () => [
      {
        header: 'Category Name',
        key: 'name',
        cell: (category) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{category.name}</span>
            {category.description && (
              <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                {category.description}
              </span>
            )}
          </div>
        ),
        className: 'w-[250px]',
        sortable: true,
        filterable: true,
        accessor: (category) => category.name,
      },
      {
        header: 'Type',
        key: 'type',
        cell: (category) => getCategoryTypeBadge(category.category_type),
        sortable: true,
        filterable: true,
        accessor: (category) => category.category_type,
      },
      {
        header: 'Description',
        key: 'description',
        cell: (category) => (
          <span className="text-sm text-muted-foreground">
            {category.description || '-'}
          </span>
        ),
        sortable: false,
        filterable: true,
        accessor: (category) => category.description || '',
      },
      {
        header: 'Created',
        key: 'created',
        cell: (category) => (
          <span className="text-sm text-muted-foreground">
            {category.created_at
              ? new Date(category.created_at).toLocaleDateString()
              : '-'}
          </span>
        ),
        sortable: true,
        filterable: false,
        accessor: (category) =>
          category.created_at ? new Date(category.created_at).getTime() : 0,
      },
    ],
    []
  );

  // Mobile card renderer
  const renderMobileCard = (category: PaymentCategory, actions: RowActions<PaymentCategory>) => (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base">{category.name}</h3>
          {category.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{category.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {getCategoryTypeBadge(category.category_type)}
        </div>
      </div>

      {/* Meta Info */}
      {category.created_at && (
        <div className="text-xs text-muted-foreground">
          Created {new Date(category.created_at).toLocaleDateString()}
        </div>
      )}

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

  return (
    <div className="p-4 md:p-5 w-full space-y-3">
      {/* Row 1: Title + inline stats + action */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-lg font-bold leading-none">Payment Categories</h1>
          {categoriesData && (
            <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
              <span className="flex items-center gap-1"><Package className="h-3 w-3" /> <span className="font-semibold text-foreground">{totalCount}</span> total</span>
              <span className="text-border">|</span>
              <span><span className="font-semibold text-foreground">{categories.filter(c => c.category_type === 'income').length}</span> income</span>
              <span className="text-border">|</span>
              <span><span className="font-semibold text-foreground">{categories.filter(c => c.category_type === 'expense').length}</span> expense</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutateCategories()}
            disabled={categoriesLoading}
            className="h-7 text-[12px]"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${categoriesLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleCreateCategory} size="sm" className="w-full sm:w-auto h-7 text-[12px]">
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Category
          </Button>
        </div>
      </div>

      {/* Mobile-only stats */}
      {categoriesData && (
        <div className="flex sm:hidden items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
          <span><span className="font-semibold text-foreground">{totalCount}</span> total</span>
          <span className="text-border">|</span>
          <span><span className="font-semibold text-foreground">{categories.filter(c => c.category_type === 'income').length}</span> income</span>
          <span className="text-border">|</span>
          <span><span className="font-semibold text-foreground">{categories.filter(c => c.category_type === 'expense').length}</span> expense</span>
        </div>
      )}

      {/* Main Content */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            rows={categories}
            isLoading={categoriesLoading}
            columns={columns}
            renderMobileCard={renderMobileCard}
            getRowId={(category) => category.id}
            getRowLabel={(category) => category.name}
            onView={handleViewCategory}
            onEdit={handleEditCategory}
            onDelete={handleDeleteCategory}
            emptyTitle="No categories found"
            emptySubtitle="Get started by creating your first category"
          />

          {/* Pagination */}
          {!categoriesLoading && categoriesData && categoriesData.count > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {categories.length} of {totalCount} categor{totalCount === 1 ? 'y' : 'ies'}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!categoriesData.previous}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!categoriesData.next}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Drawer */}
      <PaymentCategoryDetailsDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        categoryId={selectedCategoryId}
        mode={drawerMode}
        onSuccess={handleDrawerSuccess}
        onDelete={(id) => {
          // Already handled in handleDeleteCategory
        }}
        onModeChange={handleModeChange}
      />
    </div>
  );
};

export default PaymentCategories;
