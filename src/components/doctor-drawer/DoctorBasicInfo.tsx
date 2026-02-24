// src/components/doctor-drawer/DoctorBasicInfo.tsx
import { forwardRef, useImperativeHandle, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, Eye, EyeOff } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { Doctor, DoctorCreateData, DoctorUpdateData, Specialty } from '@/types/doctor.types';

// Validation schemas
const createDoctorSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  password_confirm: z.string().min(8, 'Password confirmation required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  consultation_duration: z.coerce.number().min(5, 'Consultation duration must be at least 5 minutes'),
  medical_license_number: z.string().optional(),
  license_issuing_authority: z.string().optional(),
  license_issue_date: z.string().optional(),
  license_expiry_date: z.string().optional(),
  qualifications: z.string().optional(),
  specialty_ids: z.array(z.number()).optional(),
  years_of_experience: z.coerce.number().min(0).optional(),
  consultation_fee: z.coerce.number().min(0).optional(),
  follow_up_fee: z.coerce.number().min(0).optional(),
}).refine((data) => data.password === data.password_confirm, {
  message: "Passwords don't match",
  path: ["password_confirm"],
});

const updateDoctorSchema = z.object({
  medical_license_number: z.string().optional(),
  license_issuing_authority: z.string().optional(),
  license_issue_date: z.string().optional(),
  license_expiry_date: z.string().optional(),
  qualifications: z.string().optional(),
  specialty_ids: z.array(z.number()).optional(),
  years_of_experience: z.coerce.number().min(0).optional(),
  consultation_fee: z.coerce.number().min(0).optional(),
  follow_up_fee: z.coerce.number().min(0).optional(),
  consultation_duration: z.coerce.number().min(5).optional(),
  status: z.enum(['active', 'on_leave', 'inactive']).optional(),
});

export interface DoctorBasicInfoHandle {
  getFormValues: () => Promise<DoctorCreateData | DoctorUpdateData | null>;
}

interface DoctorBasicInfoProps {
  doctor?: Doctor | null;
  specialties: Specialty[];
  mode: 'view' | 'edit' | 'create';
  onSuccess?: () => void;
}

const DoctorBasicInfo = forwardRef<DoctorBasicInfoHandle, DoctorBasicInfoProps>(
  ({ doctor, specialties, mode, onSuccess }, ref) => {
    const isReadOnly = mode === 'view';
    const isCreateMode = mode === 'create';
    const isEditMode = mode === 'edit';
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

    const schema = isCreateMode ? createDoctorSchema : updateDoctorSchema;

    const defaultValues = isCreateMode
      ? {
          email: '',
          password: '',
          password_confirm: '',
          first_name: '',
          last_name: '',
          phone: '',
          consultation_duration: 15,
          medical_license_number: '',
          license_issuing_authority: '',
          license_issue_date: '',
          license_expiry_date: '',
          qualifications: '',
          specialty_ids: [],
          years_of_experience: 0,
          consultation_fee: 0,
          follow_up_fee: 0,
        }
      : {
          medical_license_number: doctor?.medical_license_number || '',
          license_issuing_authority: doctor?.license_issuing_authority || '',
          license_issue_date: doctor?.license_issue_date || '',
          license_expiry_date: doctor?.license_expiry_date || '',
          qualifications: doctor?.qualifications || '',
          specialty_ids: doctor?.specialties?.map((s) => s.id) || [],
          years_of_experience: doctor?.years_of_experience || 0,
          consultation_fee: parseFloat(doctor?.consultation_fee || '0'),
          follow_up_fee: parseFloat(doctor?.follow_up_fee || '0'),
          consultation_duration: doctor?.consultation_duration || 15,
          status: doctor?.status || 'active',
        };

    const {
      register,
      handleSubmit,
      formState: { errors },
      watch,
      setValue,
      reset,
    } = useForm<any>({
      resolver: zodResolver(schema),
      defaultValues,
    });

    const watchedSpecialtyIds = watch('specialty_ids') || [];
    const watchedStatus = watch('status');

    useEffect(() => {
      if (!isCreateMode && doctor) {
        const formValues = {
          medical_license_number: doctor.medical_license_number || '',
          license_issuing_authority: doctor.license_issuing_authority || '',
          license_issue_date: doctor.license_issue_date || '',
          license_expiry_date: doctor.license_expiry_date || '',
          qualifications: doctor.qualifications || '',
          specialty_ids: doctor.specialties?.map((s) => s.id) || [],
          years_of_experience: doctor.years_of_experience || 0,
          consultation_fee: parseFloat(doctor.consultation_fee || '0'),
          follow_up_fee: parseFloat(doctor.follow_up_fee || '0'),
          consultation_duration: doctor.consultation_duration || 15,
          status: doctor.status || 'active',
        };
        reset(formValues);
      }
    }, [doctor, isCreateMode, reset]);

    useImperativeHandle(ref, () => ({
      getFormValues: async (): Promise<DoctorCreateData | DoctorUpdateData | null> => {
        return new Promise((resolve) => {
          handleSubmit(
            (data) => {
              if (isCreateMode) {
                const payload: any = {
                  create_user: true,
                  email: data.email,
                  password: data.password,
                  password_confirm: data.password_confirm,
                  first_name: data.first_name,
                  last_name: data.last_name,
                  phone: data.phone,
                  consultation_duration: Number(data.consultation_duration),
                };

                if (data.medical_license_number) payload.medical_license_number = data.medical_license_number;
                if (data.license_issuing_authority) payload.license_issuing_authority = data.license_issuing_authority;
                if (data.license_issue_date) payload.license_issue_date = data.license_issue_date;
                if (data.license_expiry_date) payload.license_expiry_date = data.license_expiry_date;
                if (data.qualifications) payload.qualifications = data.qualifications;
                if (data.specialty_ids && data.specialty_ids.length > 0) payload.specialty_ids = data.specialty_ids;
                if (data.years_of_experience) payload.years_of_experience = Number(data.years_of_experience);
                if (data.consultation_fee) payload.consultation_fee = Number(data.consultation_fee);
                if (data.follow_up_fee) payload.follow_up_fee = Number(data.follow_up_fee);

                resolve(payload);
              } else {
                const payload: any = {};

                if (data.medical_license_number) payload.medical_license_number = data.medical_license_number;
                if (data.license_issuing_authority) payload.license_issuing_authority = data.license_issuing_authority;
                if (data.license_issue_date) payload.license_issue_date = data.license_issue_date;
                if (data.license_expiry_date) payload.license_expiry_date = data.license_expiry_date;
                if (data.qualifications) payload.qualifications = data.qualifications;
                if (data.specialty_ids) payload.specialty_ids = data.specialty_ids;
                if (data.years_of_experience !== undefined) payload.years_of_experience = Number(data.years_of_experience);
                if (data.consultation_fee !== undefined) payload.consultation_fee = Number(data.consultation_fee);
                if (data.follow_up_fee !== undefined) payload.follow_up_fee = Number(data.follow_up_fee);
                if (data.consultation_duration) payload.consultation_duration = Number(data.consultation_duration);
                if (data.status) payload.status = data.status;

                resolve(payload);
              }
            },
            () => resolve(null)
          )();
        });
      },
    }));

    const toggleSpecialty = (specialtyId: number) => {
      if (isReadOnly) return;

      const currentIds = watchedSpecialtyIds;
      if (currentIds.includes(specialtyId)) {
        setValue('specialty_ids', currentIds.filter((id: number) => id !== specialtyId));
      } else {
        setValue('specialty_ids', [...currentIds, specialtyId]);
      }
    };

    return (
      <div className="space-y-4">
        {/* User Account (Create Mode Only) */}
        {isCreateMode && (
          <>
            <div>
              <h3 className="text-sm font-medium text-foreground">User Account</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Login credentials for the doctor</p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="doctor@example.com"
                  className={`h-8 text-sm ${errors.email ? 'border-destructive' : ''}`}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message as string}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      {...register('password')}
                      placeholder="••••••••"
                      className={`h-8 text-sm pr-8 ${errors.password ? 'border-destructive' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message as string}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password_confirm" className="text-xs">Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      id="password_confirm"
                      type={showPasswordConfirm ? 'text' : 'password'}
                      {...register('password_confirm')}
                      placeholder="••••••••"
                      className={`h-8 text-sm pr-8 ${errors.password_confirm ? 'border-destructive' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                      tabIndex={-1}
                    >
                      {showPasswordConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {errors.password_confirm && (
                    <p className="text-xs text-destructive">{errors.password_confirm.message as string}</p>
                  )}
                </div>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Personal Information */}
        <div>
          <h3 className="text-sm font-medium text-foreground">Personal Information</h3>
        </div>
        {isCreateMode ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="first_name" className="text-xs">First Name *</Label>
                <Input
                  id="first_name"
                  {...register('first_name')}
                  placeholder="John"
                  className={`h-8 text-sm ${errors.first_name ? 'border-destructive' : ''}`}
                />
                {errors.first_name && (
                  <p className="text-xs text-destructive">{errors.first_name.message as string}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name" className="text-xs">Last Name *</Label>
                <Input
                  id="last_name"
                  {...register('last_name')}
                  placeholder="Smith"
                  className={`h-8 text-sm ${errors.last_name ? 'border-destructive' : ''}`}
                />
                {errors.last_name && (
                  <p className="text-xs text-destructive">{errors.last_name.message as string}</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs">Phone Number *</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="+1234567890"
                className={`h-8 text-sm ${errors.phone ? 'border-destructive' : ''}`}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message as string}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <span className="text-xs text-muted-foreground">Full Name</span>
              <p className="text-sm font-medium text-foreground">{doctor?.full_name || 'N/A'}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Email</span>
              <p className="text-sm text-foreground">{doctor?.user?.email || 'N/A'}</p>
            </div>
          </div>
        )}

        <Separator />

        {/* Medical License */}
        <div>
          <h3 className="text-sm font-medium text-foreground">Medical License</h3>
        </div>
        {isReadOnly ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <span className="text-xs text-muted-foreground">License Number</span>
              <p className="text-sm font-mono text-foreground">{doctor?.medical_license_number || 'N/A'}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Issuing Authority</span>
              <p className="text-sm text-foreground">{doctor?.license_issuing_authority || 'N/A'}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Issue Date</span>
              <p className="text-sm text-foreground">{doctor?.license_issue_date || 'N/A'}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Expiry Date</span>
              <p className="text-sm text-foreground">{doctor?.license_expiry_date || 'N/A'}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">License Status</span>
              <div className="mt-0.5">
                {doctor?.is_license_valid ? (
                  <Badge variant="default" className="bg-green-600 text-xs h-5">Valid</Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs h-5">Expired</Badge>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="medical_license_number" className="text-xs">License Number</Label>
              <Input
                id="medical_license_number"
                {...register('medical_license_number')}
                placeholder="MED-12345"
                className={`h-8 text-sm ${errors.medical_license_number ? 'border-destructive' : ''}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="license_issuing_authority" className="text-xs">Issuing Authority</Label>
              <Input
                id="license_issuing_authority"
                {...register('license_issuing_authority')}
                placeholder="Medical Board of..."
                className={`h-8 text-sm ${errors.license_issuing_authority ? 'border-destructive' : ''}`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="license_issue_date" className="text-xs">Issue Date</Label>
                <Input
                  id="license_issue_date"
                  type="date"
                  {...register('license_issue_date')}
                  className={`h-8 text-sm ${errors.license_issue_date ? 'border-destructive' : ''}`}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="license_expiry_date" className="text-xs">Expiry Date</Label>
                <Input
                  id="license_expiry_date"
                  type="date"
                  {...register('license_expiry_date')}
                  className={`h-8 text-sm ${errors.license_expiry_date ? 'border-destructive' : ''}`}
                />
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Professional Information - editable in edit mode */}
        <div>
          <h3 className="text-sm font-medium text-foreground">Professional Information</h3>
          {isEditMode && (
            <p className="text-xs text-muted-foreground mt-0.5">Update professional details below</p>
          )}
        </div>
        <div className="space-y-3">
          {/* Qualifications */}
          {isReadOnly ? (
            <div>
              <span className="text-xs text-muted-foreground">Qualifications</span>
              <p className="text-sm text-foreground">{doctor?.qualifications || 'N/A'}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="qualifications" className="text-xs">Qualifications</Label>
              <Textarea
                id="qualifications"
                {...register('qualifications')}
                placeholder="MBBS, MD, etc."
                rows={2}
                className={`text-sm resize-none ${errors.qualifications ? 'border-destructive' : ''}`}
              />
              {errors.qualifications && (
                <p className="text-xs text-destructive">{errors.qualifications.message as string}</p>
              )}
            </div>
          )}

          {/* Specialties */}
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">Specialties</span>
            <div className="flex flex-wrap gap-1.5">
              {specialties.map((specialty) => (
                <Badge
                  key={specialty.id}
                  variant={watchedSpecialtyIds.includes(specialty.id) ? 'default' : 'outline'}
                  className={`text-xs h-6 ${isReadOnly ? 'cursor-default' : 'cursor-pointer hover:opacity-80'}`}
                  onClick={() => toggleSpecialty(specialty.id)}
                >
                  {specialty.name}
                  {watchedSpecialtyIds.includes(specialty.id) && !isReadOnly && (
                    <X className="h-3 w-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
            {errors.specialty_ids && (
              <p className="text-xs text-destructive">{errors.specialty_ids.message as string}</p>
            )}
          </div>

          {/* Years of Experience */}
          {isReadOnly ? (
            <div>
              <span className="text-xs text-muted-foreground">Years of Experience</span>
              <p className="text-sm text-foreground">{doctor?.years_of_experience || 0} years</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="years_of_experience" className="text-xs">Years of Experience</Label>
              <Input
                id="years_of_experience"
                type="number"
                min="0"
                {...register('years_of_experience')}
                className={`h-8 text-sm ${errors.years_of_experience ? 'border-destructive' : ''}`}
              />
              {errors.years_of_experience && (
                <p className="text-xs text-destructive">{errors.years_of_experience.message as string}</p>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Consultation & Fees - editable in edit mode */}
        <div>
          <h3 className="text-sm font-medium text-foreground">Consultation & Fees</h3>
        </div>
        {isReadOnly ? (
          <div className="grid grid-cols-3 gap-x-4 gap-y-2">
            <div>
              <span className="text-xs text-muted-foreground">Duration</span>
              <p className="text-sm font-medium text-foreground">{doctor?.consultation_duration || 15} min</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Consultation Fee</span>
              <p className="text-sm font-medium text-foreground">{doctor?.consultation_fee || '0'}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Follow-up Fee</span>
              <p className="text-sm font-medium text-foreground">{doctor?.follow_up_fee || '0'}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="consultation_duration" className="text-xs">
                Duration (minutes) {isCreateMode && '*'}
              </Label>
              <Input
                id="consultation_duration"
                type="number"
                min="5"
                step="5"
                {...register('consultation_duration')}
                className={`h-8 text-sm ${errors.consultation_duration ? 'border-destructive' : ''}`}
              />
              {errors.consultation_duration && (
                <p className="text-xs text-destructive">{errors.consultation_duration.message as string}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="consultation_fee" className="text-xs">Consultation Fee</Label>
                <Input
                  id="consultation_fee"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('consultation_fee')}
                  className={`h-8 text-sm ${errors.consultation_fee ? 'border-destructive' : ''}`}
                />
                {errors.consultation_fee && (
                  <p className="text-xs text-destructive">{errors.consultation_fee.message as string}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="follow_up_fee" className="text-xs">Follow-up Fee</Label>
                <Input
                  id="follow_up_fee"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('follow_up_fee')}
                  className={`h-8 text-sm ${errors.follow_up_fee ? 'border-destructive' : ''}`}
                />
                {errors.follow_up_fee && (
                  <p className="text-xs text-destructive">{errors.follow_up_fee.message as string}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Status (Edit/View Mode) */}
        {!isCreateMode && (
          <>
            <Separator />
            <div>
              <h3 className="text-sm font-medium text-foreground">Status</h3>
            </div>
            {isReadOnly ? (
              <div>
                <Badge
                  variant={
                    doctor?.status === 'active'
                      ? 'default'
                      : doctor?.status === 'on_leave'
                      ? 'secondary'
                      : 'destructive'
                  }
                  className={`text-xs h-5 ${
                    doctor?.status === 'active'
                      ? 'bg-green-600'
                      : doctor?.status === 'on_leave'
                      ? 'bg-orange-600'
                      : ''
                  }`}
                >
                  {doctor?.status === 'active' && 'Active'}
                  {doctor?.status === 'on_leave' && 'On Leave'}
                  {doctor?.status === 'inactive' && 'Inactive'}
                </Badge>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-xs">Doctor Status</Label>
                <Select
                  value={watchedStatus}
                  onValueChange={(value) => setValue('status', value)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}

        {/* Statistics (View Mode Only) */}
        {mode === 'view' && doctor && (
          <>
            <Separator />
            <div>
              <h3 className="text-sm font-medium text-foreground">Statistics</h3>
            </div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-3">
              <div className="rounded-md bg-muted/50 p-2 text-center">
                <span className="text-xs text-muted-foreground block">Rating</span>
                <p className="text-sm font-semibold text-foreground">{doctor.average_rating}</p>
              </div>
              <div className="rounded-md bg-muted/50 p-2 text-center">
                <span className="text-xs text-muted-foreground block">Reviews</span>
                <p className="text-sm font-semibold text-foreground">{doctor.total_reviews}</p>
              </div>
              <div className="rounded-md bg-muted/50 p-2 text-center">
                <span className="text-xs text-muted-foreground block">Consultations</span>
                <p className="text-sm font-semibold text-foreground">{doctor.total_consultations}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Online</span>
                <div className="mt-0.5">
                  {doctor.is_available_online ? (
                    <Badge variant="default" className="bg-green-600 text-xs h-5">Yes</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs h-5">No</Badge>
                  )}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Offline</span>
                <div className="mt-0.5">
                  {doctor.is_available_offline ? (
                    <Badge variant="default" className="bg-green-600 text-xs h-5">Yes</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs h-5">No</Badge>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }
);

DoctorBasicInfo.displayName = 'DoctorBasicInfo';

export default DoctorBasicInfo;
