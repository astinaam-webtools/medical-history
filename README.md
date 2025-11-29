# MediHistory - Medical History Manager

A comprehensive medical history management system that helps users preserve and organize their medical records, prescriptions, and documents for themselves and their family members.

## Features

- 🏥 **Patient Profiles**: Create and manage profiles for yourself and family members
- 📄 **Document Upload**: Upload prescriptions, lab reports, and medical records (PDF/images)
- 🤖 **AI-Powered Parsing**: Automatically extract medicine details, doctor info, and more using OpenRouter AI
- 🔍 **Medicine Search**: Search across all prescriptions to find specific medicines
- 📱 **PWA Support**: Install as a Progressive Web App on any device
- 🔐 **Secure Authentication**: JWT-based auth with email/password and Google OAuth support
- 🌓 **Dark Mode**: Beautiful UI with light and dark theme support

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Zustand (state management)
- React Query (server state)
- React Router (routing)
- PWA ready (vite-plugin-pwa)

### Backend
- Python 3.11+
- FastAPI
- SQLAlchemy (async) + SQLite
- JWT Authentication
- OpenRouter AI integration

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- OpenRouter API Key (get one at https://openrouter.ai/keys)

### Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env and add your configuration
# - Change SECRET_KEY to a random string
# - Add Google OAuth credentials (optional)

# Create data directories
mkdir -p data uploads

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at http://localhost:8000
API documentation: http://localhost:8000/docs

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The app will be available at http://localhost:5173

### Docker Setup

```bash
cd backend
docker-compose up --build
```

## Configuration

### Environment Variables (Backend)

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | JWT signing key | (required) |
| `DATABASE_URL` | SQLite database path | `sqlite+aiosqlite:///./data/medical_history.db` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | (optional) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | (optional) |
| `OPENROUTER_API_URL` | OpenRouter API endpoint | `https://openrouter.ai/api/v1/chat/completions` |
| `DEFAULT_AI_MODEL` | AI model for parsing | `google/gemini-flash-1.5` |
| `CORS_ORIGINS` | Allowed frontend origins | `["http://localhost:5173"]` |

### API Key Setup

1. Create an account at https://openrouter.ai
2. Generate an API key at https://openrouter.ai/keys
3. In the app, go to Settings > OpenRouter API Key
4. Enter your API key and save

## Project Structure

```
medical-history/
├── backend/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── core/          # Config, database, security
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   └── services/      # Business logic
│   ├── data/              # SQLite database
│   ├── uploads/           # Uploaded files
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── store/         # Zustand stores
│   │   └── types/         # TypeScript types
│   ├── public/            # Static assets
│   └── package.json
│
└── SPECIFICATION.md       # Full specification
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login with email/password
- `POST /api/v1/auth/google` - Login with Google OAuth
- `GET /api/v1/auth/me` - Get current user

### Patients
- `GET /api/v1/patients` - List all patients
- `POST /api/v1/patients` - Create patient
- `GET /api/v1/patients/{id}` - Get patient details
- `PUT /api/v1/patients/{id}` - Update patient
- `DELETE /api/v1/patients/{id}` - Delete patient

### Documents
- `GET /api/v1/documents` - List documents
- `POST /api/v1/documents/upload` - Upload & parse document
- `GET /api/v1/documents/{id}` - Get document details
- `DELETE /api/v1/documents/{id}` - Delete document

### Prescriptions
- `GET /api/v1/prescriptions` - List prescriptions
- `GET /api/v1/prescriptions/{id}` - Get prescription details
- `PUT /api/v1/prescriptions/{id}` - Update prescription
- `GET /api/v1/prescriptions/search/medicines` - Search medicines

### Settings
- `GET /api/v1/settings` - Get user settings
- `PUT /api/v1/settings/api-key` - Update OpenRouter API key
- `POST /api/v1/settings/export` - Export all user data

## AI Document Parsing

The system uses OpenRouter's AI models (default: Google Gemini Flash 1.5) to parse prescriptions and extract:

- **Prescription Date**: When the prescription was issued
- **Doctor Information**: Name, title, specialty, degree
- **Hospital/Clinic**: Name and address
- **Medicines**: Name, dosage, frequency, timing, duration
- **Diagnosis**: Medical condition if mentioned
- **Additional Notes**: Any other relevant information

### Supported Document Types
- PDF files
- Images (JPG, PNG)
- Maximum file size: 10MB

## Deployment

### GitHub Pages (Frontend)

```bash
cd frontend
npm run build
# Deploy dist/ folder to GitHub Pages
```

### Docker (Backend)

```bash
cd backend
docker build -t medical-history-api .
docker run -p 8000:8000 -v $(pwd)/data:/app/data medical-history-api
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - see LICENSE file for details.
