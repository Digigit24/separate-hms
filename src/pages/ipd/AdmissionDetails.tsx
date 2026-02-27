// src/pages/ipd/AdmissionDetails.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useIPD } from '@/hooks/useIPD';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { IPDAdmissionHeader } from '@/components/ipd/IPDAdmissionHeader';
import { IPDAdmissionTabs } from '@/components/ipd/IPDAdmissionTabs';

export default function AdmissionDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const { useAdmissionById, dischargePatient } = useIPD();

  // Get initial tab from query parameter, default to 'consultation'
  const initialTab = tabParam || 'consultation';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showDischargeDialog, setShowDischargeDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dischargeData, setDischargeData] = useState({
    discharge_type: 'Normal',
    discharge_summary: '',
  });

  // Update active tab when tab query parameter changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Fetch current admission
  const { data: admission, isLoading, error, mutate: mutateAdmission } = useAdmissionById(id ? parseInt(id) : null);

  // Handle back navigation
  const handleBack = () => {
    navigate('/ipd/admissions');
  };

  const handleDischargePatient = async () => {
    if (!admission) return;
    setIsSaving(true);
    try {
      await dischargePatient(admission.id, dischargeData);
      toast.success('Patient discharged successfully');
      setShowDischargeDialog(false);
      mutateAdmission();
    } catch (err: any) {
      toast.error(err.message || 'Failed to discharge patient');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !admission) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">Failed to load admission details</p>
          <Button variant="outline" size="sm" onClick={handleBack}>Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <IPDAdmissionHeader
        admission={admission}
        isSaving={isSaving}
        showDischargeDialog={showDischargeDialog}
        dischargeData={dischargeData}
        activeTab={activeTab}
        onBack={handleBack}
        onDischarge={handleDischargePatient}
        onTabChange={setActiveTab}
        setShowDischargeDialog={setShowDischargeDialog}
        setDischargeData={setDischargeData}
      />

      <div className="flex-1 overflow-auto">
        <IPDAdmissionTabs
          admission={admission}
          activeTab={activeTab}
        />
      </div>
    </div>
  );
}
