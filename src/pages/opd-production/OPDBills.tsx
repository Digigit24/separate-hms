// src/pages/opd-production/OPDBills.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOPDBill } from '@/hooks/useOPDBill';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumn } from '@/components/DataTable';
import { Loader2, Plus, Search, IndianRupee, FileText, CreditCard, AlertCircle, CheckCircle2, Clock, TrendingUp, PieChart } from 'lucide-react';
import { OPDBill, OPDBillListParams } from '@/types/opdBill.types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { OPDBillFormDrawer } from '@/components/OPDBillFormDrawer';

export const OPDBills: React.FC = () => {
  const navigate = useNavigate();
  const { useOPDBills, deleteBill, useOPDBillStatistics, printBill, recordBillPayment } = useOPDBill();

  const [searchTerm, setSearchTerm] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'paid' | 'unpaid' | 'partial' | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);

  const queryParams: OPDBillListParams = {
    page: currentPage,
    search: searchTerm || undefined,
    payment_status: paymentStatusFilter || undefined,
  };

  const { data: billsData, error, isLoading, mutate } = useOPDBills(queryParams);
  const { data: statistics, error: statsError } = useOPDBillStatistics();

  const bills = billsData?.results || [];
  const totalCount = billsData?.count || 0;
  const hasNext = !!billsData?.next;
  const hasPrevious = !!billsData?.previous;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleDelete = async (bill: OPDBill) => {
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

  const handlePrint = async (bill: OPDBill) => {
    try {
      const result = await printBill(bill.id);
      window.open(result.pdf_url, '_blank');
      toast.success('Bill printed');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Mobile card renderer
  const renderMobileCard = (bill: OPDBill, actions: any) => {
    const statusConfig = {
      paid: { label: 'Paid', className: 'bg-neutral-900 dark:bg-neutral-200' },
      partial: { label: 'Partial', className: 'bg-neutral-600 dark:bg-neutral-500' },
      unpaid: { label: 'Unpaid', className: 'bg-neutral-500' },
    };
    const config = bill.payment_status ? statusConfig[bill.payment_status] : null;

    return (
      <>
        {/* Header Row */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base font-mono truncate">{bill.bill_number}</h3>
            <p className="text-sm text-muted-foreground">
              {format(new Date(bill.bill_date), 'MMM dd, yyyy')}
            </p>
          </div>
          {config && (
            <Badge variant="default" className={config.className}>
              {config.label}
            </Badge>
          )}
        </div>

        {/* Patient & Visit Info */}
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-medium">{bill.patient_name || 'N/A'}</p>
          <p className="text-muted-foreground font-mono text-xs">Visit: {bill.visit_number || `#${bill.visit}`}</p>
        </div>

        {/* Amount Details */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Total Amount</p>
            <p className="font-medium">₹{bill.total_amount}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Balance</p>
            <p className={`font-medium ${parseFloat(bill.balance_amount) > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₹{bill.balance_amount}
            </p>
          </div>
        </div>

        {/* Type Badge */}
        <div>
          <Badge variant="secondary" className="text-xs">
            {bill.bill_type ? bill.bill_type.toUpperCase() : 'N/A'}
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {actions.view && (
            <Button size="sm" variant="outline" onClick={actions.view} className="flex-1">
              View
            </Button>
          )}
          {actions.edit && (
            <Button size="sm" variant="outline" onClick={actions.edit} className="flex-1">
              Edit
            </Button>
          )}
          {actions.askDelete && (
            <Button size="sm" variant="destructive" onClick={actions.askDelete}>
              Delete
            </Button>
          )}
        </div>
      </>
    );
  };

  const columns: DataTableColumn<OPDBill>[] = [
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
      header: 'Visit',
      key: 'visit',
      cell: (bill) => (
        <div className="flex flex-col">
          <span className="font-medium font-mono text-sm">{bill.visit_number || `#${bill.visit}`}</span>
          <span className="text-xs text-muted-foreground">Visit ID: {bill.visit}</span>
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
      header: 'Type',
      key: 'bill_type',
      cell: (bill) => (
        <Badge variant="secondary" className="text-xs">
          {bill.bill_type ? bill.bill_type.toUpperCase() : 'N/A'}
        </Badge>
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
        const config = bill.payment_status ? statusConfig[bill.payment_status] : null;
        if (!config) {
          return (
            <Badge variant="secondary" className="bg-neutral-400 dark:bg-neutral-600">
              Unknown
            </Badge>
          );
        }
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
          <h1 className="text-lg font-bold leading-none">OPD Bills</h1>
          <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> <span className="font-semibold text-foreground">{statistics?.total_bills ?? '-'}</span> Bills</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" /> <span className="font-semibold text-foreground">₹{statistics?.total_revenue ?? '-'}</span> Revenue</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> <span className="font-semibold text-foreground">₹{statistics?.paid_revenue ?? '-'}</span> Paid</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> <span className="font-semibold text-foreground text-red-600">₹{statistics?.pending_amount ?? '-'}</span> Pending</span>
          </div>
        </div>
        <Button onClick={() => { setDrawerMode('create'); setSelectedBillId(null); setDrawerOpen(true); }} size="sm" className="w-full sm:w-auto h-7 text-[12px]">
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Bill
        </Button>
      </div>

      {/* Mobile-only stats */}
      <div className="flex sm:hidden items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span><span className="font-semibold text-foreground">{statistics?.total_bills ?? '-'}</span> Bills</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">₹{statistics?.total_revenue ?? '-'}</span> Revenue</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">₹{statistics?.paid_revenue ?? '-'}</span> Paid</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground text-red-600">₹{statistics?.pending_amount ?? '-'}</span> Pending</span>
      </div>

      {statsError && (
        <Card className="border-border bg-muted">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">Unable to load statistics. The bill list below is still available.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Secondary stats row */}
      <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
        <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> <span className="font-semibold text-foreground">{statistics?.bills_paid ?? '-'}</span> Paid</span>
        <span className="text-border">|</span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> <span className="font-semibold text-foreground">{statistics?.bills_partial ?? '-'}</span> Partial</span>
        <span className="text-border">|</span>
        <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> <span className="font-semibold text-foreground">{statistics?.bills_unpaid ?? '-'}</span> Unpaid</span>
        <span className="text-border">|</span>
        <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> <span className="font-semibold text-foreground">₹{statistics?.average_bill_amount ?? '-'}</span> Avg</span>
      </div>

      {/* Breakdown Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* By OPD Type */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
                <PieChart className="h-4 w-4" />
                Revenue by OPD Type
              </div>
              <div className="space-y-3">
                {statistics.by_opd_type?.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="capitalize">
                        {item.opd_type}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {item.count} bill{item.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className="font-semibold">₹{item.revenue.toFixed(2)}</span>
                  </div>
                ))}
                {(!statistics.by_opd_type || statistics.by_opd_type.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No data available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* By Payment Mode */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
                <CreditCard className="h-4 w-4" />
                Revenue by Payment Mode
              </div>
              <div className="space-y-3">
                {statistics.by_payment_mode?.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="capitalize">
                        {item.payment_mode}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {item.count} payment{item.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className="font-semibold">₹{item.amount.toFixed(2)}</span>
                  </div>
                ))}
                {(!statistics.by_payment_mode || statistics.by_payment_mode.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No data available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                renderMobileCard={renderMobileCard}
                getRowId={(bill) => bill.id}
                getRowLabel={(bill) => bill.bill_number}
                onView={(bill) => navigate(`/opd/consultation/${bill.visit}`, { state: { activeTab: 'billing' } })}
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
      <OPDBillFormDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode={drawerMode}
        billId={selectedBillId}
        onSuccess={mutate}
      />
    </div>
  );
};

export default OPDBills;
