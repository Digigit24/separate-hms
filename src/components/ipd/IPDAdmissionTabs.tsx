// src/components/ipd/IPDAdmissionTabs.tsx
import React from 'react';
import { IPDConsultationTab } from '@/components/ipd/IPDConsultationTab';
import { IPDBillingContent } from '@/components/ipd/IPDBillingContent';
import BedTransfersTab from '@/components/ipd/BedTransfersTab';
import AdmissionInfo from '@/components/ipd/AdmissionInfo';

interface IPDAdmissionTabsProps {
  admission: any;
  activeTab: string;
}

export const IPDAdmissionTabs: React.FC<IPDAdmissionTabsProps> = ({
  admission,
  activeTab,
}) => {
  return (
    <div className="w-full px-4 py-3">
      {activeTab === 'consultation' && (
        <IPDConsultationTab admission={admission} />
      )}
      {activeTab === 'billing' && (
        <IPDBillingContent admission={admission} />
      )}
      {activeTab === 'transfers' && (
        <BedTransfersTab admissionId={admission.id} />
      )}
      {activeTab === 'info' && (
        <AdmissionInfo admission={admission} onUpdate={() => {}} />
      )}
    </div>
  );
};
