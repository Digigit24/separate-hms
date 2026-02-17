// src/pages/ipd-billing/IPDBillingListPage.tsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIPDBilling } from '@/hooks/useIPDBilling';
import { IPDBilling, PaymentStatus } from '@/types/ipdBilling.types';
import { format } from 'date-fns';
import { Plus, Search, Receipt } from 'lucide-react';
import { toast } from 'sonner';

export const IPDBillingListPage: React.FC = () => {
  const navigate = useNavigate();
  const { useIPDBillings, deleteBilling } = useIPDBilling();

  // Filter states
  const [search, setSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');

  // Build query params
  const queryParams = useMemo(() => {
    const params: any = {
      ordering: '-bill_date',
    };

    if (search) {
      params.search = search;
    }

    if (paymentStatusFilter && paymentStatusFilter !== 'all') {
      params.payment_status = paymentStatusFilter;
    }

    return params;
  }, [search, paymentStatusFilter]);

  // Fetch bills
  const { data: billsData, isLoading, mutate } = useIPDBillings(queryParams);

  const bills = billsData?.results || [];

  // Handle bill click - navigate to billing details
  const handleBillClick = (bill: IPDBilling) => {
    navigate(`/ipd/billing/${bill.id}`);
  };

  // Handle delete bill
  const handleDeleteBill = async (bill: IPDBilling) => {
    try {
      await deleteBilling(bill.id);
      toast.success('Bill deleted successfully');
      mutate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete bill');
    }
  };

  // Payment status badge variant
  const getPaymentStatusVariant = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'partial':
        return 'secondary';
      case 'unpaid':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // DataTable columns
  const columns: DataTableColumn<IPDBilling>[] = [
    {
      header: 'Bill Number',
      key: 'bill_number',
      cell: (bill) => (
        <div className="font-mono font-semibold text-primary">
          {bill.bill_number}
        </div>
      ),
      sortable: true,
      filterable: true,
      accessor: (bill) => bill.bill_number,
    },
    {
      header: 'Patient',
      key: 'patient_name',
      cell: (bill) => (
        <div className="space-y-0.5">
          <div className="font-medium">{bill.patient_name || 'N/A'}</div>
          <div className="text-xs text-muted-foreground">
            Admission: {bill.admission_number || bill.admission}
          </div>
        </div>
      ),
      sortable: true,
      filterable: true,
      accessor: (bill) => bill.patient_name || '',
    },
    {
      header: 'Bill Date',
      key: 'bill_date',
      cell: (bill) => (
        <div className="text-sm">
          {bill.bill_date && new Date(bill.bill_date).toString() !== 'Invalid Date'
            ? format(new Date(bill.bill_date), 'dd MMM yyyy, hh:mm a')
            : 'N/A'}
        </div>
      ),
      sortable: true,
      accessor: (bill) => bill.bill_date,
    },
    {
      header: 'Total Amount',
      key: 'total_amount',
      cell: (bill) => (
        <div className="font-semibold">
          ₹{parseFloat(bill.total_amount || '0').toFixed(2)}
        </div>
      ),
      sortable: true,
      accessor: (bill) => parseFloat(bill.total_amount || '0'),
    },
    {
      header: 'Received',
      key: 'received_amount',
      cell: (bill) => (
        <div className="text-foreground font-medium">
          ₹{parseFloat(bill.received_amount || '0').toFixed(2)}
        </div>
      ),
      sortable: true,
      accessor: (bill) => parseFloat(bill.received_amount || '0'),
    },
    {
      header: 'Balance',
      key: 'balance_amount',
      cell: (bill) => (
        <div className="text-foreground font-medium">
          ₹{parseFloat(bill.balance_amount || '0').toFixed(2)}
        </div>
      ),
      sortable: true,
      accessor: (bill) => parseFloat(bill.balance_amount || '0'),
    },
    {
      header: 'Status',
      key: 'payment_status',
      cell: (bill) => (
        <Badge variant={getPaymentStatusVariant(bill.payment_status)} className="capitalize">
          {bill.payment_status}
        </Badge>
      ),
      sortable: true,
      filterable: true,
      accessor: (bill) => bill.payment_status,
    },
    {
      header: 'Items',
      key: 'items_count',
      cell: (bill) => (
        <div className="text-sm text-muted-foreground">
          {bill.items?.length || 0} item(s)
        </div>
      ),
      accessor: (bill) => bill.items?.length || 0,
    },
  ];

  // Mobile card render
  const renderMobileCard = (bill: IPDBilling) => (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-mono font-semibold text-primary mb-1">
            {bill.bill_number}
          </div>
          <div className="text-sm font-medium truncate">
            {bill.patient_name || 'N/A'}
          </div>
          <div className="text-xs text-muted-foreground">
            Admission: {bill.admission_number || bill.admission}
          </div>
        </div>
        <Badge variant={getPaymentStatusVariant(bill.payment_status)} className="capitalize">
          {bill.payment_status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Total:</span>
          <span className="ml-1 font-semibold">
            ₹{parseFloat(bill.total_amount || '0').toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Balance:</span>
          <span className="ml-1 font-semibold text-orange-600">
            ₹{parseFloat(bill.balance_amount || '0').toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Items:</span>
          <span className="ml-1">{bill.items?.length || 0}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Date:</span>
          <span className="ml-1">
            {bill.bill_date && new Date(bill.bill_date).toString() !== 'Invalid Date'
              ? format(new Date(bill.bill_date), 'dd MMM yyyy')
              : 'N/A'}
          </span>
        </div>
      </div>

      <div className="flex gap-2 mt-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            handleBillClick(bill);
          }}
        >
          <Receipt className="h-4 w-4 mr-1" />
          View Bill
        </Button>
      </div>
    </>
  );

  return (
    <div className="p-4 md:p-5 w-full space-y-3">
      {/* Row 1: Title + action */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-bold leading-none">IPD Billing</h1>
        <Button size="sm" className="w-full sm:w-auto h-7 text-[12px]" onClick={() => navigate('/ipd/admissions')}>
          <Plus className="h-3.5 w-3.5 mr-1" /> View Admissions
        </Button>
      </div>

      {/* Row 2: Search + filters */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative w-full sm:w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search bills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-7 text-[12px]"
          />
        </div>
        <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
          <SelectTrigger className="w-[150px] h-7 text-[12px]">
            <SelectValue placeholder="Payment Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            rows={bills}
            isLoading={isLoading}
            columns={columns}
            renderMobileCard={renderMobileCard}
            getRowId={(bill) => bill.id}
            getRowLabel={(bill) => bill.bill_number}
            onRowClick={handleBillClick}
            onDelete={handleDeleteBill}
            emptyTitle="No IPD bills found"
            emptySubtitle="Bills will appear here once they are created for admissions"
          />
        </CardContent>
      </Card>
    </div>
  );
};
