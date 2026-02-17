// src/pages/Doctors.tsx
import React, { useState } from 'react';
import { useDoctor } from '@/hooks/useDoctor';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumn } from '@/components/DataTable';
import DoctorsFormDrawer from '@/components/DoctorsFormDrawer';
import {
  Loader2,
  Plus,
  Search,
  UserPlus,
  Stethoscope,
  Calendar,
  IndianRupee,
  Star
} from 'lucide-react';
import { DoctorListParams, Doctor } from '@/types/doctor.types';

export const Doctors: React.FC = () => {
  const { user, hasModuleAccess } = useAuth();
  const {
    hasHMSAccess,
    useDoctors,
    deleteDoctor,
  } = useDoctor();

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'on_leave' | 'inactive' | ''>('');
  const [currentPage, setCurrentPage] = useState(1);

  // Debug logging
  console.log('Doctors component rendering...');
  console.log('HMS Access:', hasHMSAccess);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create'>('view');

  // Build query params
  const queryParams: DoctorListParams = {
    page: currentPage,
    search: searchTerm || undefined,
    status: statusFilter || undefined,
  };

  // Fetch doctors
  const {
    data: doctorsData,
    error: doctorsError,
    isLoading: doctorsLoading,
    mutate: mutateDoctors
  } = useDoctors(queryParams);

  const doctors = doctorsData?.results || [];
  const totalCount = doctorsData?.count || 0;
  const hasNext = !!doctorsData?.next;
  const hasPrevious = !!doctorsData?.previous;

  // Debug logging
  console.log('Doctors data:', { doctors, totalCount, isLoading: doctorsLoading, error: doctorsError });

  // Handlers
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page
  };

  const handleStatusFilter = (status: 'active' | 'on_leave' | 'inactive' | '') => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleView = (doctor: Doctor) => {
    setSelectedDoctorId(doctor.id);
    setDrawerMode('view');
    setDrawerOpen(true);
  };

  const handleEdit = (doctor: Doctor) => {
    setSelectedDoctorId(doctor.id);
    setDrawerMode('edit');
    setDrawerOpen(true);
  };

  const handleCreate = () => {
    setSelectedDoctorId(null);
    setDrawerMode('create');
    setDrawerOpen(true);
  };

  const handleDelete = async (doctor: Doctor) => {
    try {
      await deleteDoctor(doctor.id);
      mutateDoctors();
    } catch (error: any) {
      console.error('Delete failed:', error);
    }
  };

  const handleDrawerSuccess = () => {
    mutateDoctors();
  };

  const handleDrawerDelete = () => {
    mutateDoctors();
  };

  // DataTable columns configuration
  const columns: DataTableColumn<Doctor>[] = [
    {
      header: 'Doctor',
      key: 'name',
      cell: (doctor) => (
        <div className="flex flex-col">
          <span className="font-medium">{doctor.full_name}</span>
          <span className="text-sm text-muted-foreground">{doctor.user?.email || 'N/A'}</span>
        </div>
      ),
    },
    {
      header: 'Specialties',
      key: 'specialties',
      cell: (doctor) => (
        <div className="flex flex-wrap gap-1">
          {(doctor.specialties || []).slice(0, 2).map((specialty) => (
            <Badge key={specialty.id} variant="secondary" className="text-xs">
              {specialty.name}
            </Badge>
          ))}
          {(doctor.specialties || []).length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{(doctor.specialties || []).length - 2}
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Experience',
      key: 'experience',
      cell: (doctor) => (
        <span className="text-sm">{doctor.years_of_experience || 0} years</span>
      ),
    },
    {
      header: 'Consultation Fee',
      key: 'fee',
      cell: (doctor) => (
        <div className="flex flex-col text-sm">
          <span className="font-medium">₹{doctor.consultation_fee || 0}</span>
          <span className="text-xs text-muted-foreground">
            Follow-up: ₹{doctor.follow_up_fee || 0}
          </span>
        </div>
      ),
    },
    {
      header: 'Rating',
      key: 'rating',
      cell: (doctor) => (
        <div className="flex items-center gap-1 text-sm">
          <Star className="h-4 w-4 fill-neutral-400 text-neutral-400" />
          <span className="font-medium">{doctor.average_rating || 0}</span>
          <span className="text-muted-foreground">({doctor.total_reviews || 0})</span>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      cell: (doctor) => {
        const statusConfig = {
          active: { label: 'Active', className: 'bg-neutral-900 dark:bg-neutral-200' },
          on_leave: { label: 'On Leave', className: 'bg-neutral-600 dark:bg-neutral-500' },
          inactive: { label: 'Inactive', className: 'bg-neutral-400 dark:bg-neutral-600' },
        };
        const config = statusConfig[doctor.status];
        return (
          <Badge variant="default" className={config.className}>
            {config.label}
          </Badge>
        );
      },
    },
  ];

  // Mobile card renderer
  const renderMobileCard = (doctor: Doctor, actions: any) => {
    return (
      <>
        {/* Header Row */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{doctor.full_name}</h3>
            <p className="text-sm text-muted-foreground truncate">{doctor.user?.email || 'N/A'}</p>
          </div>
          <Badge
            variant="default"
            className={
              doctor.status === 'active'
                ? 'bg-neutral-900 dark:bg-neutral-200'
                : doctor.status === 'on_leave'
                ? 'bg-neutral-600 dark:bg-neutral-500'
                : 'bg-neutral-400 dark:bg-neutral-600'
            }
          >
            {doctor.status === 'active' && 'Active'}
            {doctor.status === 'on_leave' && 'On Leave'}
            {doctor.status === 'inactive' && 'Inactive'}
          </Badge>
        </div>

        {/* Specialties */}
        <div className="flex flex-wrap gap-1">
          {(doctor.specialties || []).map((specialty) => (
            <Badge key={specialty.id} variant="secondary" className="text-xs">
              {specialty.name}
            </Badge>
          ))}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Experience</p>
            <p className="font-medium">{doctor.years_of_experience || 0} years</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Consultation</p>
            <p className="font-medium">${doctor.consultation_fee || 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Rating</p>
            <p className="font-medium flex items-center gap-1">
              <Star className="h-3 w-3 fill-neutral-400 text-neutral-400" />
              {doctor.average_rating || 0}
            </p>
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
          <h1 className="text-lg font-bold leading-none">Doctors</h1>
          <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1"><Stethoscope className="h-3 w-3" /> <span className="font-semibold text-foreground">{totalCount}</span> total</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><UserPlus className="h-3 w-3" /> <span className="font-semibold text-foreground">{doctors.filter((d) => d.status === 'active').length}</span> active</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> <span className="font-semibold text-foreground">{doctors.filter((d) => d.status === 'on_leave').length}</span> on leave</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" /> avg fee <span className="font-semibold text-foreground">₹{doctors.length > 0 ? Math.round(doctors.reduce((sum, d) => sum + parseFloat(d.consultation_fee), 0) / doctors.length) : 0}</span></span>
          </div>
        </div>
        <Button onClick={handleCreate} size="sm" className="w-full sm:w-auto h-7 text-[12px]">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Doctor
        </Button>
      </div>

      {/* Mobile-only stats */}
      <div className="flex sm:hidden items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span><span className="font-semibold text-foreground">{totalCount}</span> total</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{doctors.filter((d) => d.status === 'active').length}</span> active</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{doctors.filter((d) => d.status === 'on_leave').length}</span> on leave</span>
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
          <Button variant={statusFilter === 'on_leave' ? 'default' : 'outline'} size="sm" className="h-7 text-[11px] px-2" onClick={() => handleStatusFilter('on_leave')}>On Leave</Button>
          <Button variant={statusFilter === 'inactive' ? 'default' : 'outline'} size="sm" className="h-7 text-[11px] px-2" onClick={() => handleStatusFilter('inactive')}>Inactive</Button>
        </div>
      </div>

      {/* Doctors Table */}
      <Card>
        <CardContent className="p-0">
          {doctorsError ? (
            <div className="p-8 text-center">
              <p className="text-destructive">{doctorsError.message}</p>
            </div>
          ) : (
            <>
              {doctorsLoading && <div className="flex justify-end px-4 py-2"><Loader2 className="h-4 w-4 animate-spin" /></div>}
              <DataTable
                rows={doctors}
                isLoading={doctorsLoading}
                columns={columns}
                renderMobileCard={renderMobileCard}
                getRowId={(doctor) => doctor.id}
                getRowLabel={(doctor) => doctor.full_name}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                emptyTitle="No doctors found"
                emptySubtitle="Try adjusting your search or filters, or add a new doctor"
              />

              {/* Pagination */}
              {!doctorsLoading && doctors.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {doctors.length} of {totalCount} doctor(s)
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
      <DoctorsFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        doctorId={selectedDoctorId}
        mode={drawerMode}
        onSuccess={handleDrawerSuccess}
        onDelete={handleDrawerDelete}
        onModeChange={(newMode) => setDrawerMode(newMode)}
      />
    </div>
  );
};