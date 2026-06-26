// src/types/ipd.types.ts

export type WardType =
  | 'general'
  | 'icu'
  | 'private'
  | 'semi_private'
  | 'deluxe'
  | 'nicu'
  | 'picu'
  | 'emergency'
  | 'maternity'
  | 'pediatric'
  | 'surgical'
  | 'other';

export type BedType =
  | 'general'
  | 'icu'
  | 'ventilator'
  | 'private'
  | 'semi_private'
  | 'deluxe'
  | 'cabin'
  | 'other';

export type BedStatus =
  | 'available'
  | 'occupied'
  | 'maintenance'
  | 'reserved'
  | 'cleaning';

export type AdmissionStatus =
  | 'admitted'
  | 'discharged'
  | 'transferred'
  | 'absconded'
  | 'referred'
  | 'death';

export type ClaimStatus =
  | 'not_applicable'
  | 'not_started'
  | 'documents_pending'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'settled';

// Backend IPDBilling.payment_status choices: 'unpaid' | 'partial' | 'paid'
export type BillingStatus =
  | 'unpaid'
  | 'partial'
  | 'paid';

export type BillItemSource =
  | 'Bed'
  | 'Pharmacy'
  | 'Lab'
  | 'Radiology'
  | 'Consultation'
  | 'Procedure'
  | 'Surgery'
  | 'Other';

// ============================================
// Ward
// ============================================
export interface Ward {
  id: number;
  tenant_id: string;
  name: string;
  type: WardType;
  floor: string;
  total_beds: number;
  description: string;
  is_active: boolean;
  available_beds_count?: number;
  occupied_beds_count?: number;
  created_at: string;
  updated_at: string;
}

export interface WardFormData {
  name: string;
  type: WardType;
  floor: string;
  total_beds: number;
  description?: string;
  is_active?: boolean;
}

// ============================================
// Bed
// ============================================
export interface Bed {
  id: number;
  tenant_id: string;
  ward: number;
  ward_name?: string;
  bed_number: string;
  bed_type: BedType;
  daily_charge: string;
  is_occupied: boolean;
  status: BedStatus;
  is_active: boolean;
  has_oxygen: boolean;
  has_ventilator: boolean;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface BedFormData {
  ward: number;
  bed_number: string;
  bed_type: BedType;
  daily_charge: string;
  status?: BedStatus;
  is_active?: boolean;
  has_oxygen?: boolean;
  has_ventilator?: boolean;
  description?: string;
}

export interface BedListItem {
  id: number;
  ward: number;
  ward_name: string;
  bed_number: string;
  bed_type: BedType;
  daily_charge: string;
  is_occupied: boolean;
  status: BedStatus;
}

// ============================================
// Admission
// ============================================
export interface Admission {
  id: number;
  tenant_id: string;
  admission_id: string;
  patient: number;
  patient_name?: string;
  doctor_id: string;
  ward: number;
  ward_name?: string;
  bed: number | null;
  bed_number?: string;
  admission_date: string;
  reason: string;
  provisional_diagnosis: string;
  final_diagnosis: string;
  has_mediclaim: boolean;
  tpa_name: string;
  claim_status: ClaimStatus;
  claim_reference_number: string;
  claim_notes: string;
  discharge_date: string | null;
  discharge_summary: string;
  discharge_type: string;
  status: AdmissionStatus;
  length_of_stay?: number;
  created_by_user_id: string | null;
  discharged_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdmissionFormData {
  patient: number;
  doctor_id: string;
  ward: number;
  bed?: number | null;
  admission_id?: string;
  admission_date?: string;
  discharge_date?: string | null;
  reason: string;
  provisional_diagnosis?: string;
  final_diagnosis?: string;
  has_mediclaim?: boolean;
  tpa_name?: string;
  claim_status?: ClaimStatus;
  claim_reference_number?: string;
  claim_notes?: string;
}

export interface AdmissionListItem {
  id: number;
  admission_id: string;
  patient: number;
  patient_name: string;
  doctor_id: string;
  ward_name: string;
  bed_number: string;
  admission_date: string;
  status: AdmissionStatus;
  has_mediclaim?: boolean;
  tpa_name?: string;
  claim_status?: ClaimStatus;
  claim_reference_number?: string;
}

export interface IPDDoctorStat {
  doctor: string;
  doctor_id: string;
  doctor_name: string;
  doctor_specialty?: string | null;
  admissions_count: number;
  active: number;
  discharged: number;
  transferred: number;
  mediclaim_count: number;
  claim_pending: number;
  claim_approved: number;
  claim_rejected: number;
  claim_settled: number;
  avg_length_of_stay_days: number | null;
}

export interface IPDDoctorStatsResponse {
  success: boolean;
  date: string;
  date_from: string;
  date_to: string;
  is_single_day: boolean;
  data: IPDDoctorStat[];
}

export interface DischargeData {
  discharge_type: string;
  discharge_summary: string;
  discharge_date?: string;
}

// ============================================
// Bed Transfer
// ============================================
export interface BedTransfer {
  id: number;
  tenant_id: string;
  admission: number;
  admission_id?: string;
  from_bed: number;
  from_bed_info?: string;
  to_bed: number;
  to_bed_info?: string;
  transfer_date: string;
  reason: string;
  performed_by_user_id: string | null;
  created_at: string;
}

export interface BedTransferFormData {
  admission: number;
  from_bed: number;
  to_bed: number;
  transfer_date?: string;
  reason: string;
}

// ============================================
// IPD Billing
// ============================================
export interface IPDBillItem {
  id: number;
  tenant_id: string;
  bill: number;               // FK to IPDBilling (backend field: 'bill')
  item_name: string;
  source: BillItemSource;
  quantity: number;
  system_calculated_price: string | null;
  unit_price: string;
  actual_price: string;       // same as unit_price, for frontend clarity
  total_price: string;
  is_price_overridden: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface IPDBillItemFormData {
  bill: number;               // backend field: 'bill' (not 'billing')
  item_name: string;
  source: BillItemSource;
  quantity: number;
  unit_price: string;
  system_calculated_price?: string;
  notes?: string;
}

export interface IPDBilling {
  id: number;
  tenant_id: string;
  admission: number;
  admission_id?: string;      // read-only from admission.admission_id
  patient_name?: string;      // read-only from admission.patient.full_name
  bill_number: string;
  bill_date: string;
  doctor_id: string | null;
  diagnosis: string;
  remarks: string;
  total_amount: string;
  discount_percent: string;   // backend field (not 'discount')
  discount_amount: string;    // backend field (computed)
  payable_amount: string;     // total_amount - discount_amount
  payment_mode: string;       // 'cash' | 'card' | 'upi' | 'netbanking' | 'insurance' | 'cheque' | 'other'
  payment_details: string;
  received_amount: string;    // backend field (not 'paid_amount')
  balance_amount: string;
  payment_status: BillingStatus;  // backend field (not 'status')
  billed_by_id: string | null;
  items?: IPDBillItem[];
  created_at: string;
  updated_at: string;
}

export interface IPDBillingFormData {
  admission: number;
  doctor_id?: string;
  diagnosis?: string;
  remarks?: string;
  discount_percent?: string;
  payment_mode?: string;
  payment_details?: string;
}

export interface IPDBillingListItem {
  id: number;
  bill_number: string;
  admission_id: string;
  patient_name: string;
  bill_date: string;
  total_amount: string;
  received_amount: string;    // backend field (not 'paid_amount')
  balance_amount: string;
  payment_status: BillingStatus;  // backend field (not 'status')
}

export interface PaymentData {
  amount: string;
  payment_mode?: string;
  payment_details?: string;
}

// ============================================
// Filter Types
// ============================================
export interface WardFilters {
  type?: WardType;
  is_active?: boolean;
  floor?: string;
  search?: string;
}

export interface BedFilters {
  ward?: number;
  bed_type?: BedType;
  is_occupied?: boolean;
  status?: BedStatus;
  is_active?: boolean;
  search?: string;
}

export interface AdmissionFilters {
  status?: AdmissionStatus;
  ward?: number;
  doctor_id?: string;
  patient?: number;
  search?: string;
  admission_date__gte?: string;
  admission_date__lte?: string;
  has_mediclaim?: boolean;
  claim_status?: ClaimStatus;
  tpa_name?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
}

export interface BillingFilters {
  status?: BillingStatus;
  admission?: number;
  search?: string;
}

// ============================================
// Label Mappings
// ============================================
export const WARD_TYPE_LABELS: Record<WardType, string> = {
  general: 'General Ward',
  icu: 'ICU',
  private: 'Private',
  semi_private: 'Semi-Private',
  deluxe: 'Deluxe',
  nicu: 'NICU',
  picu: 'PICU',
  emergency: 'Emergency',
  maternity: 'Maternity',
  pediatric: 'Pediatric',
  surgical: 'Surgical',
  other: 'Other',
};

export const BED_TYPE_LABELS: Record<BedType, string> = {
  general: 'General Bed',
  icu: 'ICU Bed',
  ventilator: 'Ventilator Bed',
  private: 'Private Bed',
  semi_private: 'Semi-Private Bed',
  deluxe: 'Deluxe Bed',
  cabin: 'Cabin',
  other: 'Other',
};

export const BED_STATUS_LABELS: Record<BedStatus, string> = {
  available: 'Available',
  occupied: 'Occupied',
  maintenance: 'Under Maintenance',
  reserved: 'Reserved',
  cleaning: 'Cleaning',
};

export const ADMISSION_STATUS_LABELS: Record<AdmissionStatus, string> = {
  admitted: 'Admitted',
  discharged: 'Discharged',
  transferred: 'Transferred',
  absconded: 'Absconded',
  referred: 'Referred',
  death: 'Death',
};

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  not_applicable: 'Not Applicable',
  not_started: 'Not Started',
  documents_pending: 'Documents Pending',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  settled: 'Settled',
};

export const TPA_OPTIONS = [
  'Star Health',
  'Medi Assist',
  'MDIndia',
  'FHPL',
  'Paramount Health',
  'Raksha TPA',
  'Heritage Health',
  'Health India TPA',
  'Vidal Health',
  'Ericson TPA',
  'Other',
];

export const BILLING_STATUS_LABELS: Record<BillingStatus, string> = {
  unpaid: 'Unpaid',
  partial: 'Partial',
  paid: 'Paid',
};

export const BILL_ITEM_SOURCE_LABELS: Record<BillItemSource, string> = {
  Bed: 'Bed Charges',
  Pharmacy: 'Pharmacy',
  Lab: 'Laboratory',
  Radiology: 'Radiology',
  Consultation: 'Consultation',
  Procedure: 'Procedure',
  Surgery: 'Surgery',
  Other: 'Other',
};
