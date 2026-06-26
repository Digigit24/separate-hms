// src/components/ipd/AdmissionInfo.tsx
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Admission, CLAIM_STATUS_LABELS, TPA_OPTIONS, ClaimStatus } from '@/types/ipd.types';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Edit2, Check, X } from 'lucide-react';
import { useIPD } from '@/hooks/useIPD';
import { toast } from '@/hooks/use-toast';

interface AdmissionInfoProps {
  admission: Admission;
  onUpdate: () => void;
}

export default function AdmissionInfo({ admission, onUpdate }: AdmissionInfoProps) {
  const [editingId, setEditingId] = useState(false);
  const [editingClaim, setEditingClaim] = useState(false);
  const [newAdmissionId, setNewAdmissionId] = useState(admission.admission_id);
  const [claimForm, setClaimForm] = useState<{
    has_mediclaim: boolean;
    tpa_name: string;
    claim_status: ClaimStatus;
    claim_reference_number: string;
    claim_notes: string;
  }>({
    has_mediclaim: admission.has_mediclaim || false,
    tpa_name: admission.tpa_name || '',
    claim_status: admission.claim_status || 'not_applicable',
    claim_reference_number: admission.claim_reference_number || '',
    claim_notes: admission.claim_notes || '',
  });
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

  const resetClaimForm = () => {
    setClaimForm({
      has_mediclaim: admission.has_mediclaim || false,
      tpa_name: admission.tpa_name || '',
      claim_status: admission.claim_status || 'not_applicable',
      claim_reference_number: admission.claim_reference_number || '',
      claim_notes: admission.claim_notes || '',
    });
  };

  const handleSaveClaim = async () => {
    setIsSaving(true);
    try {
      await patchAdmission(admission.id, {
        has_mediclaim: claimForm.has_mediclaim,
        tpa_name: claimForm.has_mediclaim ? claimForm.tpa_name : '',
        claim_status: claimForm.has_mediclaim ? claimForm.claim_status || 'not_started' : 'not_applicable',
        claim_reference_number: claimForm.has_mediclaim ? claimForm.claim_reference_number : '',
        claim_notes: claimForm.has_mediclaim ? claimForm.claim_notes : '',
      });
      toast({
        title: 'Success',
        description: 'Mediclaim details updated successfully',
      });
      setEditingClaim(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update mediclaim details',
        variant: 'destructive',
      });
      resetClaimForm();
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

      {/* Mediclaim Information */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Insurance / Claim</CardTitle>
              <CardDescription>Mediclaim and TPA tracking</CardDescription>
            </div>
            {editingClaim ? (
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveClaim} disabled={isSaving}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    resetClaimForm();
                    setEditingClaim(false);
                  }}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setEditingClaim(true)}>
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingClaim ? (
            <>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="claim_has_mediclaim"
                  checked={claimForm.has_mediclaim}
                  onCheckedChange={(checked) => {
                    const enabled = checked === true;
                    setClaimForm({
                      ...claimForm,
                      has_mediclaim: enabled,
                      claim_status: enabled ? 'not_started' : 'not_applicable',
                      tpa_name: enabled ? claimForm.tpa_name : '',
                      claim_reference_number: enabled ? claimForm.claim_reference_number : '',
                      claim_notes: enabled ? claimForm.claim_notes : '',
                    });
                  }}
                />
                <Label htmlFor="claim_has_mediclaim" className="text-sm font-medium">
                  Mediclaim available
                </Label>
              </div>

              {claimForm.has_mediclaim && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>TPA / Insurance Provider</Label>
                    <Select
                      value={claimForm.tpa_name || ''}
                      onValueChange={(value) => setClaimForm({ ...claimForm, tpa_name: value })}
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

                  <div className="grid gap-2">
                    <Label>Claim Status</Label>
                    <Select
                      value={claimForm.claim_status || 'not_started'}
                      onValueChange={(value) => setClaimForm({ ...claimForm, claim_status: value as ClaimStatus })}
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

                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="claim_reference_number">Claim / Pre-auth Number</Label>
                    <Input
                      id="claim_reference_number"
                      value={claimForm.claim_reference_number}
                      onChange={(event) => setClaimForm({ ...claimForm, claim_reference_number: event.target.value })}
                      placeholder="Enter claim or pre-auth reference"
                    />
                  </div>

                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="claim_notes">Claim Notes</Label>
                    <Textarea
                      id="claim_notes"
                      value={claimForm.claim_notes}
                      onChange={(event) => setClaimForm({ ...claimForm, claim_notes: event.target.value })}
                      placeholder="Manual claim follow-up notes"
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Mediclaim</label>
                <div className="mt-1">
                  <Badge variant={admission.has_mediclaim ? 'default' : 'outline'}>
                    {admission.has_mediclaim ? 'Available' : 'Not available'}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Claim Status</label>
                <p className="text-sm mt-1">
                  {admission.has_mediclaim ? CLAIM_STATUS_LABELS[admission.claim_status || 'not_started'] : '-'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">TPA / Provider</label>
                <p className="text-sm mt-1">{admission.has_mediclaim ? admission.tpa_name || '-' : '-'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Claim / Pre-auth Number</label>
                <p className="text-sm mt-1">{admission.has_mediclaim ? admission.claim_reference_number || '-' : '-'}</p>
              </div>

              {admission.has_mediclaim && admission.claim_notes && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Claim Notes</label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{admission.claim_notes}</p>
                </div>
              )}
            </div>
          )}
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
