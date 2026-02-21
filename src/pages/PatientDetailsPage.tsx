// src/pages/PatientDetailsPage.tsx
import { useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Loader2,
  Calendar,
  IndianRupee,
  Activity,
  Droplet,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';

import { usePatient } from '@/hooks/usePatient';
import PatientBasicInfo, { PatientBasicInfoHandle } from '@/components/patient-drawer/PatientBasicInfo';
import PatientVisitHistory from '@/components/patient-drawer/PatientVisitHistory';
import PatientBillingHistory from '@/components/patient-drawer/PatientBillingHistory';
import PatientAppointments from '@/components/patient-drawer/PatientAppointments';
import OPDVisitFormDrawer from '@/components/OPDVisitFormDrawer';
import AppointmentFormDrawer from '@/components/AppointmentFormDrawer';
import { OPDBillFormDrawer } from '@/components/OPDBillFormDrawer';
import type { PatientUpdateData } from '@/types/patient.types';

export const PatientDetailsPage = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('details');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Visit drawer state
  const [visitDrawerOpen, setVisitDrawerOpen] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);

  // Appointment drawer state
  const [appointmentDrawerOpen, setAppointmentDrawerOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [appointmentDrawerMode, setAppointmentDrawerMode] = useState<'view' | 'edit' | 'create'>('view');

  // Bill drawer state
  const [billDrawerOpen, setBillDrawerOpen] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);
  const [billDrawerMode, setBillDrawerMode] = useState<'view' | 'edit' | 'create'>('view');

  // Hooks
  const { usePatientById, updatePatient, deletePatient } = usePatient();

  // Parse patientId to number
  const patientIdNum = patientId ? parseInt(patientId, 10) : null;

  // Fetch patient data
  const {
    data: patient,
    error: patientError,
    isLoading: patientLoading,
    mutate: mutatePatient
  } = usePatientById(patientIdNum);

  // Form ref
  const formRef = useRef<PatientBasicInfoHandle | null>(null);

  // Handle back navigation
  const handleBack = useCallback(() => {
    navigate('/patients');
  }, [navigate]);

  // Handle edit mode toggle
  const handleEditToggle = useCallback(() => {
    setIsEditing(!isEditing);
  }, [isEditing]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!patient || !formRef.current) return;

    try {
      setIsSaving(true);
      const formValues = await formRef.current.getFormValues();

      if (!formValues) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Update the patient
      await updatePatient(patient.id, formValues as PatientUpdateData);
      await mutatePatient();
      toast.success('Patient updated successfully');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update patient');
      console.error('Failed to update patient:', error);
    } finally {
      setIsSaving(false);
    }
  }, [patient, updatePatient, mutatePatient]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!patient) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${patient.full_name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await deletePatient(patient.id);
      toast.success('Patient deleted successfully');
      navigate('/patients');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete patient');
      console.error('Failed to delete patient:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [patient, deletePatient, navigate]);

  // Handle call
  const handleCall = useCallback(() => {
    if (patient?.mobile_primary) {
      window.location.href = `tel:${patient.mobile_primary}`;
    }
  }, [patient]);

  // Handle email
  const handleEmail = useCallback(() => {
    if (patient?.email) {
      window.location.href = `mailto:${patient.email}`;
    }
  }, [patient]);

  // Handle new visit
  const handleNewVisit = useCallback(() => {
    setSelectedVisitId(null);
    setVisitDrawerOpen(true);
  }, []);

  // Handle visit drawer success
  const handleVisitSuccess = useCallback(() => {
    mutatePatient();
  }, [mutatePatient]);

  // Handle new appointment
  const handleNewAppointment = useCallback(() => {
    setSelectedAppointmentId(null);
    setAppointmentDrawerMode('create');
    setAppointmentDrawerOpen(true);
  }, []);

  // Handle appointment drawer success
  const handleAppointmentSuccess = useCallback(() => {
    mutatePatient();
  }, [mutatePatient]);

  // Handle view appointment
  const handleViewAppointment = useCallback((appointmentId: number) => {
    setSelectedAppointmentId(appointmentId);
    setAppointmentDrawerMode('view');
    setAppointmentDrawerOpen(true);
  }, []);

  // Handle new bill
  const handleNewBill = useCallback(() => {
    setSelectedBillId(null);
    setBillDrawerMode('create');
    setBillDrawerOpen(true);
  }, []);

  // Handle bill drawer success
  const handleBillSuccess = useCallback(() => {
    mutatePatient();
  }, [mutatePatient]);

  // Loading state
  if (patientLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (patientError || !patient) {
    return (
      <div className="p-6 max-w-8xl mx-auto">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <p className="text-destructive text-lg">
            {patientError ? 'Failed to load patient details' : 'Patient not found'}
          </p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patients
          </Button>
        </div>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-green-100 text-green-700 hover:bg-green-100' },
    inactive: { label: 'Inactive', className: 'bg-orange-100 text-orange-700 hover:bg-orange-100' },
    deceased: { label: 'Deceased', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
  };
  const config = statusConfig[patient.status] || statusConfig.active;

  return (
    <div className="flex flex-col h-full bg-background/95">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-3 gap-3 sm:gap-0">
          {/* Left Section */}
          <div className="flex items-center gap-3 sm:gap-6 w-full sm:w-auto">
            <Button variant="ghost" size="icon" onClick={handleBack} className="-ml-2 shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {patient.full_name?.charAt(0) || 'P'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-lg font-bold leading-none truncate">
                    {patient.full_name}
                  </h1>
                  <Badge
                    variant="secondary"
                    className={`px-2 py-0.5 text-[10px] uppercase tracking-wide shrink-0 ${config.className}`}
                  >
                    {config.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                  <span className="font-mono bg-muted px-1 rounded whitespace-nowrap">PID: {patient.patient_id}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline whitespace-nowrap">
                    {patient.age || '-'} yrs / {patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : '-'}
                  </span>
                  {patient.mobile_primary && (
                    <>
                      <span className="hidden md:inline">•</span>
                      <span className="hidden md:inline items-center gap-1 whitespace-nowrap">
                        <Phone className="h-3 w-3 inline" /> {patient.mobile_primary}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {!isEditing ? (
              <>
                {patient.mobile_primary && (
                  <Button onClick={handleCall} variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Call">
                    <Phone className="h-4 w-4" />
                  </Button>
                )}
                {patient.email && (
                  <Button onClick={handleEmail} variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Email">
                    <Mail className="h-4 w-4" />
                  </Button>
                )}
                <Button onClick={handleNewVisit} variant="outline" size="sm" className="gap-1 text-xs sm:text-sm shrink-0">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">New Visit</span>
                </Button>
                <Button onClick={handleEditToggle} variant="outline" size="sm" className="gap-1 text-xs sm:text-sm shrink-0">
                  <Pencil className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
                <Button
                  onClick={handleDelete}
                  variant="destructive"
                  size="sm"
                  disabled={isDeleting}
                  className="gap-1 text-xs sm:text-sm shrink-0"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleEditToggle} variant="outline" size="sm" className="text-xs sm:text-sm">
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  size="sm"
                  disabled={isSaving}
                  className="gap-1 text-xs sm:text-sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 w-full space-y-6">
        {/* Quick Info Strip */}
        {!isEditing && (
          <Card className="bg-card/50">
            <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Total Visits</span>
                <span className="font-medium flex items-center gap-2">
                  <Activity className="h-3 w-3 text-blue-500" /> {patient.total_visits || 0}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Last Visit</span>
                <span className="font-medium flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-green-500" />
                  {patient.last_visit_date
                    ? new Date(patient.last_visit_date).toLocaleDateString()
                    : 'N/A'}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Blood Group</span>
                <span className="font-medium flex items-center gap-2">
                  <Droplet className="h-3 w-3 text-red-500" /> {patient.blood_group || 'N/A'}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Insurance</span>
                <span className="font-medium flex items-center gap-2 truncate">
                  <Shield className="h-3 w-3 text-purple-500" /> {patient.insurance_provider || 'None'}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs in Card */}
        <Card className="flex-1 overflow-hidden flex flex-col border-x-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
            <div className="border-b bg-muted/30 pt-4">
              <TabsList className="grid w-full grid-cols-4 h-auto p-1">
                {[
                  { value: 'details', label: 'Details' },
                  { value: 'visits', label: 'OPD Visits' },
                  { value: 'billing', label: 'Billing' },
                  { value: 'appointments', label: 'Appointments' },
                ].map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm py-2"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto bg-card">
              {/* Patient Details Tab */}
              <TabsContent value="details" className="mt-0 h-full p-6">
                <PatientBasicInfo
                  patient={patient}
                  mode={isEditing ? 'edit' : 'view'}
                  ref={formRef}
                />
              </TabsContent>

              {/* OPD Visits Tab */}
              <TabsContent value="visits" className="mt-0 h-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">OPD Visit History</h3>
                  <Button onClick={handleNewVisit} size="sm" className="h-7 text-xs">
                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                    New Visit
                  </Button>
                </div>
                <PatientVisitHistory patientId={patient.id} />
              </TabsContent>

              {/* Billing Tab */}
              <TabsContent value="billing" className="mt-0 h-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">Billing History</h3>
                  <Button onClick={handleNewBill} size="sm" className="h-7 text-xs">
                    <IndianRupee className="h-3.5 w-3.5 mr-1.5" />
                    Add Bill
                  </Button>
                </div>
                <PatientBillingHistory patientId={patient.id} />
              </TabsContent>

              {/* Appointments Tab */}
              <TabsContent value="appointments" className="mt-0 h-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">Appointments</h3>
                  <Button onClick={handleNewAppointment} size="sm" className="h-7 text-xs">
                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                    Add Appointment
                  </Button>
                </div>
                <PatientAppointments
                  patientId={patient.id}
                  onViewAppointment={handleViewAppointment}
                />
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>

      {/* Visit Drawer */}
      <OPDVisitFormDrawer
        open={visitDrawerOpen}
        onOpenChange={setVisitDrawerOpen}
        visitId={selectedVisitId}
        mode={selectedVisitId ? 'view' : 'create'}
        onSuccess={handleVisitSuccess}
        initialPatientId={patientIdNum}
      />

      {/* Appointment Drawer */}
      <AppointmentFormDrawer
        open={appointmentDrawerOpen}
        onOpenChange={setAppointmentDrawerOpen}
        appointmentId={selectedAppointmentId}
        mode={appointmentDrawerMode}
        onSuccess={handleAppointmentSuccess}
        onModeChange={setAppointmentDrawerMode}
        initialPatientId={patientIdNum}
      />

      {/* Bill Drawer */}
      <OPDBillFormDrawer
        isOpen={billDrawerOpen}
        onClose={() => setBillDrawerOpen(false)}
        billId={selectedBillId}
        mode={billDrawerMode}
        onSuccess={handleBillSuccess}
      />
    </div>
  );
};

export default PatientDetailsPage;
