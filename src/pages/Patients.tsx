// src/pages/Patients.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '@/hooks/usePatient';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumn } from '@/components/DataTable';
import PatientsFormDrawer from '@/components/PatientsFormDrawer';
import {
  Loader2,
  Plus,
  Search,
  Users,
  Activity,
  Heart,
  TrendingUp
} from 'lucide-react';
import { PatientListParams, Patient } from '@/types/patient.types';

export const Patients: React.FC = () => {
  const { user, hasModuleAccess } = useAuth();
  const navigate = useNavigate();
  const {
    hasHMSAccess,
    usePatients,
    deletePatient,
  } = usePatient();

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'deceased' | ''>('');
  const [currentPage, setCurrentPage] = useState(1);

  // Drawer state (only for create mode now)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create'>('view');

  // Build query params
  const queryParams: PatientListParams = {
    page: currentPage,
    search: searchTerm || undefined,
    status: statusFilter || undefined,
  };

  // Fetch patients
  const {
    data: patientsData,
    error: patientsError,
    isLoading: patientsLoading,
    mutate: mutatePatients
  } = usePatients(queryParams);

  const patients = patientsData?.results || [];
  const totalCount = patientsData?.count || 0;
  const hasNext = !!patientsData?.next;
  const hasPrevious = !!patientsData?.previous;

  // Handlers
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page
  };

  const handleStatusFilter = (status: 'active' | 'inactive' | 'deceased' | '') => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleView = (patient: Patient) => {
    navigate(`/patients/${patient.id}`);
  };

  const handleEdit = (patient: Patient) => {
    navigate(`/patients/${patient.id}`);
  };

  const handleCreate = () => {
    setSelectedPatientId(null);
    setDrawerMode('create');
    setDrawerOpen(true);
  };

  const handleDelete = async (patient: Patient) => {
    try {
      await deletePatient(patient.id);
      mutatePatients();
    } catch (error: any) {
      console.error('Delete failed:', error);
    }
  };

  const handleDrawerSuccess = () => {
    mutatePatients();
  };

  const handleDrawerDelete = () => {
    mutatePatients();
  };

  // DataTable columns configuration
  const columns: DataTableColumn<Patient>[] = [
    {
      header: 'Patient',
      key: 'name',
      cell: (patient) => (
        <div className="flex flex-col">
          <span className="font-medium">{patient.full_name}</span>
          <span className="text-sm text-muted-foreground">{patient.patient_id}</span>
        </div>
      ),
    },
    {
      header: 'Contact',
      key: 'contact',
      cell: (patient) => (
        <div className="flex flex-col text-sm">
          <span className="font-medium">{patient.mobile_primary}</span>
          {patient.email && (
            <span className="text-muted-foreground">{patient.email}</span>
          )}
        </div>
      ),
    },
    {
      header: 'Age / Gender',
      key: 'demographics',
      cell: (patient) => (
        <div className="flex flex-col text-sm">
          <span className="font-medium">{patient.age} years</span>
          <span className="text-muted-foreground capitalize">{patient.gender}</span>
        </div>
      ),
    },
    {
      header: 'Blood Group',
      key: 'blood_group',
      cell: (patient) => (
        <div className="text-sm">
          {patient.blood_group ? (
            <Badge variant="outline" className="font-mono">
              {patient.blood_group}
            </Badge>
          ) : (
            <span className="text-muted-foreground">N/A</span>
          )}
        </div>
      ),
    },
    {
      header: 'Location',
      key: 'location',
      cell: (patient) => (
        <div className="flex flex-col text-sm">
          {patient.city && <span className="font-medium">{patient.city}</span>}
          {patient.state && <span className="text-muted-foreground">{patient.state}</span>}
        </div>
      ),
    },
    {
      header: 'Visits',
      key: 'visits',
      cell: (patient) => (
        <div className="flex flex-col text-sm">
          <span className="font-medium">{patient.total_visits} visits</span>
          {patient.last_visit_date && (
            <span className="text-muted-foreground">
              Last: {new Date(patient.last_visit_date).toLocaleDateString()}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      cell: (patient) => {
        const statusConfig = {
          active: { label: 'Active', className: 'bg-neutral-900 dark:bg-neutral-200' },
          inactive: { label: 'Inactive', className: 'bg-neutral-400 dark:bg-neutral-600' },
          deceased: { label: 'Deceased', className: 'bg-neutral-500' },
        };
        const config = statusConfig[patient.status];
        return (
          <Badge variant="default" className={config.className}>
            {config.label}
          </Badge>
        );
      },
    },
  ];

  // Mobile card renderer
  const renderMobileCard = (patient: Patient, actions: any) => {
    return (
      <>
        {/* Header Row */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{patient.full_name}</h3>
            <p className="text-sm text-muted-foreground truncate">{patient.patient_id}</p>
          </div>
          <Badge
            variant="default"
            className={
              patient.status === 'active'
                ? 'bg-neutral-900 dark:bg-neutral-200'
                : patient.status === 'inactive'
                ? 'bg-neutral-400 dark:bg-neutral-600'
                : 'bg-neutral-500'
            }
          >
            {patient.status === 'active' && 'Active'}
            {patient.status === 'inactive' && 'Inactive'}
            {patient.status === 'deceased' && 'Deceased'}
          </Badge>
        </div>

        {/* Contact Info */}
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-medium">{patient.mobile_primary}</p>
          {patient.email && <p className="text-muted-foreground">{patient.email}</p>}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Age</p>
            <p className="font-medium">{patient.age} years</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Blood Group</p>
            <p className="font-medium">{patient.blood_group || 'N/A'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Visits</p>
            <p className="font-medium">{patient.total_visits}</p>
          </div>
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

  return (
    <div className="p-4 md:p-5 w-full space-y-3">
      {/* Row 1: Title + inline stats + action */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-lg font-bold leading-none">Patients</h1>
          <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> <span className="font-semibold text-foreground">{totalCount}</span> total</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> <span className="font-semibold text-foreground">{patients.filter((p) => p.status === 'active').length}</span> active</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> <span className="font-semibold text-foreground">{patients.filter((p) => p.insurance_provider).length}</span> insured</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> avg age <span className="font-semibold text-foreground">{patients.length > 0 ? Math.round(patients.reduce((sum, p) => sum + p.age, 0) / patients.length) : 0}</span></span>
          </div>
        </div>
        <Button onClick={handleCreate} size="sm" className="w-full sm:w-auto h-7 text-[12px]">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Patient
        </Button>
      </div>

      {/* Mobile-only stats */}
      <div className="flex sm:hidden items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span><span className="font-semibold text-foreground">{totalCount}</span> total</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{patients.filter((p) => p.status === 'active').length}</span> active</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{patients.filter((p) => p.insurance_provider).length}</span> insured</span>
      </div>

      {/* Row 2: Search + filters */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative w-full sm:w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={handleSearch}
            className="pl-8 h-7 text-[12px]"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          <Button variant={statusFilter === '' ? 'default' : 'outline'} size="sm" className="h-7 text-[11px] px-2" onClick={() => handleStatusFilter('')}>All</Button>
          <Button variant={statusFilter === 'active' ? 'default' : 'outline'} size="sm" className="h-7 text-[11px] px-2" onClick={() => handleStatusFilter('active')}>Active</Button>
          <Button variant={statusFilter === 'inactive' ? 'default' : 'outline'} size="sm" className="h-7 text-[11px] px-2" onClick={() => handleStatusFilter('inactive')}>Inactive</Button>
          <Button variant={statusFilter === 'deceased' ? 'default' : 'outline'} size="sm" className="h-7 text-[11px] px-2" onClick={() => handleStatusFilter('deceased')}>Deceased</Button>
        </div>
      </div>

      {/* Patients Table */}
      <Card>
        <CardContent className="p-0">
          {patientsError ? (
            <div className="p-8 text-center">
              <p className="text-destructive">{patientsError.message}</p>
            </div>
          ) : (
            <>
              {patientsLoading && <div className="flex justify-end px-4 py-2"><Loader2 className="h-4 w-4 animate-spin" /></div>}
              <DataTable
                rows={patients}
                isLoading={patientsLoading}
                columns={columns}
                renderMobileCard={renderMobileCard}
                getRowId={(patient) => patient.id}
                getRowLabel={(patient) => patient.full_name}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                emptyTitle="No patients found"
                emptySubtitle="Try adjusting your search or filters, or add a new patient"
              />

              {/* Pagination */}
              {!patientsLoading && patients.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {patients.length} of {totalCount} patient(s)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!hasPrevious}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!hasNext}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Drawer */}
      <PatientsFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        patientId={selectedPatientId}
        mode={drawerMode}
        onSuccess={handleDrawerSuccess}
        onDelete={handleDrawerDelete}
        onModeChange={(newMode) => setDrawerMode(newMode)}
      />
    </div>
  );
};

export default Patients;
