# Medical History Management System - Specification Document

## Project Overview

A comprehensive web application for preserving and managing medical history for users, their family members, and others. The system allows users to upload prescriptions/medical reports (PDFs/images) and automatically extracts relevant information using AI.

## Key Features

### 1. User Management
- **Authentication**
  - Username/password registration and login
  - Google OAuth 2.0 integration
  - JWT-based session management
  - Password reset functionality

### 2. Patient Profiles
- Create profiles for self, family members, and others
- Profile fields:
  - Name
  - Date of Birth
  - Gender
  - Blood Group
  - Allergies
  - Chronic Conditions
  - Emergency Contact
  - Relationship to user (self, spouse, child, parent, sibling, other)

### 3. Document Management
- Upload PDFs and images (JPG, PNG, WEBP)
- Capture images directly from camera (mobile-friendly)
- Store files in configurable local storage
- Preview documents within the app
- Organize documents by patient and date

### 4. AI-Powered Prescription Parsing
- Automatic extraction of:
  - **Date**: Prescription/report date
  - **Medicine List**:
    - Medicine name
    - Frequency (e.g., twice daily)
    - When to eat (before/after meals, morning/evening)
    - Duration (number of days)
    - Dosage
  - **Doctor Information**:
    - Name
    - Title/Specialty (e.g., Cardiologist)
    - Degree (e.g., MBBS, MD)
    - Hospital/Clinic affiliation
  - **Hospital/Clinic Name**
  - **Diagnosis** (if mentioned)
  - **Lab Results** (for reports)
- Graceful handling of parsing failures (empty fields)
- Manual editing of parsed data

### 5. Medical History Search
- Full-text search across:
  - Medicine names
  - Doctor names
  - Hospital names
  - Diagnosis
- Filter by:
  - Patient
  - Date range
  - Document type (prescription/report)

### 6. Settings/Admin Panel
- OpenRouter API Key management (per user)
- Profile settings
- Notification preferences
- Data export (JSON/PDF)
- Theme customization (light/dark mode)

### 7. Additional Features
- **Medicine Reminders**: Set reminders for medications
- **Analytics Dashboard**: Visualize health trends
- **Timeline View**: Chronological medical history
- **Share Reports**: Generate shareable links for doctors
- **Offline Support**: PWA with offline capabilities

---

## Technical Architecture

### Frontend (React + TypeScript + Vite)

```
frontend/
├── public/
│   ├── manifest.json
│   ├── sw.js
│   └── icons/
├── src/
│   ├── components/
│   │   ├── common/
│   │   ├── auth/
│   │   ├── patients/
│   │   ├── documents/
│   │   ├── prescriptions/
│   │   └── settings/
│   ├── pages/
│   ├── hooks/
│   ├── services/
│   ├── store/
│   ├── types/
│   └── utils/
├── package.json
└── vite.config.ts
```

**Key Libraries:**
- React Router v6 (routing)
- Zustand (state management)
- React Query (data fetching)
- Tailwind CSS (styling)
- Headless UI (accessible components)
- React Hook Form (forms)
- date-fns (date handling)
- Workbox (PWA/service worker)

### Backend (Python + FastAPI)

```
backend/
├── app/
│   ├── api/
│   │   ├── auth.py
│   │   ├── patients.py
│   │   ├── documents.py
│   │   ├── prescriptions.py
│   │   └── settings.py
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   └── database.py
│   ├── models/
│   ├── schemas/
│   ├── services/
│   │   ├── ai_parser.py
│   │   └── file_storage.py
│   └── main.py
├── tests/
├── alembic/
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```

**Key Libraries:**
- FastAPI (web framework)
- SQLAlchemy (ORM)
- Alembic (migrations)
- Pydantic (validation)
- python-jose (JWT)
- passlib (password hashing)
- httpx (HTTP client for OpenRouter)
- python-multipart (file uploads)
- Pillow (image processing)
- PyPDF2 (PDF processing)

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE,
    hashed_password VARCHAR(255),
    full_name VARCHAR(255),
    google_id VARCHAR(255),
    openrouter_api_key VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Patients Table
```sql
CREATE TABLE patients (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20),
    blood_group VARCHAR(10),
    allergies TEXT,
    chronic_conditions TEXT,
    emergency_contact VARCHAR(100),
    relationship VARCHAR(50),
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Documents Table
```sql
CREATE TABLE documents (
    id INTEGER PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    user_id INTEGER REFERENCES users(id),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    document_type VARCHAR(50), -- prescription, lab_report, scan, etc.
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);
```

### Prescriptions Table
```sql
CREATE TABLE prescriptions (
    id INTEGER PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id),
    patient_id INTEGER REFERENCES patients(id),
    prescription_date DATE,
    doctor_name VARCHAR(255),
    doctor_specialty VARCHAR(255),
    doctor_degree VARCHAR(255),
    hospital_name VARCHAR(255),
    diagnosis TEXT,
    notes TEXT,
    raw_parsed_data JSON,
    parsing_status VARCHAR(50), -- success, partial, failed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Medicines Table
```sql
CREATE TABLE medicines (
    id INTEGER PRIMARY KEY,
    prescription_id INTEGER REFERENCES prescriptions(id),
    name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    when_to_take VARCHAR(100),
    duration_days INTEGER,
    instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/google` - Google OAuth login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - Logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Patients
- `GET /api/patients` - List all patients for user
- `POST /api/patients` - Create new patient
- `GET /api/patients/{id}` - Get patient details
- `PUT /api/patients/{id}` - Update patient
- `DELETE /api/patients/{id}` - Delete patient

### Documents
- `GET /api/documents` - List documents (with filters)
- `POST /api/documents/upload` - Upload document
- `GET /api/documents/{id}` - Get document details
- `GET /api/documents/{id}/file` - Download document file
- `DELETE /api/documents/{id}` - Delete document

### Prescriptions
- `GET /api/prescriptions` - List prescriptions (with search)
- `GET /api/prescriptions/{id}` - Get prescription details
- `PUT /api/prescriptions/{id}` - Update prescription
- `POST /api/prescriptions/{id}/reparse` - Re-parse document

### Medicines
- `GET /api/medicines/search` - Search medicines across all prescriptions

### Settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update settings
- `PUT /api/settings/api-key` - Update OpenRouter API key
- `POST /api/settings/export` - Export all data

---

## OpenRouter Integration

### AI Prompt for Prescription Parsing

```
You are a medical document parser. Extract the following information from the provided prescription/medical report image or PDF.

Return a JSON object with these fields:
{
  "prescription_date": "YYYY-MM-DD or null",
  "doctor": {
    "name": "string or null",
    "specialty": "string or null",
    "degree": "string or null"
  },
  "hospital_name": "string or null",
  "diagnosis": "string or null",
  "medicines": [
    {
      "name": "string",
      "dosage": "string or null",
      "frequency": "string or null (e.g., 'twice daily', '3 times a day')",
      "when_to_take": "string or null (e.g., 'after meals', 'before breakfast')",
      "duration_days": "number or null",
      "instructions": "string or null"
    }
  ],
  "additional_notes": "string or null"
}

Rules:
1. If a field cannot be determined, set it to null
2. For medicines, extract as many details as visible
3. Parse dates in YYYY-MM-DD format
4. Include any special instructions for medicines
5. Be accurate - do not hallucinate information not present in the document
```

---

## PWA Configuration

### manifest.json
```json
{
  "name": "Medical History Manager",
  "short_name": "MedHistory",
  "description": "Manage your family's medical history",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0ea5e9",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## Security Considerations

1. **API Key Storage**: OpenRouter API keys encrypted at rest
2. **File Storage**: Files stored outside web root with unique names
3. **Input Validation**: All inputs sanitized and validated
4. **CORS**: Configured for specific origins only
5. **Rate Limiting**: API rate limiting to prevent abuse
6. **HTTPS**: Required for production deployment

---

## Deployment

### Frontend (GitHub Pages)
- Build static files with Vite
- Deploy to GitHub Pages with GitHub Actions
- Use environment variables for API URL

### Backend (Docker)
- Dockerfile with multi-stage build
- docker-compose for easy deployment
- Volume mounts for SQLite and file storage

---

## Assumptions

1. Users will provide their own OpenRouter API key
2. Single-user or small family use (no complex multi-tenancy)
3. Documents are primarily in English (can be extended)
4. Mobile-first design priority
5. Offline support limited to viewing cached data

---

## Future Enhancements

1. Multi-language OCR support
2. Integration with health APIs (FHIR)
3. Medication interaction warnings
4. Appointment scheduling
5. Integration with pharmacies
6. Voice notes attachment
7. Family sharing with permissions
