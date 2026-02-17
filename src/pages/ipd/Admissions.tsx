// src/pages/ipd/Admissions.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, DataTableColumn } from '@/components/DataTable';
import { useIPD } from '@/hooks/useIPD';
import { Admission, ADMISSION_STATUS_LABELS } from '@/types/ipd.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import {
  Plus,
  Eye,
  FileText,
  Bed as BedIcon,
  IndianRupee,
  Calendar,
  Clock,
  CheckCircle2,
  Stethoscope,
  Search,
} from 'lucide-react';
import { format } from 'date-fns';
import { AdmissionFormDrawer } from '@/components/ipd/AdmissionFormDrawer';

export default function Admissions() {
  const navigate = useNavigate();
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isDischargeDialogOpen, setIsDischargeDialogOpen] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [dischargeData, setDischargeData] = useState({
    discharge_type: 'Normal',
    discharge_summary: '',
  });

  const { useAdmissions, dischargePatient } = useIPD();

  const { data: admissionsData, isLoading, error: fetchError, mutate } = useAdmissions({ search: searchQuery });

  const admissions = admissionsData?.results || [];

  // Show error state if data fetch fails
  if (fetchError && !isLoading && admissions.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold">IPD Admissions</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-destructive">Failed to load admissions</p>
            <p className="text-sm text-muted-foreground mt-2">{fetchError.message || 'An error occurred'}</p>
            <Button className="mt-4" onClick={() => mutate()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Handle Discharge
  const handleDischarge = async () => {
    if (!selectedAdmission) return;

    try {
      await dischargePatient(selectedAdmission.id, dischargeData);
      toast({
        title: 'Success',
        description: 'Patient discharged successfully',
      });
      setIsDischargeDialogOpen(false);
      setSelectedAdmission(null);
      setDischargeData({ discharge_type: 'Normal', discharge_summary: '' });
      mutate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to discharge patient',
        variant: 'destructive',
      });
    }
  };

  // Open Discharge Dialog
  const openDischargeDialog = (admission: Admission) => {
    setSelectedAdmission(admission);
    setIsDischargeDialogOpen(true);
  };

  // View Details
  const viewDetails = (admission: Admission) => {
    navigate(`/ipd/admissions/${admission.id}`);
  };

  // Handle Billing
  const handleBilling = (admission: Admission) => {
    navigate(`/ipd/admissions/${admission.id}?tab=billing`);
  };

  // Handle Consultation
  const handleConsultation = (admission: Admission) => {
    navigate(`/ipd/admissions/${admission.id}?tab=consultation`);
  };

  // Mobile card renderer
  const renderMobileCard = (row: Admission, actions: any) => {
    return (
      <>
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono font-semibold text-sm">{row.admission_id}</span>
          <Badge
            variant="default"
            className={
              row.status === 'admitted'
                ? 'bg-neutral-800 dark:bg-neutral-300'
                : row.status === 'discharged'
                ? 'bg-neutral-900 dark:bg-neutral-200'
                : row.status === 'transferred'
                ? 'bg-neutral-500 dark:bg-neutral-500'
                : 'bg-neutral-400 dark:bg-neutral-600'
            }
          >
            {ADMISSION_STATUS_LABELS[row.status]}
          </Badge>
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Patient:</span>
            <span className="font-medium">{row.patient_name?.replace(/ None$/, '') || ''}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Ward:</span>
            <span>{row.ward_name}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Bed:</span>
            <span className="font-mono text-xs">{row.bed_number || '-'}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Admitted:</span>
            <span className="text-xs">
              {format(new Date(row.admission_date), 'dd MMM yyyy HH:mm')}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Length of Stay:</span>
            <span>{row.length_of_stay} days</span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleBilling(row);
            }}
            className="flex-1"
          >
            <IndianRupee className="h-3.5 w-3.5 mr-1.5" />
            Billing
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleConsultation(row);
            }}
            className="flex-1"
          >
            <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
            Consult
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {actions.view && (
            <Button size="sm" variant="outline" onClick={actions.view} className="flex-1">
              View
            </Button>
          )}
          {row.status === 'admitted' && (
            <Button size="sm" variant="outline" onClick={() => openDischargeDialog(row)}>
              <FileText className="h-3 w-3 mr-1" />
              Discharge
            </Button>
          )}
        </div>
      </>
    );
  };

  // DataTable columns
  const columns: DataTableColumn<Admission>[] = [
    {
      header: 'Admission ID',
      key: 'admission_id',
      sortable: true,
      filterable: true,
      accessor: (row) => row.admission_id,
      cell: (row) => (
        <span className="font-mono font-medium">{row.admission_id}</span>
      ),
    },
    {
      header: 'Patient',
      key: 'patient_name',
      sortable: true,
      filterable: true,
      accessor: (row) => row.patient_name || '',
      cell: (row) => {
        // Clean up patient name by removing " None" suffix
        const cleanName = row.patient_name?.replace(/ None$/, '') || '';
        return <span className="font-medium">{cleanName}</span>;
      },
    },
    {
      header: 'Ward',
      key: 'ward_name',
      sortable: true,
      filterable: true,
      accessor: (row) => row.ward_name || '',
      cell: (row) => <span>{row.ward_name}</span>,
    },
    {
      header: 'Bed',
      key: 'bed_number',
      sortable: true,
      accessor: (row) => row.bed_number || '',
      cell: (row) => (
        <span className="font-mono text-sm">{row.bed_number || '-'}</span>
      ),
    },
    {
      header: 'Admission Date',
      key: 'admission_date',
      sortable: true,
      accessor: (row) => row.admission_date,
      cell: (row) => {
        try {
          return (
            <span className="text-sm">
              {format(new Date(row.admission_date), 'dd MMM yyyy HH:mm')}
            </span>
          );
        } catch {
          return <span className="text-sm text-muted-foreground">Invalid date</span>;
        }
      },
    },
    {
      header: 'Length of Stay',
      key: 'length_of_stay',
      sortable: true,
      accessor: (row) => row.length_of_stay || 0,
      cell: (row) => (
        <span className="text-sm">
          {row.length_of_stay} {row.length_of_stay === 1 ? 'day' : 'days'}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      sortable: true,
      filterable: true,
      accessor: (row) => row.status,
      cell: (row) => (
        <span
          className={`px-2 py-1 rounded text-xs ${
            row.status === 'admitted'
              ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              : row.status === 'discharged'
              ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              : row.status === 'transferred'
              ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
          }`}
        >
          {ADMISSION_STATUS_LABELS[row.status]}
        </span>
      ),
    },
  ];

  // Calculate statistics from admissions data
  const totalAdmissions = admissionsData?.count || 0;
  const activeAdmissions = admissions.filter(a => a.status === 'admitted').length;
  const dischargedToday = admissions.filter(a => {
    if (a.status === 'discharged' && a.discharge_date) {
      try {
        const dischargeDate = new Date(a.discharge_date);
        const today = new Date();
        return dischargeDate.toDateString() === today.toDateString();
      } catch {
        return false;
      }
    }
    return false;
  }).length;

  return (
    <div className="p-4 md:p-5 w-full space-y-3">
      {/* Row 1: Title + inline stats + action */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-lg font-bold leading-none">IPD Admissions</h1>
          <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> <span className="font-semibold text-foreground">{totalAdmissions}</span> total</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><BedIcon className="h-3 w-3" /> <span className="font-semibold text-foreground">{activeAdmissions}</span> active</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> <span className="font-semibold text-foreground">{dischargedToday}</span> discharged today</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> avg <span className="font-semibold text-foreground">{admissions.length > 0 ? Math.round(admissions.reduce((sum, a) => sum + (a.length_of_stay || 0), 0) / admissions.length) : 0}</span> days</span>
          </div>
        </div>
        <Button onClick={() => setIsCreateDrawerOpen(true)} size="sm" className="w-full sm:w-auto h-7 text-[12px]">
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Admission
        </Button>
      </div>

      {/* Mobile-only stats */}
      <div className="flex sm:hidden items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span><span className="font-semibold text-foreground">{totalAdmissions}</span> total</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{activeAdmissions}</span> active</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{dischargedToday}</span> discharged</span>
      </div>

      {/* Row 2: Search */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative w-full sm:w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-7 text-[12px]"
          />
        </div>
      </div>

      {/* Admissions Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            rows={admissions}
            isLoading={isLoading}
            columns={columns}
            renderMobileCard={renderMobileCard}
            getRowId={(row) => row.id}
            getRowLabel={(row) => `${row.admission_id} - ${row.patient_name}`}
            onView={viewDetails}
            onBilling={handleBilling}
            onConsultation={handleConsultation}
            extraActions={(row) => (
              <>
                {row.status === 'admitted' && (
                  <button
                    onClick={() => openDischargeDialog(row)}
                    className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Discharge
                  </button>
                )}
              </>
            )}
            emptyTitle="No admissions found"
            emptySubtitle="Create a new admission to get started"
          />
        </CardContent>
      </Card>

      {/* Create Admission Drawer */}
      <AdmissionFormDrawer
        open={isCreateDrawerOpen}
        onOpenChange={setIsCreateDrawerOpen}
        onSuccess={mutate}
      />

      {/* Discharge Dialog */}
      <Dialog open={isDischargeDialogOpen} onOpenChange={setIsDischargeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Discharge Patient</DialogTitle>
            <DialogDescription>
              Discharge {selectedAdmission?.patient_name} from {selectedAdmission?.ward_name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="discharge_type">Discharge Type *</Label>
              <Input
                id="discharge_type"
                value={dischargeData.discharge_type}
                onChange={(e) => setDischargeData({ ...dischargeData, discharge_type: e.target.value })}
                placeholder="e.g., Normal, Against Medical Advice"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="discharge_summary">Discharge Summary</Label>
              <Textarea
                id="discharge_summary"
                value={dischargeData.discharge_summary}
                onChange={(e) => setDischargeData({ ...dischargeData, discharge_summary: e.target.value })}
                placeholder="Enter discharge summary and instructions"
                rows={5}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDischargeDialogOpen(false);
              setSelectedAdmission(null);
              setDischargeData({ discharge_type: 'Normal', discharge_summary: '' });
            }}>
              Cancel
            </Button>
            <Button onClick={handleDischarge}>Discharge Patient</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}