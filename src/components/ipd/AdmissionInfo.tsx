// src/components/ipd/AdmissionInfo.tsx
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Admission } from '@/types/ipd.types';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit2, Check, X } from 'lucide-react';
import { useIPD } from '@/hooks/useIPD';
import { toast } from '@/hooks/use-toast';

interface AdmissionInfoProps {
  admission: Admission;
  onUpdate: () => void;
}

export default function AdmissionInfo({ admission, onUpdate }: AdmissionInfoProps) {
  const [editingId, setEditingId] = useState(false);
  const [newAdmissionId, setNewAdmissionId] = useState(admission.admission_id);
  const [isSaving, setIsSaving] = useState(false);
  const { patchAdmission } = useIPD();

  const handleSaveAdmissionId = async () => {
    if (!newAdmissionId.trim()) {
      toast({
        title: 'Error',
        description: 'Admission ID cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    if (newAdmissionId === admission.admission_id) {
      setEditingId(false);
      return;
    }

    setIsSaving(true);
    try {
      await patchAdmission(admission.id, { admission_id: newAdmissionId });
      toast({
        title: 'Success',
        description: 'Admission ID updated successfully',
      });
      setEditingId(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update admission ID',
        variant: 'destructive',
      });
      setNewAdmissionId(admission.admission_id);
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <div className="p-6 space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>General admission details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Admission ID</label>
              {editingId ? (
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newAdmissionId}
                    onChange={(e) => setNewAdmissionId(e.target.value)}
                    className="text-sm font-mono"
                    placeholder="Enter admission ID"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveAdmissionId}
                    disabled={isSaving}
                    variant="default"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingId(false);
                      setNewAdmissionId(admission.admission_id);
                    }}
                    disabled={isSaving}
                    variant="outline"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm font-mono">{admission.admission_id}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(true)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Patient</label>
              <p className="text-sm mt-1">{admission.patient_name}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Ward</label>
              <p className="text-sm mt-1">{admission.ward_name}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Bed</label>
              <p className="text-sm mt-1">{admission.bed_number || 'Not assigned'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Admission Date</label>
              <p className="text-sm mt-1">
                {(() => {
                  try {
                    return format(new Date(admission.admission_date), 'dd MMM yyyy, HH:mm');
                  } catch {
                    return 'Invalid date';
                  }
                })()}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Length of Stay</label>
              <p className="text-sm mt-1">
                {admission.length_of_stay} {admission.length_of_stay === 1 ? 'day' : 'days'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clinical Information */}
      <Card>
        <CardHeader>
          <CardTitle>Clinical Information</CardTitle>
          <CardDescription>Medical details and diagnosis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Reason for Admission</label>
            <p className="text-sm mt-1 whitespace-pre-wrap">{admission.reason}</p>
          </div>

          <Separator />

          <div>
            <label className="text-sm font-medium text-muted-foreground">Provisional Diagnosis</label>
            <p className="text-sm mt-1 whitespace-pre-wrap">
              {admission.provisional_diagnosis || 'Not provided'}
            </p>
          </div>

          {admission.final_diagnosis && (
            <>
              <Separator />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Final Diagnosis</label>
                <p className="text-sm mt-1 whitespace-pre-wrap">{admission.final_diagnosis}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Discharge Information */}
      {admission.status === 'discharged' && admission.discharge_date && (
        <Card>
          <CardHeader>
            <CardTitle>Discharge Information</CardTitle>
            <CardDescription>Discharge details and summary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Discharge Date</label>
                <p className="text-sm mt-1">
                  {(() => {
                    try {
                      return format(new Date(admission.discharge_date), 'dd MMM yyyy, HH:mm');
                    } catch {
                      return 'Invalid date';
                    }
                  })()}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Discharge Type</label>
                <p className="text-sm mt-1">{admission.discharge_type || '-'}</p>
              </div>
            </div>

            {admission.discharge_summary && (
              <>
                <Separator />
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Discharge Summary</label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{admission.discharge_summary}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
