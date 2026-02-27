// src/components/ipd/IPDAdmissionHeader.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Loader2,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { ADMISSION_STATUS_LABELS } from '@/types/ipd.types';

interface IPDAdmissionHeaderProps {
  admission: any;
  isSaving: boolean;
  showDischargeDialog: boolean;
  dischargeData: {
    discharge_type: string;
    discharge_summary: string;
  };
  activeTab: string;
  onBack: () => void;
  onDischarge: () => void;
  onTabChange: (tab: string) => void;
  setShowDischargeDialog: (show: boolean) => void;
  setDischargeData: (data: any) => void;
}

export const IPDAdmissionHeader: React.FC<IPDAdmissionHeaderProps> = ({
  admission,
  isSaving,
  showDischargeDialog,
  dischargeData,
  activeTab,
  onBack,
  onDischarge,
  onTabChange,
  setShowDischargeDialog,
  setDischargeData,
}) => {
  const navigate = useNavigate();
  const patientName = admission.patient_name?.replace(/ None$/, '') || 'Unknown Patient';

  return (
    <>
      <div className="sticky top-0 z-20 w-full bg-background border-b">
        {/* Patient bar */}
        <div className="flex items-center justify-between px-4 py-2.5">
          {/* Left: Back + Patient + Quick Info */}
          <div className="flex items-center gap-2.5 min-w-0">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-7 w-7 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <span
              className="text-sm font-semibold truncate cursor-pointer hover:underline underline-offset-2"
              onClick={() => navigate(`/patients/${admission.patient}`)}
            >
              {patientName}
            </span>

            <span className="text-[11px] text-muted-foreground font-mono shrink-0">{admission.admission_id}</span>

            <span className="text-[11px] text-muted-foreground shrink-0">
              {admission.ward_name} / {admission.bed_number || 'N/A'}
            </span>

            <span className="text-[11px] text-muted-foreground shrink-0 hidden md:inline">
              {admission.admission_date ? format(new Date(admission.admission_date), 'dd MMM yyyy') : 'N/A'}
            </span>

            <span className="text-[11px] text-muted-foreground shrink-0 hidden lg:inline">
              {admission.length_of_stay} {admission.length_of_stay === 1 ? 'day' : 'days'}
            </span>
          </div>

          {/* Right: Status + Action */}
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <Badge
              variant="outline"
              className={`text-[10px] uppercase tracking-wide font-medium px-2 h-5 ${
                admission.status === 'admitted'
                  ? 'bg-blue-500/15 text-blue-700 border-blue-300 dark:text-blue-400 dark:border-blue-600'
                  : admission.status === 'discharged'
                    ? 'bg-emerald-500/15 text-emerald-700 border-emerald-300 dark:text-emerald-400 dark:border-emerald-600'
                    : 'bg-amber-500/15 text-amber-700 border-amber-300 dark:text-amber-400 dark:border-amber-600'
              }`}
            >
              {ADMISSION_STATUS_LABELS[admission.status]}
            </Badge>

            {admission.status === 'admitted' && (
              <Button
                size="sm"
                onClick={() => setShowDischargeDialog(true)}
                disabled={isSaving}
                className="h-7 text-xs px-3 gap-1.5 bg-foreground hover:bg-foreground/90 text-background"
              >
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                <span className="hidden sm:inline">Discharge</span>
              </Button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center px-4 border-t h-9">
          <div className="flex shrink-0">
            {[
              { key: 'consultation', label: 'Consultation' },
              { key: 'billing', label: 'Billing' },
              { key: 'transfers', label: 'Bed Transfers' },
              { key: 'info', label: 'Admission Info' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={`px-3 h-9 text-xs font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={showDischargeDialog} onOpenChange={setShowDischargeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Discharge Patient</DialogTitle>
            <DialogDescription className="text-xs">
              Discharge {patientName} from {admission.ward_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="discharge_type" className="text-xs">Discharge Type *</Label>
              <Input
                id="discharge_type"
                value={dischargeData.discharge_type}
                onChange={(e) => setDischargeData({ ...dischargeData, discharge_type: e.target.value })}
                placeholder="e.g., Normal, Against Medical Advice"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="discharge_summary" className="text-xs">Discharge Summary</Label>
              <Textarea
                id="discharge_summary"
                value={dischargeData.discharge_summary}
                onChange={(e) => setDischargeData({ ...dischargeData, discharge_summary: e.target.value })}
                placeholder="Enter discharge summary and instructions"
                className="h-16 resize-none text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowDischargeDialog(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={onDischarge} disabled={isSaving} className="bg-foreground hover:bg-foreground/90 text-background">
              {isSaving && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />} Discharge Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
