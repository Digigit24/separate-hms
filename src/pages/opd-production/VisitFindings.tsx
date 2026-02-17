// src/pages/opd-production/VisitFindings.tsx
import React, { useState } from 'react';
import { useVisitFinding } from '@/hooks/useVisitFinding';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumn } from '@/components/DataTable';
import { Loader2, Plus, Search, Activity, Heart, Thermometer } from 'lucide-react';
import { VisitFinding, VisitFindingListParams, FindingType } from '@/types/visitFinding.types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { VisitFindingFormDrawer } from '@/components/VisitFindingFormDrawer';

export const VisitFindings: React.FC = () => {
  const { useVisitFindings, deleteFinding } = useVisitFinding();

  const [searchTerm, setSearchTerm] = useState('');
  const [findingTypeFilter, setFindingTypeFilter] = useState<FindingType | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedFindingId, setSelectedFindingId] = useState<number | null>(null);

  const queryParams: VisitFindingListParams = {
    page: currentPage,
    search: searchTerm || undefined,
    finding_type: findingTypeFilter || undefined,
  };

  const { data: findingsData, error, isLoading, mutate } = useVisitFindings(queryParams);

  const findings = findingsData?.results || [];
  const totalCount = findingsData?.count || 0;
  const hasNext = !!findingsData?.next;
  const hasPrevious = !!findingsData?.previous;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleDelete = async (finding: VisitFinding) => {
    if (window.confirm(`Delete finding for visit ${finding.visit_number}?`)) {
      try {
        await deleteFinding(finding.id);
        toast.success('Visit finding deleted');
        mutate();
      } catch (error: any) {
        toast.error(error.message);
      }
    }
  };

  const columns: DataTableColumn<VisitFinding>[] = [
    {
      header: 'Visit',
      key: 'visit_number',
      cell: (finding) => (
        <div className="flex flex-col">
          <span className="font-medium font-mono text-sm">{finding.visit_number || `Visit #${finding.visit}`}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(finding.finding_date), 'MMM dd, yyyy')}
          </span>
        </div>
      ),
    },
    {
      header: 'Patient',
      key: 'patient_name',
      cell: (finding) => (
        <span className="font-medium">{finding.patient_name || 'N/A'}</span>
      ),
    },
    {
      header: 'Type',
      key: 'finding_type',
      cell: (finding) => (
        <Badge variant={finding.finding_type === 'examination' ? 'default' : 'secondary'} className="text-xs">
          {finding.finding_type.toUpperCase()}
        </Badge>
      ),
    },
    {
      header: 'Vitals',
      key: 'vitals',
      cell: (finding) => (
        <div className="flex flex-col text-xs space-y-1">
          {finding.temperature && (
            <span>Temp: {finding.temperature}°F</span>
          )}
          {finding.blood_pressure && (
            <span>BP: {finding.blood_pressure}</span>
          )}
          {finding.pulse && (
            <span>Pulse: {finding.pulse} bpm</span>
          )}
        </div>
      ),
    },
    {
      header: 'BMI',
      key: 'bmi',
      cell: (finding) => (
        <div className="flex flex-col text-xs">
          {finding.bmi && <span className="font-medium">{finding.bmi}</span>}
          {finding.bmi_category && (
            <Badge variant="outline" className="text-xs w-fit">
              {finding.bmi_category}
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Recorded By',
      key: 'recorded_by_name',
      cell: (finding) => (
        <span className="text-sm">{finding.recorded_by_name || 'N/A'}</span>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-5 w-full space-y-3">
      {/* Row 1: Title + inline stats + action */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-lg font-bold leading-none">Visit Findings</h1>
          <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> <span className="font-semibold text-foreground">{totalCount}</span> Total</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><Thermometer className="h-3 w-3" /> <span className="font-semibold text-foreground">{findings.filter(f => f.finding_type === 'examination').length}</span> Examinations</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> <span className="font-semibold text-foreground">{findings.filter(f => f.finding_type === 'systemic').length}</span> Systemic</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> <span className="font-semibold text-foreground">{findings.length}</span> This Week</span>
          </div>
        </div>
        <Button onClick={() => { setDrawerMode('create'); setSelectedFindingId(null); setDrawerOpen(true); }} size="sm" className="w-full sm:w-auto h-7 text-[12px]">
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Finding
        </Button>
      </div>

      {/* Mobile-only stats */}
      <div className="flex sm:hidden items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span><span className="font-semibold text-foreground">{totalCount}</span> Total</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{findings.filter(f => f.finding_type === 'examination').length}</span> Examinations</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{findings.filter(f => f.finding_type === 'systemic').length}</span> Systemic</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{findings.length}</span> This Week</span>
      </div>

      {/* Row 2: Search + filters */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative w-full sm:w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by patient, visit..."
            value={searchTerm}
            onChange={handleSearch}
            className="pl-8 h-7 text-[12px]"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          <Button variant={findingTypeFilter === '' ? 'default' : 'outline'} size="sm" className="h-7 text-[11px] px-2" onClick={() => setFindingTypeFilter('')}>
            All
          </Button>
          <Button variant={findingTypeFilter === 'examination' ? 'default' : 'outline'} size="sm" className="h-7 text-[11px] px-2" onClick={() => setFindingTypeFilter('examination')}>
            Examination
          </Button>
          <Button variant={findingTypeFilter === 'systemic' ? 'default' : 'outline'} size="sm" className="h-7 text-[11px] px-2" onClick={() => setFindingTypeFilter('systemic')}>
            Systemic
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
                rows={findings}
                isLoading={isLoading}
                columns={columns}
                getRowId={(finding) => finding.id}
                getRowLabel={(finding) => finding.visit_number || `Visit #${finding.visit}`}
                onView={(finding) => { setDrawerMode('view'); setSelectedFindingId(finding.id); setDrawerOpen(true); }}
                onEdit={(finding) => { setDrawerMode('edit'); setSelectedFindingId(finding.id); setDrawerOpen(true); }}
                onDelete={handleDelete}
                emptyTitle="No visit findings found"
                emptySubtitle="Try adjusting your filters"
              />

              {!isLoading && findings.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {findings.length} of {totalCount} finding(s)
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
      <VisitFindingFormDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode={drawerMode}
        findingId={selectedFindingId}
        onSuccess={mutate}
      />
    </div>
  );
};

export default VisitFindings;
