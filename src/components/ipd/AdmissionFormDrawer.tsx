import { useState, useEffect } from 'react';
import { useIPD } from '@/hooks/useIPD';
import { AdmissionFormData } from '@/types/ipd.types';
import { PatientSelect } from '@/components/form/PatientSelect';
import { DoctorSelect } from '@/components/form/DoctorSelect';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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

interface AdmissionFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultPatientId?: number;
}

export function AdmissionFormDrawer({ open, onOpenChange, onSuccess, defaultPatientId }: AdmissionFormDrawerProps) {
  // Form state
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
  });

  // Local state for datetime picker
  const [admissionDate, setAdmissionDate] = useState<Date | undefined>();
  const [dischargeDate, setDischargeDate] = useState<Date | undefined>();

  // Sync defaultPatientId when drawer opens
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
    });
    setAdmissionDate(undefined);
    setDischargeDate(undefined);
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.patient) {
      toast({
        title: 'Validation Error',
        description: 'Please select a patient',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.doctor_id) {
      toast({
        title: 'Validation Error',
        description: 'Please select a doctor',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.ward) {
      toast({
        title: 'Validation Error',
        description: 'Please select a ward',
        variant: 'destructive',
      });
      return;
    }

    if (!admissionDate) {
      toast({
        title: 'Validation Error',
        description: 'Please enter admission date and time',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.reason.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter reason for admission',
        variant: 'destructive',
      });
      return;
    }

    // Validate discharge_date >= admission_date if discharge_date is provided
    if (dischargeDate) {
      if (dischargeDate < admissionDate) {
        toast({
          title: 'Validation Error',
          description: 'Discharge date cannot be before admission date',
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      // Convert to ISO 8601 format
      const submissionData: AdmissionFormData = {
        ...formData,
        admission_date: admissionDate.toISOString(),
        discharge_date: dischargeDate ? dischargeDate.toISOString() : null,
      };

      await createAdmission(submissionData);
      toast({
        title: 'Success',
        description: 'Patient admitted successfully',
      });
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to admit patient',
        variant: 'destructive',
      });
    }
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
          label: 'Admit Patient',
          onClick: handleSubmit,
        },
      ]}
    >
      <div className="grid gap-4 py-4">
        <PatientSelect
          value={formData.patient || null}
          onChange={(patientId) => setFormData({ ...formData, patient: patientId })}
          label="Patient"
          required={true}
        />

        <div className="grid gap-2">
          <Label htmlFor="admission_id">Admission Number (Optional)</Label>
          <Input
            id="admission_id"
            value={formData.admission_id}
            onChange={(e) => setFormData({ ...formData, admission_id: e.target.value })}
            placeholder="Leave empty to auto-generate (e.g., IPD/20260507/001)"
          />
          <p className="text-xs text-muted-foreground">
            If blank, system will auto-generate a unique ID
          </p>
        </div>

        <DoctorSelect
          value={formData.doctor_id || null}
          onChange={(doctorUserId) => setFormData({ ...formData, doctor_id: doctorUserId as string })}
          label="Doctor"
          required={true}
          returnUserId={true}
        />

        <div className="grid gap-2">
          <Label htmlFor="ward">Ward *</Label>
          <Select
            value={formData.ward ? formData.ward.toString() : ''}
            onValueChange={(value) => setFormData({ ...formData, ward: parseInt(value), bed: null })}
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoadingWards ? 'Loading wards...' : 'Select ward'} />
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
        </div>

        <div className="grid gap-2">
          <Label htmlFor="bed">Bed (Optional)</Label>
          <Select
            value={formData.bed ? formData.bed.toString() : ''}
            onValueChange={(value) => setFormData({ ...formData, bed: (value && value !== 'unassigned') ? parseInt(value) : null })}
            disabled={!formData.ward}
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoadingBeds ? 'Loading beds...' : !formData.ward ? 'Select a ward first' : 'Select bed (optional)'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">No bed assigned</SelectItem>
              {beds.filter(bed => bed.ward === formData.ward).map((bed) => (
                <SelectItem key={bed.id} value={bed.id.toString()}>
                  {bed.bed_number} - {bed.ward_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Admission Date & Time *</Label>
          <DateTimePicker
            date={admissionDate}
            onDateTimeChange={setAdmissionDate}
            placeholder="Select admission date and time"
          />
        </div>

        <div className="grid gap-2">
          <Label>Expected Discharge Date & Time (Optional)</Label>
          <DateTimePicker
            date={dischargeDate}
            onDateTimeChange={setDischargeDate}
            placeholder="Select expected discharge date and time"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="reason">Reason for Admission *</Label>
          <Textarea
            id="reason"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="Enter reason for admission"
            rows={3}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="provisional_diagnosis">Provisional Diagnosis</Label>
          <Textarea
            id="provisional_diagnosis"
            value={formData.provisional_diagnosis}
            onChange={(e) => setFormData({ ...formData, provisional_diagnosis: e.target.value })}
            placeholder="Enter initial diagnosis"
            rows={3}
          />
        </div>
      </div>
    </SideDrawer>
  );
}
