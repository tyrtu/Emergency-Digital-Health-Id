# Emergency Digital Health ID

A comprehensive emergency triage and health identity platform that enables rapid patient identification and critical health information access through QR code technology. Designed for healthcare providers, EMS teams, and patients to improve emergency response times and continuity of care.

## 🎯 Overview

Emergency Digital Health ID provides a portable, verifiable health identity system that works both online and offline. Patients receive a digital/printable QR code health ID card that medics can scan to instantly access critical health information including vitals, allergies, medications, and emergency contacts—even in low-connectivity environments.

### Key Benefits

- **For Patients**: A single, portable emergency ID that works across facilities, plus a self-service portal to manage non-clinical data
- **For Medics/Clinicians**: Rapid access to critical information at the point of care with decision support (alerts, protocols)
- **For Administrators**: Visibility into usage, triage patterns, and operational KPIs, plus audit trails for compliance

## ✨ Features

### Core Functionality
- 🔐 **Secure Authentication**: Supabase-powered email/password and Google OAuth authentication
- 📱 **QR Code Health ID**: Generate and scan QR codes for instant patient identification
- 🏥 **Patient Dashboard**: Self-service portal for managing personal information, emergency contacts, and viewing health summaries
- 👨‍⚕️ **Medic Dashboard**: Analytics dashboard with QR scanner for emergency triage
- 📋 **Medical Records**: Longitudinal record keeping with visit logs and medication tracking
- 📊 **Analytics**: Usage metrics, practice analytics, and operational insights
- 💾 **Offline Support**: Local caching for offline triage in bandwidth-poor environments
- 📄 **PDF Export**: Generate printable health ID cards with QR codes
- 🔒 **Role-Based Access Control**: Secure RBAC for patients, medics, and administrators
- 📝 **Audit Logging**: Comprehensive audit trails for compliance and traceability

### Security Features
- Rate limiting on all endpoints
- Input sanitization and validation
- CORS protection with configurable whitelist
- JWT token verification
- Secure file upload handling
- Audit logging for all critical operations

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express 5
- **Database**: MongoDB with Mongoose
- **Authentication**: Supabase (JWT verification)
- **File Upload**: Multer
- **QR Generation**: qrcode
- **PDF Generation**: pdfkit
- **Image Processing**: sharp

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **State Management**: Redux Toolkit
- **Routing**: React Router 7
- **Styling**: CSS Modules
- **QR Scanning**: jsqr
- **PDF Export**: html2canvas + jsPDF
- **UI Icons**: Material UI Icons

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **MongoDB** (local instance or MongoDB Atlas account)
- **Supabase Account** (for authentication)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/Emergency-Digital-Health-Id.git
cd Emergency-Digital-Health-Id
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database
MONGO_URI=your-mongodb-connection-string-here

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key-here
SUPABASE_JWT_SECRET=your-supabase-jwt-secret-here

# Frontend URL (comma-separated for multiple origins)
FRONTEND_URL=http://localhost:5173,http://localhost:3000
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Create a `.env` file in the `frontend` directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:5000

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

### 4. Configure Supabase

1. Create a new project at [Supabase](https://supabase.com)
2. Enable Email/Password authentication
3. Configure Google OAuth (optional) in Authentication > Providers
4. Add redirect URLs:
   - `http://localhost:5173/auth/callback`
   - `http://localhost:5173/login`
   - Add your production URLs when deploying

### 5. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

The backend server will start on `http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173`

## 📁 Project Structure

```
Emergency-Digital-Health-Id/
├── backend/
│   ├── src/
│   │   ├── config/          # Database configuration
│   │   ├── controllers/      # Request handlers
│   │   ├── middleware/       # Auth, validation, rate limiting
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # API route definitions
│   │   ├── scripts/         # Maintenance scripts
│   │   ├── services/        # Business logic services
│   │   └── utils/           # Helper functions
│   ├── uploads/             # Patient photo storage
│   ├── app.js               # Express app entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── config/          # API client configuration
│   │   ├── pages/           # Page components
│   │   ├── store/           # Redux store and slices
│   │   └── utils/           # Utility functions
│   ├── public/              # Static assets
│   ├── index.html
│   └── package.json
├── docs/                    # Documentation files
│   ├── BACKEND_REFERENCE.md
│   ├── FRONTEND_REFERENCE.md
│   └── EMERGENCY_HEALTH_ID_Documentation.md
├── PROJECT_OVERVIEW.md      # Architecture overview
└── README.md
```

## 🔌 API Overview

### Public Endpoints
- `GET /api/qr` - Generate QR code images
- `GET /api/analytics` - Public analytics data
- `GET /api/emergency-contacts` - Emergency contact lookup

### Protected Endpoints (Require Authentication)

#### Profiles
- `POST /api/profiles` - Create user profile
- `GET /api/profiles/:id` - Get profile
- `PUT /api/profiles/:id` - Update profile

#### Patients
- `POST /api/patients` - Register new patient
- `GET /api/patients/:identifier` - Get patient data
- `PUT /api/patients/:id` - Update patient information
- `POST /api/patients/:id/photo` - Upload patient photo

#### Medical Records
- `GET /api/records` - List medical records
- `POST /api/records` - Create medical record
- `PUT /api/records/:id` - Update medical record
- `DELETE /api/records/:id` - Delete medical record

#### Medication Log
- `POST /api/medication-log` - Log medication administration
- `GET /api/medication-log` - Get medication history

#### Analytics
- `GET /api/analytics/scans` - Scan analytics
- `GET /api/analytics/practice` - Practice metrics
- `GET /api/analytics/health` - System health metrics

For detailed API documentation, see [docs/BACKEND_REFERENCE.md](docs/BACKEND_REFERENCE.md)

## 🔄 Key Workflows

### Patient Onboarding
1. Patient registers via Supabase (email/password or Google OAuth)
2. Completes onboarding wizard at `/welcome`
3. Receives unique Health ID (format: `EMH-XXXXXX`)
4. QR code health ID card is generated and can be printed/exported

### Emergency Triage
1. Medic scans patient's QR code using web scanner
2. Critical health information is instantly displayed
3. Medic can access full patient record if authenticated
4. Patient data can be cached offline for future use

### Medical Record Management
1. Medics log visits and medication administrations
2. Records are automatically linked to patient profiles
3. Longitudinal history is maintained for continuity of care
4. Analytics track usage patterns and outcomes

## 🧪 Development

### Running in Development Mode

Backend uses `nodemon` for hot reloading:
```bash
cd backend
npm run dev
```

Frontend uses Vite's HMR:
```bash
cd frontend
npm run dev
```

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
```

The production build will be in `frontend/dist/`

**Backend:**
```bash
cd backend
npm start
```

### Maintenance Scripts

```bash
# Backfill missing health IDs
node backend/src/scripts/addHealthIds.js

# Fix QR code ID index
node backend/src/scripts/fixQrCodeIdIndex.js
```

## 📚 Documentation

- **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)** - High-level architecture overview
- **[docs/EMERGENCY_HEALTH_ID_Documentation.md](docs/EMERGENCY_HEALTH_ID_Documentation.md)** - Comprehensive product and technical documentation
- **[docs/BACKEND_REFERENCE.md](docs/BACKEND_REFERENCE.md)** - Detailed backend API reference
- **[docs/FRONTEND_REFERENCE.md](docs/FRONTEND_REFERENCE.md)** - Frontend component and page reference

## 🔒 Security Considerations

- All API endpoints require authentication except public QR and analytics endpoints
- Rate limiting is enforced globally and per-route
- Input sanitization prevents injection attacks
- File uploads are restricted to images with size limits
- CORS is configured with whitelist-based origin checking
- Audit logging tracks all critical operations
- RBAC ensures users can only access appropriate resources

**Note**: Before production deployment, ensure:
- RBAC is fully enforced on all analytics and medic routes
- Environment variables are properly secured
- HTTPS is enforced
- Database credentials are rotated regularly
- Audit logs are monitored and retained per compliance requirements

## 🚧 Known Limitations & Roadmap

### Current Gaps
- RBAC not fully enforced on analytics endpoints
- Limited automated test coverage
- Document model uses CommonJS (inconsistent with ES modules)
- Notifications model not fully implemented

### Planned Improvements
- Comprehensive test suite (Jest + React Testing Library)
- FHIR-based interoperability
- Biometric authentication integration
- Enhanced offline synchronization
- Internationalization/localization
- Admin console for audit log viewing
- Webhook support for integrations

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code follows the existing style and includes appropriate tests.

## 📝 License

[Add your license here]

## 👥 Authors

[Add author information here]

## 🙏 Acknowledgments

- Built with [Supabase](https://supabase.com) for authentication
- Uses [MongoDB](https://www.mongodb.com) for data persistence
- QR code generation powered by [qrcode](https://www.npmjs.com/package/qrcode)
- React framework and ecosystem

## 📞 Support

For issues, questions, or contributions, please:
- Open an issue on GitHub
- Check the documentation in the `docs/` folder
- Review [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) for architecture details

---

**Last Updated**: 2025

