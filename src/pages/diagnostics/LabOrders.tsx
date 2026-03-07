// src/pages/diagnostics/LabOrders.tsx
import React, { useState, useMemo } from 'react';
import { useDiagnostics } from '@/hooks/useDiagnostics';
import { DataTable, DataTableColumn } from '@/components/DataTable';
import { SideDrawer, DrawerActionButton } from '@/components/SideDrawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { Search, Microscope, Clock, CheckCircle2, XCircle, Activity, FileText, Eye, Download, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { DiagnosticOrder, Requisition, CreateLabReportPayload, LabReport } from '@/types/diagnostics.types';

type DiagnosticOrderStatus = 'pending' | 'sample_collected' | 'processing' | 'completed' | 'cancelled';

const STATUS_OPTIONS: { value: DiagnosticOrderStatus; label: string; icon: React.ReactNode }[] = [
  { value: 'pending', label: 'Pending', icon: <Clock className="h-3 w-3" /> },
  { value: 'sample_collected', label: 'Sample Collected', icon: <Activity className="h-3 w-3" /> },
  { value: 'processing', label: 'Processing', icon: <Clock className="h-3 w-3" /> },
  { value: 'completed', label: 'Completed', icon: <CheckCircle2 className="h-3 w-3" /> },
  { value: 'cancelled', label: 'Cancelled', icon: <XCircle className="h-3 w-3" /> },
];

const STATUS_COLORS: Record<DiagnosticOrderStatus, string> = {
  pending: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
  sample_collected: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
  processing: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
  completed: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
  cancelled: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
};

interface FlattenedLabOrder extends DiagnosticOrder {
  requisition_number: string;
  order_date: string;
  priority: string;
}

export const LabOrders: React.FC = () => {
  const navigate = useNavigate();
  const {
    useRequisitions,
    createLabReport,
    useDiagnosticOrders,
    useLabReports,
  } = useDiagnostics();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<DiagnosticOrderStatus | 'all'>('all');

  // Lab report drawer state
  const [reportDrawerOpen, setReportDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'view'>('create');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedReport, setSelectedReport] = useState<LabReport | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<Partial<CreateLabReportPayload>>({ result_data: {} });
  const [resultKey, setResultKey] = useState('');
  const [resultValue, setResultValue] = useState('');

  // Fetch requisitions filtered by type=investigation
  const { data, isLoading } = useRequisitions({ requisition_type: 'investigation' });
  const { data: ordersData } = useDiagnosticOrders();
  const { data: labReportsData } = useLabReports();
  const requisitions: Requisition[] = data?.results || [];
  const orders = ordersData?.results || [];
  const labReports: LabReport[] = labReportsData?.results || [];

  // Map diagnostic_order ID to lab report
  const reportByOrderId = useMemo(() => {
    const map = new Map<number, LabReport>();
    labReports.forEach((report) => {
      map.set(report.diagnostic_order, report);
    });
    return map;
  }, [labReports]);

  // Flatten investigation_orders from all requisitions
  const flattenedOrders: FlattenedLabOrder[] = useMemo(() => {
    return requisitions.flatMap((req) =>
      (req.investigation_orders || []).map((order) => ({
        ...order,
        requisition_number: req.requisition_number,
        order_date: req.order_date,
        priority: req.priority,
      }))
    );
  }, [requisitions]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return flattenedOrders.filter((order) => {
      const matchesSearch =
        order.investigation_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.patient_mobile?.includes(searchTerm) ||
        order.requisition_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.sample_id?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [flattenedOrders, searchTerm, statusFilter]);

  // DataTable columns
  const columns: DataTableColumn<FlattenedLabOrder>[] = [
    {
      header: 'Order #',
      key: 'id',
      accessor: (row) => row.id,
      cell: (row) => <span className="font-mono font-semibold text-sm">#{row.id}</span>,
      sortable: true,
    },
    {
      header: 'Investigation',
      key: 'investigation_name',
      accessor: (row) => row.investigation_name,
      cell: (row) => (
        <span className="font-medium flex items-center gap-1.5">
          <Microscope className="h-3.5 w-3.5 text-muted-foreground" />
          {row.investigation_name}
        </span>
      ),
      sortable: true,
      filterable: true,
    },
    {
      header: 'Patient',
      key: 'patient_name',
      accessor: (row) => row.patient_name,
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span
            className="text-sm font-medium cursor-pointer hover:underline text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/patients/${row.patient}`);
            }}
          >
            {row.patient_name}
          </span>
          {row.patient_mobile && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {row.patient_mobile}
            </span>
          )}
        </div>
      ),
      sortable: true,
      filterable: true,
    },
    {
      header: 'Requisition',
      key: 'requisition_number',
      accessor: (row) => row.requisition_number,
      cell: (row) => <span className="text-sm font-mono">{row.requisition_number}</span>,
      sortable: true,
    },
    {
      header: 'Sample ID',
      key: 'sample_id',
      accessor: (row) => row.sample_id,
      cell: (row) => <span className="text-sm font-mono">{row.sample_id || 'N/A'}</span>,
      sortable: true,
    },
    {
      header: 'Status',
      key: 'status',
      accessor: (row) => row.status,
      cell: (row) => {
        const statusOption = STATUS_OPTIONS.find((s) => s.value === row.status);
        return (
          <Badge className={STATUS_COLORS[row.status]}>
            <span className="flex items-center gap-1">
              {statusOption?.icon}
              {statusOption?.label}
            </span>
          </Badge>
        );
      },
      sortable: true,
      filterable: true,
    },
    {
      header: 'Price',
      key: 'price',
      accessor: (row) => row.price,
      cell: (row) => <span className="text-sm font-semibold">₹{parseFloat(row.price).toLocaleString()}</span>,
      sortable: true,
    },
    {
      header: '',
      key: 'actions',
      accessor: (row) => row.id,
      cell: (row) => {
        const report = reportByOrderId.get(row.id);
        if (row.status === 'completed' && report) {
          return (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[12px]"
              onClick={(e) => {
                e.stopPropagation();
                handleViewReport(report);
              }}
            >
              <Eye className="h-3 w-3 mr-1" />
              View Report
            </Button>
          );
        }
        return (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[12px]"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenCreateReport(row.id);
            }}
          >
            <FileText className="h-3 w-3 mr-1" />
            Create Report
          </Button>
        );
      },
    },
  ];

  // Lab Report handlers
  const handleOpenCreateReport = (orderId: number) => {
    setSelectedOrderId(orderId);
    setSelectedReport(null);
    setDrawerMode('create');
    setFormData({ diagnostic_order: orderId, result_data: {} });
    setSelectedFile(null);
    setResultKey('');
    setResultValue('');
    setReportDrawerOpen(true);
  };

  const handleViewReport = (report: LabReport) => {
    setSelectedReport(report);
    setSelectedOrderId(report.diagnostic_order);
    setDrawerMode('view');
    setFormData({
      diagnostic_order: report.diagnostic_order,
      result_data: report.result_data,
      technician_id: report.technician_id || undefined,
      verified_by: report.verified_by || undefined,
    });
    setReportDrawerOpen(true);
  };

  const handleAddResultField = () => {
    if (resultKey && resultValue) {
      setFormData({
        ...formData,
        result_data: {
          ...formData.result_data,
          [resultKey]: resultValue,
        },
      });
      setResultKey('');
      setResultValue('');
    }
  };

  const handleRemoveResultField = (key: string) => {
    const newResultData = { ...formData.result_data };
    delete newResultData[key];
    setFormData({ ...formData, result_data: newResultData });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmitReport = async () => {
    if (!formData.diagnostic_order) {
      toast.error('Please select a diagnostic order');
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = {
        ...formData,
        attachment: selectedFile || undefined,
      };
      await createLabReport(submitData as CreateLabReportPayload);
      toast.success('Lab report created successfully');
      setReportDrawerOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create lab report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReportDrawerClose = () => {
    setReportDrawerOpen(false);
    setFormData({ result_data: {} });
    setSelectedFile(null);
    setSelectedOrderId(null);
    setSelectedReport(null);
  };

  const reportDrawerButtons: DrawerActionButton[] = drawerMode === 'view'
    ? []
    : [
        {
          label: 'Cancel',
          onClick: handleReportDrawerClose,
          variant: 'outline',
        },
        {
          label: 'Create Report',
          onClick: handleSubmitReport,
          variant: 'default',
          loading: isSubmitting,
          disabled: isSubmitting,
        },
      ];

  // Stats
  const stats = useMemo(() => {
    const total = filteredOrders.length;
    const pending = filteredOrders.filter((o) => o.status === 'pending').length;
    const completed = filteredOrders.filter((o) => o.status === 'completed').length;
    return { total, pending, completed };
  }, [filteredOrders]);

  return (
    <div className="p-4 md:p-5 w-full space-y-3">
      {/* Row 1: Title + inline stats */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-lg font-bold leading-none">Lab Orders</h1>
          <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1"><Microscope className="h-3 w-3" /> <span className="font-semibold text-foreground">{stats.total}</span> Total</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> <span className="font-semibold text-foreground">{stats.pending}</span> Pending</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> <span className="font-semibold text-foreground">{stats.completed}</span> Completed</span>
          </div>
        </div>
      </div>

      {/* Mobile-only stats */}
      <div className="flex sm:hidden items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span><span className="font-semibold text-foreground">{stats.total}</span> Total</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{stats.pending}</span> Pending</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{stats.completed}</span> Completed</span>
      </div>

      {/* Row 2: Search + filters */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative w-full sm:w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-7 text-[12px]"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as DiagnosticOrderStatus | 'all')}
        >
          <SelectTrigger className="w-[160px] h-7 text-[12px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            rows={filteredOrders}
            columns={columns}
            isLoading={isLoading}
            getRowId={(row) => row.id}
            getRowLabel={(row) => `Order #${row.id}`}
            emptyTitle="No lab orders found"
            emptySubtitle="Investigation orders from requisitions will appear here"
            renderMobileCard={(row) => (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono font-semibold text-sm text-primary">#{row.id}</div>
                    <div className="font-medium mt-1 flex items-center gap-1.5">
                      <Microscope className="h-3.5 w-3.5 text-muted-foreground" />
                      {row.investigation_name}
                    </div>
                    <span
                      className="text-sm text-muted-foreground mt-0.5 hover:underline cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); navigate(`/patients/${row.patient}`); }}
                    >
                      {row.patient_name}
                    </span>
                    {row.patient_mobile && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" />
                        {row.patient_mobile}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={STATUS_COLORS[row.status]}>
                      <span className="flex items-center gap-1">
                        {STATUS_OPTIONS.find((s) => s.value === row.status)?.icon}
                        {STATUS_OPTIONS.find((s) => s.value === row.status)?.label}
                      </span>
                    </Badge>
                    <span className="text-sm font-semibold">₹{parseFloat(row.price).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground font-mono">{row.requisition_number}</span>
                  {row.status === 'completed' && reportByOrderId.get(row.id) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[12px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewReport(reportByOrderId.get(row.id)!);
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View Report
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[12px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCreateReport(row.id);
                      }}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Create Report
                    </Button>
                  )}
                </div>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Lab Report Drawer */}
      <SideDrawer
        open={reportDrawerOpen}
        onOpenChange={setReportDrawerOpen}
        onClose={handleReportDrawerClose}
        title={drawerMode === 'view' ? 'Lab Report Details' : 'Create Lab Report'}
        mode={drawerMode === 'view' ? 'view' : 'create'}
        footerButtons={reportDrawerButtons}
        size="lg"
      >
        <div className="space-y-6">
          {/* Diagnostic Order */}
          <div className="space-y-2">
            <Label htmlFor="diagnostic_order">
              Diagnostic Order {drawerMode === 'create' && <span className="text-destructive">*</span>}
            </Label>
            {drawerMode === 'create' ? (
              <select
                id="diagnostic_order"
                className="w-full h-10 px-3 py-2 text-sm border border-input bg-background rounded-md"
                value={formData.diagnostic_order || ''}
                onChange={(e) =>
                  setFormData({ ...formData, diagnostic_order: parseInt(e.target.value) })
                }
              >
                <option value="">Select order</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    Order #{order.id} - {order.investigation_name}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                value={`Order #${formData.diagnostic_order}`}
                disabled
              />
            )}
          </div>

          {/* Result Data */}
          <div className="space-y-2">
            <Label>Test Results</Label>
            {drawerMode === 'create' && (
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Parameter name"
                  value={resultKey}
                  onChange={(e) => setResultKey(e.target.value)}
                />
                <Input
                  placeholder="Value"
                  value={resultValue}
                  onChange={(e) => setResultValue(e.target.value)}
                />
                <Button onClick={handleAddResultField} variant="outline" size="sm">
                  Add
                </Button>
              </div>
            )}
            <Card className="p-4">
              {Object.entries(formData.result_data || {}).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(formData.result_data || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="font-medium">{key}:</span>
                      <div className="flex items-center gap-2">
                        <span>{String(value)}</span>
                        {drawerMode === 'create' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveResultField(key)}
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No results added yet
                </div>
              )}
            </Card>
          </div>

          {/* Attachment */}
          <div className="space-y-2">
            <Label htmlFor="attachment">Attachment</Label>
            {drawerMode === 'create' ? (
              <>
                <Input
                  id="attachment"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                {selectedFile && (
                  <div className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name}
                  </div>
                )}
              </>
            ) : selectedReport?.attachment ? (
              <Button
                variant="outline"
                onClick={() => window.open(selectedReport.attachment!, '_blank')}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Attachment
              </Button>
            ) : (
              <div className="text-sm text-muted-foreground">No attachment</div>
            )}
          </div>

          {/* Technician ID */}
          <div className="space-y-2">
            <Label htmlFor="technician_id">Technician ID</Label>
            <Input
              id="technician_id"
              placeholder="Enter technician UUID"
              value={formData.technician_id || ''}
              onChange={(e) => setFormData({ ...formData, technician_id: e.target.value })}
              disabled={drawerMode === 'view'}
            />
          </div>

          {/* Verified By */}
          <div className="space-y-2">
            <Label htmlFor="verified_by">Verified By</Label>
            <Input
              id="verified_by"
              placeholder="Enter verifier UUID"
              value={formData.verified_by || ''}
              onChange={(e) => setFormData({ ...formData, verified_by: e.target.value })}
              disabled={drawerMode === 'view'}
            />
          </div>

          {/* Verified At - view only */}
          {drawerMode === 'view' && selectedReport?.verified_at && (
            <div className="space-y-2">
              <Label>Verified At</Label>
              <Input
                value={format(new Date(selectedReport.verified_at), 'MMM dd, yyyy HH:mm')}
                disabled
              />
            </div>
          )}

          {/* Created At - view only */}
          {drawerMode === 'view' && selectedReport?.created_at && (
            <div className="space-y-2">
              <Label>Created At</Label>
              <Input
                value={format(new Date(selectedReport.created_at), 'MMM dd, yyyy HH:mm')}
                disabled
              />
            </div>
          )}
        </div>
      </SideDrawer>
    </div>
  );
};

export default LabOrders;
