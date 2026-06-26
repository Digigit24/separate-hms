// src/services/patient.service.ts
import { hmsClient, tokenManager } from '@/lib/client';
import { API_CONFIG, buildQueryString } from '@/lib/apiConfig';
import {
  Patient,
  PatientListParams,
  PatientExportParams,
  PatientCreateData,
  PatientUpdateData,
  PaginatedResponse,
  ApiResponse
} from '@/types/patient.types';

class PatientService {
  // ==================== PATIENTS ====================

  // Get patients with optional query parameters
  async getPatients(params?: PatientListParams): Promise<PaginatedResponse<Patient>> {
    try {
      const queryString = buildQueryString(params);
      const response = await hmsClient.get<PaginatedResponse<Patient>>(
        `${API_CONFIG.HMS.PATIENTS.PROFILES_LIST}${queryString}`
      );
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.error ||
                     error.response?.data?.message ||
                     'Failed to fetch patients';
      throw new Error(message);
    }
  }

  // Get single patient by ID
  async getPatient(id: number): Promise<Patient> {
    try {
      const response = await hmsClient.get<any>(
        API_CONFIG.HMS.PATIENTS.PROFILE_DETAIL.replace(':id', id.toString())
      );
      // API returns {success: true, data: {...}}, so we need to unwrap it
      return response.data?.data || response.data;
    } catch (error: any) {
      const message = error.response?.data?.error ||
                     error.response?.data?.message ||
                     'Failed to fetch patient';
      throw new Error(message);
    }
  }

  // Create new patient
  async createPatient(patientData: PatientCreateData): Promise<Patient> {
    try {
      const response = await hmsClient.post<any>(
        API_CONFIG.HMS.PATIENTS.PROFILE_CREATE,
        patientData
      );
      // API returns {success: true, data: {...}}, so we need to unwrap it
      return response.data?.data || response.data;
    } catch (error: any) {
      const message = error.response?.data?.error ||
                     error.response?.data?.message ||
                     'Failed to create patient';
      throw new Error(message);
    }
  }

  // Register new patient (alternative endpoint)
  async registerPatient(patientData: PatientCreateData): Promise<Patient> {
    try {
      const response = await hmsClient.post<any>(
        API_CONFIG.HMS.PATIENTS.REGISTER,
        patientData
      );
      // API returns {success: true, data: {...}}, so we need to unwrap it
      return response.data?.data || response.data;
    } catch (error: any) {
      const message = error.response?.data?.error ||
                     error.response?.data?.message ||
                     'Failed to register patient';
      throw new Error(message);
    }
  }

  // Update patient (full update)
  async updatePatient(id: number, patientData: PatientUpdateData): Promise<Patient> {
    try {
      const response = await hmsClient.put<any>(
        API_CONFIG.HMS.PATIENTS.PROFILE_UPDATE.replace(':id', id.toString()),
        patientData
      );
      // API returns {success: true, data: {...}}, so we need to unwrap it
      return response.data?.data || response.data;
    } catch (error: any) {
      const message = error.response?.data?.error ||
                     error.response?.data?.message ||
                     'Failed to update patient';
      throw new Error(message);
    }
  }

  // Partially update patient (patch)
  async patchPatient(id: number, patientData: Partial<PatientUpdateData>): Promise<Patient> {
    try {
      const response = await hmsClient.patch<any>(
        API_CONFIG.HMS.PATIENTS.PROFILE_UPDATE.replace(':id', id.toString()),
        patientData
      );
      // API returns {success: true, data: {...}}, so we need to unwrap it
      return response.data?.data || response.data;
    } catch (error: any) {
      const message = error.response?.data?.error ||
                     error.response?.data?.message ||
                     'Failed to update patient';
      throw new Error(message);
    }
  }

  // Delete patient
  async deletePatient(id: number): Promise<void> {
    try {
      await hmsClient.delete(
        API_CONFIG.HMS.PATIENTS.PROFILE_DELETE.replace(':id', id.toString())
      );
    } catch (error: any) {
      const message = error.response?.data?.error ||
                     error.response?.data?.message ||
                     'Failed to delete patient';
      throw new Error(message);
    }
  }

  // ==================== PATIENT EXPORT ====================

  // Export patients as CSV or XLSX (binary file download)
  async exportPatients(params?: PatientExportParams): Promise<void> {
    try {
      const queryString = buildQueryString(params as Record<string, string | number | boolean | undefined>);

      // Build the same headers the hmsClient interceptor adds for every request
      const token = tokenManager.getAccessToken();
      const USER_KEY = 'celiyo_user';
      const extraHeaders: Record<string, string> = {};
      if (token) extraHeaders['Authorization'] = `Bearer ${token}`;
      try {
        const userJson = localStorage.getItem(USER_KEY);
        if (userJson) {
          const user = JSON.parse(userJson);
          const tenant = user?.tenant;
          if (tenant) {
            const tenantId = tenant.id || tenant.tenant_id;
            if (tenantId) {
              extraHeaders['X-Tenant-Id'] = String(tenantId);
              extraHeaders['tenanttoken'] = String(tenantId);
            }
            if (tenant.slug) extraHeaders['X-Tenant-Slug'] = tenant.slug;
          }
        }
      } catch { /* ignore */ }

      const response = await hmsClient.get(
        `${API_CONFIG.HMS.PATIENTS.EXPORT}${queryString}`,
        { responseType: 'blob', headers: extraHeaders }
      );

      // Extract filename from Content-Disposition header
      const disposition: string = response.headers['content-disposition'] || '';
      const match = disposition.match(/filename="?([^";\n]+)"?/);
      const fallbackExt = params?.format === 'xlsx' ? 'xlsx' : 'csv';
      const filename = match ? match[1].trim() : `patients_export.${fallbackExt}`;

      // Trigger browser download
      const blob = new Blob([response.data as BlobPart]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      // Error body may itself be a Blob — read it as text to extract JSON message
      if (error.response?.data instanceof Blob) {
        try {
          const text = await (error.response.data as Blob).text();
          const json = JSON.parse(text);
          throw new Error(json.error || json.message || 'Export failed');
        } catch (parseErr: any) {
          if (parseErr.message && parseErr.message !== 'Export failed') throw parseErr;
          throw new Error('Failed to export patients');
        }
      }
      const message = error.response?.data?.error ||
                     error.response?.data?.message ||
                     'Failed to export patients';
      throw new Error(message);
    }
  }

  // ==================== PATIENT STATISTICS ====================

  // Get patient statistics
  async getPatientStatistics(): Promise<any> {
    try {
      const response = await hmsClient.get(
        API_CONFIG.HMS.PATIENTS.STATISTICS
      );
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.error ||
                     error.response?.data?.message ||
                     'Failed to fetch patient statistics';
      throw new Error(message);
    }
  }
}

export const patientService = new PatientService();
