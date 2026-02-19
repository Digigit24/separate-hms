// src/components/opd/OPDBillingContent.tsx
import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOPDBill } from '@/hooks/useOPDBill';
import { useProcedureMaster } from '@/hooks/useProcedureMaster';
import { useProcedurePackage } from '@/hooks/useProcedurePackage';
import { useDiagnostics } from '@/hooks/useDiagnostics';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { opdBillService } from '@/services/opdBill.service';
import { formatLocalDate } from '@/lib/utils';
import { procedurePackageService } from '@/services/procedurePackage.service';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Receipt,
  Package,
  Plus,
  FlaskConical,
  Download,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ProcedureBillingTab, type ProcedureItem } from './ProcedureBillingTab';
import { InvestigationsBillingTab } from './InvestigationsBillingTab';
import { BillPreviewTab } from './BillPreviewTab';
import { BillItemsTable } from './BillItemsTable';

import type {
  OPDBill,
  OPDBillItem,
  OPDBillItemCreateData,
  OPDType,
  ChargeType,
} from '@/types/opdBill.types';
import type { OpdVisit } from '@/types/opdVisit.types';
import type { Investigation } from '@/types/diagnostics.types';
import type { ProcedureMaster } from '@/types/procedureMaster.types';

/* --------------------------------- Types --------------------------------- */

type BillingData = {
  opdTotal: string;
  procedureTotal: string;
  subtotal: string;
  discount: string;
  discountPercent: string;
  totalAmount: string;
  paymentMode: 'cash' | 'card' | 'upi' | 'bank';
  receivedAmount: string;
  balanceAmount: string;
};

/* --------------------------- Reusable Right Panel -------------------------- */

type BillingDetailsPanelProps = {
  data: BillingData;
  billItems: OPDBillItem[];
  onChange: (field: string, value: string) => void;
  onFormatReceived: () => void;
  onSave: () => void;
  isEditMode?: boolean;
};

const BillingDetailsPanel = memo(function BillingDetailsPanel({
  data,
  billItems,
  onChange,
  onFormatReceived,
  onSave,
  isEditMode = false,
}: BillingDetailsPanelProps) {
  return (
    <div className="sticky top-4 space-y-3">
      {/* Totals */}
      <div className="border rounded-md p-3 space-y-2.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-semibold">₹{data.subtotal}</span>
        </div>

        {/* Discount row */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">Discount</span>
          <Input
            type="number"
            value={data.discount}
            onChange={(e) => onChange('discount', e.target.value)}
            className="flex-1 h-7 text-xs"
            placeholder="0.00"
          />
          <Input
            type="number"
            value={data.discountPercent}
            onChange={(e) => onChange('discountPercent', e.target.value)}
            className="w-12 h-7 text-xs"
            placeholder="0"
          />
          <span className="text-[10px] text-muted-foreground">%</span>
        </div>

        <Separator />

        <div className="flex justify-between text-sm font-bold">
          <span>Total</span>
          <span>₹{data.totalAmount}</span>
        </div>
      </div>

      {/* Payment */}
      <div className="border rounded-md p-3 space-y-2.5">
        <div className="flex items-center gap-1.5">
          {(['cash', 'card', 'upi'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onChange('paymentMode', mode)}
              className={`flex-1 h-7 text-[11px] font-medium rounded border capitalize transition-colors ${
                data.paymentMode === mode
                  ? 'bg-foreground text-background border-foreground'
                  : 'text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-muted-foreground">Received</span>
            <Input
              type="number"
              value={data.receivedAmount}
              onChange={(e) => onChange('receivedAmount', e.target.value)}
              onBlur={onFormatReceived}
              className="h-7 text-xs text-green-600 font-semibold mt-0.5"
            />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground">Balance</span>
            <Input
              type="number"
              value={data.balanceAmount}
              className="h-7 text-xs text-orange-600 font-semibold mt-0.5"
              readOnly
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <Button variant="default" className="w-full h-8 text-xs" size="sm" onClick={onSave}>
        <Receipt className="mr-1.5 h-3.5 w-3.5" />
        {isEditMode ? 'Update Bill' : 'Save Bill'}
      </Button>
    </div>
  );
});

/* --------------------------------- Component --------------------------------- */

interface OPDBillingContentProps {
  visit: OpdVisit;
}

export const OPDBillingContent: React.FC<OPDBillingContentProps> = ({ visit }) => {
  const navigate = useNavigate();
  const { user, getTenant } = useAuth();
  const { useTenantDetail } = useTenant();

  // Get tenant from current session
  const tenant = getTenant();
  const tenantId = tenant?.id || null;

  // Fetch tenant settings for branding
  const { data: tenantData, isLoading: tenantLoading } = useTenantDetail(tenantId);
  const tenantSettings = tenantData?.settings || {};

  const {
    useOPDBills,
    createBill,
    updateBill,
    deleteBill,
    useUnbilledRequisitions,
    importRequisition,
    syncClinicalCharges,
  } = useOPDBill();
  const { useActiveProcedureMasters } = useProcedureMaster();
  const { useActiveProcedurePackages } = useProcedurePackage();
  const { useInvestigations } = useDiagnostics();

  // Fetch all bills for the patient (ordered by date, most recent first)
  const { data: patientBillsData, isLoading: patientBillsLoading, mutate: mutatePatientBills } = useOPDBills(
    visit?.patient ? {
      patient: visit.patient,
      ordering: '-bill_date',
    } : undefined
  );

  // State to track selected bill
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);

  // Fetch bills for current visit (to check if bill exists)
  const { data: visitBillsData, isLoading: visitBillsLoading, mutate: mutateVisitBills } = useOPDBills({
    visit: visit.id
  });

  const { data: proceduresData, isLoading: proceduresLoading } = useActiveProcedureMasters();
  const { data: packagesData, isLoading: packagesLoading } = useActiveProcedurePackages();
  const { data: investigationsData, isLoading: investigationsLoading } = useInvestigations({ is_active: true });

  // Fetch unbilled requisitions for current visit
  const {
    data: unbilledData,
    isLoading: requisitionsLoading,
    mutate: mutateRequisitions
  } = useUnbilledRequisitions(visit?.id || null);
  const unbilledRequisitions = unbilledData?.requisitions || [];
  const totalUnbilledItems = unbilledData?.total_unbilled_items
    ?? unbilledRequisitions.reduce((sum, req) => sum + (req.unbilled_orders?.length || 0), 0);
  const estimatedUnbilledAmount = unbilledData?.estimated_amount ?? 0;

  // Get all bills for patient history
  const patientBills = patientBillsData?.results || [];
  const visitBills = visitBillsData?.results || [];
  const billsLoading = visitBillsLoading || patientBillsLoading;

  // Get existing bill - use selected bill if set, otherwise use first bill from current visit
  const existingBill = useMemo(() => {
    if (selectedBillId) {
      return patientBills.find(b => b.id === selectedBillId) || null;
    }
    return visitBills[0] || null;
  }, [selectedBillId, patientBills, visitBills]);

  const isEditMode = !!existingBill;

  // State to control showing create bill button vs form
  const [showBillingForm, setShowBillingForm] = useState(false);

  // Track which requisitions have been notified to avoid duplicate toasts
  const [notifiedRequisitions, setNotifiedRequisitions] = useState<Set<number>>(new Set());
  const [isSyncingClinicalCharges, setIsSyncingClinicalCharges] = useState(false);

  // Auto-show form if bill exists or if bills are available for this visit
  useEffect(() => {
    if (!visitBillsLoading) {
      if (existingBill || visitBills.length > 0) {
        setShowBillingForm(true);
        // Auto-select first bill if no bill is selected
        if (!selectedBillId && visitBills.length > 0) {
          setSelectedBillId(visitBills[0].id);
        }
      } else {
        setShowBillingForm(false);
      }
    }
  }, [existingBill, visitBillsLoading, visitBills, selectedBillId]);

  // Show toast notifications for new unbilled requisitions
  useEffect(() => {
    if (unbilledRequisitions && unbilledRequisitions.length > 0 && !requisitionsLoading) {
      unbilledRequisitions.forEach((requisition) => {
        const requisitionId = (requisition as any).id ?? requisition.requisition_id;
        if (!notifiedRequisitions.has(requisitionId)) {
          toast.info(
            `New ${requisition.requisition_type} requisition`,
            {
              description: `Requisition ${requisition.requisition_number} is ready to be synced to bill`,
              action: {
                label: 'Sync All',
                onClick: () => handleSyncClinicalCharges(),
              },
              duration: 10000,
            }
          );
          setNotifiedRequisitions(prev => new Set(prev).add(requisitionId));
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unbilledRequisitions, requisitionsLoading]);

  // Function to refresh all bills
  const mutateBills = () => {
    mutateVisitBills();
    mutatePatientBills();
  };

  // Print/Export ref (ONLY this area prints/exports)
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Unified Bill Items State - All items (consultation, procedures, investigations, etc.)
  const [billItems, setBillItems] = useState<OPDBillItem[]>([]);

  // OPD Form Data (simplified - just essential fields)
  const [opdFormData, setOpdFormData] = useState({
    receiptNo: '',
    billDate: formatLocalDate(new Date()),
    billTime: new Date().toTimeString().split(' ')[0].slice(0, 5),
    doctor: '',
    opdType: 'consultation',
    chargeType: '',
    diagnosis: '',
    remarks: '',
    opdAmount: '0.00',
  });

  // Procedure state (for backward compatibility)
  const [procedureFormData, setProcedureFormData] = useState({
    doctor: '',
    procedures: [] as ProcedureItem[],
  });

  // Common Billing State (Right Panel)
  const [billingData, setBillingData] = useState<BillingData>({
    opdTotal: '0.00',
    procedureTotal: '0.00',
    subtotal: '0.00',
    discount: '0.00',
    discountPercent: '0',
    totalAmount: '0.00',
    paymentMode: 'cash',
    receivedAmount: '0.00',
    balanceAmount: '0.00',
  });

  const [activeTab, setActiveTab] = useState<'billing' | 'preview'>('billing');
  const [isInvestigationsModalOpen, setIsInvestigationsModalOpen] = useState(false);
  const [isProceduresModalOpen, setIsProceduresModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<number | null>(null);

  // Calculate current payment status based on bill or billing data
  const currentPaymentStatus = useMemo((): 'paid' | 'partial' | 'unpaid' => {
    if (existingBill) {
      return existingBill.payment_status;
    }
    // For new bills, calculate from billingData
    const balance = parseFloat(billingData.balanceAmount) || 0;
    const received = parseFloat(billingData.receivedAmount) || 0;
    const total = parseFloat(billingData.totalAmount) || 0;

    if (total === 0) return 'unpaid';
    if (balance === 0 && received > 0) return 'paid';
    if (received > 0 && balance > 0) return 'partial';
    return 'unpaid';
  }, [existingBill, billingData.balanceAmount, billingData.receivedAmount, billingData.totalAmount]);

  // Auto-populate OPD form data from visit
  useEffect(() => {
    if (visit && !visitBillsLoading && !existingBill) {
      const receiptNo = visit.visit_number
        ? `BILL/${visit.visit_number.split('/').slice(1).join('/')}`
        : `BILL/${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(
          new Date().getDate(),
        ).padStart(2, '0')}/001`;

      // Use visit's consultation fee if set, otherwise fall back to doctor's default fee
      const isFollowUp = visit.visit_type === 'follow_up';
      const opdAmount = visit.consultation_fee ||
        (visit.doctor_details
          ? isFollowUp
            ? visit.doctor_details.follow_up_fee
            : visit.doctor_details.consultation_fee
          : '0.00');

      let chargeType = '';
      if (isFollowUp) chargeType = 'follow_up';
      else if (visit.visit_type === 'new') chargeType = 'first_visit';
      else chargeType = 'revisit';

      setOpdFormData((prev) => ({
        ...prev,
        receiptNo,
        billDate: visit.visit_date || formatLocalDate(new Date()),
        doctor: visit.doctor?.toString() || '',
        opdType: 'consultation',
        chargeType,
        opdAmount,
      }));

      setProcedureFormData((prev) => ({
        ...prev,
        doctor: visit.doctor?.toString() || '',
      }));

      // Initialize bill items with consultation fee
      setBillItems([{
        item_name: 'Consultation Fee',
        source: 'Consultation',
        quantity: 1,
        system_calculated_price: opdAmount || '0',
        unit_price: opdAmount || '0',
        total_price: opdAmount || '0',
        notes: '',
      }]);
    }
  }, [visit, visitBillsLoading, existingBill]);

  // Load bill items from existing bill
  useEffect(() => {
    if (existingBill && !billsLoading && visit) {
      // ALWAYS use visit's consultation fee as source of truth (from API)
      const isFollowUp = visit.visit_type === 'follow_up';
      const opdAmount = visit.consultation_fee ||
        (visit.doctor_details
          ? isFollowUp
            ? visit.doctor_details.follow_up_fee
            : visit.doctor_details.consultation_fee
          : '0.00');

      // Update bill items with visit's consultation fee
      const billItemsFromApi = existingBill.items || [];
      const consultationIndex = billItemsFromApi.findIndex(
        item => item.source === 'Consultation' || item.item_name === 'Consultation Fee'
      );

      let updatedBillItems = [...billItemsFromApi];
      if (consultationIndex >= 0) {
        // Update existing consultation item with visit's fee
        updatedBillItems[consultationIndex] = {
          ...updatedBillItems[consultationIndex],
          unit_price: opdAmount || '0',
          total_price: opdAmount || '0',
        };
      } else {
        // Add consultation item if it doesn't exist
        updatedBillItems = [{
          item_name: 'Consultation Fee',
          source: 'Consultation',
          quantity: 1,
          system_calculated_price: opdAmount || '0',
          unit_price: opdAmount || '0',
          total_price: opdAmount || '0',
          notes: '',
        }, ...updatedBillItems];
      }

      setBillItems(updatedBillItems);

      // Load form data
      setOpdFormData((prev) => ({
        ...prev,
        receiptNo: existingBill.bill_number || prev.receiptNo,
        billDate: existingBill.bill_date?.split('T')[0] || prev.billDate,
        doctor: existingBill.doctor?.toString() || prev.doctor,
        opdType: existingBill.opd_type || 'consultation',
        chargeType: existingBill.charge_type || prev.chargeType,
        diagnosis: existingBill.diagnosis || '',
        remarks: existingBill.remarks || '',
        opdAmount: opdAmount || '0',
      }));

      // Load billing data from API response (these are calculated server-side)
      setBillingData((prev) => ({
        ...prev,
        subtotal: existingBill.total_amount || '0',
        discountPercent: existingBill.discount_percent || '0',
        discount: existingBill.discount_amount || '0',
        totalAmount: existingBill.payable_amount || existingBill.total_amount || '0',
        paymentMode: (existingBill.payment_mode as any) || 'cash',
        receivedAmount: existingBill.received_amount || '0',
        balanceAmount: existingBill.balance_amount || '0',
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingBill, billsLoading, visit]);

  // Sync consultation fee from opdAmount to bill items
  useEffect(() => {
    const consultationAmount = parseFloat(opdFormData.opdAmount) || 0;

    setBillItems((prev) => {
      // Find existing consultation item
      const consultationIndex = prev.findIndex(
        item => item.source === 'Consultation' || item.item_name === 'Consultation Fee'
      );

      if (consultationIndex >= 0) {
        // Update existing consultation item
        const updated = [...prev];
        updated[consultationIndex] = {
          ...updated[consultationIndex],
          unit_price: consultationAmount.toFixed(2),
          total_price: consultationAmount.toFixed(2),
        };
        return updated;
      } else if (consultationAmount > 0) {
        // Add consultation item if it doesn't exist and amount > 0
        return [{
          item_name: 'Consultation Fee',
          source: 'Consultation',
          quantity: 1,
          system_calculated_price: consultationAmount.toFixed(2),
          unit_price: consultationAmount.toFixed(2),
          total_price: consultationAmount.toFixed(2),
          notes: '',
        }, ...prev];
      }
      return prev;
    });
  }, [opdFormData.opdAmount]);

  // Recalculate billing totals from bill items
  // This provides immediate (optimistic) updates to the UI
  // Backend-calculated values will overwrite these when the bill is reloaded from API
  useEffect(() => {
    const subtotal = billItems.reduce((sum, item) => sum + parseFloat(item.total_price || '0'), 0);
    const disc = parseFloat(billingData.discount) || 0;
    const recv = parseFloat(billingData.receivedAmount) || 0;
    const total = Math.max(0, subtotal - disc);
    const balance = total - recv;

    setBillingData((prev) => ({
      ...prev,
      opdTotal: '0', // Not used anymore
      procedureTotal: '0', // Not used anymore
      subtotal: subtotal.toFixed(2),
      totalAmount: total.toFixed(2),
      balanceAmount: balance.toFixed(2),
    }));
  }, [billItems, billingData.discount, billingData.receivedAmount]);

  const handleOpdInputChange = async (field: string, value: string) => {
    setOpdFormData((prev) => ({ ...prev, [field]: value }));

    // If changing opdAmount for existing bill, update consultation item in backend
    if (field === 'opdAmount' && existingBill) {
      const consultationItemIndex = billItems.findIndex(
        item => item.source === 'Consultation' || item.item_name === 'Consultation Fee'
      );

      if (consultationItemIndex >= 0) {
        const consultationItem = billItems[consultationItemIndex];
        const newAmount = parseFloat(value) || 0;

        if (consultationItem.id) {
          // Debounce the API call - only update after user stops typing
          const timeoutId = setTimeout(async () => {
            try {
              const updatedItem = await opdBillService.updateBillItem(consultationItem.id!, {
                quantity: 1,
                unit_price: newAmount.toFixed(2),
                is_price_overridden: newAmount.toFixed(2) !== consultationItem.system_calculated_price,
              });

              // Update item in state with response from API
              setBillItems((prev) => {
                const updated = [...prev];
                updated[consultationItemIndex] = updatedItem;
                return updated;
              });
            } catch (error) {
              console.error('Failed to update consultation fee:', error);
              toast.error('Failed to update consultation fee');
            }
          }, 1000);

          // Store timeout ID for cleanup
          return () => clearTimeout(timeoutId);
        }
      }
    }
  };

  const handleProcedureInputChange = (field: string, value: string) => {
    setProcedureFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Centralized billing change handler
  const handleBillingChange = (field: string, value: string) => {
    if (field === 'paymentMode') {
      setBillingData((prev) => ({ ...prev, paymentMode: value as BillingData['paymentMode'] }));
      return;
    }

    if (field === 'receivedAmount') {
      const raw = value;
      setBillingData((prev) => {
        const total = parseFloat(prev.totalAmount) || 0;
        const recv = parseFloat(raw) || 0;
        const balance = (total - recv).toFixed(2);
        return { ...prev, receivedAmount: raw, balanceAmount: balance };
      });
      return;
    }

    if (field === 'discountPercent') {
      setBillingData((prev) => {
        const subtotal = parseFloat(prev.subtotal) || 0;
        const percent = parseFloat(value) || 0;
        const discNum = (subtotal * percent) / 100;
        const totalNum = Math.max(0, subtotal - discNum);
        const recv = parseFloat(prev.receivedAmount) || 0;

        return {
          ...prev,
          discountPercent: percent.toFixed(2),
          discount: discNum.toFixed(2),
          totalAmount: totalNum.toFixed(2),
          balanceAmount: (totalNum - recv).toFixed(2),
        };
      });
      return;
    }

    if (field === 'discount') {
      setBillingData((prev) => {
        const subtotal = parseFloat(prev.subtotal) || 0;
        const discNum = parseFloat(value) || 0;
        const totalNum = Math.max(0, subtotal - discNum);
        const recv = parseFloat(prev.receivedAmount) || 0;
        const percent = subtotal > 0 ? ((discNum / subtotal) * 100).toFixed(2) : '0.00';

        return {
          ...prev,
          discount: discNum.toFixed(2),
          discountPercent: percent,
          totalAmount: totalNum.toFixed(2),
          balanceAmount: (totalNum - recv).toFixed(2),
        };
      });
      return;
    }

    setBillingData((prev) => ({ ...prev, [field]: value } as BillingData));
  };

  // Add investigation to bill items
  const handleAddInvestigation = async (investigation: Investigation) => {
    const newItem: OPDBillItem = {
      item_name: investigation.name,
      source: 'Lab',
      quantity: 1,
      system_calculated_price: investigation.base_charge || '0',
      unit_price: investigation.base_charge || '0',
      total_price: investigation.base_charge || '0',
      notes: investigation.category || '',
    };

    // If bill exists, create item with optimistic update
    if (existingBill) {
      // OPTIMISTIC: Add to UI immediately with temporary ID
      const tempItem = { ...newItem, id: Date.now() }; // Temporary ID
      setBillItems((prev) => [...prev, tempItem]);
      toast.success('Investigation added to bill');

      // API call in background
      try {
        const itemData: OPDBillItemCreateData = {
          bill: existingBill.id,
          item_name: newItem.item_name,
          source: newItem.source,
          quantity: newItem.quantity,
          unit_price: newItem.unit_price,
          system_calculated_price: newItem.system_calculated_price || newItem.unit_price,
          notes: newItem.notes || '',
        };

        const createdItem = await opdBillService.createBillItem(itemData);

        // Replace temp item with real item from API
        setBillItems((prev) => prev.map(item =>
          item.id === tempItem.id ? createdItem : item
        ));
      } catch (error) {
        console.error('Failed to add investigation:', error);
        // ROLLBACK: Remove the temp item
        setBillItems((prev) => prev.filter(item => item.id !== tempItem.id));
        toast.error('Failed to add investigation to bill');
      }
    } else {
      // If no bill exists yet, just add to local state
      setBillItems((prev) => [...prev, newItem]);
      toast.success('Investigation added (will be saved when bill is created)');
    }
  };

  // Add procedure to bill items
  const handleAddProcedure = async (procedure: ProcedureMaster) => {
    const newItem: OPDBillItem = {
      item_name: procedure.name,
      source: 'Procedure',
      quantity: 1,
      system_calculated_price: procedure.default_charge || '0',
      unit_price: procedure.default_charge || '0',
      total_price: procedure.default_charge || '0',
      notes: procedure.category || '',
    };

    // If bill exists, create item with optimistic update
    if (existingBill) {
      // OPTIMISTIC: Add to UI immediately with temporary ID
      const tempItem = { ...newItem, id: Date.now() }; // Temporary ID
      setBillItems((prev) => [...prev, tempItem]);
      toast.success('Procedure added to bill');

      // API call in background
      try {
        const itemData: OPDBillItemCreateData = {
          bill: existingBill.id,
          item_name: newItem.item_name,
          source: newItem.source,
          quantity: newItem.quantity,
          unit_price: newItem.unit_price,
          system_calculated_price: newItem.system_calculated_price || newItem.unit_price,
          notes: newItem.notes || '',
        };

        const createdItem = await opdBillService.createBillItem(itemData);

        // Replace temp item with real item from API
        setBillItems((prev) => prev.map(item =>
          item.id === tempItem.id ? createdItem : item
        ));
      } catch (error) {
        console.error('Failed to add procedure:', error);
        // ROLLBACK: Remove the temp item
        setBillItems((prev) => prev.filter(item => item.id !== tempItem.id));
        toast.error('Failed to add procedure to bill');
      }
    } else {
      // If no bill exists yet, just add to local state
      setBillItems((prev) => [...prev, newItem]);
      toast.success('Procedure added (will be saved when bill is created)');
    }
  };

  // Handle package addition
  const handleAddPackage = async (packageId: number, packageName: string) => {
    console.log('[Package Addition] Starting - ID:', packageId, 'Name:', packageName);

    try {
      const packageData = await procedurePackageService.getProcedurePackageById(packageId);
      console.log('[Package Addition] Package data received:', packageData);

      if (!packageData.procedures || packageData.procedures.length === 0) {
        toast.error('This package has no procedures associated with it.');
        return;
      }

      // Create a single package item with discounted price
      const packageItem: OPDBillItem = {
        item_name: packageName,
        source: 'Package',
        quantity: 1,
        system_calculated_price: packageData.discounted_charge || packageData.total_charge || '0',
        unit_price: packageData.discounted_charge || packageData.total_charge || '0',
        total_price: packageData.discounted_charge || packageData.total_charge || '0',
        notes: `Package includes ${packageData.procedures.length} procedure(s)`,
        origin_object_id: packageId,
      };

      console.log('[Package Addition] Package item to add:', packageItem);

      // If bill exists, create item with optimistic update
      if (existingBill) {
        // OPTIMISTIC: Add to UI immediately with temporary ID
        const tempItem = { ...packageItem, id: Date.now() };
        setBillItems((prev) => [...prev, tempItem]);
        toast.success('Package added to bill');

        // API call in background
        try {
          const itemData: OPDBillItemCreateData = {
            bill: existingBill.id,
            item_name: packageItem.item_name,
            source: packageItem.source,
            quantity: packageItem.quantity,
            unit_price: packageItem.unit_price,
            system_calculated_price: packageItem.system_calculated_price || packageItem.unit_price,
            notes: packageItem.notes || '',
            origin_object_id: packageId,
          };

          const createdItem = await opdBillService.createBillItem(itemData);
          console.log('[Package Addition] Created item from API:', createdItem);

          // Replace temp item with real item from API (don't refresh from backend to avoid expansion)
          setBillItems((prev) => prev.map(item =>
            item.id === tempItem.id ? createdItem : item
          ));

          console.log('[Package Addition] Package added successfully');
        } catch (error) {
          console.error('Failed to add package:', error);
          // ROLLBACK: Remove the temp item
          setBillItems((prev) => prev.filter(item => item.id !== tempItem.id));
          toast.error('Failed to add package to bill');
          throw error; // Re-throw to be caught by the outer catch
        }
      } else {
        // If no bill exists yet, just add to local state
        setBillItems((prev) => [...prev, packageItem]);
        toast.success('Package added (will be saved when bill is created)');
      }
    } catch (error) {
      console.error('Error loading package:', error);
      toast.error('Failed to load package details. Please try again.');
      throw error; // Re-throw so the dialog handler can manage loading state properly
    }
  };


  // Update bill item (for existing bills, update in backend with optimistic updates)
  const handleUpdateBillItem = async (index: number, field: 'quantity' | 'unit_price', value: string) => {
    const item = billItems[index];

    // Calculate new values
    const updatedItem = { ...item };
    if (field === 'quantity') {
      updatedItem.quantity = parseInt(value) || 1;
    } else if (field === 'unit_price') {
      updatedItem.unit_price = value;
      updatedItem.is_price_overridden = updatedItem.unit_price !== updatedItem.system_calculated_price;
    }
    updatedItem.total_price = (updatedItem.quantity * parseFloat(updatedItem.unit_price || '0')).toFixed(2);

    // OPTIMISTIC UPDATE: Update UI immediately
    setBillItems((prev) => {
      const updated = [...prev];
      updated[index] = updatedItem;
      return updated;
    });

    // If bill exists and item has ID, update in backend
    if (existingBill && item.id) {
      try {
        const updatedFromApi = await opdBillService.updateBillItem(item.id, {
          quantity: updatedItem.quantity,
          unit_price: updatedItem.unit_price,
          is_price_overridden: updatedItem.is_price_overridden,
        });

        // Update with response from API to ensure consistency
        setBillItems((prev) => {
          const updated = [...prev];
          updated[index] = updatedFromApi;
          return updated;
        });
      } catch (error) {
        console.error('Failed to update bill item:', error);
        toast.error('Failed to update item');

        // ROLLBACK: Revert to original item on error
        setBillItems((prev) => {
          const reverted = [...prev];
          reverted[index] = item;
          return reverted;
        });
      }
    }
  };

  // Remove bill item (for existing bills, delete from backend)
  const handleRemoveBillItem = async (index: number) => {
    const item = billItems[index];

    // OPTIMISTIC: Remove from UI immediately
    const removedItem = billItems[index];
    setBillItems((prev) => prev.filter((_, i) => i !== index));
    toast.success('Item removed from bill');

    // If bill exists and item has ID, delete from backend
    if (existingBill && item.id) {
      try {
        await opdBillService.deleteBillItem(item.id);
      } catch (error) {
        console.error('Failed to remove bill item:', error);
        // ROLLBACK: Restore the item
        setBillItems((prev) => {
          const newItems = [...prev];
          newItems.splice(index, 0, removedItem);
          return newItems;
        });
        toast.error('Failed to remove item - Item restored');
      }
    }
  };

  const handleSyncClinicalCharges = async () => {
    if (!visit?.id) return;

    setIsSyncingClinicalCharges(true);

    // Show immediate feedback
    toast.info('Syncing clinical charges...');

    try {
      // First, ensure a bill exists. If not, create one
      if (!existingBill) {
        await handleCreateInitialBill();
        // Wait a moment for the bill to be created and loaded
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Now sync all clinical charges
      const response = await syncClinicalCharges(visit.id);

      toast.success('Clinical charges synced', {
        description: `Successfully synced ${response?.created_items || 0} clinical charges to the bill`,
      });

      setShowBillingForm(true);

      // Refresh in background
      mutateBills();
      mutateRequisitions();
    } catch (error: any) {
      console.error('Failed to sync clinical charges:', error);
      toast.error('Failed to sync clinical charges', {
        description: error?.message || 'Please try again',
      });
    } finally {
      setIsSyncingClinicalCharges(false);
    }
  };

  const handleCreateInitialBill = async () => {
    if (!visit) return;

    // Validate doctor is set
    const doctorId = parseInt(opdFormData.doctor || visit.doctor?.toString() || '0');
    if (!doctorId || doctorId === 0) {
      toast.error('Doctor is required to create a bill');
      return;
    }

    // OPTIMISTIC: Show form immediately
    setShowBillingForm(true);

    // Calculate total amount from bill items
    const subtotal = billItems.reduce((sum, item) => sum + parseFloat(item.total_price || '0'), 0);
    const totalAmount = subtotal.toFixed(2);

    // Create initial bill data
    const initialBillData = {
      visit: visit.id,
      doctor: doctorId,
      opd_type: 'consultation' as OPDType,
      charge_type: (opdFormData.chargeType as ChargeType) || 'first_visit',
      diagnosis: '',
      remarks: '',
      total_amount: totalAmount,
      discount_percent: '0',
      discount_amount: '0',
      payment_mode: 'cash' as const,
      received_amount: '0',
      bill_date: new Date().toISOString(),
    };

    // Create temporary bill for optimistic UI update
    const tempBillId = Date.now();
    const tempBill: OPDBill = {
      id: tempBillId,
      bill_number: `BILL/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/NEW`,
      visit: visit.id,
      patient: visit.patient,
      doctor: initialBillData.doctor,
      bill_date: initialBillData.bill_date,
      opd_type: initialBillData.opd_type,
      charge_type: initialBillData.charge_type,
      diagnosis: initialBillData.diagnosis || '',
      remarks: initialBillData.remarks || '',
      total_amount: totalAmount,
      discount_percent: '0',
      discount_amount: '0.00',
      payable_amount: totalAmount,
      payment_mode: initialBillData.payment_mode,
      payment_status: 'unpaid',
      received_amount: '0.00',
      balance_amount: totalAmount,
      items: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // OPTIMISTIC: Add temp bill to UI immediately
    mutateVisitBills(
      (currentData) => {
        if (!currentData) return { results: [tempBill], count: 1, next: null, previous: null };
        return {
          ...currentData,
          results: [tempBill, ...currentData.results],
          count: currentData.count + 1,
        };
      },
      { revalidate: false }
    );

    mutatePatientBills(
      (currentData) => {
        if (!currentData) return { results: [tempBill], count: 1, next: null, previous: null };
        return {
          ...currentData,
          results: [tempBill, ...currentData.results],
          count: currentData.count + 1,
        };
      },
      { revalidate: false }
    );

    // Select the temp bill immediately
    setSelectedBillId(tempBillId);
    toast.success('Bill created', {
      description: 'Bill has been created. You can now add more items and update payment details.',
    });

    // API call in background
    try {
      console.log('[Bill Creation] Creating bill with data:', initialBillData);
      const newBill = await createBill(initialBillData);
      console.log('[Bill Creation] Bill created successfully:', newBill);

      // Replace temp bill with real bill
      mutateVisitBills(
        (currentData) => {
          if (!currentData) return currentData;
          return {
            ...currentData,
            results: currentData.results.map(bill =>
              bill.id === tempBillId ? newBill : bill
            ),
          };
        },
        { revalidate: false }
      );

      mutatePatientBills(
        (currentData) => {
          if (!currentData) return currentData;
          return {
            ...currentData,
            results: currentData.results.map(bill =>
              bill.id === tempBillId ? newBill : bill
            ),
          };
        },
        { revalidate: false }
      );

      // Update selected bill ID to real ID
      if (newBill) {
        setSelectedBillId(newBill.id);
      }

      // Revalidate to ensure consistency
      mutateVisitBills();
      mutatePatientBills();
    } catch (error: any) {
      console.error('[Bill Creation] Failed to create initial bill:', error);
      console.error('[Bill Creation] Error details:', error?.response?.data || error?.message);

      // ROLLBACK: Remove temp bill
      mutateVisitBills(
        (currentData) => {
          if (!currentData) return currentData;
          return {
            ...currentData,
            results: currentData.results.filter(bill => bill.id !== tempBillId),
            count: currentData.count - 1,
          };
        },
        { revalidate: false }
      );

      mutatePatientBills(
        (currentData) => {
          if (!currentData) return currentData;
          return {
            ...currentData,
            results: currentData.results.filter(bill => bill.id !== tempBillId),
            count: currentData.count - 1,
          };
        },
        { revalidate: false }
      );

      // Clear selection and hide form
      setSelectedBillId(null);
      setShowBillingForm(false);

      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Unknown error';
      toast.error('Failed to create bill', {
        description: errorMessage,
      });
    }
  };

  const handleSaveBill = async () => {
    if (!visit) return;

    if (billItems.length === 0) {
      toast.error('Add at least one item to the bill');
      return;
    }

    // OPTIMISTIC: Show progress immediately
    toast.success(isEditMode ? 'Updating bill...' : 'Creating bill...');

    try {
      // Build metadata (without payment info for the initial update)
      const billMetadata = {
        visit: visit.id,
        doctor: parseInt(opdFormData.doctor) || visit.doctor || 0,
        opd_type: (opdFormData.opdType as OPDType) || 'consultation',
        charge_type: (opdFormData.chargeType as ChargeType) || 'first_visit',
        diagnosis: opdFormData.diagnosis || '',
        remarks: opdFormData.remarks || '',
        bill_date: opdFormData.billDate,
      };

      let savedBill: OPDBill;

      if (isEditMode && existingBill) {
        // Step 1: Update bill metadata only (no payment fields yet)
        savedBill = await updateBill(existingBill.id, billMetadata);

        // Step 2: Delete all existing items
        for (const item of existingBill.items || []) {
          if (item.id) {
            await opdBillService.deleteBillItem(item.id);
          }
        }

        // Step 3: Create all new bill items
        for (const item of billItems) {
          const itemData: OPDBillItemCreateData = {
            bill: savedBill.id,
            item_name: item.item_name,
            source: item.source,
            quantity: item.quantity,
            unit_price: item.unit_price,
            system_calculated_price: item.system_calculated_price || item.unit_price,
            notes: item.notes || '',
          };
          await opdBillService.createBillItem(itemData);
        }

        // Step 4: Now update payment info (backend has items, so payable_amount is correct)
        await updateBill(existingBill.id, {
          discount_percent: billingData.discountPercent || '0',
          discount_amount: billingData.discount || '0',
          payment_mode: billingData.paymentMode || 'cash',
          received_amount: billingData.receivedAmount || '0',
        });

        toast.success('Bill updated successfully');
      } else {
        // Create new bill with all fields
        const createData = {
          ...billMetadata,
          discount_percent: billingData.discountPercent || '0',
          discount_amount: billingData.discount || '0',
          payment_mode: billingData.paymentMode || 'cash',
          received_amount: billingData.receivedAmount || '0',
        };
        savedBill = await createBill(createData);

        // Create all bill items
        for (const item of billItems) {
          const itemData: OPDBillItemCreateData = {
            bill: savedBill.id,
            item_name: item.item_name,
            source: item.source,
            quantity: item.quantity,
            unit_price: item.unit_price,
            system_calculated_price: item.system_calculated_price || item.unit_price,
            notes: item.notes || '',
          };
          await opdBillService.createBillItem(itemData);
        }

        toast.success('Bill created successfully');
      }

      // Refresh in background
      mutateBills();
      mutateVisitBills();
    } catch (error: any) {
      console.error('Failed to save bill:', error);
      toast.error('Failed to save bill', {
        description: error?.message || 'Please try again.',
      });
    }
  };

  const isLoading = visitBillsLoading || tenantLoading;

  // Print functionality - simple browser print
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    toast.info('PDF download feature coming soon');
  };

  const handleDeleteBillClick = (billId: number) => {
    setBillToDelete(billId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!billToDelete) return;

    // Close dialog immediately (optimistic)
    setIsDeleteDialogOpen(false);
    const deletedBillId = billToDelete;
    setBillToDelete(null);

    // Clear selection if deleted bill was selected
    const wasSelected = selectedBillId === deletedBillId;
    if (wasSelected) {
      setSelectedBillId(null);
      setShowBillingForm(false);
    }

    // Store original data for rollback
    const originalVisitBills = visitBillsData;
    const originalPatientBills = patientBillsData;

    // OPTIMISTIC UPDATE: Remove bill from UI immediately
    mutateVisitBills(
      (currentData) => {
        if (!currentData) return currentData;
        return {
          ...currentData,
          results: currentData.results.filter(bill => bill.id !== deletedBillId),
          count: currentData.count - 1,
        };
      },
      { revalidate: false }
    );

    mutatePatientBills(
      (currentData) => {
        if (!currentData) return currentData;
        return {
          ...currentData,
          results: currentData.results.filter(bill => bill.id !== deletedBillId),
          count: currentData.count - 1,
        };
      },
      { revalidate: false }
    );

    // Show optimistic success message
    toast.success('Bill deleted successfully');

    // Call API in background
    try {
      await deleteBill(deletedBillId);
      // Revalidate to ensure consistency
      mutateVisitBills();
      mutatePatientBills();
    } catch (error: any) {
      console.error('Failed to delete bill:', error);

      // ROLLBACK: Restore original data
      mutateVisitBills(originalVisitBills, { revalidate: false });
      mutatePatientBills(originalPatientBills, { revalidate: false });

      // Restore selection if it was selected
      if (wasSelected) {
        setSelectedBillId(deletedBillId);
        setShowBillingForm(true);
      }

      toast.error('Failed to delete bill', {
        description: error?.message || 'The bill has been restored',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-xs text-muted-foreground">Loading billing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <style>{`
        @page {
          size: A4;
          margin: 0;
        }
        @media print {
          /* Hide browser default headers and footers */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
          }

          .no-print {
            display: none !important;
          }
          body * {
            visibility: hidden;
          }
          #bill-preview-area,
          #bill-preview-area * {
            visibility: visible;
          }
          #bill-preview-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 15mm 15mm 15mm 15mm;
          }
          /* Ensure colors print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          /* Remove shadows and borders that don't print well */
          .shadow, .shadow-sm, .shadow-md, .shadow-lg {
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Toolbar: Bill selector chips + view toggle + actions */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Bill chips */}
          {visitBills.length > 0 ? (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {visitBills.map((bill) => (
                <button
                  key={bill.id}
                  onClick={() => {
                    setSelectedBillId(bill.id);
                    setShowBillingForm(true);
                    setActiveTab('billing');
                  }}
                  className={`shrink-0 h-7 px-2.5 rounded border text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                    existingBill?.id === bill.id
                      ? 'bg-foreground text-background border-foreground'
                      : 'text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  <span className="font-mono">{bill.bill_number?.split('/').pop() || bill.id}</span>
                  <span className={`text-[9px] uppercase ${
                    bill.payment_status === 'paid' ? 'text-emerald-600' :
                    bill.payment_status === 'partial' ? 'text-amber-600' : 'text-red-500'
                  }`}>
                    {bill.payment_status}
                  </span>
                  <span className="font-semibold">₹{parseFloat(bill.total_amount || '0').toFixed(0)}</span>
                </button>
              ))}
              <button
                onClick={handleCreateInitialBill}
                className="shrink-0 h-7 px-2 rounded border border-dashed text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> New
              </button>
            </div>
          ) : !visitBillsLoading && !showBillingForm ? (
            <button
              onClick={handleCreateInitialBill}
              className="h-7 px-3 rounded border border-dashed text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
            >
              <Plus className="h-3 w-3" /> Create Bill
            </button>
          ) : null}
        </div>

        {/* Right: View toggle + Delete */}
        {showBillingForm && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center border rounded overflow-hidden">
              <button
                onClick={() => setActiveTab('billing')}
                className={`h-7 px-2.5 text-[11px] font-medium transition-colors ${
                  activeTab === 'billing'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                Edit
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`h-7 px-2.5 text-[11px] font-medium border-l transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                Preview
              </button>
            </div>
            {existingBill && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleDeleteBillClick(existingBill.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Billing Form */}
      {showBillingForm && activeTab === 'billing' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-3">
          {/* Left: Consultation fee inline + Items table */}
          <div className="space-y-3">
            {/* Consultation fee - compact inline */}
            <div className="flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-md border">
              <span className="text-xs text-muted-foreground shrink-0">Consultation Fee</span>
              <div className="relative flex-1 max-w-[140px]">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                <Input
                  type="number"
                  value={opdFormData.opdAmount}
                  onChange={(e) => handleOpdInputChange('opdAmount', e.target.value)}
                  className="h-7 text-xs font-semibold pl-5"
                />
              </div>
              {visit.doctor_details && (
                <span className="text-[10px] text-muted-foreground truncate">
                  {visit.doctor_details.full_name} · Std ₹{visit.visit_type === 'follow_up'
                    ? visit.doctor_details.follow_up_fee
                    : visit.doctor_details.consultation_fee}
                </span>
              )}
            </div>

            {/* Items table with action buttons */}
            <div className="border rounded-md">
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/20">
                <span className="text-xs font-medium">{billItems.length} items · ₹{billingData.subtotal}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setIsInvestigationsModalOpen(true)}
                    className="h-6 px-2 rounded border text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <FlaskConical className="h-3 w-3" />
                    Investigations
                    {unbilledRequisitions && unbilledRequisitions.length > 0 && (
                      <span className="bg-destructive text-destructive-foreground rounded-full px-1 text-[9px] font-bold">
                        {unbilledRequisitions.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setIsProceduresModalOpen(true)}
                    className="h-6 px-2 rounded border text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <Package className="h-3 w-3" />
                    Procedures
                  </button>
                  <button
                    onClick={handleSyncClinicalCharges}
                    disabled={isSyncingClinicalCharges}
                    className="h-6 px-2 rounded border text-[10px] bg-foreground text-background flex items-center gap-1 disabled:opacity-50"
                  >
                    <Download className="h-3 w-3" />
                    {isSyncingClinicalCharges ? 'Syncing...' : 'Sync'}
                  </button>
                </div>
              </div>
              <div className="p-2">
                <BillItemsTable
                  items={billItems}
                  onUpdateItem={handleUpdateBillItem}
                  onRemoveItem={handleRemoveBillItem}
                  readOnly={false}
                />
              </div>
            </div>
          </div>

          {/* Right: Summary panel */}
          <BillingDetailsPanel
            data={billingData}
            billItems={billItems}
            onChange={handleBillingChange}
            onFormatReceived={() => {
              const num = parseFloat(billingData.receivedAmount);
              if (!isNaN(num)) setBillingData((prev) => ({ ...prev, receivedAmount: num.toFixed(2) }));
            }}
            onSave={handleSaveBill}
            isEditMode={isEditMode}
          />
        </div>
      )}

      {/* Preview */}
      {showBillingForm && activeTab === 'preview' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-3">
          <BillPreviewTab
            ref={printAreaRef}
            visit={visit}
            opdFormData={opdFormData}
            billItems={billItems}
            billingData={billingData}
            tenantData={tenantData}
            tenantSettings={tenantSettings}
            patientBills={patientBills}
            billsLoading={billsLoading}
            onPrint={handlePrint}
            onDownloadPDF={handleDownloadPDF}
          />
          <BillingDetailsPanel
            data={billingData}
            billItems={billItems}
            onChange={handleBillingChange}
            onFormatReceived={() => {
              const num = parseFloat(billingData.receivedAmount);
              if (!isNaN(num)) setBillingData((prev) => ({ ...prev, receivedAmount: num.toFixed(2) }));
            }}
            onSave={handleSaveBill}
            isEditMode={isEditMode}
          />
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={isInvestigationsModalOpen} onOpenChange={setIsInvestigationsModalOpen}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Investigations & Clinical Charges</DialogTitle>
          </DialogHeader>
          <InvestigationsBillingTab
            visit={visit}
            unbilledRequisitions={unbilledRequisitions}
            totalUnbilledItems={totalUnbilledItems}
            estimatedUnbilledAmount={estimatedUnbilledAmount}
            requisitionsLoading={requisitionsLoading}
            isSyncingClinicalCharges={isSyncingClinicalCharges}
            existingBill={existingBill}
            investigationsData={investigationsData}
            investigationsLoading={investigationsLoading}
            onSyncClinicalCharges={handleSyncClinicalCharges}
            onRefreshRequisitions={mutateRequisitions}
            onAddInvestigation={handleAddInvestigation}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isProceduresModalOpen} onOpenChange={setIsProceduresModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Procedures & Packages</DialogTitle>
          </DialogHeader>
          <ProcedureBillingTab
            billItems={billItems}
            proceduresData={proceduresData}
            packagesData={packagesData}
            proceduresLoading={proceduresLoading}
            packagesLoading={packagesLoading}
            onAddProcedure={handleAddProcedure}
            onAddPackage={handleAddPackage}
            onUpdateBillItem={handleUpdateBillItem}
            onRemoveBillItem={handleRemoveBillItem}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Delete Bill</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            This action cannot be undone. Are you sure?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={handleConfirmDelete}>
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
