// src/pages/diagnostics/LabReports.tsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useDiagnostics } from '@/hooks/useDiagnostics';
import { DataTable, DataTableColumn } from '@/components/DataTable';
import { SideDrawer, DrawerActionButton } from '@/components/SideDrawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, FileText, CheckCircle2, Download, Upload, Clock, Phone, Send, Loader2, Check, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { LabReport, CreateLabReportPayload } from '@/types/diagnostics.types';
import { externalWhatsappService } from '@/services/externalWhatsappService';
import { templatesService } from '@/services/whatsapp/templatesService';
import { authService } from '@/services/authService';

export const LabReports: React.FC = () => {
  const navigate = useNavigate();
  const {
    useLabReports,
    createLabReport,
    updateLabReport,
    deleteLabReport,
    useDiagnosticOrders,
    updateDiagnosticOrder,
  } = useDiagnostics();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create'>('view');
  const [selectedReport, setSelectedReport] = useState<LabReport | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sendingReportId, setSendingReportId] = useState<number | null>(null);
  const pollTimersRef = useRef<NodeJS.Timeout[]>([]);

  // Cleanup polling timers on unmount
  useEffect(() => {
    return () => {
      pollTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  // Form state
  const [formData, setFormData] = useState<Partial<CreateLabReportPayload>>({
    result_data: {},
  });

  // Fetch data
  const { data, isLoading, mutate } = useLabReports();
  const { data: ordersData, mutate: mutateOrders } = useDiagnosticOrders();

  const reports = data?.results || [];
  const orders = ordersData?.results || [];

  // Build lookup map: order ID -> WhatsApp status from orders
  const orderWhatsappMap = useMemo(() => {
    const map: Record<number, { whatsapp_message_log_id: string | null; whatsapp_delivered: boolean; whatsapp_read: boolean; whatsapp_failed: boolean }> = {};
    orders.forEach((order) => {
      map[order.id] = {
        whatsapp_message_log_id: order.whatsapp_message_log_id,
        whatsapp_delivered: order.whatsapp_delivered,
        whatsapp_read: order.whatsapp_read,
        whatsapp_failed: order.whatsapp_failed,
      };
    });
    return map;
  }, [orders]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        report.id.toString().includes(searchTerm) ||
        report.patient_name?.toLowerCase().includes(term) ||
        report.patient_mobile?.includes(searchTerm) ||
        report.investigation_name?.toLowerCase().includes(term);
      return matchesSearch;
    });
  }, [reports, searchTerm]);

  // DataTable columns
  const columns: DataTableColumn<LabReport>[] = [
    {
      header: 'Report ID',
      key: 'id',
      accessor: (row) => row.id,
      cell: (row) => <span className="font-mono font-semibold text-sm">#{row.id}</span>,
      sortable: true,
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
              // Navigate using diagnostic_order as a fallback; patient ID not in response
              navigate(`/patients`);
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
      header: 'Investigation',
      key: 'investigation_name',
      accessor: (row) => row.investigation_name,
      cell: (row) => <span className="text-sm">{row.investigation_name}</span>,
      sortable: true,
    },
    {
      header: 'Test Order',
      key: 'diagnostic_order',
      accessor: (row) => row.diagnostic_order,
      cell: (row) => <span className="text-sm">Order #{row.diagnostic_order}</span>,
      sortable: true,
    },
    {
      header: 'Created At',
      key: 'created_at',
      accessor: (row) => row.created_at,
      cell: (row) => <span className="text-sm">{format(new Date(row.created_at), 'MMM dd, yyyy HH:mm')}</span>,
      sortable: true,
    },
    {
      header: 'Verified',
      key: 'verified_by',
      accessor: (row) => row.verified_by,
      cell: (row) => {
        if (row.verified_by) {
          return (
            <Badge className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          );
        }
        return <Badge variant="secondary">Pending</Badge>;
      },
      sortable: true,
    },
    {
      header: 'Attachment',
      key: 'attachment',
      accessor: (row) => row.attachment,
      cell: (row) => {
        if (row.attachment) {
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                window.open(row.attachment!, '_blank');
              }}
            >
              <Download className="h-3 w-3 mr-1" />
              View
            </Button>
          );
        }
        return <span className="text-muted-foreground text-sm">No attachment</span>;
      },
    },
    {
      header: 'WhatsApp',
      key: 'send_whatsapp',
      accessor: () => '',
      cell: (row) => {
        const waStatus = orderWhatsappMap[row.diagnostic_order];
        const wasSent = !!waStatus?.whatsapp_message_log_id;

        if (wasSent) {
          return (
            <div className="flex items-center gap-1.5">
              {waStatus.whatsapp_failed ? (
                <Badge variant="destructive" className="text-[11px] h-5 px-1.5">
                  Failed
                </Badge>
              ) : waStatus.whatsapp_read ? (
                <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-[11px] h-5 px-1.5">
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Read
                </Badge>
              ) : waStatus.whatsapp_delivered ? (
                <Badge className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-[11px] h-5 px-1.5">
                  <Check className="h-3 w-3 mr-1" />
                  Sent
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[11px] h-5 px-1.5">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Sending
                </Badge>
              )}
            </div>
          );
        }

        return (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px]"
            disabled={sendingReportId === row.id || !row.patient_mobile || (!row.attachment && !row.attachment_url)}
            onClick={(e) => {
              e.stopPropagation();
              handleSendWhatsApp(row);
            }}
          >
            {sendingReportId === row.id ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Send className="h-3 w-3 mr-1" />
            )}
            Send Report
          </Button>
        );
      },
    },
  ];

  // Handlers
  const handleCreate = () => {
    setFormData({ result_data: {} });
    setSelectedFile(null);
    setSelectedReport(null);
    setDrawerMode('create');
    setDrawerOpen(true);
  };

  const handleView = (report: LabReport) => {
    setSelectedReport(report);
    setFormData({
      diagnostic_order: report.diagnostic_order,
      result_data: report.result_data,
      technician_id: report.technician_id || undefined,
      verified_by: report.verified_by || undefined,
      verified_at: report.verified_at || undefined,
    });
    setDrawerMode('view');
    setDrawerOpen(true);
  };

  const handleEdit = (report: LabReport) => {
    setSelectedReport(report);
    setFormData({
      diagnostic_order: report.diagnostic_order,
      result_data: report.result_data,
      technician_id: report.technician_id || undefined,
      verified_by: report.verified_by || undefined,
      verified_at: report.verified_at || undefined,
    });
    setDrawerMode('edit');
    setDrawerOpen(true);
  };

  const handleDelete = async (report: LabReport) => {
    try {
      await deleteLabReport(report.id);
      toast.success('Lab report deleted successfully');
      mutate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete lab report');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
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

      if (drawerMode === 'create') {
        await createLabReport(submitData as CreateLabReportPayload);
        toast.success('Lab report created successfully');
      } else if (drawerMode === 'edit' && selectedReport) {
        await updateLabReport(selectedReport.id, submitData);
        toast.success('Lab report updated successfully');
      }
      setDrawerOpen(false);
      mutate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save lab report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setFormData({ result_data: {} });
    setSelectedFile(null);
    setSelectedReport(null);
  };

  // Result data fields management
  const [resultKey, setResultKey] = useState('');
  const [resultValue, setResultValue] = useState('');

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

  // Poll WhatsApp delivery status using log_uid
  const pollDeliveryStatus = (logUid: string, orderId: number) => {
    const pollDelays = [30000, 120000, 300000]; // 30s, 2min, 5min

    const checkStatus = async (attemptIndex: number) => {
      try {
        const messageData = await externalWhatsappService.getMessage(logUid);
        const status = messageData?.status;

        // sent, delivered, read, failed are all terminal states
        if (status === 'sent' || status === 'delivered' || status === 'read' || status === 'failed') {
          await updateDiagnosticOrder(orderId, {
            whatsapp_delivered: status === 'sent' || status === 'delivered' || status === 'read',
            whatsapp_read: status === 'read',
            whatsapp_failed: status === 'failed',
          } as any);

          // Refresh orders data so UI updates
          mutateOrders();

          if (status === 'failed') {
            toast.error(`WhatsApp message delivery failed for Order #${orderId}`);
          } else {
            toast.success(`WhatsApp report sent successfully (Order #${orderId})`);
          }
          return; // Stop polling
        }

        // Schedule next poll if we haven't exhausted attempts
        if (attemptIndex + 1 < pollDelays.length) {
          const timer = setTimeout(() => checkStatus(attemptIndex + 1), pollDelays[attemptIndex + 1]);
          pollTimersRef.current.push(timer);
        }
      } catch (error) {
        console.error('Failed to poll WhatsApp delivery status:', error);
        if (attemptIndex + 1 < pollDelays.length) {
          const timer = setTimeout(() => checkStatus(attemptIndex + 1), pollDelays[attemptIndex + 1]);
          pollTimersRef.current.push(timer);
        }
      }
    };

    // Start first poll after 30s
    const timer = setTimeout(() => checkStatus(0), pollDelays[0]);
    pollTimersRef.current.push(timer);
  };

  // Send report on WhatsApp
  const handleSendWhatsApp = async (report: LabReport) => {
    if (!report.patient_mobile) {
      toast.error('Patient mobile number is not available');
      return;
    }
    if (!report.attachment && !report.attachment_url) {
      toast.error('No report attachment available to send');
      return;
    }

    setSendingReportId(report.id);
    try {
      // Get template name from user preferences
      const preferences = authService.getUserPreferences();
      const reportTemplateId = preferences?.whatsappDefaults?.reports;

      let templateName = 'sendreport'; // fallback default
      if (reportTemplateId) {
        const response = await templatesService.getTemplates({ limit: 100 });
        const template = response.items?.find(
          (t) => String(t.id) === String(reportTemplateId)
        );
        if (template?.name) {
          templateName = template.name;
        }
      }

      const documentUrl = report.attachment_url || report.attachment || '';
      const nameParts = (report.patient_name || 'Patient').trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const sendResponse = await externalWhatsappService.sendTemplateMessage({
        phone_number: report.patient_mobile,
        template_name: templateName,
        template_language: 'en',
        first_name: firstName,
        last_name: lastName,
        header_document: documentUrl,
        header_document_name: `Report_${report.id}.pdf`,
        field_1: report.patient_name || 'Patient',
      });

      // Save log_uid to the diagnostic order
      const logUid = sendResponse?.log_uid;
      if (logUid) {
        await updateDiagnosticOrder(report.diagnostic_order, {
          whatsapp_message_log_id: logUid,
          whatsapp_delivered: false,
          whatsapp_read: false,
          whatsapp_failed: false,
        } as any);

        // Refresh orders so UI shows "Sending" status
        mutateOrders();

        // Start polling for delivery status
        pollDeliveryStatus(logUid, report.diagnostic_order);
      }

      toast.success('Report sent on WhatsApp successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send report on WhatsApp');
    } finally {
      setSendingReportId(null);
    }
  };

  // Drawer action buttons
  const drawerButtons: DrawerActionButton[] = drawerMode === 'view'
    ? [
        {
          label: 'Edit',
          onClick: () => {
            setDrawerMode('edit');
          },
          variant: 'default',
        },
      ]
    : [
        {
          label: 'Cancel',
          onClick: handleDrawerClose,
          variant: 'outline',
        },
        {
          label: drawerMode === 'create' ? 'Create' : 'Update',
          onClick: handleSubmit,
          variant: 'default',
          loading: isSubmitting,
          disabled: isSubmitting,
        },
      ];

  // Stats
  const reportStats = useMemo(() => {
    const total = filteredReports.length;
    const verified = filteredReports.filter((r) => r.verified_by).length;
    const pending = total - verified;
    return { total, verified, pending };
  }, [filteredReports]);

  return (
    <div className="p-4 md:p-5 w-full space-y-3">
      {/* Row 1: Title + inline stats + action */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-lg font-bold leading-none">Lab Reports</h1>
          <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> <span className="font-semibold text-foreground">{reportStats.total}</span> Total</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> <span className="font-semibold text-foreground">{reportStats.verified}</span> Verified</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> <span className="font-semibold text-foreground">{reportStats.pending}</span> Pending</span>
          </div>
        </div>
        <Button size="sm" className="w-full sm:w-auto h-7 text-[12px]" onClick={handleCreate}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Report
        </Button>
      </div>

      {/* Mobile-only stats */}
      <div className="flex sm:hidden items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span><span className="font-semibold text-foreground">{reportStats.total}</span> Total</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{reportStats.verified}</span> Verified</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{reportStats.pending}</span> Pending</span>
      </div>

      {/* Row 2: Search */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative w-full sm:w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-7 text-[12px]"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            rows={filteredReports}
            columns={columns}
            isLoading={isLoading}
            onRowClick={handleView}
            getRowId={(row) => row.id}
            getRowLabel={(row) => `Report #${row.id}`}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            emptyTitle="No lab reports found"
            emptySubtitle="Create your first lab report to get started"
            renderMobileCard={(row, actions) => (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono font-semibold text-sm text-primary">Report #{row.id}</div>
                    <span
                      className="text-sm font-medium mt-1 hover:underline cursor-pointer block"
                      onClick={(e) => { e.stopPropagation(); navigate(`/patients`); }}
                    >
                      {row.patient_name}
                    </span>
                    {row.patient_mobile && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" />
                        {row.patient_mobile}
                      </span>
                    )}
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {row.investigation_name} &middot; Order #{row.diagnostic_order}
                    </div>
                  </div>
                  {row.verified_by ? (
                    <Badge className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(row.created_at), 'MMM dd, yyyy HH:mm')}
                </div>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Side Drawer */}
      <SideDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onClose={handleDrawerClose}
        title={
          drawerMode === 'create'
            ? 'Add Lab Report'
            : drawerMode === 'edit'
            ? 'Edit Lab Report'
            : 'Lab Report Details'
        }
        mode={drawerMode}
        footerButtons={drawerButtons}
        size="lg"
      >
        <div className="space-y-6">
          {/* Diagnostic Order */}
          <div className="space-y-2">
            <Label htmlFor="diagnostic_order">
              Diagnostic Order <span className="text-destructive">*</span>
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
                id="diagnostic_order"
                value={`Order #${formData.diagnostic_order}`}
                disabled
              />
            )}
          </div>

          {/* Result Data */}
          <div className="space-y-2">
            <Label>Test Results</Label>
            {drawerMode !== 'view' && (
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
                        {drawerMode !== 'view' && (
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
            {drawerMode !== 'view' ? (
              <div className="space-y-2">
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
              </div>
            ) : (
              selectedReport?.attachment && (
                <Button
                  variant="outline"
                  onClick={() => window.open(selectedReport.attachment!, '_blank')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Attachment
                </Button>
              )
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

          {/* Verification Date/Time */}
          {selectedReport?.verified_at && drawerMode === 'view' && (
            <div className="space-y-2">
              <Label>Verified At</Label>
              <Input
                value={format(new Date(selectedReport.verified_at), 'MMM dd, yyyy HH:mm')}
                disabled
              />
            </div>
          )}
        </div>
      </SideDrawer>
    </div>
  );
};

export default LabReports;
