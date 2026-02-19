// src/components/consultation/ProfileTab.tsx
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Phone, Mail, MapPin, Heart, Shield, Calendar, Briefcase } from 'lucide-react';
import { usePatient } from '@/hooks/usePatient';
import { format } from 'date-fns';

interface ProfileTabProps {
  patientId: number;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ patientId }) => {
  const { usePatientById } = usePatient();
  const { data: patient, isLoading, error } = usePatientById(patientId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="text-center py-16 text-sm text-muted-foreground">
        Failed to load patient profile
      </div>
    );
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  const Field = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div className="space-y-0.5">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm">{value || '-'}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-foreground/5 border flex items-center justify-center text-lg font-semibold">
            {patient.full_name?.charAt(0) || 'P'}
          </div>
          <div>
            <h2 className="text-base font-semibold">{patient.full_name}</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="font-mono">{patient.patient_id}</span>
              <span>·</span>
              <span>{patient.age} yrs / {patient.gender}</span>
              {patient.blood_group && (
                <>
                  <span>·</span>
                  <Badge variant="outline" className="h-4 text-[10px] px-1.5 font-normal">{patient.blood_group}</Badge>
                </>
              )}
            </div>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`text-[10px] uppercase ${
            patient.status === 'active'
              ? 'border-foreground/20 text-foreground'
              : patient.status === 'deceased'
              ? 'border-red-300 text-red-600'
              : 'border-muted-foreground/30 text-muted-foreground'
          }`}
        >
          {patient.status}
        </Badge>
      </div>

      {/* Personal Info */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Personal Information</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
          <Field label="Full Name" value={patient.full_name} />
          <Field label="Date of Birth" value={formatDate(patient.date_of_birth)} />
          <Field label="Gender" value={patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : undefined} />
          <Field label="Blood Group" value={patient.blood_group} />
          <Field label="Marital Status" value={patient.marital_status ? patient.marital_status.charAt(0).toUpperCase() + patient.marital_status.slice(1) : undefined} />
          <Field label="Occupation" value={patient.occupation} />
          <Field label="Height" value={patient.height ? `${patient.height} cm` : undefined} />
          <Field label="Weight" value={patient.weight ? `${patient.weight} kg` : undefined} />
        </div>
      </div>

      {/* Contact Info */}
      <div className="border-t pt-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Contact Information</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
          <Field label="Primary Mobile" value={patient.mobile_primary} />
          <Field label="Secondary Mobile" value={patient.mobile_secondary} />
          <Field label="Email" value={patient.email} />
          <div /> {/* spacer */}
          <div className="col-span-2 md:col-span-4">
            <Field label="Address" value={patient.full_address || [patient.address_line1, patient.address_line2, patient.city, patient.state, patient.pincode, patient.country].filter(Boolean).join(', ') || undefined} />
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="border-t pt-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Heart className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Emergency Contact</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
          <Field label="Contact Name" value={patient.emergency_contact_name} />
          <Field label="Relation" value={patient.emergency_contact_relation} />
          <Field label="Phone" value={patient.emergency_contact_phone} />
        </div>
      </div>

      {/* Insurance */}
      {(patient.insurance_provider || patient.insurance_policy_number) && (
        <div className="border-t pt-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Insurance</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
            <Field label="Provider" value={patient.insurance_provider} />
            <Field label="Policy Number" value={patient.insurance_policy_number} />
            <Field label="Expiry Date" value={formatDate(patient.insurance_expiry_date)} />
            <Field
              label="Status"
              value={patient.is_insurance_valid ? 'Valid' : patient.insurance_expiry_date ? 'Expired' : undefined}
            />
          </div>
        </div>
      )}

      {/* Registration Info */}
      <div className="border-t pt-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Registration</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
          <Field label="Registration Date" value={formatDate(patient.registration_date)} />
          <Field label="Last Visit" value={formatDate(patient.last_visit_date)} />
          <Field label="Total Visits" value={patient.total_visits} />
        </div>
      </div>
    </div>
  );
};
