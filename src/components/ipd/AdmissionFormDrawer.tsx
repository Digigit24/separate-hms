import { useState, useEffect } from 'react';
import { useIPD } from '@/hooks/useIPD';
import { AdmissionFormData, CLAIM_STATUS_LABELS, TPA_OPTIONS, ClaimStatus } from '@/types/ipd.types';
import { PatientSelect } from '@/components/form/PatientSelect';
import { DoctorSelect } from '@/components/form/DoctorSelect';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { SideDrawer } from '@/components/SideDrawer';
import { cn } from '@/lib/utils';

interface AdmissionFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultPatientId?: number;
}

interface FormErrors {
  patient?: string;
  doctor_id?: string;
  ward?: string;
  admission_date?: string;
  reason?: string;
}

export function AdmissionFormDrawer({ open, onOpenChange, onSuccess, defaultPatientId }: AdmissionFormDrawerProps) {
  const [formData, setFormData] = useState<AdmissionFormData>({
    patient: defaultPatientId || 0,
    doctor_id: '',
    ward: 0,
    bed: null,
    admission_id: '',
    admission_date: '',
    discharge_date: null,
    reason: '',
    provisional_diagnosis: '',
    has_mediclaim: false,
    tpa_name: '',
    claim_status: 'not_applicable',
    claim_reference_number: '',
    claim_notes: '',
  });

  const [admissionDate, setAdmissionDate] = useState<Date | undefined>();
  const [dischargeDate, setDischargeDate] = useState<Date | undefined>();
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && defaultPatientId) {
      setFormData((prev) => ({ ...prev, patient: defaultPatientId }));
    }
  }, [open, defaultPatientId]);

  const { createAdmission, useWards, useAvailableBeds } = useIPD();
  const { data: wardsData, isLoading: isLoadingWards } = useWards({ is_active: true });
  const { data: availableBeds, isLoading: isLoadingBeds } = useAvailableBeds();

  const wards = wardsData?.results || [];
  const beds = availableBeds || [];

  const resetForm = () => {
    setFormData({
      patient: defaultPatientId || 0,
      doctor_id: '',
      ward: 0,
      bed: null,
      admission_id: '',
      admission_date: '',
      discharge_date: null,
      reason: '',
      provisional_diagnosis: '',
      has_mediclaim: false,
      tpa_name: '',
      claim_status: 'not_applicable',
      claim_reference_number: '',
      claim_notes: '',
    });
    setAdmissionDate(undefined);
    setDischargeDate(undefined);
    setErrors({});
  };

  // Validate all required fields at once — returns error map (empty = valid)
  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!formData.patient) e.patient = 'Please select a patient';
    if (!formData.doctor_id) e.doctor_id = 'Please select a doctor';
    if (!formData.ward) e.ward = 'Please select a ward';
    if (!admissionDate) e.admission_date = 'Please enter admission date and time';
    if (!formData.reason.trim()) e.reason = 'Please enter reason for admission';
    return e;
  };

  const handleSubmit = async () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Extra cross-field check
    if (dischargeDate && admissionDate && dischargeDate < admissionDate) {
      toast({
        title: 'Validation Error',
        description: 'Discharge date cannot be before admission date',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const submissionData: AdmissionFormData = {
        ...formData,
        claim_status: formData.has_mediclaim ? formData.claim_status || 'not_started' : 'not_applicable',
        tpa_name: formData.has_mediclaim ? formData.tpa_name || '' : '',
        claim_reference_number: formData.has_mediclaim ? formData.claim_reference_number || '' : '',
        claim_notes: formData.has_mediclaim ? formData.claim_notes || '' : '',
        admission_date: admissionDate!.toISOString(),
        discharge_date: dischargeDate ? dischargeDate.toISOString() : null,
      };
      await createAdmission(submissionData);
      toast({ title: 'Success', description: 'Patient admitted successfully' });
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to admit patient',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear individual field error when user fills it
  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <SideDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="New Patient Admission"
      description="Admit a patient to the IPD ward"
      mode="create"
      footerButtons={[
        {
          label: 'Cancel',
          onClick: () => onOpenChange(false),
          variant: 'outline',
        },
        {
          label: isSubmitting ? 'Admitting...' : 'Admit Patient',
          onClick: handleSubmit,
          disabled: isSubmitting,
        },
      ]}
    >
      <div className="grid gap-4 py-4">

        {/* Patient */}
        <div className="grid gap-1.5">
          <PatientSelect
            value={formData.patient || null}
            onChange={(patientId) => {
              setFormData({ ...formData, patient: patientId });
              clearError('patient');
            }}
            label="Patient"
            required={true}
            error={errors.patient}
          />
          {errors.patient && (
            <p className="text-xs text-destructive">{errors.patient}</p>
          )}
        </div>

        {/* Doctor */}
        <div className="grid gap-1.5">
          <DoctorSelect
            value={formData.doctor_id || null}
            onChange={(doctorUserId) => {
              setFormData({ ...formData, doctor_id: doctorUserId as string });
              clearError('doctor_id');
            }}
            label="Doctor"
            required={true}
            returnUserId={true}
            error={errors.doctor_id}
          />
          {errors.doctor_id && (
            <p className="text-xs text-destructive">{errors.doctor_id}</p>
          )}
        </div>

        {/* Ward */}
        <div className="grid gap-1.5">
          <Label htmlFor="ward" className={errors.ward ? 'text-destructive' : ''}>
            Ward <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.ward ? formData.ward.toString() : ''}
            onValueChange={(value) => {
              setFormData({ ...formData, ward: parseInt(value), bed: null });
              clearError('ward');
            }}
          >
            <SelectTrigger className={cn(errors.ward && 'border-destructive ring-destructive focus:ring-destructive')}>
              <SelectValue placeholder={isLoadingWards ? 'Loading wards…' : 'Select ward'} />
            </SelectTrigger>
            <SelectContent>
              {wards.length === 0 && !isLoadingWards && (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No wards available. Create wards in IPD settings first.
                </div>
              )}
              {wards.map((ward) => (
                <SelectItem key={ward.id} value={ward.id.toString()}>
                  {ward.name} ({ward.available_beds_count ?? 0} available)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.ward && <p className="text-xs text-destructive">{errors.ward}</p>}
        </div>

        {/* Bed (optional) */}
        <div className="grid gap-1.5">
          <Label htmlFor="bed">Bed <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Select
            value={formData.bed ? formData.bed.toString() : ''}
            onValueChange={(value) =>
              setFormData({ ...formData, bed: value && value !== 'unassigned' ? parseInt(value) : null })
            }
            disabled={!formData.ward}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  isLoadingBeds ? 'Loading beds…' : !formData.ward ? 'Select a ward first' : 'Select bed (optional)'
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">No bed assigned</SelectItem>
              {beds
                .filter((bed) => bed.ward === formData.ward)
                .map((bed) => (
                  <SelectItem key={bed.id} value={bed.id.toString()}>
                    {bed.bed_number} — {bed.ward_name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Admission Date */}
        <div className="grid gap-1.5">
          <Label className={errors.admission_date ? 'text-destructive' : ''}>
            Admission Date &amp; Time <span className="text-destructive">*</span>
          </Label>
          <div className={cn(errors.admission_date && 'ring-1 ring-destructive rounded-md')}>
            <DateTimePicker
              date={admissionDate}
              onDateTimeChange={(d) => {
                setAdmissionDate(d);
                clearError('admission_date');
              }}
              placeholder="Select admission date and time"
            />
          </div>
          {errors.admission_date && (
            <p className="text-xs text-destructive">{errors.admission_date}</p>
          )}
        </div>

        {/* Expected Discharge (optional) */}
        <div className="grid gap-1.5">
          <Label>Expected Discharge <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <DateTimePicker
            date={dischargeDate}
            onDateTimeChange={setDischargeDate}
            placeholder="Select expected discharge date and time"
          />
        </div>

        {/* Reason for Admission */}
        <div className="grid gap-1.5">
          <Label htmlFor="reason" className={errors.reason ? 'text-destructive' : ''}>
            Reason for Admission <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="reason"
            value={formData.reason}
            onChange={(e) => {
              setFormData({ ...formData, reason: e.target.value });
              clearError('reason');
            }}
            placeholder="Enter reason for admission"
            rows={3}
            className={cn(errors.reason && 'border-destructive focus-visible:ring-destructive')}
          />
          {errors.reason && <p className="text-xs text-destructive">{errors.reason}</p>}
        </div>

        {/* Provisional Diagnosis (optional) */}
        <div className="grid gap-1.5">
          <Label htmlFor="provisional_diagnosis">
            Provisional Diagnosis <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Textarea
            id="provisional_diagnosis"
            value={formData.provisional_diagnosis}
            onChange={(e) => setFormData({ ...formData, provisional_diagnosis: e.target.value })}
            placeholder="Enter initial diagnosis"
            rows={3}
          />
        </div>

        {/* Mediclaim / TPA */}
        <div className="rounded-md border p-3 space-y-3">
          <div className="flex items-start gap-2">
            <Checkbox
              id="has_mediclaim"
              checked={formData.has_mediclaim}
              onCheckedChange={(checked) => {
                const enabled = checked === true;
                setFormData({
                  ...formData,
                  has_mediclaim: enabled,
                  claim_status: enabled ? 'not_started' : 'not_applicable',
                  tpa_name: enabled ? formData.tpa_name : '',
                  claim_reference_number: enabled ? formData.claim_reference_number : '',
                  claim_notes: enabled ? formData.claim_notes : '',
                });
              }}
            />
            <div className="grid gap-1 leading-none">
              <Label htmlFor="has_mediclaim">Mediclaim available</Label>
              <p className="text-xs text-muted-foreground">
                Enable this when the admission will be processed through insurance or a TPA.
              </p>
            </div>
          </div>

          {formData.has_mediclaim && (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>TPA / Insurance Provider</Label>
                <Select
                  value={formData.tpa_name || ''}
                  onValueChange={(value) => setFormData({ ...formData, tpa_name: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose TPA" />
                  </SelectTrigger>
                  <SelectContent>
                    {TPA_OPTIONS.map((tpa) => (
                      <SelectItem key={tpa} value={tpa}>{tpa}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label>Claim Status</Label>
                <Select
                  value={formData.claim_status || 'not_started'}
                  onValueChange={(value) => setFormData({ ...formData, claim_status: value as ClaimStatus })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select claim status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CLAIM_STATUS_LABELS)
                      .filter(([key]) => key !== 'not_applicable')
                      .map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="claim_reference_number">Claim / Pre-auth Number</Label>
                <input
                  id="claim_reference_number"
                  value={formData.claim_reference_number || ''}
                  onChange={(e) => setFormData({ ...formData, claim_reference_number: e.target.value })}
                  placeholder="Enter claim or pre-auth reference"
                  className="h-8 rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="claim_notes">Claim Notes</Label>
                <Textarea
                  id="claim_notes"
                  value={formData.claim_notes || ''}
                  onChange={(e) => setFormData({ ...formData, claim_notes: e.target.value })}
                  placeholder="Manual claim follow-up notes"
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>

      </div>
    </SideDrawer>
  );
}
