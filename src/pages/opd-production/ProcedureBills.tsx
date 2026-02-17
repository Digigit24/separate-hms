// src/pages/opd-production/ProcedureBills.tsx
import React, { useState } from 'react';
import { useProcedureBill } from '@/hooks/useProcedureBill';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumn } from '@/components/DataTable';
import { Loader2, Plus, Search, IndianRupee, FileText, CreditCard, AlertCircle } from 'lucide-react';
import { ProcedureBill, ProcedureBillListParams } from '@/types/procedureBill.types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ProcedureBillFormDrawer } from '@/components/ProcedureBillFormDrawer';

export const ProcedureBills: React.FC = () => {
  const { useProcedureBills, deleteBill, printBill } = useProcedureBill();

  const [searchTerm, setSearchTerm] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'paid' | 'unpaid' | 'partial' | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);

  const queryParams: ProcedureBillListParams = {
    page: currentPage,
    search: searchTerm || undefined,
    payment_status: paymentStatusFilter || undefined,
  };

  const { data: billsData, error, isLoading, mutate } = useProcedureBills(queryParams);

  const bills = billsData?.results || [];
  const totalCount = billsData?.count || 0;
  const hasNext = !!billsData?.next;
  const hasPrevious = !!billsData?.previous;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleDelete = async (bill: ProcedureBill) => {
    if (window.confirm(`Delete bill ${bill.bill_number}?`)) {
      try {
        await deleteBill(bill.id);
        toast.success('Bill deleted');
        mutate();
      } catch (error: any) {
        toast.error(error.message);
      }
    }
  };

  const handlePrint = async (bill: ProcedureBill) => {
    try {
      const result = await printBill(bill.id);
      window.open(result.pdf_url, '_blank');
      toast.success('Bill printed');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const columns: DataTableColumn<ProcedureBill>[] = [
    {
      header: 'Bill',
      key: 'bill_number',
      cell: (bill) => (
        <div className="flex flex-col">
          <span className="font-medium font-mono text-sm">{bill.bill_number}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(bill.bill_date), 'MMM dd, yyyy')}
          </span>
        </div>
      ),
    },
    {
      header: 'Patient',
      key: 'patient',
      cell: (bill) => (
        <div className="flex flex-col">
          <span className="font-medium">{bill.patient_name || 'N/A'}</span>
          <span className="text-xs text-muted-foreground">{bill.patient_phone}</span>
        </div>
      ),
    },
    {
      header: 'Doctor',
      key: 'doctor',
      cell: (bill) => (
        <span className="text-sm">{bill.doctor_name || 'N/A'}</span>
      ),
    },
    {
      header: 'Items',
      key: 'items',
      cell: (bill) => (
        <div className="flex flex-col text-xs">
          <span className="font-medium">{bill.items.length} items</span>
          {bill.items.slice(0, 2).map((item, idx) => (
            <span key={idx} className="text-muted-foreground truncate max-w-xs">
              • {item.particular_name || `Procedure #${item.procedure}`} x{item.quantity}
            </span>
          ))}
          {bill.items.length > 2 && (
            <span className="text-muted-foreground">+{bill.items.length - 2} more</span>
          )}
        </div>
      ),
    },
    {
      header: 'Amount',
      key: 'total_amount',
      cell: (bill) => (
        <div className="flex flex-col text-sm">
          <span className="font-medium">₹{bill.total_amount}</span>
          {parseFloat(bill.balance_amount) > 0 && (
            <span className="text-xs text-orange-600">Bal: ₹{bill.balance_amount}</span>
          )}
        </div>
      ),
    },
    {
      header: 'Payment',
      key: 'payment_status',
      cell: (bill) => {
        const statusConfig = {
          paid: { label: 'Paid', className: 'bg-neutral-900 dark:bg-neutral-200' },
          partial: { label: 'Partial', className: 'bg-neutral-600 dark:bg-neutral-500' },
          unpaid: { label: 'Unpaid', className: 'bg-neutral-500' },
        };
        const config = statusConfig[bill.payment_status];
        return (
          <Badge variant="default" className={config.className}>
            {config.label}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="p-4 md:p-5 w-full space-y-3">
      {/* Row 1: Title + inline stats + action */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-lg font-bold leading-none">Procedure Bills</h1>
          <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> <span className="font-semibold text-foreground">{totalCount}</span> Bills</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" /> <span className="font-semibold text-foreground">₹{bills.reduce((sum, b) => sum + parseFloat(b.received_amount || '0'), 0).toFixed(0)}</span> Collected</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> <span className="font-semibold text-foreground">₹{bills.reduce((sum, b) => sum + parseFloat(b.balance_amount || '0'), 0).toFixed(0)}</span> Pending</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" /> <span className="font-semibold text-foreground">{bills.filter(b => b.payment_status === 'unpaid').length}</span> Unpaid</span>
          </div>
        </div>
        <Button onClick={() => { setDrawerMode('create'); setSelectedBillId(null); setDrawerOpen(true); }} size="sm" className="w-full sm:w-auto h-7 text-[12px]">
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Bill
        </Button>
      </div>

      {/* Mobile-only stats */}
      <div className="flex sm:hidden items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span><span className="font-semibold text-foreground">{totalCount}</span> Bills</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">₹{bills.reduce((sum, b) => sum + parseFloat(b.received_amount || '0'), 0).toFixed(0)}</span> Collected</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">₹{bills.reduce((sum, b) => sum + parseFloat(b.balance_amount || '0'), 0).toFixed(0)}</span> Pending</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{bills.filter(b => b.payment_status === 'unpaid').length}</span> Unpaid</span>
      </div>

      {/* Row 2: Search + filters */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative w-full sm:w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by bill number, patient..."
            value={searchTerm}
            onChange={handleSearch}
            className="pl-8 h-7 text-[12px]"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          <Button variant={paymentStatusFilter === '' ? 'default' : 'outline'} size="sm" className="h-7 text-[11px] px-2" onClick={() => setPaymentStatusFilter('')}>
            All
          </Button>
          <Button variant={paymentStatusFilter === 'paid' ? 'default' : 'outline'} size="sm" className="h-7 text-[11px] px-2" onClick={() => setPaymentStatusFilter('paid')}>
            Paid
          </Button>
          <Button variant={paymentStatusFilter === 'partial' ? 'default' : 'outline'} size="sm" className="h-7 text-[11px] px-2" onClick={() => setPaymentStatusFilter('partial')}>
            Partial
          </Button>
          <Button variant={paymentStatusFilter === 'unpaid' ? 'default' : 'outline'} size="sm" className="h-7 text-[11px] px-2" onClick={() => setPaymentStatusFilter('unpaid')}>
            Unpaid
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
                rows={bills}
                isLoading={isLoading}
                columns={columns}
                getRowId={(bill) => bill.id}
                getRowLabel={(bill) => bill.bill_number}
                onView={(bill) => handlePrint(bill)}
                onEdit={(bill) => { setDrawerMode('edit'); setSelectedBillId(bill.id); setDrawerOpen(true); }}
                onDelete={handleDelete}
                emptyTitle="No bills found"
                emptySubtitle="Try adjusting your filters"
              />

              {!isLoading && bills.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {bills.length} of {totalCount} bill(s)
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
      <ProcedureBillFormDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode={drawerMode}
        billId={selectedBillId}
        onSuccess={mutate}
      />
    </div>
  );
};

export default ProcedureBills;
