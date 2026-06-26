import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
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
  const [isTabSwitching, setIsTabSwitching] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [activeResponse, setActiveResponse] = useState<TemplateResponse | null>(null);
  const [showNewResponseDialog, setShowNewResponseDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [newResponseReason, setNewResponseReason] = useState('');
  const [isDefaultTemplateApplied, setIsDefaultTemplateApplied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Sync guard: prevent concurrent auto-creates (ref so it's synchronously reliable)
  const isAutoCreatingRef = useRef(false);
  // Stable ref to handleAddNewResponse — lets the auto-create effect call it
  // without adding it to the effect's dependency array (breaks circular dep).
  const handleAddNewResponseRef = useRef<((isAutoCreation?: boolean, forceCreate?: boolean) => Promise<void>) | null>(null);
  const [completeNote, setCompleteNote] = useState('');
  const [followupDate, setFollowupDate] = useState<Date | undefined>(undefined);
  const [followupNotes, setFollowupNotes] = useState('');
  const [isFollowupOpen, setIsFollowupOpen] = useState(false);
  const [isSavingFollowup, setIsSavingFollowup] = useState(false);

  // Update URL hash when tab changes
  const handleTabChange = (tab: string) => {
    if (tab !== activeTab) {
      setIsTabSwitching(true);
      setTimeout(() => setIsTabSwitching(false), 300);
    }
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

  // Auto-start consultation when the page opens for a waiting visit
  const [autoStarted, setAutoStarted] = useState(false);
  useEffect(() => {
    if (visit && visit.status === 'waiting' && !autoStarted && !isSaving) {
      setAutoStarted(true);
      // Fire-and-forget: start consultation silently
      const startTime = new Date().toISOString();
      mutateVisit(
        async () => {
          const updated = await patchOpdVisit(visit.id, {
            status: 'in_consultation',
            consultation_start_time: startTime,
          });
          return updated;
        },
        {
          optimisticData: { ...visit, status: 'in_consultation' as const, consultation_start_time: startTime },
          rollbackOnError: true,
          revalidate: true,
        }
      ).catch(() => {
        // If auto-start fails silently, doctor can click Start manually
        setAutoStarted(false);
      });
    }
  }, [visit?.id, visit?.status, autoStarted]);

  // Get visit IDs from navigation state (passed from visits list)
  const visitIdsFromState = (location.state as any)?.visitIds as number[] | undefined;

  // Only fetch today's visits when state doesn't carry IDs (e.g. direct URL access).
  // Passing undefined as params causes SWR to skip the request entirely.
  const { data: todayVisitsData } = useTodayVisits(
    visitIdsFromState ? undefined : { page_size: 100 }
  );
  const todayVisits = todayVisitsData?.results || [];

  // Use visitIds from state if available, otherwise fall back to today's visits
  const visitIds = visitIdsFromState || todayVisits.map(v => v.id);

  // Determine Prev/Next IDs
  const currentIndex = visitIds.findIndex(id => id === parseInt(visitId || '0'));
  const prevVisitId = currentIndex > 0 ? visitIds[currentIndex - 1] : null;
  const nextVisitId = currentIndex !== -1 && currentIndex < visitIds.length - 1 ? visitIds[currentIndex + 1] : null;

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
    if (prevVisitId) navigate(`/opd/consultation/${prevVisitId}#${activeTab}`, {
      state: { visitIds, from: (location.state as any)?.from || '/opd/visits' }
    });
  };

  const handleNextVisit = () => {
    if (nextVisitId) navigate(`/opd/consultation/${nextVisitId}#${activeTab}`, {
      state: { visitIds, from: (location.state as any)?.from || '/opd/visits' }
    });
  };

  const handleStartConsultation = async () => {
    if (!visit) return;
    setIsSaving(true);
    const startTime = new Date().toISOString();
    try {
      await mutateVisit(
        async () => {
          const updated = await patchOpdVisit(visit.id, {
            status: 'in_consultation',
            consultation_start_time: startTime,
          });
          return updated;
        },
        {
          optimisticData: { ...visit, status: 'in_consultation' as const, consultation_start_time: startTime },
          rollbackOnError: true,
          revalidate: true,
        }
      );
      toast.success('Consultation started');
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
      await mutateVisit(
        async () => {
          const updated = await completeOpdVisit(visit.id, {
            diagnosis: completeNote || 'Completed',
            notes: completeNote,
          });
          // If a follow-up date was set in the dialog, save it too
          if (followupDate) {
            await patchOpdVisit(visit.id, {
              follow_up_required: true,
              follow_up_date: format(followupDate, 'yyyy-MM-dd'),
              follow_up_notes: followupNotes || null,
            });
          }
          return updated;
        },
        {
          optimisticData: {
            ...visit,
            status: 'completed' as const,
            ...(followupDate && {
              follow_up_required: true,
              follow_up_date: format(followupDate, 'yyyy-MM-dd'),
              follow_up_notes: followupNotes || null,
            }),
          },
          rollbackOnError: true,
          revalidate: true,
        }
      );
      toast.success('Consultation completed');
      setShowCompleteDialog(false);
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
    const patch = {
      follow_up_required: !!followupDate,
      follow_up_date: followupDate ? format(followupDate, 'yyyy-MM-dd') : null,
      follow_up_notes: followupNotes || null,
    };
    try {
      await mutateVisit(
        async () => {
          const updated = await patchOpdVisit(visit.id, patch);
          return updated;
        },
        {
          optimisticData: { ...visit, ...patch },
          rollbackOnError: true,
          revalidate: true,
        }
      );
      toast.success(followupDate ? 'Follow-up scheduled' : 'Follow-up cleared');
      setIsFollowupOpen(false);
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

  // Gate on both visit.id AND selectedTemplate being ready — pass null to skip until then.
  // Using null (not undefined) so SWR skips the fetch entirely rather than fetching all responses.
  const { data: responsesData, isLoading: isLoadingResponses, isValidating: isValidatingResponses, mutate: mutateResponses } = useTemplateResponses(
    visit?.id && selectedTemplate
      ? { object_id: visit.id, encounter_type: 'visit', template: parseInt(selectedTemplate) }
      : null
  );

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

  // forceCreate=true is used by the dialog's Create button to skip the "open dialog" guard
  const handleAddNewResponse = useCallback(async (isAutoCreation = false, forceCreate = false) => {
    if (!selectedTemplate || !visit?.id) return;

    // If this is a manual action AND there are existing responses AND we're not already
    // confirming in the dialog → show the dialog first so the doctor can add a reason.
    if (!isAutoCreation && !forceCreate && templateResponses.length > 0) {
        setShowNewResponseDialog(true);
        return;
    }

    // Synchronous guard: if an auto-create is already in flight, don't fire another.
    if (isAutoCreation && isAutoCreatingRef.current) return;
    if (isAutoCreation) isAutoCreatingRef.current = true;

    setIsSaving(true);
    try {
      const payload: CreateTemplateResponsePayload = {
        encounter_type: 'visit',
        object_id: visit.id,
        template: parseInt(selectedTemplate),
        doctor_switched_reason: !isAutoCreation && newResponseReason ? newResponseReason : undefined,
      };
      const newResponse = await createTemplateResponse(payload);
      // Optimistically set the response immediately so the effect won't re-fire
      handleViewResponse(newResponse);
      // Then revalidate SWR in background (no await — avoids re-triggering the effect)
      mutateResponses();
      if (!isAutoCreation) {
        toast.success('New consultation note added.');
      }
      setShowNewResponseDialog(false);
      setNewResponseReason('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create new response.');
    } finally {
      setIsSaving(false);
      if (isAutoCreation) isAutoCreatingRef.current = false;
    }
  }, [selectedTemplate, visit?.id, newResponseReason, templateResponses, createTemplateResponse, mutateResponses, handleViewResponse]);

  // Keep the stable ref in sync with the latest callback every render.
  // This lets the effect below call it without listing it as a dep (breaks circular dep).
  handleAddNewResponseRef.current = handleAddNewResponse;

  useEffect(() => {
    // isValidating guards against keepPreviousData races: even when isLoadingResponses is
    // false, isValidating is true while the new key is fetching — so we must wait for both.
    if (!selectedTemplate || isLoadingResponses || isValidatingResponses || !visit) {
      return;
    }

    if (templateResponses.length > 0) {
      if (!activeResponse || !templateResponses.find(r => r.id === activeResponse.id)) {
        const sortedResponses = [...templateResponses].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        handleViewResponse(sortedResponses[0]);
      }
    } else {
      // If activeResponse is already set (e.g. ConsultationBoard just created a note and
      // called onViewResponse), don't clobber it — SWR just hasn't caught up yet.
      if (activeResponse) return;
      setActiveResponse(null);
      // Call via stable ref so this effect doesn't depend on handleAddNewResponse
      // (which itself depends on templateResponses — the circular dep that caused double POSTs).
      handleAddNewResponseRef.current?.(true);
    }
  }, [selectedTemplate, templateResponses, isLoadingResponses, isValidatingResponses, activeResponse, handleViewResponse, visit]);
  // ↑ handleAddNewResponse intentionally NOT in deps — use the ref above instead

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
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 w-full bg-background border-b">
        {/* Patient bar */}
        <div className="flex items-center justify-between px-4 py-2.5">
          {/* Left: Back + Patient + Quick Info + Nav */}
          <div className="flex items-center gap-2.5 min-w-0">
            <Button variant="ghost" size="icon" onClick={handleBack} className="h-7 w-7 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <span
              className="text-sm font-semibold truncate cursor-pointer hover:underline underline-offset-2"
              onClick={() => navigate(`/patients/${visit.patient}`)}
            >
              {patient?.full_name || 'Unknown'}
            </span>

            <span className="text-[11px] text-muted-foreground font-mono shrink-0">{patient?.patient_id}</span>

            <span className="text-[11px] text-muted-foreground shrink-0">
              {patient?.age || '-'}y / {patient?.gender || '-'}
            </span>

            {patient?.blood_group && (
              <Badge variant="outline" className="h-5 text-[10px] px-1.5 font-normal shrink-0">{patient.blood_group}</Badge>
            )}

            <span className="text-[11px] text-muted-foreground shrink-0 uppercase">{visit.visit_type}</span>

            {(visit.priority === 'high' || visit.priority === 'urgent') && (
              <Badge variant="outline" className="h-5 text-[10px] px-1.5 font-normal text-red-600 border-red-300 shrink-0">
                {visit.priority}
              </Badge>
            )}

            {doctor && (
              <span className="text-[11px] text-muted-foreground shrink-0 hidden lg:inline">
                Dr. {doctor.full_name}
              </span>
            )}

            {/* Nav */}
            <div className="flex items-center border rounded shrink-0 ml-1">
              <button onClick={handlePrevVisit} disabled={!prevVisitId} className="h-6 w-6 flex items-center justify-center disabled:opacity-30 hover:bg-muted">
                <ChevronLeft className="h-3 w-3" />
              </button>
              <span className="text-[10px] font-mono px-1.5 border-x text-muted-foreground">{currentIndex + 1}/{visitIds.length}</span>
              <button onClick={handleNextVisit} disabled={!nextVisitId} className="h-6 w-6 flex items-center justify-center disabled:opacity-30 hover:bg-muted">
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Right: Status + Action */}
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <Badge
              variant="outline"
              className={`text-[10px] uppercase tracking-wide font-medium px-2 h-5 ${
                visit.status === 'in_consultation'
                  ? 'bg-emerald-500/15 text-emerald-700 border-emerald-300 dark:text-emerald-400 dark:border-emerald-600'
                  : visit.status === 'waiting'
                    ? 'bg-amber-500/15 text-amber-700 border-amber-300 dark:text-amber-400 dark:border-amber-600'
                    : visit.status === 'completed'
                      ? 'bg-blue-500/15 text-blue-700 border-blue-300 dark:text-blue-400 dark:border-blue-600'
                      : ''
              }`}
            >
              {statusLabel}
            </Badge>

            {visit.status === 'waiting' && (
              <Button size="sm" onClick={handleStartConsultation} disabled={isSaving} className="h-7 text-xs px-3 gap-1.5 bg-foreground hover:bg-foreground/90 text-background">
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                Start
              </Button>
            )}

            {visit.status === 'in_consultation' && (
              <Button size="sm" onClick={() => {
                // Reset follow-up state to current visit values before opening
                setFollowupDate(visit.follow_up_date ? new Date(visit.follow_up_date) : undefined);
                setFollowupNotes(visit.follow_up_notes || '');
                setCompleteNote('');
                setShowCompleteDialog(true);
              }} disabled={isSaving} className="h-7 text-xs px-3 gap-1.5 bg-foreground hover:bg-foreground/90 text-background">
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                Complete
              </Button>
            )}
          </div>
        </div>

        {/* Tab bar + template selector */}
        <div className="flex items-center px-4 border-t h-9">
          <div className="flex shrink-0">
            {['consultation', 'billing', 'history', 'profile'].map(tab => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`px-3 h-9 text-xs font-medium capitalize transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Template selector inline with tabs (consultation only) */}
          {activeTab === 'consultation' && (
            <>
              <div className="h-4 w-px bg-border mx-3" />
              <Select
                onValueChange={setSelectedTemplate}
                value={selectedTemplate || undefined}
                disabled={isLoadingTemplates}
              >
                <SelectTrigger className="h-7 text-xs w-[200px] border-dashed">
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
                <button onClick={() => setShowNewResponseDialog(true)} className="ml-2 h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground border border-dashed rounded flex items-center gap-1">
                  <PlusCircle className="h-3 w-3" /> Note
                </button>
              )}

              {templateResponses.length > 0 && (
                <>
                  <div className="h-4 w-px bg-border mx-2" />
                  <div className="flex gap-1.5">
                    {templateResponses.map(res => (
                      <button
                        key={res.id}
                        onClick={() => handleViewResponse(res)}
                        className={`h-6 px-2 rounded text-[11px] font-medium border transition-colors ${
                          activeResponse?.id === res.id
                            ? 'bg-foreground text-background border-foreground'
                            : 'text-muted-foreground border-border hover:bg-muted'
                        }`}
                      >
                        #{res.response_sequence}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="w-full px-4 py-3">
          {isTabSwitching ? (
            <div className="space-y-3 pt-1">
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-24 w-full rounded-md" />
              <Skeleton className="h-8 w-3/4 rounded-md" />
              <Skeleton className="h-32 w-full rounded-md" />
            </div>
          ) : (
            <>
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
            </>
          )}
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
            <Button size="sm" onClick={() => handleAddNewResponse(false, true)} disabled={isSaving} className="bg-foreground hover:bg-foreground/90 text-background">
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
      <Dialog open={showCompleteDialog} onOpenChange={(open) => { setShowCompleteDialog(open); if (!open) { setCompleteNote(''); setFollowupDate(visit?.follow_up_date ? new Date(visit.follow_up_date) : undefined); setFollowupNotes(visit?.follow_up_notes || ''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Complete Consultation</DialogTitle>
            <DialogDescription className="text-xs">
              Finalize this visit. Optionally schedule a follow-up below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="complete-note" className="text-xs">Final Diagnosis / Notes</Label>
              <Textarea
                id="complete-note"
                placeholder="Enter diagnosis or completion summary..."
                value={completeNote}
                onChange={(e) => setCompleteNote(e.target.value)}
                className="mt-1 h-16 resize-none text-sm"
              />
            </div>
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <CalendarPlus className="h-3.5 w-3.5 text-muted-foreground" />
                  Schedule Follow-up <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                {followupDate && (
                  <button onClick={() => { setFollowupDate(undefined); setFollowupNotes(''); }} className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-0.5">
                    <X className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={followupDate ? format(followupDate, 'yyyy-MM-dd') : ''}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => setFollowupDate(e.target.value ? new Date(e.target.value) : undefined)}
                  className="h-8 text-sm flex-1"
                />
                <Input
                  placeholder="Instructions..."
                  value={followupNotes}
                  onChange={(e) => setFollowupNotes(e.target.value)}
                  className="h-8 text-sm flex-1"
                />
              </div>
            </div>
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
