// src/components/opd/shared/OPDPatientQuickInfo.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Droplet, Activity, Pencil, Stethoscope, AlertTriangle, Calendar, Clock } from 'lucide-react';

interface OPDPatientQuickInfoProps {
  visit: any;
  patient: any;
  onEdit?: () => void;
}

export const OPDPatientQuickInfo: React.FC<OPDPatientQuickInfoProps> = ({ visit, patient, onEdit }) => {
  const calculateBMI = () => {
    if (visit.weight && visit.height) {
      const heightM = parseFloat(visit.height) / 100;
      const bmi = parseFloat(visit.weight) / (heightM * heightM);
      return bmi.toFixed(1);
    }
    return 'N/A';
  };

  return (
    <Card className="bg-card/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm flex-1">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Blood Group</span>
              <span className="font-medium flex items-center gap-2">
                <Droplet className="h-3 w-3 text-red-500" /> {patient?.blood_group || 'N/A'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Vitals (BMI)</span>
              <span className="font-medium flex items-center gap-2">
                <Activity className="h-3 w-3 text-blue-500" /> {calculateBMI()}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Visit Type</span>
              <Badge variant="outline" className="w-fit text-[10px] font-normal">
                {visit.visit_type?.toUpperCase()}
              </Badge>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Priority</span>
              <span className={`font-medium flex items-center gap-2 ${visit.priority === 'high' || visit.priority === 'urgent' ? 'text-red-600' : ''}`}>
                {(visit.priority === 'high' || visit.priority === 'urgent') && <AlertTriangle className="h-3 w-3" />}
                {visit.priority?.toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Doctor</span>
              <span className="font-medium flex items-center gap-2 truncate">
                <Stethoscope className="h-3 w-3 text-primary shrink-0" />
                <span className="truncate">{visit.doctor_details?.full_name || 'N/A'}</span>
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Chief Complaint</span>
              <span className="font-medium truncate text-muted-foreground">
                {visit.chief_complaint || 'Not recorded'}
              </span>
            </div>
          </div>
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="h-8 w-8 shrink-0 ml-3 text-muted-foreground hover:text-foreground"
              title="Edit visit details"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
