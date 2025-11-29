# MediHistory - Medical History Manager

A comprehensive medical history management system that helps users preserve and organize their medical records, prescriptions, and documents for themselves and their family members.

## Features

- 🏥 **Patient Profiles**: Create and manage profiles for yourself and family members
- 📄 **Document Upload**: Upload prescriptions, lab reports, X-rays, and medical records (PDF/images)
- 🤖 **AI-Powered Parsing**: Automatically extract medicine details, doctor info, and more using OpenRouter AI
- � **Medical Records**: Comprehensive view of all documents with filters by type, date range, and patient
- �🔍 **Medicine Search**: Search across all prescriptions to find specific medicines
- 👁️ **Document Viewer**: In-app PDF and image viewer with zoom, pan, and multi-page support
- 📱 **PWA Support**: Install as a Progressive Web App on any device (mobile & desktop)
- 🔐 **Secure Authentication**: JWT-based auth with email/password and Google OAuth support
- 🌓 **Dark Mode**: Beautiful UI with light and dark theme support
- ⚙️ **Configurable Backend**: Connect to any backend URL via settings

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Zustand (state management)
- React Query (server state)
- React Router (routing)
- PDF.js (PDF rendering)
- PWA ready (vite-plugin-pwa)

### Backend
- Python 3.11+
- FastAPI
- SQLAlchemy (async) + SQLite
- JWT Authentication
- OpenRouter AI integration
- Docker support

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

### Health Check
- `GET /api/v1/health` - Check API health status

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login with email/password
- `POST /api/v1/auth/google` - Login with Google OAuth
- `GET /api/v1/auth/me` - Get current user
- `DELETE /api/v1/auth/account` - Delete user account

### Patients
- `GET /api/v1/patients` - List all patients
- `POST /api/v1/patients` - Create patient
- `GET /api/v1/patients/{id}` - Get patient details
- `PUT /api/v1/patients/{id}` - Update patient
- `DELETE /api/v1/patients/{id}` - Delete patient

### Documents
- `GET /api/v1/documents` - List documents (supports filters)
- `POST /api/v1/documents/upload` - Upload & parse document
- `GET /api/v1/documents/{id}` - Get document details
- `GET /api/v1/documents/{id}/file` - Download/view document file
- `DELETE /api/v1/documents/{id}` - Delete document

### Prescriptions
- `GET /api/v1/prescriptions` - List prescriptions
- `GET /api/v1/prescriptions/{id}` - Get prescription details
- `PUT /api/v1/prescriptions/{id}` - Update prescription
- `GET /api/v1/prescriptions/search/medicines` - Search medicines

### Medical Reports
- `GET /api/v1/medical-reports` - List medical reports
- `GET /api/v1/medical-reports/{id}` - Get report details
- `PUT /api/v1/medical-reports/{id}` - Update report

### Settings
- `GET /api/v1/settings` - Get user settings
- `PUT /api/v1/settings/api-key` - Update OpenRouter API key
- `POST /api/v1/settings/export` - Export all user data

## AI Document Parsing

The system uses OpenRouter's AI models (default: Google Gemini Flash 1.5) to parse medical documents and extract structured data.

### Supported Document Types

| Type | Description | Extracted Data |
|------|-------------|----------------|
| **Prescription** | Doctor prescriptions | Medicines, dosage, frequency, doctor info, diagnosis |
| **Lab Report** | Blood tests, urine tests, etc. | Test results, reference ranges, lab info |
| **Imaging** | X-rays, MRI, CT scans | Findings, impressions, radiologist notes |
| **Medical Record** | General medical documents | Summary, key information |

### Extracted Information

**From Prescriptions:**
- Prescription date
- Doctor information (name, title, specialty, degree)
- Hospital/Clinic details
- Medicines (name, dosage, frequency, timing, duration)
- Diagnosis
- Additional notes
- AI-suggested display name

**From Lab Reports:**
- Report date and type
- Lab name and address
- Test results with reference ranges
- Technician/pathologist info
- Findings and conclusions

### File Requirements
- **Formats**: PDF, JPG, PNG
- **Max Size**: 10MB
- **Best Results**: Clear, well-lit images or searchable PDFs

## Deployment

### Frontend Deployment (GitHub Pages)

1. **Build the frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to GitHub Pages:**
   - Push the `dist/` folder to the `gh-pages` branch, or
   - Use GitHub Actions for automatic deployment:
   
   Create `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to GitHub Pages
   on:
     push:
       branches: [main]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: '18'
         - run: cd frontend && npm ci && npm run build
         - uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./frontend/dist
   ```

3. **Configure backend URL:**
   - After deploying, open the app and go to Settings
   - Enter your backend URL (e.g., `https://your-server.com`)

### Backend Deployment

#### Option 1: Docker (Recommended)

**Quick Start with Docker Compose:**
```bash
cd backend

# Create environment file
cp .env.example .env
# Edit .env with your SECRET_KEY and other settings

# Build and run
docker-compose up -d --build

# Check logs
docker-compose logs -f

# Stop
docker-compose down
```

**Manual Docker Build:**
```bash
cd backend

# Build the image
docker build -t medihistory-api .

# Run with persistent data
docker run -d \
  --name medihistory-api \
  -p 8000:8000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/uploads:/app/uploads \
  -e SECRET_KEY="your-secure-secret-key" \
  -e CORS_ORIGINS='["https://yourusername.github.io","http://localhost:5173"]' \
  --restart unless-stopped \
  medihistory-api

# View logs
docker logs -f medihistory-api
```

#### Option 2: Docker Compose with Custom Configuration

Create a `docker-compose.override.yml` for production:
```yaml
version: '3.8'
services:
  backend:
    environment:
      - SECRET_KEY=your-very-secure-secret-key-here
      - CORS_ORIGINS=["https://yourusername.github.io"]
      - DEBUG=False
    restart: always
```

Then run:
```bash
docker-compose up -d --build
```

#### Option 3: VPS/Cloud Deployment (Without Docker)

```bash
# On your server
cd /opt
git clone https://github.com/yourusername/medical-history.git
cd medical-history/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
nano .env  # Edit with your settings

# Create directories
mkdir -p data uploads

# Run with gunicorn (production)
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

**Systemd Service (for auto-start):**

Create `/etc/systemd/system/medihistory.service`:
```ini
[Unit]
Description=MediHistory API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/medical-history/backend
Environment=PATH=/opt/medical-history/backend/venv/bin
ExecStart=/opt/medical-history/backend/venv/bin/gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable medihistory
sudo systemctl start medihistory
sudo systemctl status medihistory
```

#### Option 4: Cloud Platform Deployment

**Railway/Render/Fly.io:**
1. Connect your GitHub repository
2. Set the root directory to `backend`
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables:
   - `SECRET_KEY`: Generate a secure random string
   - `CORS_ORIGINS`: Your frontend URL

### Nginx Reverse Proxy (Optional)

For production with HTTPS:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # For file uploads
        client_max_body_size 20M;
    }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - see LICENSE file for details.
