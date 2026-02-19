import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useOpdVisit } from '@/hooks/useOpdVisit';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Loader2, Phone,
  PlusCircle, Eye, ChevronLeft, ChevronRight, Play, CheckCircle, CalendarPlus, X
} from 'lucide-react';
import { format } from 'date-fns';
import { ConsultationTab } from '@/components/consultation/ConsultationTab';
import { OPDBillingContent } from '@/components/opd/OPDBillingContent';
import { HistoryTab } from '@/components/consultation/HistoryTab';
import { ProfileTab } from '@/components/consultation/ProfileTab';
import { useOPDTemplate } from '@/hooks/useOPDTemplate';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  TemplateResponse,
  CreateTemplateResponsePayload,
} from '@/types/opdTemplate.types';

export const OPDConsultation: React.FC = () => {
  const { visitId } = useParams<{ visitId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    useOpdVisitById,
    useTodayVisits,
    patchOpdVisit,
    completeOpdVisit
  } = useOpdVisit();

  const { user } = useAuth();
  const {
    useTemplates,
    useTemplateResponses,
    createTemplateResponse,
  } = useOPDTemplate();

  // Get tab from URL hash or default to consultation
  const getInitialTab = () => {
    const hash = location.hash.replace('#', '');
    if (['consultation', 'billing', 'history', 'profile'].includes(hash)) {
      return hash;
    }
    return 'consultation';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [activeResponse, setActiveResponse] = useState<TemplateResponse | null>(null);
  const [showNewResponseDialog, setShowNewResponseDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [newResponseReason, setNewResponseReason] = useState('');
  const [isDefaultTemplateApplied, setIsDefaultTemplateApplied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [completeNote, setCompleteNote] = useState('');
  const [followupDate, setFollowupDate] = useState<Date | undefined>(undefined);
  const [followupNotes, setFollowupNotes] = useState('');
  const [isFollowupOpen, setIsFollowupOpen] = useState(false);
  const [isSavingFollowup, setIsSavingFollowup] = useState(false);

  // Update URL hash when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate(`#${tab}`, { replace: true });
  };

  // Sync tab with URL hash changes
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash && ['consultation', 'billing', 'history', 'profile'].includes(hash)) {
      setActiveTab(hash);
    }
  }, [location.hash]);

  // Fetch current visit
  const { data: visit, isLoading, error, mutate: mutateVisit } = useOpdVisitById(visitId ? parseInt(visitId) : null);

  // Fetch context for navigation (Today's visits)
  const { data: todayVisitsData } = useTodayVisits({ page_size: 100 });
  const todayVisits = todayVisitsData?.results || [];

  // Determine Prev/Next IDs
  const currentIndex = todayVisits.findIndex(v => v.id === parseInt(visitId || '0'));
  const prevVisitId = currentIndex > 0 ? todayVisits[currentIndex - 1].id : null;
  const nextVisitId = currentIndex !== -1 && currentIndex < todayVisits.length - 1 ? todayVisits[currentIndex + 1].id : null;

  // Handle back navigation
  const handleBack = () => {
    const from = (location.state as any)?.from;
    if (from) {
      navigate(from);
    } else {
      navigate('/opd/visits');
    }
  };

  const handlePrevVisit = () => {
    if (prevVisitId) navigate(`/opd/consultation/${prevVisitId}`);
  };

  const handleNextVisit = () => {
    if (nextVisitId) navigate(`/opd/consultation/${nextVisitId}`);
  };

  const handleStartConsultation = async () => {
    if (!visit) return;
    setIsSaving(true);
    try {
      await patchOpdVisit(visit.id, {
        status: 'in_consultation',
        started_at: new Date().toISOString()
      });
      toast.success('Consultation started');
      mutateVisit();
    } catch (err: any) {
      toast.error(err.message || 'Failed to start consultation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteConsultation = async () => {
    if (!visit) return;
    setIsSaving(true);
    try {
      await completeOpdVisit(visit.id, {
        diagnosis: completeNote || 'Completed',
        notes: completeNote
      });
      toast.success('Consultation completed');
      setShowCompleteDialog(false);
      mutateVisit();
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete consultation');
    } finally {
      setIsSaving(false);
    }
  };

  // Initialize followup state from visit data
  useEffect(() => {
    if (visit) {
      if (visit.follow_up_date) {
        setFollowupDate(new Date(visit.follow_up_date));
      } else {
        setFollowupDate(undefined);
      }
      setFollowupNotes(visit.follow_up_notes || '');
    }
  }, [visit?.id, visit?.follow_up_date, visit?.follow_up_notes]);

  const handleSaveFollowup = async () => {
    if (!visit) return;
    setIsSavingFollowup(true);
    try {
      await patchOpdVisit(visit.id, {
        follow_up_required: !!followupDate,
        follow_up_date: followupDate ? format(followupDate, 'yyyy-MM-dd') : null,
        follow_up_notes: followupNotes || null,
      });
      toast.success(followupDate ? 'Follow-up scheduled' : 'Follow-up cleared');
      setIsFollowupOpen(false);
      mutateVisit();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save follow-up');
    } finally {
      setIsSavingFollowup(false);
    }
  };

  const handleClearFollowup = async () => {
    setFollowupDate(undefined);
    setFollowupNotes('');
  };

  const { data: templatesData, isLoading: isLoadingTemplates } = useTemplates({ is_active: true });

  const { data: responsesData, isLoading: isLoadingResponses, mutate: mutateResponses } = useTemplateResponses({
    visit: visit?.id,
    template: selectedTemplate ? parseInt(selectedTemplate) : undefined,
  });

  const templateResponses = useMemo(() => responsesData?.results || [], [responsesData]);

  // Effect to load default template from user preferences
  useEffect(() => {
    if (
      !isDefaultTemplateApplied &&
      !isLoadingTemplates &&
      visit &&
      templatesData?.results &&
      templatesData.results.length > 0
    ) {
      if (user?.preferences?.defaultOPDTemplate) {
        const defaultTemplateId = String(user.preferences.defaultOPDTemplate);
        const templateExists = templatesData.results.some(t => String(t.id) === defaultTemplateId);

        if (templateExists) {
          setSelectedTemplate(defaultTemplateId);
          setIsDefaultTemplateApplied(true);
          return;
        }
      }

      const firstTemplate = templatesData.results[0];
      if (firstTemplate && !selectedTemplate) {
        setSelectedTemplate(String(firstTemplate.id));
        setIsDefaultTemplateApplied(true);
      } else {
        setIsDefaultTemplateApplied(true);
      }
    }
  }, [user?.preferences?.defaultOPDTemplate, templatesData, visit, isDefaultTemplateApplied, isLoadingTemplates, selectedTemplate]);

  const handleViewResponse = useCallback((response: TemplateResponse) => {
    setActiveResponse(response);
  }, []);

  const handleAddNewResponse = useCallback(async (isAutoCreation = false) => {
    if (!selectedTemplate || !visit?.id) return;

    if (!isAutoCreation && templateResponses.length > 0) {
        setShowNewResponseDialog(true);
        return;
    }

    setIsSaving(true);
    try {
      const payload: CreateTemplateResponsePayload = {
        encounter_type: 'visit',
        object_id: visit.id,
        template: parseInt(selectedTemplate),
        doctor_switched_reason: !isAutoCreation && newResponseReason ? newResponseReason : undefined,
      };
      const newResponse = await createTemplateResponse(payload);
      await mutateResponses();
      handleViewResponse(newResponse);
      toast.success('New consultation form ready.');
      setShowNewResponseDialog(false);
      setNewResponseReason('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create new response.');
    } finally {
      setIsSaving(false);
    }
  }, [selectedTemplate, visit?.id, newResponseReason, templateResponses, createTemplateResponse, mutateResponses, handleViewResponse]);

  useEffect(() => {
    if (!selectedTemplate || isLoadingResponses || !visit) {
      return;
    }

    if (templateResponses.length > 0) {
      if (!activeResponse || !templateResponses.find(r => r.id === activeResponse.id)) {
        const sortedResponses = [...templateResponses].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        handleViewResponse(sortedResponses[0]);
      }
    } else {
      setActiveResponse(null);
      handleAddNewResponse(true);
    }
  }, [selectedTemplate, templateResponses, isLoadingResponses, activeResponse, handleAddNewResponse, handleViewResponse, visit]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !visit) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">Failed to load visit details</p>
          <Button variant="outline" size="sm" onClick={handleBack}>Back</Button>
        </div>
      </div>
    );
  }

  const patient = visit.patient_details;
  const doctor = visit.doctor_details;

  const statusLabel = visit.status?.replace('_', ' ');

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Compact Sticky Header */}
      <div className="sticky top-0 z-20 w-full bg-background border-b">
        {/* Top bar: patient info + actions */}
        <div className="flex items-center justify-between px-4 py-2">
          {/* Left: Back + Patient Info + Nav */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack} className="h-7 w-7 -ml-1">
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="h-8 w-8 rounded-full bg-foreground/5 border flex items-center justify-center text-sm font-semibold shrink-0">
              {patient?.full_name?.charAt(0) || 'P'}
            </div>

            <div className="min-w-0">
              <h1
                className="text-sm font-semibold leading-tight cursor-pointer hover:underline underline-offset-2 truncate"
                onClick={() => navigate(`/patients/${visit.patient}`)}
              >
                {patient?.full_name || 'Unknown Patient'}
              </h1>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="font-mono">{patient?.patient_id || 'N/A'}</span>
                <span>·</span>
                <span>{patient?.age || '-'}y / {patient?.gender || '-'}</span>
                <span>·</span>
                <Phone className="h-2.5 w-2.5" />
                <span>{patient?.mobile_primary || 'N/A'}</span>
              </div>
            </div>

            {/* Compact Nav */}
            <div className="flex items-center border rounded-md ml-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-none rounded-l-md"
                onClick={handlePrevVisit}
                disabled={!prevVisitId}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-[10px] font-mono px-1.5 border-x text-muted-foreground">
                {currentIndex + 1}/{todayVisits.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-none rounded-r-md"
                onClick={handleNextVisit}
                disabled={!nextVisitId}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Right: Status + Actions */}
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] uppercase tracking-wide font-normal px-2 py-0.5"
            >
              {statusLabel}
            </Badge>

            {visit.status === 'waiting' && (
              <Button
                size="sm"
                onClick={handleStartConsultation}
                disabled={isSaving}
                className="h-7 text-xs gap-1.5 bg-foreground hover:bg-foreground/90 text-background"
              >
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                Start
              </Button>
            )}

            {(visit.status === 'in_consultation' || visit.status === 'in_progress') && (
              <Button
                size="sm"
                onClick={() => setShowCompleteDialog(true)}
                disabled={isSaving}
                className="h-7 text-xs gap-1.5 bg-foreground hover:bg-foreground/90 text-background"
              >
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                Complete
              </Button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex px-4 border-t">
          {['consultation', 'billing', 'history', 'profile'].map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-3 py-2 text-xs font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto p-4 space-y-3">

          {/* Quick Info Strip */}
          <div className="flex items-center gap-4 text-xs border rounded-md px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Blood:</span>
              <span className="font-medium">{patient?.blood_group || 'N/A'}</span>
            </div>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium uppercase">{visit.visit_type}</span>
            </div>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Priority:</span>
              <span className={`font-medium uppercase ${visit.priority === 'high' || visit.priority === 'urgent' ? 'text-red-600' : ''}`}>
                {visit.priority}
              </span>
            </div>
            {doctor && (
              <>
                <div className="h-3 w-px bg-border" />
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Doctor:</span>
                  <span className="font-medium">{doctor.full_name}</span>
                </div>
              </>
            )}
            {visit.visit_date && (
              <>
                <div className="h-3 w-px bg-border" />
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">{visit.visit_date}</span>
                </div>
              </>
            )}
          </div>

          {/* Template Workspace (only on consultation tab) */}
          {activeTab === 'consultation' && (
            <div className="border rounded-md px-3 py-2.5">
              <div className="flex items-center gap-3">
                <Select
                  onValueChange={setSelectedTemplate}
                  value={selectedTemplate || undefined}
                  disabled={isLoadingTemplates}
                >
                  <SelectTrigger className="h-8 text-xs max-w-[240px]">
                    <SelectValue placeholder={isLoadingTemplates ? "Loading..." : "Select template..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingTemplates ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : (
                      (templatesData?.results || []).map(t => (
                        <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                {selectedTemplate && (
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowNewResponseDialog(true)}>
                    <PlusCircle className="h-3 w-3" /> Add Note
                  </Button>
                )}

                <div className="h-4 w-px bg-border mx-1" />

                {/* Response chips */}
                <div className="flex flex-wrap gap-1.5">
                  {templateResponses.map(res => (
                    <button
                      key={res.id}
                      onClick={() => handleViewResponse(res)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                        activeResponse?.id === res.id
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-background text-foreground border-border hover:bg-muted'
                      }`}
                    >
                      <Eye className="h-2.5 w-2.5" />
                      #{res.response_sequence}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab Content */}
          <div className="border rounded-md p-4">
            {activeTab === 'consultation' && (
              <ConsultationTab visit={visit} onVisitUpdate={() => mutateVisit()} />
            )}
            {activeTab === 'billing' && (
              <OPDBillingContent visit={visit} />
            )}
            {activeTab === 'history' && (
              <HistoryTab patientId={visit.patient} />
            )}
            {activeTab === 'profile' && (
              <ProfileTab patientId={visit.patient} />
            )}
          </div>
        </div>
      </div>

      {/* New Response Dialog */}
      <Dialog open={showNewResponseDialog} onOpenChange={setShowNewResponseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Add Clinical Note</DialogTitle>
            <DialogDescription className="text-xs">
              Create a new note for this consultation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reason" className="text-xs">Reason / Context (optional)</Label>
            <Input
              id="reason"
              placeholder="e.g., Handover, Second Opinion"
              value={newResponseReason}
              onChange={(e) => setNewResponseReason(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowNewResponseDialog(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => handleAddNewResponse(false)} disabled={isSaving} className="bg-foreground hover:bg-foreground/90 text-background">
              {isSaving && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow-up Dialog */}
      <Dialog open={isFollowupOpen} onOpenChange={setIsFollowupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <CalendarPlus className="h-4 w-4" />
              Schedule Follow-up
            </DialogTitle>
            <DialogDescription className="text-xs">
              Set the next follow-up date for this patient
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex justify-center">
              <CalendarComponent
                mode="single"
                selected={followupDate}
                onSelect={setFollowupDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </div>
            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                placeholder="Follow-up instructions..."
                value={followupNotes}
                onChange={(e) => setFollowupNotes(e.target.value)}
                className="mt-1 h-16 resize-none text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {visit.follow_up_date && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleClearFollowup();
                  handleSaveFollowup();
                }}
                className="text-destructive hover:text-destructive"
              >
                Clear
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSaveFollowup}
              disabled={isSavingFollowup || !followupDate}
              className="bg-foreground hover:bg-foreground/90 text-background"
            >
              {isSavingFollowup && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Consultation Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Complete Consultation</DialogTitle>
            <DialogDescription className="text-xs">
              Finalize this visit and move the patient to completed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="complete-note" className="text-xs">Final Diagnosis / Notes</Label>
            <Input
              id="complete-note"
              placeholder="Enter diagnosis or completion summary..."
              value={completeNote}
              onChange={(e) => setCompleteNote(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowCompleteDialog(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCompleteConsultation} disabled={isSaving} className="bg-foreground hover:bg-foreground/90 text-background">
              {isSaving && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />} Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OPDConsultation;
