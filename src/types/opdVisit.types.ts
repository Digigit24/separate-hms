// src/types/opdVisit.types.ts
// OPD Visit Types - Matches Django backend fields exactly

import { Patient } from './patient.types';
import { Doctor } from './doctor.types';

// ==================== ENUMS & CONSTANTS ====================
export type VisitStatus = 'waiting' | 'in_consultation' | 'completed' | 'cancelled' | 'no_show';
export type VisitType = 'new' | 'follow_up' | 'emergency' | 'referral';
// Backend values: 'unpaid' | 'partial' | 'paid'
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type VisitPriority = 'low' | 'normal' | 'high' | 'urgent';

// ==================== PATIENT & DOCTOR DETAILS ====================
export interface PatientDetails {
  patient_id: string;
  full_name: string;
  age: number;
  gender: string;
  blood_group: string | null;
  mobile: string;
  mobile_primary?: string;
}

export interface DoctorDetails {
  id: number;
  full_name: string;
  specialties: string[] | Array<{ id: number; name: string }>;
  consultation_fee: string;
  follow_up_fee: string;
}

// ==================== MAIN OPD VISIT INTERFACE ====================
// Fields mirror Visit model in apps/opd/models.py
export interface OpdVisit {
  id: number;
  visit_number: string; // Unique visit ID like OPD2025XXXX

  // Patient & Doctor (IDs)
  patient: number;
  doctor: number;

  // Patient & Doctor (Nested Objects from API - VisitDetailSerializer)
  patient_details?: PatientDetails;
  doctor_details?: DoctorDetails;

  // Patient & Doctor (Flat fields - fallback when nested objects not provided)
  patient_name?: string;
  patient_id?: string;
  doctor_name?: string;

  // Visit Details
  visit_date: string;          // DateField (YYYY-MM-DD)
  entry_time: string;          // DateTimeField auto_now_add — time patient entered
  visit_type: VisitType;
  status: VisitStatus;
  is_follow_up: boolean;

  // Queue Management (backend field: queue_position)
  queue_position: number | null;

  // Consultation Timing
  consultation_start_time: string | null;   // when doctor started
  consultation_end_time: string | null;     // when consultation finished

  // Follow-up
  follow_up_required: boolean;
  follow_up_date: string | null;       // DateField (YYYY-MM-DD)
  follow_up_notes: string | null;

  // Referrals
  referred_to: string | null;
  referral_reason: string | null;

  // Billing — on the Visit model itself (OPDBill is a separate model)
  payment_status: PaymentStatus;       // 'unpaid' | 'partial' | 'paid'
  total_amount: string;
  paid_amount: string;
  balance_amount: string;

  // Computed / method fields from VisitDetailSerializer
  waiting_time: string | null;
  has_opd_bill: boolean;
  has_clinical_note: boolean;

  // Active IPD admission for this patient (embedded to avoid extra API call)
  active_ipd_admission: {
    id: number;
    admission_id: string;
    status: string;
    ward_id: number | null;
  } | null;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by_id: string | null;   // UUID (SuperAdmin user ID)
}

// ==================== LIST PARAMETERS ====================
export interface OpdVisitListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: VisitStatus;
  visit_type?: VisitType;
  is_follow_up?: boolean;
  payment_status?: PaymentStatus;
  doctor?: number;             // backend filter param: doctor
  patient?: number;            // backend filter param: patient
  visit_date?: string;         // exact date YYYY-MM-DD
  visit_date__gte?: string;    // date range start (requires VisitFilter on backend)
  visit_date__lte?: string;    // date range end
  ordering?: string;
  [key: string]: string | number | boolean | undefined;
}

// ==================== CREATE DATA ====================
// Backend VisitCreateUpdateSerializer accepts these fields
export interface OpdVisitCreateData {
  // Required
  patient: number;
  doctor: number;
  visit_date: string;
  visit_type: VisitType;

  // Optional
  is_follow_up?: boolean;
  status?: VisitStatus;
  queue_position?: number;
}

// ==================== UPDATE DATA ====================
export interface OpdVisitUpdateData {
  patient?: number;
  doctor?: number;
  visit_date?: string;
  visit_type?: VisitType;
  status?: VisitStatus;
  is_follow_up?: boolean;
  queue_position?: number;
  consultation_start_time?: string;
  consultation_end_time?: string;
  payment_status?: PaymentStatus;
  follow_up_required?: boolean;
  follow_up_date?: string;
  follow_up_notes?: string;
  referred_to?: string;
  referral_reason?: string;
}

// ==================== COMPLETE VISIT DATA ====================
export interface CompleteVisitData {
  follow_up_required?: boolean;
  follow_up_date?: string;
  follow_up_notes?: string;
}

// ==================== QUEUE ITEM ====================
export interface QueueItem {
  id: number;
  visit_number: string;
  patient_name: string;
  queue_position: number | null;
  status: VisitStatus;
  entry_time: string;
  waiting_time: string | null;
}

// ==================== STATISTICS ====================
export interface OpdVisitStatistics {
  total_visits: number;
  today_visits: number;
  waiting_patients: number;
  in_progress_patients: number;
  completed_today: number;
  average_waiting_time: string;
  visits_by_type: {
    new: number;
    follow_up: number;
    emergency: number;
    referral: number;
  };
  visits_by_status: {
    waiting: number;
    in_consultation: number;
    completed: number;
    cancelled: number;
    no_show: number;
  };
  revenue_today: string;
  pending_payments: number;
}

// ==================== DOCTOR STATS ====================
export interface DoctorStat {
  doctor: number;
  doctor_name: string;
  doctor_specialty: string | null;
  /** Total visits in the queried period */
  visits_count: number;
  /** Alias of visits_count (backward compat) */
  visits_today: number;
  waiting: number;
  in_consultation: number;
  completed: number;
  /** Revenue in the queried period */
  revenue: string | null;
  /** Alias of revenue (backward compat) */
  revenue_today: string | null;
  avg_consultation_mins: number | null;
  /** Currently active IPD admissions (always live, not range-bound) */
  ipd_admissions: number;
}

export interface DoctorStatsResponse {
  success: boolean;
  date: string;
  date_from: string;
  date_to: string;
  is_single_day: boolean;
  data: DoctorStat[];
}

export type DoctorStatsPeriod = 'today' | 'week' | 'month' | 'custom';

export interface DoctorStatsParams {
  dateFrom: string;
  dateTo: string;
}

// ==================== API RESPONSE WRAPPERS ====================
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}
