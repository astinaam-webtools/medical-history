// User types
export interface User {
  id: number;
  email: string;
  username: string | null;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
  has_api_key: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  username?: string;
  full_name?: string;
}

// Patient types
export interface Patient {
  id: number;
  user_id: number;
  name: string;
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  allergies: string | null;
  chronic_conditions: string | null;
  emergency_contact: string | null;
  relationship: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string | null;
  document_count: number;
}

export interface PatientCreate {
  name: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  allergies?: string;
  chronic_conditions?: string;
  emergency_contact?: string;
  relationship?: string;
  avatar_url?: string;
}

export interface PatientUpdate extends Partial<PatientCreate> {}

// Document types
export interface Document {
  id: number;
  patient_id: number;
  user_id: number;
  file_name: string;
  display_name: string | null;
  file_type: string | null;
  file_size: number | null;
  document_type: string | null;
  upload_date: string;
  notes: string | null;
  prescription: Prescription | null;
  medical_report?: MedicalReport | null;
}

// Medical Report types
export interface MedicalReport {
  id: number;
  document_id: number;
  patient_id: number;
  report_type: string | null;
  report_title: string | null;
  report_date: string | null;
  lab_name: string | null;
  lab_address: string | null;
  technician_name: string | null;
  referring_doctor: string | null;
  findings: string | null;
  conclusion: string | null;
  recommendations: string | null;
  test_results: Record<string, unknown> | null;
  full_text: string | null;
  summary: string | null;
  parsing_status: string | null;
  created_at: string;
  updated_at: string | null;
}

// Prescription types
export interface Medicine {
  id: number;
  prescription_id: number;
  name: string;
  dosage: string | null;
  frequency: string | null;
  timing: string | null;
  when_to_take: string | null;
  duration_days: number | null;
  instructions: string | null;
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
  night: boolean;
  created_at: string;
}

export interface Prescription {
  id: number;
  document_id: number;
  patient_id: number;
  prescription_date: string | null;
  doctor_name: string | null;
  doctor_title: string | null;
  doctor_speciality: string | null;
  doctor_degree: string | null;
  hospital_name: string | null;
  hospital_address: string | null;
  diagnosis: string | null;
  notes: string | null;
  parsing_status: string | null;
  medicines: Medicine[];
  created_at: string;
  updated_at: string | null;
}

export interface PrescriptionUpdate {
  prescription_date?: string;
  doctor_name?: string;
  doctor_specialty?: string;
  doctor_degree?: string;
  hospital_name?: string;
  diagnosis?: string;
  notes?: string;
}

// Search types
export interface MedicineSearchResult {
  medicine: Medicine;
  prescription_id: number;
  prescription_date: string | null;
  doctor_name: string | null;
  patient_name: string;
  patient_id: number;
}

// Settings types
export interface Settings {
  has_api_key: boolean;
  api_key_preview: string | null;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  status: number;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
}

export interface PatientListResponse {
  patients: Patient[];
  total: number;
}

export interface DocumentListResponse {
  documents: Document[];
  total: number;
}

export interface PrescriptionListResponse {
  prescriptions: Prescription[];
  total: number;
}

export interface MedicineSearchResponse {
  results: MedicineSearchResult[];
  total: number;
}
