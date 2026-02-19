// src/components/opd/OPDBillingTab.tsx
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OpdVisit } from '@/types/opdVisit.types';

interface OPDFormData {
  receiptNo: string;
  billDate: string;
  billTime: string;
  doctor: string;
  opdType: string;
  chargeType: string;
  diagnosis: string;
  remarks: string;
  opdAmount: string;
}

interface OPDBillingTabProps {
  formData: OPDFormData;
  visit: OpdVisit;
  onInputChange: (field: string, value: string) => void;
}

export const OPDBillingTab: React.FC<OPDBillingTabProps> = ({
  formData,
  visit,
  onInputChange,
}) => {
  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-sm">Consultation Fees</CardTitle>
        <CardDescription className="text-xs">Doctor charges for this visit</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        <div className="space-y-2">
          <Label htmlFor="opdAmount" className="text-xs">Fee Amount</Label>
          <div className="relative">
            <Input
              id="opdAmount"
              type="number"
              value={formData.opdAmount}
              onChange={(e) => onInputChange('opdAmount', e.target.value)}
              className="pr-10 h-8 text-sm font-semibold"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
              INR
            </span>
          </div>
          {visit.doctor_details && (
            <div className="bg-muted/50 p-2.5 rounded-md flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{visit.doctor_details.full_name}</p>
                {visit.doctor_details.specialties && visit.doctor_details.specialties.length > 0 && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {visit.doctor_details.specialties.map(s => s.name).join(', ')}
                  </p>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                Std fee: ₹{visit.visit_type === 'follow_up'
                  ? visit.doctor_details.follow_up_fee
                  : visit.doctor_details.consultation_fee}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
