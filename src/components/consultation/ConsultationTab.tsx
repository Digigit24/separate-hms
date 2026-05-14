// src/components/consultation/ConsultationTab.tsx
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Save, Download, Printer, Building2, Stethoscope, CalendarPlus, X, MessageSquare, Send, Plus, FileImage, FileX } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { OpdVisit } from '@/types/opdVisit.types';
import { toast } from 'sonner';
import { useOPDTemplate } from '@/hooks/useOPDTemplate';
import { useIPD } from '@/hooks/useIPD';
import { usePatient } from '@/hooks/usePatient';
import { useClinicalNote } from '@/hooks/useClinicalNote';
import { useScheduling } from '@/hooks/useScheduling';
import { templatesService } from '@/services/whatsapp/templatesService';
import { authService } from '@/services/authService';
import { useTenant } from '@/hooks/useTenant';
import { useUsers } from '@/hooks/useUsers';
import { useConsultationAttachment } from '@/hooks/useConsultationAttachment';
import {
  TemplateField,
  TemplateResponse,
  FieldResponsePayload,
} from '@/types/opdTemplate.types';
import { ConsultationBoard } from './ConsultationBoard';
import { DiagnosticRequisitionSidebar } from './DiagnosticRequisitionSidebar';
import { FloatingActionPanel } from './FloatingActionPanel';
import { SideDrawer } from '@/components/SideDrawer';
import { AdmissionFormDrawer } from '@/components/ipd/AdmissionFormDrawer';

interface FileAttachment {
  id: number;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_by?: string;
  created_at: string;
  description?: string;
}

interface ConsultationTabProps {
  visit: OpdVisit;
  onVisitUpdate?: () => void;
}

// --- Field config helpers — no backend changes, all metadata lives in help_text JSON ---

function parseFieldConfig(helpText?: string): Record<string, any> | null {
  if (!helpText?.trim().startsWith('{')) return null;
  try { return JSON.parse(helpText) as Record<string, any>; } catch { return null; }
}

function isSectionMarker(f: { field_name: string }) { return f.field_name.startsWith('__sec_'); }
function isSubsectionMarker(f: { field_name: string }) { return f.field_name.startsWith('__sub_'); }
function isStructural(f: { field_name: string }) { return isSectionMarker(f) || isSubsectionMarker(f); }

function usesPerOptionNotes(field: { field_type: string; field_label: string }, cfg: Record<string, any> | null): boolean {
  if (field.field_type !== 'multiselect' && field.field_type !== 'checkbox') return false;
  if (cfg?.widget !== 'multiselect_with_option_notes') return false;
  if (cfg?.allow_notes) console.warn(`[ConsultationTab] "${field.field_label}" has both widget and allow_notes; widget wins`);
  return true;
}

// json field_type where options are defined in help_text.options[]
// Options may be plain strings OR { label, value } objects.
// Stored as value_json = { selections: string[], notes: { [value]: string } }

type JsonOpt = string | { label: string; value: string };
function optLabel(o: JsonOpt) { return typeof o === 'string' ? o : o.label; }
function optValue(o: JsonOpt) { return typeof o === 'string' ? o : o.value; }

function isJsonMultiselectWidget(field: { field_type: string }, cfg: Record<string, any> | null): boolean {
  return field.field_type === 'json'
    && cfg?.widget === 'multiselect_with_option_notes'
    && Array.isArray(cfg?.options)
    && (cfg.options as unknown[]).length > 0;
}

type FieldBucket = {
  section: TemplateField | null;
  sectionConfig: Record<string, any>;
  subsections: { sub: TemplateField; subConfig: Record<string, any>; fields: TemplateField[] }[];
  orphanFields: TemplateField[];
};

function groupFieldsBySection(fields: TemplateField[]): FieldBucket[] {
  const sorted = [...fields].sort((a, b) => a.display_order - b.display_order);
  const buckets: FieldBucket[] = [];
  let cur: FieldBucket = { section: null, sectionConfig: {}, subsections: [], orphanFields: [] };
  let curSub: FieldBucket['subsections'][0] | null = null;

  for (const f of sorted) {
    if (isSectionMarker(f)) {
      buckets.push(cur);
      cur = { section: f, sectionConfig: parseFieldConfig(f.help_text) ?? {}, subsections: [], orphanFields: [] };
      curSub = null;
    } else if (isSubsectionMarker(f)) {
      curSub = { sub: f, subConfig: parseFieldConfig(f.help_text) ?? {}, fields: [] };
      cur.subsections.push(curSub);
    } else {
      if (curSub) curSub.fields.push(f);
      else cur.orphanFields.push(f);
    }
  }
  buckets.push(cur);
  return buckets.filter(b => b.section !== null || b.orphanFields.length > 0 || b.subsections.length > 0);
}

// Page-split helper — rough mm estimate per bucket (for multi-page preview)
function estimateBucketMm(bucket: FieldBucket, formData: Record<string, any>): number {
  const allFields = [...bucket.orphanFields, ...bucket.subsections.flatMap(s => s.fields)];
  const hasContent = allFields.some(f => {
    const v = formData[String(f.id)];
    return v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0) && v !== false;
  });
  if (!hasContent) return 0;

  const sH = bucket.section ? 9 : 0;
  const fieldMm = (f: TemplateField) => {
    if (f.field_type === 'textarea') return 14;
    if (f.field_type === 'json') return ((parseFieldConfig(f.help_text)?.options as unknown[] ?? []).length) * 5 + 5;
    if (f.field_type === 'multiselect' || f.field_type === 'checkbox') return (f.options?.length ?? 2) * 5 + 4;
    return 5;
  };
  if (bucket.subsections.length > 0) {
    const colH = bucket.subsections.map(sub => (sub.subConfig.hide_label ? 0 : 7) + sub.fields.reduce((a, f) => a + fieldMm(f), 0));
    return sH + Math.max(...colH, 0) + 8;
  }
  return sH + bucket.orphanFields.reduce((a, f) => a + fieldMm(f), 0) + 8;
}

export const ConsultationTab: React.FC<ConsultationTabProps> = ({ visit, onVisitUpdate }) => {
  const {
    useTemplates,
    useTemplate,
    useTemplateResponses,
    useTemplateResponse,
    updateTemplateResponse,
  } = useOPDTemplate();

  const { useAdmissions } = useIPD();

  const { useCurrentTenant } = useTenant();
  const { data: tenantData } = useCurrentTenant();
  const tenantSettings = tenantData?.settings || {};

  // File attachment hooks
  const {
    useAttachments,
    uploadAttachment,
    deleteAttachment,
    downloadAttachment,
  } = useConsultationAttachment();

  const [selectedResponse, setSelectedResponse] = useState<TemplateResponse | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [activeSubTab, setActiveSubTab] = useState<'fields' | 'preview'>('fields');
  const [isSaving, setIsSaving] = useState(false);
  const [responseDrawerOpen, setResponseDrawerOpen] = useState(false);
  const [encounterType, setEncounterType] = useState<'visit' | 'admission'>('visit');
  const [requisitionSidebarOpen, setRequisitionSidebarOpen] = useState(false);
  const [templateDrawerOpen, setTemplateDrawerOpen] = useState(false);
  const [admissionDrawerOpen, setAdmissionDrawerOpen] = useState(false);
  const [isFollowupOpen, setIsFollowupOpen] = useState(false);
  const [followupDate, setFollowupDate] = useState<Date | undefined>(undefined);
  const [followupNotes, setFollowupNotes] = useState('');
  const [isSavingFollowup, setIsSavingFollowup] = useState(false);

  // WhatsApp message dialog state
  const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false);
  const [whatsAppVariables, setWhatsAppVariables] = useState<Record<string, string>>({});
  const [templateBody, setTemplateBody] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateLanguage, setTemplateLanguage] = useState('en');
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [savedFollowupDate, setSavedFollowupDate] = useState<Date | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  const [showLetterhead, setShowLetterhead] = useState(true);

  // Clinical note hook for follow-up date
  const { useClinicalNoteByVisit, updateNote, createNote } = useClinicalNote();
  const { data: clinicalNote, mutate: mutateClinicalNote } = useClinicalNoteByVisit(visit.id);

  // Scheduling hook for follow-up reminders
  const { scheduleEvent, loading: isSchedulingReminder } = useScheduling();

  // Fetch patient details (for phone number)
  const { usePatientById } = usePatient();
  const { data: patientData } = usePatientById(visit.patient);

  // Fetch active admission for the patient
  const { data: admissionsData, mutate: mutateAdmissions } = useAdmissions({
    patient: visit.patient,
    status: 'admitted',
  });
  const activeAdmission = admissionsData?.results?.[0] || null;

  // Initialize follow-up date from clinical note
  useEffect(() => {
    if (clinicalNote?.next_followup_date) {
      setFollowupDate(new Date(clinicalNote.next_followup_date));
      setSavedFollowupDate(new Date(clinicalNote.next_followup_date));
    }
  }, [clinicalNote?.next_followup_date]);

  // Determine object_id based on encounter type
  const currentObjectId = encounterType === 'visit' ? visit.id : activeAdmission?.id;

  // Fetch user for filled_by display
  const { useUser } = useUsers();
  const { data: filledByUser } = useUser(selectedResponse?.filled_by_id || null);

  const filledByName = filledByUser
    ? `${filledByUser.first_name} ${filledByUser.last_name}`.trim()
    : 'Unknown';

  // Fetch all templates
  const { data: templatesData, isLoading: isLoadingTemplates } = useTemplates({ is_active: true });
  const templates = useMemo(() => templatesData?.results || [], [templatesData]);

  // Fetch all responses for the current encounter context
  const { data: responsesData, isLoading: isLoadingResponses, mutate: mutateResponses } = useTemplateResponses(
    currentObjectId
      ? {
          encounter_type: encounterType,
          object_id: currentObjectId,
        }
      : undefined
  );
  const responses = useMemo(() => responsesData?.results || [], [responsesData]);

  // Fetch file attachments for the current encounter context
  const { data: attachmentsData, isLoading: isLoadingAttachments, mutate: mutateAttachments } = useAttachments(
    currentObjectId
      ? {
          encounter_type: encounterType,
          object_id: currentObjectId,
        }
      : undefined
  );
  const fileAttachments = useMemo(() => attachmentsData?.results || [], [attachmentsData]);

  // Fetch detailed response when one is selected
  const { data: detailedResponse } = useTemplateResponse(selectedResponse?.id || null);

  // Fetch template fields for selected response
  const { data: templateData, isLoading: isLoadingTemplate } = useTemplate(
    selectedResponse?.template || null
  );
  const fieldsData = useMemo(() => templateData?.fields || [], [templateData]);
  const fieldBuckets = useMemo(() => groupFieldsBySection(fieldsData), [fieldsData]);

  // Split buckets into A4 pages for the multi-page preview
  const printPages = useMemo<FieldBucket[][]>(() => {
    const FIRST_MM  = 204; // 297 - 50 (header) - 26 (patient row) - 12 (footer) - 5 (padding)
    const OTHER_MM  = 228; // 297 - 50 (header) - 12 (footer) - 7 (padding)
    const pages: FieldBucket[][] = [[]];
    let used = 0;
    for (const bucket of fieldBuckets) {
      const h = estimateBucketMm(bucket, formData);
      if (h === 0) continue;
      const limit = pages.length === 1 ? FIRST_MM : OTHER_MM;
      if (used + h > limit && pages[pages.length - 1].length > 0) {
        pages.push([]);
        used = 0;
      }
      pages[pages.length - 1].push(bucket);
      used += h;
    }
    return pages.filter(p => p.length > 0);
  }, [fieldBuckets, formData]);

  // Populate form data when response is loaded
  useEffect(() => {
    if (!detailedResponse || fieldsData.length === 0 || isLoadingTemplate) {
      return;
    }

    const populatedData: Record<string, any> = {};
    detailedResponse.field_responses?.forEach((fieldResp) => {
      const field = fieldsData.find(f => f.id === fieldResp.field);
      if (!field) return;

      const fieldId = String(fieldResp.field);

      if (field.field_type === 'json') {
        const jCfg = parseFieldConfig(field.help_text) ?? {};
        if (isJsonMultiselectWidget(field, jCfg)) {
          const vj = fieldResp.value_json;
          populatedData[fieldId] = vj?.selections ?? [];
          populatedData[fieldId + '_option_notes'] = vj?.notes ?? {};
        }
        // other json fields (canvas etc.) are handled by their own mechanisms
      } else if (field.field_type === 'multiselect' || (field.field_type === 'checkbox' && field.options?.length)) {
        const mCfg = parseFieldConfig(field.help_text) ?? {};
        if (usesPerOptionNotes(field, mCfg)) {
          const vj = fieldResp.value_json;
          populatedData[fieldId] = vj?.selections ?? fieldResp.selected_options ?? [];
          populatedData[fieldId + '_option_notes'] = vj?.notes ?? {};
        } else {
          populatedData[fieldId] = fieldResp.selected_options || [];
          if (mCfg.allow_notes && fieldResp.value_text !== null) {
            populatedData[fieldId + '_notes'] = fieldResp.value_text;
          }
        }
      } else if (field.field_type === 'select' || field.field_type === 'radio') {
        populatedData[fieldId] = fieldResp.selected_options?.[0] || null;
      } else if (fieldResp.value_text !== null) {
        populatedData[fieldId] = fieldResp.value_text;
      } else if (fieldResp.value_number !== null) {
        populatedData[fieldId] = fieldResp.value_number;
      } else if (fieldResp.value_date !== null) {
        populatedData[fieldId] = fieldResp.value_date;
      } else if (fieldResp.value_datetime !== null) {
        populatedData[fieldId] = fieldResp.value_datetime;
      } else if (fieldResp.value_boolean !== null) {
        populatedData[fieldId] = fieldResp.value_boolean;
      }
    });
    setFormData(populatedData);
  }, [detailedResponse, fieldsData, isLoadingTemplate]);

  const handleViewResponse = useCallback((response: TemplateResponse) => {
    setSelectedResponse(response);
    setResponseDrawerOpen(true);
    setActiveSubTab('fields');
  }, []);

  const handleCloseResponseDrawer = useCallback(() => {
    setResponseDrawerOpen(false);
    setSelectedResponse(null);
    setFormData({});
  }, []);

  const handleFieldChange = useCallback((fieldId: number, value: any, isNotes = false) => {
    const key = isNotes ? String(fieldId) + '_notes' : String(fieldId);
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateOptionNote = useCallback((fieldId: number, optionId: number, text: string) => {
    setFormData(prev => {
      const key = String(fieldId) + '_option_notes';
      return { ...prev, [key]: { ...(prev[key] || {}), [String(optionId)]: text } };
    });
  }, []);

  const handleSave = async () => {
    // Use detailedResponse.id (fresh from API) as primary, fall back to selectedResponse.id
    const responseId = detailedResponse?.id ?? selectedResponse?.id;
    if (!responseId) {
      toast.error('No active response to save. Please close and reopen the form.');
      return;
    }

    setIsSaving(true);
    try {
      const nonCanvasFields = fieldsData.filter(f => f.field_type !== 'canvas' && !isStructural(f));

      const field_responses: FieldResponsePayload[] = nonCanvasFields.map((field) => {
        const fieldValue = formData[String(field.id)];
        const response: FieldResponsePayload = { field: field.id };

        switch (field.field_type) {
          case 'text': case 'textarea': response.value_text = fieldValue || null; break;
          case 'number': response.value_number = fieldValue ? Number(fieldValue) : null; break;
          case 'date': response.value_date = fieldValue || null; break;
          case 'datetime': {
            // Validate datetime format before sending - convert datetime-local to ISO format
            if (fieldValue) {
              const dt = new Date(fieldValue);
              response.value_datetime = isNaN(dt.getTime()) ? null : dt.toISOString();
            } else {
              response.value_datetime = null;
            }
            break;
          }
          case 'boolean': response.value_boolean = Boolean(fieldValue); break;
          case 'select': case 'radio':
            response.selected_options = fieldValue ? [Number(fieldValue)] : undefined;
            break;
          case 'checkbox':
          case 'multiselect': {
            if (field.options?.length) {
              const opts = Array.isArray(fieldValue) ? fieldValue.map(Number) : [];
              const mCfg = parseFieldConfig(field.help_text) ?? {};
              if (usesPerOptionNotes(field, mCfg)) {
                const notesObj = (formData[String(field.id) + '_option_notes'] || {}) as Record<string, string>;
                const cleanedNotes = Object.fromEntries(
                  Object.entries(notesObj)
                    .filter(([id]) => opts.includes(Number(id)))
                    .map(([id, txt]) => [String(id), String(txt ?? '')])
                );
                response.value_json = { selections: opts, notes: cleanedNotes };
                response.selected_options = undefined;
                response.value_text = null;
              } else {
                response.selected_options = opts.length > 0 ? opts : undefined;
                if (mCfg.allow_notes) {
                  response.value_text = formData[String(field.id) + '_notes'] || null;
                }
              }
            } else {
              response.value_boolean = Boolean(fieldValue);
            }
            break;
          }
          case 'json': {
            const jCfg = parseFieldConfig(field.help_text) ?? {};
            if (isJsonMultiselectWidget(field, jCfg)) {
              const selections = Array.isArray(fieldValue) ? (fieldValue as string[]) : [];
              const notesObj = (formData[String(field.id) + '_option_notes'] || {}) as Record<string, string>;
              // Only keep notes for currently-selected values; coerce to string
              const cleanedNotes = Object.fromEntries(
                Object.entries(notesObj)
                  .filter(([v]) => selections.includes(v))
                  .map(([v, txt]) => [v, String(txt ?? '')])
              );
              response.value_json = { selections, notes: cleanedNotes };
            }
            // other json fields (e.g. canvas handled separately): emit nothing
            break;
          }
          default: response.value_text = fieldValue ? String(fieldValue) : null;
        }
        return response;
      });

      await updateTemplateResponse(responseId, { field_responses });
      toast.success('Form fields saved successfully!');
      await mutateResponses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save fields.');
    } finally {
      setIsSaving(false);
    }
  };

  const getGridColumns = (optionCount: number): string => {
    if (optionCount <= 2) return 'grid-cols-1';
    if (optionCount <= 4) return 'grid-cols-2';
    if (optionCount <= 6) return 'grid-cols-3';
    return 'grid-cols-4';
  };

  // Handle file upload
  const handleUploadFile = useCallback(async (file: File, description: string) => {
    console.log("[ConsultationTab] handleUploadFile called:", { fileName: file.name, fileSize: file.size, description, currentObjectId, encounterType });
    if (!currentObjectId) {
      toast.error('No valid visit or admission context');
      return;
    }

    try {
      await uploadAttachment({
        encounter_type: encounterType,
        object_id: currentObjectId,
        file,
        description,
      });
      toast.success('File uploaded successfully');
      mutateAttachments();
    } catch (error: any) {
      console.error('Failed to upload file:', error);
      throw error; // Re-throw to let FileUploadDialog handle it
    }
  }, [currentObjectId, encounterType, uploadAttachment, mutateAttachments]);

  // Handle file delete
  const handleDeleteFile = useCallback(async (fileId: number) => {
    try {
      await deleteAttachment(fileId);
      toast.success('File deleted successfully');
      mutateAttachments();
    } catch (error: any) {
      console.error('Failed to delete file:', error);
      toast.error(error.message || 'Failed to delete file');
    }
  }, [deleteAttachment, mutateAttachments]);

  // Handle file download
  const handleDownloadFile = useCallback((file: any) => {
    downloadAttachment(file);
  }, [downloadAttachment]);

  // Handle follow-up save
  const handleSaveFollowup = async () => {
    setIsSavingFollowup(true);
    try {
      const followupDateStr = followupDate ? format(followupDate, 'yyyy-MM-dd') : null;

      // Save follow-up to clinical note
      if (clinicalNote?.id) {
        // Update existing clinical note
        await updateNote(clinicalNote.id, {
          next_followup_date: followupDateStr,
        });
      } else {
        // Create new clinical note with follow-up date
        await createNote({
          visit: visit.id,
          next_followup_date: followupDateStr,
        });
      }

      // Update local state immediately for UI feedback
      setSavedFollowupDate(followupDate || null);

      setIsFollowupOpen(false);
      mutateClinicalNote(); // Refresh clinical note data
      onVisitUpdate?.();

      // Schedule WhatsApp reminder if follow-up date is set
      if (followupDate) {
        const patientPhone = patientData?.mobile_primary || visit.patient_details?.mobile_primary;

        if (!patientPhone) {
          toast.success('Follow-up saved (no phone for reminder)');
        } else {
          // Format phone number
          let phone = patientPhone.replace(/[\s\-\(\)]/g, '');
          if (!phone.startsWith('+')) {
            if (!phone.startsWith('91') && phone.length === 10) {
              phone = '+91' + phone;
            } else if (phone.startsWith('91')) {
              phone = '+' + phone;
            }
          }

          // Create follow-up datetime (default 10:00 AM)
          const followupDateTime = new Date(followupDate);
          followupDateTime.setHours(10, 0, 0, 0);

          const patientName = patientData?.full_name || visit.patient_details?.full_name || 'Patient';

          // Schedule the follow-up event with auto-reminders (1 hour before configured in backend)
          const result = await scheduleEvent(
            'followup_appointment',
            phone,
            followupDateTime.toISOString(),
            {
              patient_name: patientName,
              doctor_name: visit.doctor_details?.full_name || 'Doctor',
              hospital_name: tenantData?.name || 'Hospital',
              visit_id: visit.id,
              appointment_date: format(followupDate, 'dd MMM yyyy'),
              appointment_time: '10:00 AM',
            },
            {
              timezone: 'Asia/Kolkata',
              contactName: patientName,
            }
          );

          if (result.success) {
            const reminderCount = result.data?.scheduled_messages?.length || 0;
            toast.success(`Follow-up scheduled with ${reminderCount} reminder${reminderCount !== 1 ? 's' : ''}`);
          } else {
            // Still saved follow-up, just reminder failed
            toast.warning('Follow-up saved, but reminder scheduling failed');
            console.error('Scheduling failed:', result.error);
          }
        }
      } else {
        toast.success('Follow-up cleared');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save follow-up');
    } finally {
      setIsSavingFollowup(false);
    }
  };

  // Handle WhatsApp send
  const handleSendWhatsApp = async () => {
    setIsSendingWhatsApp(true);
    try {
      const patientPhone = patientData?.mobile_primary || visit.patient_details?.mobile_primary;
      if (!patientPhone) {
        toast.error('Patient phone not available');
        return;
      }

      // Clean phone number
      let phone = patientPhone.replace(/[\s\-\(\)]/g, '');
      if (!phone.startsWith('91') && phone.length === 10) {
        phone = '91' + phone;
      }

      await templatesService.sendTemplate({
        to: phone,
        template_name: templateName,
        language: templateLanguage as any,
        parameters: whatsAppVariables,
      });

      toast.success('WhatsApp reminder sent successfully');
      setIsWhatsAppDialogOpen(false);
    } catch (err: any) {
      console.error('WhatsApp send failed:', err);
      toast.error('Failed to send WhatsApp: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  // Get preview with variables replaced
  const getPreviewWithVariables = () => {
    let preview = templateBody;
    Object.entries(whatsAppVariables).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `{{${key}}}`);
    });
    return preview;
  };

  const handleClearFollowup = () => {
    setFollowupDate(undefined);
    setFollowupNotes('');
  };

  const handlePrint = useCallback(() => {
    if (!previewRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print the preview');
      return;
    }

    const patient = visit.patient_details;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Consultation - ${patient?.full_name || 'Patient'}</title>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; background: white; }
            .preview-container { background: #fff; width: 210mm; margin: 0 auto; position: relative; }
            table { width: 100%; border-collapse: collapse; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            tbody { display: table-row-group; }
            @media print {
              @page { size: A4; margin: 0; }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              body { margin: 0 !important; padding: 0 !important; }
              .preview-container { width: 210mm !important; margin: 0 !important; box-shadow: none !important; }
              .section-block { break-inside: avoid; page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          ${previewRef.current.outerHTML}
          <script>
            window.onload = function() { window.print(); setTimeout(() => window.close(), 100); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [visit]);

  const handleDownload = useCallback(async () => {
    if (!previewRef.current) return;

    try {
      toast.info('Generating PDF... Please wait.');

      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const patient = visit.patient_details;

      const canvas = await html2canvas(previewRef.current, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794,
        windowHeight: 1123,
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF('p', 'mm', 'a4');

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const fileName = `consultation_${patient?.patient_id || 'patient'}_${visit.visit_number}_${new Date().getTime()}.pdf`;
      pdf.save(fileName);

      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  }, [visit]);

  const renderField = (field: TemplateField) => {
    const fieldId = String(field.id);
    const value = formData[fieldId];

    const handleChange = (newValue: any) => {
      handleFieldChange(field.id, newValue);
    };

    if (field.field_type === 'canvas' || isStructural(field)) {
      return null;
    }

    const cfg = parseFieldConfig(field.help_text) ?? {};

    // ── JSON multiselect widget — options from help_text.options[] ──────────
    if (field.field_type === 'json') {
      if (!isJsonMultiselectWidget(field, cfg)) return null;
      const options = cfg.options as JsonOpt[];
      const hideLabel = !!cfg.hide_label;
      const selectedValues = new Set(Array.isArray(value) ? value as string[] : []);
      const optionNotes = (formData[fieldId + '_option_notes'] || {}) as Record<string, string>;
      return (
        <div key={field.id} className="space-y-1.5 min-w-0">
          {!hideLabel && (
            <Label className="text-xs font-medium text-foreground/80">{field.field_label}</Label>
          )}
          <div className="flex flex-col gap-1 min-w-0">
            {options.map((opt) => {
              const val = optValue(opt);
              const lbl = optLabel(opt);
              const isChecked = selectedValues.has(val);
              return (
                <div
                  key={val}
                  className={`rounded-lg border overflow-hidden transition-all duration-150 min-w-0 ${
                    isChecked
                      ? 'border-primary/30 bg-primary/[0.04] dark:bg-primary/10'
                      : 'border-border/50 hover:border-border hover:bg-muted/20'
                  }`}
                >
                  <label
                    htmlFor={`${fieldId}-${val}`}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 cursor-pointer"
                  >
                    <Checkbox
                      id={`${fieldId}-${val}`}
                      checked={isChecked}
                      className="shrink-0"
                      onCheckedChange={(checked) => {
                        const newSel = new Set(selectedValues);
                        if (checked) {
                          newSel.add(val);
                          setFormData(prev => ({ ...prev, [fieldId]: Array.from(newSel) }));
                        } else {
                          newSel.delete(val);
                          setFormData(prev => {
                            const notesKey = fieldId + '_option_notes';
                            const n = { ...(prev[notesKey] || {}) };
                            delete n[val];
                            return { ...prev, [fieldId]: Array.from(newSel), [notesKey]: n };
                          });
                        }
                      }}
                    />
                    <span className={`text-xs flex-1 min-w-0 leading-snug ${isChecked ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {lbl}
                    </span>
                  </label>
                  {isChecked && (
                    <div className="px-2.5 pb-2">
                      <Input
                        key={`${fieldId}-${val}-note`}
                        placeholder="Add a note..."
                        className="h-7 text-xs w-full bg-background/60 border-border/50 focus-visible:border-primary/40"
                        value={optionNotes[val] ?? ''}
                        onChange={(e) => {
                          const text = e.target.value;
                          setFormData(prev => {
                            const notesKey = fieldId + '_option_notes';
                            return { ...prev, [notesKey]: { ...(prev[notesKey] || {}), [val]: text } };
                          });
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    const isInline = !!cfg.inline_label;
    const isCompact = !!cfg.compact;
    const allowNotes = !!cfg.allow_notes;
    const prefix = cfg.prefix as string | undefined;
    const hideLabel = !!cfg.hide_label;
    const notesValue = formData[fieldId + '_notes'] || '';

    switch (field.field_type) {
      case 'text':
      case 'number':
      case 'decimal':
        if (isInline) {
          return (
            <div key={field.id} className={`flex items-baseline gap-1.5 ${isCompact ? 'py-0.5' : 'py-1'}`}>
              {prefix && <span className="text-xs text-muted-foreground shrink-0">{prefix}</span>}
              {!hideLabel && <span className="text-xs font-medium shrink-0">{field.field_label}:</span>}
              <Input
                id={fieldId}
                type={field.field_type === 'text' ? 'text' : 'number'}
                placeholder={field.placeholder}
                value={value || ''}
                onChange={(e) => handleChange(e.target.value)}
                className="h-6 text-xs border-0 border-b border-input rounded-none px-0 focus-visible:ring-0 flex-1 min-w-0"
              />
            </div>
          );
        }
        return (
          <div key={field.id} className="space-y-1.5">
            {!hideLabel && <Label htmlFor={fieldId}>{field.field_label}</Label>}
            <Input
              id={fieldId}
              type={field.field_type === 'text' ? 'text' : 'number'}
              placeholder={field.placeholder}
              value={value || ''}
              onChange={(e) => handleChange(e.target.value)}
            />
          </div>
        );
      case 'textarea':
        if (isInline) {
          return (
            <div key={field.id} className="flex items-start gap-1.5 py-1">
              {prefix && <span className="text-xs text-muted-foreground shrink-0 pt-1">{prefix}</span>}
              {!hideLabel && <span className="text-xs font-medium shrink-0 pt-1">{field.field_label}:</span>}
              <Textarea
                id={fieldId}
                placeholder={field.placeholder}
                value={value || ''}
                onChange={(e) => handleChange(e.target.value)}
                rows={2}
                className="text-xs flex-1 min-w-0"
              />
            </div>
          );
        }
        return (
          <div key={field.id} className="space-y-1.5">
            {!hideLabel && <Label htmlFor={fieldId}>{field.field_label}</Label>}
            <Textarea
              id={fieldId}
              placeholder={field.placeholder}
              value={value || ''}
              onChange={(e) => handleChange(e.target.value)}
              rows={4}
            />
          </div>
        );
      case 'boolean':
        return (
          <div key={field.id} className="flex items-center space-x-2">
            <Checkbox
              id={fieldId}
              checked={!!value}
              onCheckedChange={handleChange}
            />
            {!hideLabel && <Label htmlFor={fieldId}>{field.field_label}</Label>}
          </div>
        );
      case 'date':
      case 'datetime':
      case 'time': {
        const htmlInputType = field.field_type === 'datetime' ? 'datetime-local' : field.field_type;
        if (isInline) {
          return (
            <div key={field.id} className={`flex items-baseline gap-1.5 ${isCompact ? 'py-0.5' : 'py-1'}`}>
              {prefix && <span className="text-xs text-muted-foreground shrink-0">{prefix}</span>}
              {!hideLabel && <span className="text-xs font-medium shrink-0">{field.field_label}:</span>}
              <Input
                id={fieldId}
                type={htmlInputType}
                value={value || ''}
                onChange={(e) => handleChange(e.target.value)}
                className="h-6 text-xs border-0 border-b border-input rounded-none px-0 focus-visible:ring-0 flex-1 min-w-0"
              />
            </div>
          );
        }
        return (
          <div key={field.id} className="space-y-1.5">
            {!hideLabel && <Label htmlFor={fieldId}>{field.field_label}</Label>}
            <Input
              id={fieldId}
              type={htmlInputType}
              value={value || ''}
              onChange={(e) => handleChange(e.target.value)}
            />
          </div>
        );
      }
      case 'select':
      case 'radio':
        if (!field.options) return null;
        if (field.field_type === 'radio') {
          return (
            <div key={field.id} className="space-y-1.5">
              {!hideLabel && <Label>{field.field_label}</Label>}
              <RadioGroup
                value={String(value)}
                onValueChange={(val) => handleChange(Number(val))}
              >
                <div className={`grid ${getGridColumns(field.options.length)} gap-4`}>
                  {field.options.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={String(option.id)} id={`${fieldId}-${option.id}`} />
                      <Label htmlFor={`${fieldId}-${option.id}`}>{option.option_label}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
          );
        }
        if (isInline) {
          return (
            <div key={field.id} className={`flex items-baseline gap-1.5 ${isCompact ? 'py-0.5' : 'py-1'}`}>
              {prefix && <span className="text-xs text-muted-foreground shrink-0">{prefix}</span>}
              {!hideLabel && <span className="text-xs font-medium shrink-0">{field.field_label}:</span>}
              <Select value={String(value)} onValueChange={(val) => handleChange(Number(val))}>
                <SelectTrigger className="h-6 text-xs flex-1">
                  <SelectValue placeholder={field.placeholder || 'Select...'} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((option) => (
                    <SelectItem key={option.id} value={String(option.id)}>
                      {option.option_label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }
        return (
          <div key={field.id} className="space-y-1.5">
            {!hideLabel && <Label>{field.field_label}</Label>}
            <Select
              value={String(value)}
              onValueChange={(val) => handleChange(Number(val))}
            >
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || 'Select an option'} />
              </SelectTrigger>
              <SelectContent>
                {field.options.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.option_label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case 'multiselect':
      case 'checkbox': {
        if (!field.options) return null;
        const selectedValues = new Set(Array.isArray(value) ? value : []);
        const perOptionNotes = usesPerOptionNotes(field, cfg);
        const optionNotes = (formData[fieldId + '_option_notes'] || {}) as Record<string, string>;
        const orientation = cfg.orientation === 'vertical'
          ? 'flex flex-col gap-1'
          : `grid ${getGridColumns(field.options.length)} gap-2`;
        return (
          <div key={field.id} className="space-y-1.5 min-w-0">
            {!hideLabel && <Label className="text-xs font-medium text-foreground/80">{field.field_label}</Label>}
            {perOptionNotes ? (
              // Card design — note input is inside the card, zero overflow risk
              <div className="flex flex-col gap-1 min-w-0">
                {field.options.map((option) => {
                  const isChecked = selectedValues.has(option.id);
                  return (
                    <div
                      key={option.id}
                      className={`rounded-lg border overflow-hidden transition-all duration-150 min-w-0 ${
                        isChecked
                          ? 'border-primary/30 bg-primary/[0.04] dark:bg-primary/10'
                          : 'border-border/50 hover:border-border hover:bg-muted/20'
                      }`}
                    >
                      <label
                        htmlFor={`${fieldId}-${option.id}`}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 cursor-pointer"
                      >
                        <Checkbox
                          id={`${fieldId}-${option.id}`}
                          checked={isChecked}
                          className="shrink-0"
                          onCheckedChange={(checked) => {
                            const newValues = new Set(selectedValues);
                            if (checked) {
                              newValues.add(option.id);
                              handleChange(Array.from(newValues));
                            } else {
                              newValues.delete(option.id);
                              setFormData(prev => {
                                const notesKey = fieldId + '_option_notes';
                                const n = { ...(prev[notesKey] || {}) };
                                delete n[String(option.id)];
                                return { ...prev, [fieldId]: Array.from(newValues), [notesKey]: n };
                              });
                            }
                          }}
                        />
                        <span className={`text-xs flex-1 min-w-0 leading-snug ${isChecked ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                          {option.option_label}
                        </span>
                      </label>
                      {isChecked && (
                        <div className="px-2.5 pb-2">
                          <Input
                            key={`${fieldId}-${option.id}-note`}
                            placeholder="Add a note..."
                            className="h-7 text-xs w-full bg-background/60 border-border/50 focus-visible:border-primary/40"
                            value={optionNotes[String(option.id)] ?? ''}
                            onChange={(e) => updateOptionNote(field.id, option.id, e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              // Plain compact checkboxes
              <div className={orientation}>
                {field.options.map((option) => {
                  const isChecked = selectedValues.has(option.id);
                  return (
                    <label
                      key={option.id}
                      htmlFor={`${fieldId}-${option.id}`}
                      className="flex items-center gap-2 py-0.5 cursor-pointer group/opt"
                    >
                      <Checkbox
                        id={`${fieldId}-${option.id}`}
                        checked={isChecked}
                        className="shrink-0"
                        onCheckedChange={(checked) => {
                          const newValues = new Set(selectedValues);
                          checked ? newValues.add(option.id) : newValues.delete(option.id);
                          handleChange(Array.from(newValues));
                        }}
                      />
                      <span className={`text-xs leading-snug ${isChecked ? 'font-medium text-foreground' : 'text-muted-foreground group-hover/opt:text-foreground/80'}`}>
                        {option.option_label}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            {allowNotes && !perOptionNotes && (
              <Textarea
                placeholder="Add notes..."
                value={notesValue}
                rows={2}
                className="text-xs resize-none bg-muted/20"
                onChange={(e) => handleFieldChange(field.id, e.target.value, true)}
              />
            )}
          </div>
        );
      }
      default:
        return null;
    }
  };

  // Read-only renderer — ALL styles are inline so they survive the print-popup outerHTML copy
  const renderPrintField = (field: TemplateField) => {
    if (isStructural(field)) return null;
    const cfg = parseFieldConfig(field.help_text) ?? {};
    const value = formData[String(field.id)];
    const hideLabel = !!cfg.hide_label;
    const perOptionNotes = usesPerOptionNotes(field, cfg);

    const hasValue = value !== null && value !== undefined && value !== ''
      && !(Array.isArray(value) && value.length === 0) && value !== false;
    if (!hasValue) return null;

    // shared inline style fragments
    const lbl: React.CSSProperties = { fontSize: '7.5pt', fontWeight: '600', color: '#374151', flexShrink: 0, whiteSpace: 'nowrap' };
    const val: React.CSSProperties = { flex: 1, borderBottom: '1px dotted #9ca3af', paddingBottom: '1px', fontSize: '8pt', color: '#111827', minWidth: 0 };
    const row: React.CSSProperties = { display: 'flex', alignItems: 'baseline', gap: '4px', paddingTop: '2px', paddingBottom: '2px' };
    const optList: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '4px' };

    // ── JSON multiselect (options from help_text) ───────────────────
    if (field.field_type === 'json') {
      if (!isJsonMultiselectWidget(field, cfg)) return null;
      const options = cfg.options as JsonOpt[];
      const sel = new Set(Array.isArray(value) ? value as string[] : []);
      const notes = (formData[String(field.id) + '_option_notes'] || {}) as Record<string, string>;
      if (sel.size === 0) return null;
      return (
        <div key={field.id} style={{ paddingTop: '2px', paddingBottom: '4px' }}>
          {!hideLabel && <div style={{ ...lbl, display: 'block', marginBottom: '2px' }}>{field.field_label}:</div>}
          <div style={optList}>
            {options.map(opt => {
              const v = optValue(opt), l = optLabel(opt), s = sel.has(v), n = notes[v];
              return (
                <span key={v} style={{ fontSize: '8pt', lineHeight: '1.4', color: s ? '#111827' : '#9ca3af' }}>
                  {s ? '☑' : '☐'}{' '}{l}
                  {s && n && <span style={{ color: '#6b7280' }}> — <span style={{ fontStyle: 'italic', color: '#374151' }}>{n}</span></span>}
                </span>
              );
            })}
          </div>
        </div>
      );
    }

    // ── SELECT / RADIO ──────────────────────────────────────────────
    if ((field.field_type === 'select' || field.field_type === 'radio') && field.options?.length) {
      const optId = typeof value === 'number' ? value : Number(value);
      const label = field.options.find(o => o.id === optId)?.option_label ?? String(value);
      return (
        <div key={field.id} style={row}>
          {!hideLabel && <span style={lbl}>{field.field_label}:</span>}
          <span style={val}>{label}</span>
        </div>
      );
    }

    // ── MULTISELECT — per-option notes (DB options) ─────────────────
    if (perOptionNotes && field.options?.length) {
      const selSet = new Set(value as number[]);
      const notes = (formData[String(field.id) + '_option_notes'] || {}) as Record<string, string>;
      return (
        <div key={field.id} style={{ paddingTop: '2px', paddingBottom: '4px' }}>
          {!hideLabel && <div style={{ ...lbl, display: 'block', marginBottom: '2px' }}>{field.field_label}:</div>}
          <div style={optList}>
            {field.options.map(opt => {
              const s = selSet.has(opt.id), n = notes[String(opt.id)];
              return (
                <span key={opt.id} style={{ fontSize: '8pt', lineHeight: '1.4', color: s ? '#111827' : '#9ca3af' }}>
                  {s ? '☑' : '☐'}{' '}{opt.option_label}
                  {s && n && <span style={{ color: '#6b7280' }}> — <span style={{ fontStyle: 'italic', color: '#374151' }}>{n}</span></span>}
                </span>
              );
            })}
          </div>
        </div>
      );
    }

    // ── MULTISELECT — regular ───────────────────────────────────────
    if ((field.field_type === 'multiselect' || field.field_type === 'checkbox') && field.options?.length) {
      const selSet = new Set(value as number[]);
      const horizontal = cfg.orientation === 'horizontal';
      const notesValue = formData[String(field.id) + '_notes'];
      return (
        <div key={field.id} style={{ paddingTop: '2px', paddingBottom: '4px' }}>
          {!hideLabel && <div style={{ ...lbl, display: 'block', marginBottom: '2px' }}>{field.field_label}:</div>}
          <div style={{ display: 'flex', flexDirection: horizontal ? 'row' : 'column', flexWrap: horizontal ? 'wrap' : undefined, gap: horizontal ? '0 10px' : '2px', paddingLeft: '4px' } as React.CSSProperties}>
            {field.options.map(opt => {
              const s = selSet.has(opt.id);
              return (
                <span key={opt.id} style={{ fontSize: '8pt', lineHeight: '1.4', color: s ? '#111827' : '#9ca3af' }}>
                  {s ? '☑' : '☐'}{' '}{opt.option_label}
                </span>
              );
            })}
          </div>
          {cfg.allow_notes && notesValue && (
            <div style={{ fontSize: '7.5pt', color: '#6b7280', fontStyle: 'italic', marginTop: '2px', paddingLeft: '4px' }}>{notesValue}</div>
          )}
        </div>
      );
    }

    // ── TEXTAREA — always full-width, own block ─────────────────────
    if (field.field_type === 'textarea') {
      return (
        <div key={field.id} style={{ paddingTop: '2px', paddingBottom: '4px', width: '100%' }}>
          {!hideLabel && <div style={{ ...lbl, display: 'block', marginBottom: '2px' }}>{field.field_label}:</div>}
          <div style={{ borderBottom: '1px dotted #9ca3af', minHeight: '18px', paddingBottom: '2px' }}>
            <span style={{ fontSize: '8pt', color: '#111827', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{String(value)}</span>
          </div>
        </div>
      );
    }

    // ── BOOLEAN ─────────────────────────────────────────────────────
    if (field.field_type === 'boolean') {
      return (
        <div key={field.id} style={row}>
          {!hideLabel && <span style={lbl}>{field.field_label}:</span>}
          <span style={{ fontSize: '8pt' }}>{value ? '☑ Yes' : '☐ No'}</span>
        </div>
      );
    }

    // ── DATE / DATETIME ─────────────────────────────────────────────
    if (field.field_type === 'date' || field.field_type === 'datetime' || field.field_type === 'time') {
      let display = String(value);
      try {
        const d = new Date(String(value));
        if (!isNaN(d.getTime())) {
          display = field.field_type === 'datetime'
            ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }
      } catch { /* keep raw */ }
      return (
        <div key={field.id} style={row}>
          {!hideLabel && <span style={lbl}>{field.field_label}:</span>}
          <span style={val}>{display}</span>
        </div>
      );
    }

    // ── DEFAULT (text, number, etc.) ────────────────────────────────
    return (
      <div key={field.id} style={row}>
        {!hideLabel && <span style={lbl}>{field.field_label}:</span>}
        <span style={val}>{String(value)}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col relative">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/20">
        <div className="flex items-center gap-2.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${encounterType === 'visit' ? 'text-foreground' : 'text-muted-foreground'}`}>OPD</span>
                  <Switch
                    checked={encounterType === 'admission'}
                    onCheckedChange={(checked) => setEncounterType(checked ? 'admission' : 'visit')}
                    disabled={!activeAdmission}
                  />
                  <span className={`text-xs font-medium ${encounterType === 'admission' ? 'text-foreground' : 'text-muted-foreground'}`}>IPD</span>
                </div>
              </TooltipTrigger>
              {!activeAdmission && (
                <TooltipContent>
                  <p className="text-xs">Patient has no active IPD admission</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          {encounterType === 'admission' && activeAdmission && (
            <span className="text-[11px] text-muted-foreground">{activeAdmission.admission_id}</span>
          )}
          {!activeAdmission && (
            <button
              onClick={() => setAdmissionDrawerOpen(true)}
              className="h-6 px-2 text-[11px] rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground flex items-center gap-1 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Admit to IPD
            </button>
          )}
        </div>

        <button
          onClick={() => setIsFollowupOpen(true)}
          className={`h-7 px-2.5 text-xs rounded border flex items-center gap-1.5 transition-colors ${
            (savedFollowupDate || clinicalNote?.next_followup_date)
              ? 'bg-foreground text-background border-foreground'
              : 'text-muted-foreground border-border hover:text-foreground'
          }`}
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          {(savedFollowupDate || clinicalNote?.next_followup_date)
            ? format(savedFollowupDate || new Date(clinicalNote!.next_followup_date!), 'dd MMM')
            : 'Follow-up'}
        </button>
      </div>

      <div className="overflow-hidden">
        {/* Kanban Board View */}
        <ConsultationBoard
          encounterType={encounterType}
          objectId={currentObjectId}
          visit={visit}
          responses={responses}
          templates={templates}
          fileAttachments={fileAttachments}
          isLoadingResponses={isLoadingResponses}
          isLoadingTemplates={isLoadingTemplates}
          isLoadingFiles={isLoadingAttachments}
          onViewResponse={handleViewResponse}
          onRefresh={mutateResponses}
          onRefreshFiles={mutateAttachments}
          templateDrawerOpen={templateDrawerOpen}
          onTemplateDrawerChange={setTemplateDrawerOpen}
          onUploadFile={handleUploadFile}
          onDeleteFile={handleDeleteFile}
          onDownloadFile={handleDownloadFile}
        />
      </div>

      {/* Response Detail Side Drawer (resizable) */}
      <SideDrawer
        open={responseDrawerOpen}
        onOpenChange={(open) => (open ? setResponseDrawerOpen(true) : handleCloseResponseDrawer())}
        title={templateData?.name || 'Clinical Note'}
        description={
          selectedResponse
            ? `#${selectedResponse.response_sequence} - ${selectedResponse.status || 'Draft'} - Filled by: ${filledByName}`
            : undefined
        }
        size="xl"
        storageKey="consultation-response-drawer"
      >
        <div className="flex flex-col gap-2">
          {/* Sub-tab navigation */}
          <div className="border-b -mx-4 sm:-mx-6 px-4 sm:px-6">
            <div className="flex gap-0.5">
              <button
                onClick={() => setActiveSubTab('fields')}
                className={`px-2.5 py-1.5 text-[11px] font-medium transition-colors border-b -mb-px ${
                  activeSubTab === 'fields'
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Fields
              </button>
              <button
                onClick={() => setActiveSubTab('preview')}
                className={`px-2.5 py-1.5 text-[11px] font-medium transition-colors border-b -mb-px ${
                  activeSubTab === 'preview'
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Preview
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto">
            {activeSubTab === 'fields' && (
              <div className="space-y-3 pt-1">
                <div className="flex justify-end sticky top-0 bg-background z-10 pb-1">
                  <Button onClick={handleSave} disabled={isSaving} size="sm" className="h-7 text-xs bg-foreground hover:bg-foreground/90 text-background">
                    {isSaving ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Save className="mr-1.5 h-3 w-3" />}
                    Save
                  </Button>
                </div>
                <div className="space-y-5">
                  {fieldBuckets.map((bucket, bi) => {
                    const sCfg = bucket.sectionConfig;
                    const autoCol = bucket.subsections.length > 0
                      ? Math.min(bucket.subsections.length, 3)
                      : 1;
                    const columns = (sCfg.columns as number) ?? autoCol;
                    const colWidths = sCfg.column_widths
                      ? (sCfg.column_widths as string[]).join(' ')
                      : `repeat(${columns}, minmax(0,1fr))`;
                    return (
                      <div key={bi}>
                        {bucket.section && !sCfg.hide_label && (
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-0.5 h-4 rounded-full bg-primary/50 shrink-0" />
                            <span className="text-xs font-semibold text-foreground/75 tracking-wide shrink-0">
                              {bucket.section.field_label}
                            </span>
                            <div className="flex-1 h-px bg-border" />
                          </div>
                        )}
                        {bucket.subsections.length > 0 ? (
                          <div className="grid gap-3" style={{ gridTemplateColumns: colWidths }}>
                            {bucket.subsections.map((sub, si) => (
                              <div
                                key={si}
                                className="min-w-0 overflow-hidden"
                                style={{ gridRow: sub.subConfig.row_span ? `span ${sub.subConfig.row_span}` : undefined }}
                              >
                                {!sub.subConfig.hide_label && (
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                                    <p className="text-[11px] font-semibold text-muted-foreground">
                                      {sub.sub.field_label}
                                    </p>
                                  </div>
                                )}
                                <div className="space-y-1.5">
                                  {sub.fields.map(renderField)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (() => {
                          const shortFields = bucket.orphanFields.filter(f => f.field_type !== 'textarea');
                          const longFields  = bucket.orphanFields.filter(f => f.field_type === 'textarea');
                          return (
                            <>
                              {shortFields.length > 0 && (
                                <div className="grid gap-3" style={{ gridTemplateColumns: colWidths }}>
                                  {shortFields.map(renderField)}
                                </div>
                              )}
                              {longFields.length > 0 && (
                                <div className="space-y-3 mt-3">
                                  {longFields.map(renderField)}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Preview Tab */}
            {activeSubTab === 'preview' && selectedResponse && (
              <div className="space-y-3 pt-3">
                {/* Controls */}
                <div className="flex justify-between items-center gap-2 print:hidden">
                  <div className="flex gap-2">
                    <Button variant={showLetterhead ? 'default' : 'outline'} size="sm" onClick={() => setShowLetterhead(true)}>
                      <FileImage className="h-4 w-4 mr-2" />With Letterhead
                    </Button>
                    <Button variant={!showLetterhead ? 'default' : 'outline'} size="sm" onClick={() => setShowLetterhead(false)}>
                      <FileX className="h-4 w-4 mr-2" />Without Letterhead
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">{printPages.length} page{printPages.length !== 1 ? 's' : ''}</span>
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                      <Printer className="h-4 w-4 mr-2" />Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                      <Download className="h-4 w-4 mr-2" />PDF
                    </Button>
                  </div>
                </div>

                {/* ── Multi-page A4 preview ────────────────────────────────── */}
                <div className="overflow-auto" ref={previewRef}>
                  {(printPages.length > 0 ? printPages : [[]]).map((pageBuckets, pageIndex) => {
                    const hBg  = tenantSettings.header_bg_color  || '#1e3a5f';
                    const hFg  = tenantSettings.header_text_color || '#ffffff';
                    const fBg  = tenantSettings.footer_bg_color  || '#1e3a5f';
                    const fFg  = tenantSettings.footer_text_color || '#ffffff';

                    return (
                      <div
                        key={pageIndex}
                        className="preview-container"
                        style={{
                          width: '210mm', height: '297mm',
                          background: '#ffffff', color: '#111827',
                          fontFamily: 'Arial, sans-serif',
                          display: 'flex', flexDirection: 'column',
                          position: 'relative', overflow: 'hidden',
                          boxShadow: '0 2px 16px rgba(0,0,0,0.14)',
                          marginBottom: pageIndex < (printPages.length || 1) - 1 ? '10px' : 0,
                          breakAfter: 'page', pageBreakAfter: 'always',
                        }}
                      >
                        {/* Faded watermark */}
                        {showLetterhead && tenantSettings.logo && (
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
                            <img src={tenantSettings.logo} alt="" style={{ width: '60%', objectFit: 'contain', opacity: 0.045 }} />
                          </div>
                        )}

                        {/* Content above watermark */}
                        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>

                          {/* ── Header (every page) ── */}
                          {showLetterhead && (
                            <div style={{ background: hBg, color: hFg, padding: '12px 22px 10px', flexShrink: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                  {tenantSettings.logo && (
                                    <img src={tenantSettings.logo} alt="Logo" style={{ height: '46px', width: '46px', objectFit: 'contain', flexShrink: 0 }} />
                                  )}
                                  <div>
                                    <div style={{ fontSize: '14pt', fontWeight: '700', lineHeight: 1.2 }}>{tenantData?.name || 'Medical Center'}</div>
                                    {tenantSettings.address && (
                                      <div style={{ fontSize: '7pt', marginTop: '3px', opacity: 0.9, whiteSpace: 'pre-wrap', maxWidth: '230px' }}>{tenantSettings.address}</div>
                                    )}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right', fontSize: '7.5pt' }}>
                                  {tenantSettings.contact_phone && <div style={{ fontWeight: '600' }}>Ph: {tenantSettings.contact_phone}</div>}
                                  {tenantSettings.contact_email && <div style={{ opacity: 0.9 }}>{tenantSettings.contact_email}</div>}
                                  {tenantSettings.website_url && <div style={{ opacity: 0.9 }}>{tenantSettings.website_url}</div>}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ── Patient info (first page only) ── */}
                          {pageIndex === 0 && (
                            <div style={{ padding: '6px 22px 7px', borderBottom: '1.5px solid #e5e7eb', background: '#f9fafb', flexShrink: 0 }}>
                              <div style={{ fontSize: '9pt', fontWeight: '700', textAlign: 'center', letterSpacing: '0.07em', textTransform: 'uppercase', color: '#1f2937', marginBottom: '5px' }}>
                                Consultation Record
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px 14px', fontSize: '7.5pt' }}>
                                {([
                                  ['Name', visit.patient_details?.full_name],
                                  ['Age / Sex', `${visit.patient_details?.age || ''}${visit.patient_details?.gender ? ' / ' + visit.patient_details.gender : ''}`],
                                  ['Date', visit.visit_date],
                                  ['Patient ID', visit.patient_details?.patient_id],
                                  ['Doctor', visit.doctor_details?.full_name],
                                  ['Visit #', visit.visit_number],
                                ] as [string, string | undefined][]).map(([l, v]) => (
                                  <div key={l} style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                                    <span style={{ fontWeight: '600', whiteSpace: 'nowrap', color: '#374151', flexShrink: 0 }}>{l}:</span>
                                    <span style={{ flex: 1, borderBottom: '1px dotted #9ca3af', paddingBottom: '1px', color: '#111827' }}>{v || ''}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ── Clinical content (flex-1 fills space between header and footer) ── */}
                          <div style={{ flex: 1, padding: showLetterhead ? '7px 22px 6px' : '100px 22px 50px', overflow: 'hidden' }}>
                            {pageBuckets.length === 0 && pageIndex === 0 ? (
                              <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: '9pt' }}>No data recorded</div>
                            ) : (
                              pageBuckets.map((bucket, bi) => {
                                const sCfg = bucket.sectionConfig;
                                const autoCol = bucket.subsections.length > 0 ? Math.min(bucket.subsections.length, 3) : 1;
                                const columns = (sCfg.columns as number) ?? autoCol;
                                const colWidths = sCfg.column_widths
                                  ? (sCfg.column_widths as string[]).join(' ')
                                  : `repeat(${columns}, minmax(0,1fr))`;
                                const orphanShort = bucket.orphanFields.filter(f => f.field_type !== 'textarea');
                                const orphanLong  = bucket.orphanFields.filter(f => f.field_type === 'textarea');

                                return (
                                  <div key={bi} style={{ marginBottom: '7px', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                                    {/* Section heading */}
                                    {bucket.section && !sCfg.hide_label && (
                                      <div style={{ borderBottom: '1.5px solid #1f2937', marginBottom: '4px', paddingBottom: '1px' }}>
                                        <span style={{ fontSize: '8.5pt', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#111827' }}>
                                          {bucket.section.field_label}
                                        </span>
                                      </div>
                                    )}

                                    {bucket.subsections.length > 0 ? (
                                      <div style={{ display: 'grid', gridTemplateColumns: colWidths, columnGap: '12px' }}>
                                        {bucket.subsections.map((sub, si) => {
                                          const subHasContent = sub.fields.some(f => {
                                            const v = formData[String(f.id)];
                                            return v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0) && v !== false;
                                          });
                                          if (!subHasContent) return null;
                                          const subShort = sub.fields.filter(f => f.field_type !== 'textarea');
                                          const subLong  = sub.fields.filter(f => f.field_type === 'textarea');
                                          return (
                                            <div key={si} style={{ gridRow: sub.subConfig.row_span ? `span ${sub.subConfig.row_span}` : undefined, minWidth: 0, overflow: 'hidden' }}>
                                              {!sub.subConfig.hide_label && (
                                                <div style={{ fontSize: '7.5pt', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#4b5563', borderBottom: '1px dashed #d1d5db', paddingBottom: '2px', marginBottom: '3px' }}>
                                                  {sub.sub.field_label}
                                                </div>
                                              )}
                                              {subShort.map(renderPrintField)}
                                              {subLong.map(renderPrintField)}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <>
                                        {orphanShort.length > 0 && (
                                          <div style={{ display: 'grid', gridTemplateColumns: colWidths, columnGap: '12px' }}>
                                            {orphanShort.map(renderPrintField)}
                                          </div>
                                        )}
                                        {/* Textarea always full-width separate row */}
                                        {orphanLong.map(renderPrintField)}
                                      </>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* ── Footer (every page) ── */}
                          {showLetterhead && (
                            <div style={{ background: fBg, color: fFg, padding: '5px 22px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '7pt' }}>
                              <span style={{ fontWeight: '600' }}>{tenantData?.name || 'Medical Center'}{tenantSettings.contact_phone ? `  ·  Ph: ${tenantSettings.contact_phone}` : ''}</span>
                              <span style={{ opacity: 0.9 }}>Page {pageIndex + 1}{printPages.length > 1 ? ` / ${printPages.length}` : ''}  ·  {new Date().toLocaleDateString()}  ·  Confidential</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </SideDrawer>

      {/* Floating Action Panel */}
      <FloatingActionPanel
        onAddNotes={() => {
          if (!currentObjectId) {
            toast.error('No active encounter found for adding notes.');
            return;
          }
          setTemplateDrawerOpen(true);
        }}
        onOpenDiagnostics={() => {
          if (!currentObjectId) {
            toast.error('No active encounter found for ordering tests.');
            return;
          }
          setRequisitionSidebarOpen(true);
        }}
        disabled={!currentObjectId}
      />

      {/* Diagnostic Requisition Sidebar */}
      {currentObjectId && (
        <DiagnosticRequisitionSidebar
          open={requisitionSidebarOpen}
          onOpenChange={setRequisitionSidebarOpen}
          patientId={visit.patient}
          encounterType={encounterType}
          objectId={currentObjectId}
        />
      )}

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
              <Calendar
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
            {(followupDate || clinicalNote?.next_followup_date) && (
              <Button variant="outline" size="sm" onClick={() => { handleClearFollowup(); handleSaveFollowup(); }} className="text-destructive hover:text-destructive">
                Clear
              </Button>
            )}
            <Button size="sm" onClick={handleSaveFollowup} disabled={isSavingFollowup || !followupDate} className="bg-foreground hover:bg-foreground/90 text-background">
              {isSavingFollowup && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Message Dialog - Field Mapping */}
      <Dialog open={isWhatsAppDialogOpen} onOpenChange={setIsWhatsAppDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              Send Follow-up Reminder
            </DialogTitle>
            <DialogDescription>
              Review and send WhatsApp message to patient
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Follow-up Date Display & Edit */}
            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold text-purple-700 dark:text-purple-300">Follow-up Date</Label>
                  <p className="text-sm font-medium mt-1">
                    {savedFollowupDate ? format(savedFollowupDate, 'dd MMM yyyy (EEEE)') : 'Not set'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsWhatsAppDialogOpen(false);
                    setFollowupDate(savedFollowupDate || undefined);
                    setIsFollowupOpen(true);
                  }}
                  className="text-purple-600 border-purple-300 hover:bg-purple-100"
                >
                  <CalendarPlus className="h-4 w-4 mr-1" />
                  Change
                </Button>
              </div>
            </div>

            {/* Variable Inputs */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Message Variables</Label>
              {Object.keys(whatsAppVariables).sort().map((varKey) => (
                <div key={varKey} className="flex items-center gap-3">
                  <span className="text-sm font-mono bg-muted px-2 py-1 rounded min-w-[50px] text-center">
                    {`{{${varKey}}}`}
                  </span>
                  <Input
                    value={whatsAppVariables[varKey]}
                    onChange={(e) => setWhatsAppVariables(prev => ({
                      ...prev,
                      [varKey]: e.target.value
                    }))}
                    placeholder={`Value for {{${varKey}}}`}
                    className="flex-1"
                  />
                </div>
              ))}
            </div>

            {/* Message Preview */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Message Preview</Label>
              <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm whitespace-pre-wrap">{getPreviewWithVariables()}</p>
              </div>
            </div>

            {/* Patient Info */}
            <div className="text-xs text-muted-foreground">
              Sending to: {patientData?.full_name || visit.patient_details?.full_name} ({patientData?.mobile_primary || visit.patient_details?.mobile_primary})
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsWhatsAppDialogOpen(false)}
            >
              Skip
            </Button>
            <Button
              onClick={handleSendWhatsApp}
              disabled={isSendingWhatsApp}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSendingWhatsApp ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admission Form Drawer */}
      <AdmissionFormDrawer
        open={admissionDrawerOpen}
        onOpenChange={setAdmissionDrawerOpen}
        defaultPatientId={visit.patient}
        onSuccess={() => {
          mutateAdmissions();
          setEncounterType('admission');
        }}
      />
    </div>
  );
};