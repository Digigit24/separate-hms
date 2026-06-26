// src/components/form/PatientSelect.tsx
// Reusable patient selector with server-side search, quick-add inline form,
// and a sleek Popover + list design. Used by OPD, IPD, Diagnostics, etc.
import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  UserPlus, Edit2, Search, Loader2, ChevronDown,
  X, Check, User, Phone, Hash, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePatient } from '@/hooks/usePatient';
import type { PatientCreateData } from '@/types/patient.types';
import PatientsFormDrawer from '@/components/PatientsFormDrawer';
import { cn } from '@/lib/utils';

// ─── debounce hook ────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface PatientSelectProps {
  value?: number | null;
  onChange: (patientId: number) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
  showEditButton?: boolean;
  showAddButton?: boolean;
  placeholder?: string;
}

// ─── Quick-add form state ─────────────────────────────────────────────────────
const EMPTY_INLINE = {
  first_name: '',
  middle_name: '',
  last_name: '',
  gender: '' as 'male' | 'female' | 'other' | '',
  mobile_primary: '',
  date_of_birth: '',
};

// ─── Component ────────────────────────────────────────────────────────────────
export function PatientSelect({
  value,
  onChange,
  disabled = false,
  error,
  label = 'Patient',
  required = false,
  showEditButton = true,
  showAddButton = true,
  placeholder = 'Search or select a patient…',
}: PatientSelectProps) {
  const { usePatients, usePatientById, createPatient } = usePatient();

  // ── search state ────────────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── server-side search ──────────────────────────────────────────────────────
  const { data: searchResults, isLoading: searching } = usePatients(
    debouncedSearch.trim().length >= 1
      ? { search: debouncedSearch.trim(), page_size: 30 }
      : { page_size: 20 }
  );
  const patients = searchResults?.results ?? [];

  // ── selected patient ────────────────────────────────────────────────────────
  const { data: selectedPatient } = usePatientById(value ?? null);

  // ── inline quick-add ────────────────────────────────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [inlineData, setInlineData] = useState(EMPTY_INLINE);

  // calculated age
  const calculatedAge = (() => {
    if (!inlineData.date_of_birth) return null;
    const bd = new Date(inlineData.date_of_birth);
    if (isNaN(bd.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - bd.getFullYear();
    if (
      today.getMonth() < bd.getMonth() ||
      (today.getMonth() === bd.getMonth() && today.getDate() < bd.getDate())
    ) age--;
    return age;
  })();

  // ── patient edit drawer ─────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // ── focus search when popover opens ────────────────────────────────────────
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ── handlers ────────────────────────────────────────────────────────────────
  const handleSelect = useCallback((patientId: number) => {
    onChange(patientId);
    setOpen(false);
    setSearchInput('');
    setShowAddForm(false);
  }, [onChange]);

  const handleCreatePatient = useCallback(async () => {
    if (!inlineData.first_name.trim()) { toast.error('First name is required'); return; }
    if (!inlineData.gender) { toast.error('Gender is required'); return; }
    if (!inlineData.mobile_primary.trim() || inlineData.mobile_primary.length < 9) {
      toast.error('Valid mobile number is required (min 9 digits)'); return;
    }
    setIsCreating(true);
    try {
      const newPatient = await createPatient({
        first_name: inlineData.first_name.trim(),
        middle_name: inlineData.middle_name.trim() || undefined,
        last_name: inlineData.last_name.trim() || undefined,
        gender: inlineData.gender,
        mobile_primary: inlineData.mobile_primary.trim(),
        date_of_birth: inlineData.date_of_birth || undefined,
      } as PatientCreateData);
      toast.success('Patient created and selected');
      onChange(newPatient.id);
      setInlineData(EMPTY_INLINE);
      setShowAddForm(false);
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create patient');
    } finally {
      setIsCreating(false);
    }
  }, [inlineData, createPatient, onChange]);

  // ── selected display text ───────────────────────────────────────────────────
  const displayName = selectedPatient
    ? (selectedPatient.full_name || `${selectedPatient.first_name} ${selectedPatient.last_name ?? ''}`.trim())
    : null;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-1.5">
      {/* Label */}
      {label && (
        <Label className="text-sm font-medium">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}

      {/* Trigger row */}
      <div className="flex gap-2 items-stretch">
        <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className={cn(
                'flex-1 flex items-center gap-2 rounded-md border bg-background px-3 h-9 text-sm text-left transition-colors',
                'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                error ? 'border-destructive' : 'border-input',
                disabled && 'opacity-50 cursor-not-allowed',
                !displayName && 'text-muted-foreground',
              )}
            >
              <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">
                {displayName ?? placeholder}
              </span>
              {value && selectedPatient?.patient_id && (
                <span className="shrink-0 text-[10px] text-muted-foreground font-mono border rounded px-1 py-0.5">
                  {selectedPatient.patient_id}
                </span>
              )}
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>

          <PopoverContent
            className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[280px] max-w-[480px]"
            align="start"
            sideOffset={4}
          >
            {/* Search input */}
            <div className="flex items-center gap-2 px-3 py-2 border-b">
              {searching
                ? <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin shrink-0" />
                : <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              }
              <input
                ref={searchRef}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Search by name, ID or mobile…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Patient list */}
            <div className="max-h-[220px] overflow-y-auto">
              {patients.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {searching ? 'Searching…' : 'No patients found'}
                </p>
              ) : (
                patients.map((patient) => {
                  const name = patient.full_name || `${patient.first_name} ${patient.last_name ?? ''}`.trim();
                  const isSelected = patient.id === value;
                  return (
                    <button
                      key={patient.id}
                      type="button"
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50',
                        isSelected && 'bg-primary/5',
                      )}
                      onClick={() => handleSelect(patient.id)}
                    >
                      <div className={cn(
                        'h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold',
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                      )}>
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate leading-tight">{name}</p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-0.5">
                            <Hash className="h-2.5 w-2.5" />{patient.patient_id}
                          </span>
                          {patient.mobile_primary && (
                            <span className="flex items-center gap-0.5">
                              <Phone className="h-2.5 w-2.5" />{patient.mobile_primary}
                            </span>
                          )}
                        </p>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            {/* Add new patient toggle */}
            {showAddButton && (
              <div className="border-t">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-primary hover:bg-primary/5 transition-colors font-medium"
                  onClick={() => setShowAddForm((v) => !v)}
                >
                  <span className="flex items-center gap-2">
                    <UserPlus className="h-3.5 w-3.5" />
                    Quick add new patient
                  </span>
                  {showAddForm
                    ? <ChevronUp className="h-3.5 w-3.5" />
                    : <ChevronDown className="h-3.5 w-3.5" />
                  }
                </button>

                {/* Inline quick-add form */}
                {showAddForm && (
                  <div className="px-3 pb-3 space-y-2.5 border-t bg-muted/20">
                    <p className="text-[11px] text-muted-foreground pt-2 font-medium uppercase tracking-wide">
                      New patient details
                    </p>

                    {/* Name row */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">First name *</Label>
                        <Input
                          className="h-8 text-xs"
                          placeholder="First"
                          value={inlineData.first_name}
                          onChange={(e) => setInlineData({ ...inlineData, first_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Last name</Label>
                        <Input
                          className="h-8 text-xs"
                          placeholder="Last"
                          value={inlineData.last_name}
                          onChange={(e) => setInlineData({ ...inlineData, last_name: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Gender + Mobile */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Gender *</Label>
                        <Select
                          value={inlineData.gender}
                          onValueChange={(v) => setInlineData({ ...inlineData, gender: v as any })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Mobile *</Label>
                        <Input
                          className="h-8 text-xs"
                          placeholder="Mobile number"
                          value={inlineData.mobile_primary}
                          onChange={(e) => setInlineData({ ...inlineData, mobile_primary: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* DOB */}
                    <div className="space-y-1">
                      <Label className="text-xs">Date of birth</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          className="h-8 text-xs flex-1"
                          value={inlineData.date_of_birth}
                          onChange={(e) => setInlineData({ ...inlineData, date_of_birth: e.target.value })}
                        />
                        {calculatedAge !== null && (
                          <span className="shrink-0 text-xs font-semibold text-primary tabular-nums">
                            {calculatedAge}y
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={handleCreatePatient}
                      disabled={isCreating}
                    >
                      {isCreating && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                      {isCreating ? 'Creating…' : 'Create & Select Patient'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Edit patient button */}
        {showEditButton && value && !disabled && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            title="Edit patient details"
            onClick={() => {
              setEditId(value);
              setDrawerOpen(true);
            }}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Selected patient pill */}
      {value && selectedPatient && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs">
          <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
            {(selectedPatient.full_name || selectedPatient.first_name).charAt(0).toUpperCase()}
          </div>
          <span className="font-medium truncate">
            {selectedPatient.full_name || `${selectedPatient.first_name} ${selectedPatient.last_name ?? ''}`.trim()}
          </span>
          {selectedPatient.mobile_primary && (
            <span className="text-muted-foreground">{selectedPatient.mobile_primary}</span>
          )}
          {!disabled && (
            <button
              type="button"
              className="ml-auto text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(true)}
              title="Change patient"
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Edit drawer */}
      <PatientsFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        patientId={editId}
        mode="edit"
        onSuccess={() => setDrawerOpen(false)}
      />
    </div>
  );
}

export default PatientSelect;
