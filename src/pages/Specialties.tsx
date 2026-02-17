// src/pages/Specialties.tsx
import React, { useState } from 'react';
import { useSpecialty } from '@/hooks/useSpecialty';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumn } from '@/components/DataTable';
import SpecialtiesFormDrawer from '@/components/SpecialtiesFormDrawer';
import {
  Loader2,
  Plus,
  Search,
  Award,
  Users,
  Building2,
  Activity
} from 'lucide-react';
import { SpecialtyListParams, Specialty } from '@/types/specialty.types';

export const Specialties: React.FC = () => {
  const {
    useSpecialties,
    deleteSpecialty,
  } = useSpecialty();

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<number | null>(null);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create'>('view');

  // Build query params
  const queryParams: SpecialtyListParams = {
    page: currentPage,
    search: searchTerm || undefined,
    is_active: statusFilter,
  };

  // Fetch specialties
  const {
    data: specialtiesData,
    error: specialtiesError,
    isLoading: specialtiesLoading,
    mutate: mutateSpecialties
  } = useSpecialties(queryParams);

  const specialties = specialtiesData?.results || [];
  const totalCount = specialtiesData?.count || 0;
  const hasNext = !!specialtiesData?.next;
  const hasPrevious = !!specialtiesData?.previous;

  // Handlers
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page
  };

  const handleStatusFilter = (status: boolean | undefined) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleView = (specialty: Specialty) => {
    setSelectedSpecialtyId(specialty.id);
    setDrawerMode('view');
    setDrawerOpen(true);
  };

  const handleEdit = (specialty: Specialty) => {
    setSelectedSpecialtyId(specialty.id);
    setDrawerMode('edit');
    setDrawerOpen(true);
  };

  const handleCreate = () => {
    setSelectedSpecialtyId(null);
    setDrawerMode('create');
    setDrawerOpen(true);
  };

  const handleDelete = async (specialty: Specialty) => {
    try {
      await deleteSpecialty(specialty.id);
      mutateSpecialties();
    } catch (error: any) {
      console.error('Delete failed:', error);
    }
  };

  const handleDrawerSuccess = () => {
    mutateSpecialties();
  };

  const handleDrawerDelete = () => {
    mutateSpecialties();
  };

  // DataTable columns configuration
  const columns: DataTableColumn<Specialty>[] = [
    {
      header: 'Specialty',
      key: 'name',
      cell: (specialty) => (
        <div className="flex flex-col">
          <span className="font-medium">{specialty.name}</span>
          <span className="text-sm text-muted-foreground font-mono">{specialty.code}</span>
        </div>
      ),
    },
    {
      header: 'Department',
      key: 'department',
      cell: (specialty) => (
        <span className="text-sm">
          {specialty.department || (
            <span className="text-muted-foreground italic">Not specified</span>
          )}
        </span>
      ),
    },
    {
      header: 'Doctors',
      key: 'doctors_count',
      cell: (specialty) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{specialty.doctors_count}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'is_active',
      cell: (specialty) => (
        <Badge variant="default" className={specialty.is_active ? 'bg-neutral-900 dark:bg-neutral-200' : 'bg-neutral-400 dark:bg-neutral-600'}>
          {specialty.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      header: 'Created',
      key: 'created_at',
      cell: (specialty) => (
        <span className="text-sm text-muted-foreground">
          {new Date(specialty.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  // Mobile card renderer
  const renderMobileCard = (specialty: Specialty, actions: any) => {
    return (
      <>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{specialty.name}</h3>
            <p className="text-sm text-muted-foreground font-mono">{specialty.code}</p>
          </div>
          <Badge
            variant="default"
            className={specialty.is_active ? 'bg-neutral-900 dark:bg-neutral-200' : 'bg-neutral-400 dark:bg-neutral-600'}
          >
            {specialty.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {specialty.department && (
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span>{specialty.department}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Doctors</p>
            <p className="font-medium flex items-center gap-1">
              <Users className="h-3 w-3" />
              {specialty.doctors_count}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Created</p>
            <p className="font-medium">
              {new Date(specialty.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

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
          <h1 className="text-lg font-bold leading-none">Specialties</h1>
          <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1"><Award className="h-3 w-3" /> <span className="font-semibold text-foreground">{totalCount}</span> total</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> <span className="font-semibold text-foreground">{specialties.filter((s) => s.is_active).length}</span> active</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> <span className="font-semibold text-foreground">{specialties.reduce((sum, s) => sum + s.doctors_count, 0)}</span> doctors</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> <span className="font-semibold text-foreground">{new Set(specialties.filter(s => s.department).map(s => s.department)).size}</span> depts</span>
          </div>
        </div>
        <Button onClick={handleCreate} size="sm" className="w-full sm:w-auto h-7 text-[12px]">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Specialty
        </Button>
      </div>

      {/* Mobile-only stats */}
      <div className="flex sm:hidden items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span><span className="font-semibold text-foreground">{totalCount}</span> total</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{specialties.filter((s) => s.is_active).length}</span> active</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{specialties.reduce((sum, s) => sum + s.doctors_count, 0)}</span> doctors</span>
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
          <Button variant={statusFilter === undefined ? 'default' : 'outline'} size="sm" className="h-7 text-[11px] px-2" onClick={() => handleStatusFilter(undefined)}>All</Button>
          <Button variant={statusFilter === true ? 'default' : 'outline'} size="sm" className="h-7 text-[11px] px-2" onClick={() => handleStatusFilter(true)}>Active</Button>
          <Button variant={statusFilter === false ? 'default' : 'outline'} size="sm" className="h-7 text-[11px] px-2" onClick={() => handleStatusFilter(false)}>Inactive</Button>
        </div>
      </div>

      {/* Specialties Table */}
      <Card>
        <CardContent className="p-0">
          {specialtiesError ? (
            <div className="p-8 text-center">
              <p className="text-destructive">{specialtiesError.message}</p>
            </div>
          ) : (
            <>
              {specialtiesLoading && <div className="flex justify-end px-4 py-2"><Loader2 className="h-4 w-4 animate-spin" /></div>}
              <DataTable
                rows={specialties}
                isLoading={specialtiesLoading}
                columns={columns}
                renderMobileCard={renderMobileCard}
                getRowId={(specialty) => specialty.id}
                getRowLabel={(specialty) => specialty.name}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                emptyTitle="No specialties found"
                emptySubtitle="Try adjusting your search or filters, or add a new specialty"
              />

              {/* Pagination */}
              {!specialtiesLoading && specialties.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {specialties.length} of {totalCount} specialt{totalCount === 1 ? 'y' : 'ies'}
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
      <SpecialtiesFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        specialtyId={selectedSpecialtyId}
        mode={drawerMode}
        onSuccess={handleDrawerSuccess}
        onDelete={handleDrawerDelete}
        onModeChange={(newMode) => setDrawerMode(newMode)}
      />
    </div>
  );
};

export default Specialties;
