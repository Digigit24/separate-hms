// src/pages/ipd-billing/IPDBillingDetailsPage.tsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { IPDBillingContent } from '@/components/ipd/IPDBillingContent';
import { useIPDBilling } from '@/hooks/useIPDBilling';
import { useIPD } from '@/hooks/useIPD';

export const IPDBillingDetailsPage: React.FC = () => {
  const { billId } = useParams<{ billId: string }>();
  const navigate = useNavigate();
  const { useIPDBillingById } = useIPDBilling();
  const { useAdmissionById } = useIPD();

  // Fetch bill details
  const { data: bill, isLoading } = useIPDBillingById(billId ? parseInt(billId) : null);

  // Fetch the actual admission data (will be null until bill is loaded)
  const { data: admissionData } = useAdmissionById(bill?.admission || null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading bill details...</p>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Bill Not Found</h3>
            <p className="text-muted-foreground mb-6">
              The bill you're looking for doesn't exist or has been deleted.
            </p>
            <Button onClick={() => navigate('/ipd/billing')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Bills
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Convert bill to admission format for IPDBillingContent
  const admission = admissionData || {
    id: bill.admission,
    admission_id: bill.admission_number || `ADM-${bill.admission}`,
    patient: 0, // Will be populated from bill
    patient_name: bill.patient_name,
    doctor_id: bill.doctor_id,
    doctor_name: '',
    admission_date: bill.bill_date, // Approximation
    status: 'admitted' as const,
    ward: 0,
    bed: 0,
    reason: '',
  };

  return (
    <div className="p-4 md:p-5 w-full space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[12px]"
          onClick={() => navigate('/ipd/billing')}
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Back
        </Button>
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-lg font-bold leading-none">IPD Bill Details</h1>
          <span className="text-[12px] text-muted-foreground truncate">
            {bill.bill_number} • {bill.patient_name}
          </span>
        </div>
      </div>

      {/* Billing Content */}
      <IPDBillingContent admission={admission} billId={bill.id} />
    </div>
  );
};
