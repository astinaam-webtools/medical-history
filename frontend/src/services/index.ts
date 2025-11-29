import api from './api';
import type {
  User,
  TokenResponse,
  LoginCredentials,
  RegisterData,
  Patient,
  PatientCreate,
  PatientUpdate,
  PatientListResponse,
  Document,
  DocumentListResponse,
  Prescription,
  PrescriptionUpdate,
  PrescriptionListResponse,
  MedicineSearchResult,
  Settings,
} from '../types';

// Auth API
export const authApi = {
  register: async (data: RegisterData): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/register', data);
    return response.data;
  },

  login: async (credentials: LoginCredentials): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/login', credentials);
    return response.data;
  },

  googleLogin: async (token: string): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/google', { token });
    return response.data;
  },

  refresh: async (refreshToken: string): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },
};

// Patients API
export const patientsApi = {
  list: async (): Promise<PatientListResponse> => {
    const response = await api.get<PatientListResponse>('/patients');
    return response.data;
  },

  get: async (id: number): Promise<Patient> => {
    const response = await api.get<Patient>(`/patients/${id}`);
    return response.data;
  },

  create: async (data: PatientCreate): Promise<Patient> => {
    const response = await api.post<Patient>('/patients', data);
    return response.data;
  },

  update: async (id: number, data: PatientUpdate): Promise<Patient> => {
    const response = await api.put<Patient>(`/patients/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/patients/${id}`);
  },
};

// Documents API
export const documentsApi = {
  list: async (params?: {
    patient_id?: number;
    document_type?: string;
  }): Promise<DocumentListResponse> => {
    const response = await api.get<DocumentListResponse>('/documents', { params });
    return response.data;
  },

  get: async (id: number): Promise<Document> => {
    const response = await api.get<Document>(`/documents/${id}`);
    return response.data;
  },

  upload: async (data: { 
    file: File; 
    patientId: number; 
    documentType: string;
    displayName?: string;
    generateDisplayName?: boolean;
  }): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('patient_id', data.patientId.toString());
    formData.append('document_type', data.documentType);
    if (data.displayName) {
      formData.append('display_name', data.displayName);
    }
    formData.append('generate_display_name', String(data.generateDisplayName || false));
    const response = await api.post<Document>('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getFileUrl: (id: number): string => {
    const token = localStorage.getItem('access_token');
    return `${api.defaults.baseURL}/documents/${id}/file?token=${token}`;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/documents/${id}`);
  },
};

// Prescriptions API
export const prescriptionsApi = {
  list: async (params?: {
    patient_id?: number;
    search?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<PrescriptionListResponse> => {
    const response = await api.get<PrescriptionListResponse>('/prescriptions', {
      params,
    });
    return response.data;
  },

  get: async (id: number): Promise<Prescription> => {
    const response = await api.get<Prescription>(`/prescriptions/${id}`);
    return response.data;
  },

  update: async (id: number, data: PrescriptionUpdate): Promise<Prescription> => {
    const response = await api.put<Prescription>(`/prescriptions/${id}`, data);
    return response.data;
  },

  searchMedicines: async (
    query: string,
    patientId?: number
  ): Promise<MedicineSearchResult[]> => {
    const params: { query: string; patient_id?: number } = { query };
    if (patientId) {
      params.patient_id = patientId;
    }
    const response = await api.get<MedicineSearchResult[]>(
      '/prescriptions/search/medicines',
      { params }
    );
    return response.data;
  },
};

// Settings API
export const settingsApi = {
  get: async (): Promise<Settings> => {
    const response = await api.get<Settings>('/settings');
    return response.data;
  },

  updateProfile: async (data: {
    username?: string;
    full_name?: string;
  }): Promise<User> => {
    const response = await api.put<User>('/settings/profile', data);
    return response.data;
  },

  updateApiKey: async (apiKey: string): Promise<Settings> => {
    const response = await api.put<Settings>('/settings/api-key', {
      api_key: apiKey,
    });
    return response.data;
  },

  deleteApiKey: async (): Promise<void> => {
    await api.delete('/settings/api-key');
  },

  exportData: async (): Promise<unknown> => {
    const response = await api.post('/settings/export');
    return response.data;
  },

  deleteAccount: async (password: string): Promise<void> => {
    await api.delete('/settings/account', {
      data: { password },
    });
  },
};
