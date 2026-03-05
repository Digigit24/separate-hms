// src/pages/opd-production/ClinicalNotes.tsx
import React, { useState } from 'react';
import { useClinicalNote } from '@/hooks/useClinicalNote';
import { useOpdVisit } from '@/hooks/useOpdVisit';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, DataTableColumn } from '@/components/DataTable';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Loader2, Plus, Search, FileText, ClipboardList, User, Phone } from 'lucide-react';
import { ClinicalNote, ClinicalNoteListParams } from '@/types/clinicalNote.types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ClinicalNoteFormDrawer } from '@/components/ClinicalNoteFormDrawer';

export const ClinicalNotes: React.FC = () => {
  const { useClinicalNotes, deleteNote } = useClinicalNote();
  const { useOpdVisitById } = useOpdVisit();

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);

  // Patient details drawer state
  const [patientDrawerOpen, setPatientDrawerOpen] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);

  const queryParams: ClinicalNoteListParams = {
    page: currentPage,
    search: searchTerm || undefined,
  };

  const { data: notesData, error, isLoading, mutate } = useClinicalNotes(queryParams);
  const { data: visitData, isLoading: visitLoading } = useOpdVisitById(selectedVisitId);

  const notes = notesData?.results || [];
  const totalCount = notesData?.count || 0;
  const hasNext = !!notesData?.next;
  const hasPrevious = !!notesData?.previous;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleDelete = async (note: ClinicalNote) => {
    if (window.confirm(`Delete clinical note for visit ${note.visit_number}?`)) {
      try {
        await deleteNote(note.id);
        toast.success('Clinical note deleted');
        mutate();
      } catch (error: any) {
        toast.error(error.message);
      }
    }
  };

  const handleRowClick = (note: ClinicalNote) => {
    setSelectedVisitId(note.visit);
    setPatientDrawerOpen(true);
  };

  const columns: DataTableColumn<ClinicalNote>[] = [
    {
      header: 'Visit',
      key: 'visit_number',
      cell: (note) => (
        <div className="flex flex-col">
          <span className="font-medium font-mono text-sm">{note.visit_number || `Visit #${note.visit}`}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(note.note_date), 'MMM dd, yyyy')}
          </span>
        </div>
      ),
    },
    {
      header: 'Patient',
      key: 'patient_name',
      cell: (note) => (
        <div className="flex flex-col">
          <span className="font-medium">{note.patient_name || 'N/A'}</span>
          <span className="text-xs text-muted-foreground">EHR: {note.ehr_number}</span>
        </div>
      ),
    },
    {
      header: 'Complaints',
      key: 'present_complaints',
      cell: (note) => (
        <div className="max-w-xs">
          <p className="text-sm truncate">{note.present_complaints || 'N/A'}</p>
        </div>
      ),
    },
    {
      header: 'Diagnosis',
      key: 'diagnosis',
      cell: (note) => (
        <div className="max-w-xs">
          <p className="text-sm truncate">{note.diagnosis || 'N/A'}</p>
        </div>
      ),
    },
    {
      header: 'Doctor',
      key: 'referred_doctor_name',
      cell: (note) => (
        <span className="text-sm">{note.referred_doctor_name || 'N/A'}</span>
      ),
    },
    {
      header: 'Follow-up',
      key: 'next_followup_date',
      cell: (note) => (
        <span className="text-sm">
          {note.next_followup_date ? format(new Date(note.next_followup_date), 'MMM dd, yyyy') : 'N/A'}
        </span>
      ),
    },
  ];

  const patient = visitData?.patient_details;

  return (
    <div className="p-4 md:p-5 w-full space-y-3">
      {/* Row 1: Title + inline stats + action */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-lg font-bold leading-none">Follow-ups</h1>
          <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> <span className="font-semibold text-foreground">{totalCount}</span> Total</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><ClipboardList className="h-3 w-3" /> <span className="font-semibold text-foreground">{notes.length}</span> This Month</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> <span className="font-semibold text-foreground">{notes.filter(n => n.next_followup_date).length}</span> With Follow-up Date</span>
          </div>
        </div>
        <Button onClick={() => { setDrawerMode('create'); setSelectedNoteId(null); setDrawerOpen(true); }} size="sm" className="w-full sm:w-auto h-7 text-[12px]">
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Note
        </Button>
      </div>

      {/* Mobile-only stats */}
      <div className="flex sm:hidden items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span><span className="font-semibold text-foreground">{totalCount}</span> Total</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{notes.length}</span> This Month</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{notes.filter(n => n.next_followup_date).length}</span> With Follow-up Date</span>
      </div>

      {/* Row 2: Search */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative w-full sm:w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by patient, visit, diagnosis..."
            value={searchTerm}
            onChange={handleSearch}
            className="pl-8 h-7 text-[12px]"
          />
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
                rows={notes}
                isLoading={isLoading}
                columns={columns}
                getRowId={(note) => note.id}
                getRowLabel={(note) => note.visit_number || `Visit #${note.visit}`}
                onRowClick={handleRowClick}
                onView={(note) => { setDrawerMode('view'); setSelectedNoteId(note.id); setDrawerOpen(true); }}
                onEdit={(note) => { setDrawerMode('edit'); setSelectedNoteId(note.id); setDrawerOpen(true); }}
                onDelete={handleDelete}
                emptyTitle="No follow-ups found"
                emptySubtitle="Try adjusting your filters"
              />

              {!isLoading && notes.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {notes.length} of {totalCount} note(s)
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

      <ClinicalNoteFormDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode={drawerMode}
        noteId={selectedNoteId}
        onSuccess={mutate}
      />

      {/* Patient Details Side Drawer */}
      <Sheet open={patientDrawerOpen} onOpenChange={setPatientDrawerOpen}>
        <SheetContent className="w-[400px] sm:w-[450px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Patient Details
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6">
            {visitLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : visitData ? (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {visitData.patient_details?.full_name || visitData.patient_name || 'N/A'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {visitData.patient_details?.patient_id || 'No Patient ID'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Age</Label>
                      <p className="text-sm font-medium">{visitData.patient_details?.age ?? 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Gender</Label>
                      <p className="text-sm font-medium capitalize">{visitData.patient_details?.gender || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Blood Group</Label>
                      <p className="text-sm font-medium">{visitData.patient_details?.blood_group || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Phone</Label>
                      {visitData.patient_details?.mobile ? (
                        <a href={`tel:${visitData.patient_details.mobile}`} className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {visitData.patient_details.mobile}
                        </a>
                      ) : (
                        <p className="text-sm font-medium">N/A</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">No visit data found</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ClinicalNotes;
