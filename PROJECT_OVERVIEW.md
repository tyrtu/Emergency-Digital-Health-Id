# Emergency Health ID — Architecture Overview

## Backend (`backend/`)
- **Runtime & Framework**: Node.js with Express 5 (`app.js`), structured as an API server with environment-driven configuration via `dotenv`.
- **Database Layer**: MongoDB accessed through Mongoose (`src/config/db.js`) with models for `Patient`, `Medic`, `Profile`, `MedicalRecord`, `Document`, `EmergencyContact`, `Notifications`, and `Analytic`. Models back CRUD, QR metadata, and analytic tracking.
- **Auth & Identity**: Supabase JWT verification (`middleware/auth.js`) augments requests with user metadata. `identifyUser` resolves `authId` to profile and role, enabling role-based access checks in downstream routes.
- **Security Middleware**:
  - CORS whitelisting with ngrok allowances.
  - Global JSON sanitization (`validation.js`), structured validation helpers (e.g., `validateHealthVitals`), and Multer-based uploads for patient photos.
  - Multiple rate limiters (`rateLimiter.js`) applied globally and per-route.
  - Audit logging (`auditLogger.js`) records CRUD actions for traceability.
- **Routing**:
  - `qrRoutes` serves QR image/data blobs for patient identification.
  - `profileRoutes` manages Supabase-linked profile creation and role updates.
  - `patientRoutes` covers patient registration, vital updates, emergency info, and document uploads, enforcing RBAC and audit logs.
  - `medicRoutes`, `medicalRecordRoutes`, `medicationLogRoutes`, and `emergencyContactRoutes` expose supporting datasets.
  - `analyticRoutes` surfaces usage metrics.
- **Utilities & Scripts**: Health ID generator (`utils/healthIdGenerator.js`) ensures unique `EMH-` identifiers; maintenance scripts under `src/scripts/` backfill IDs and clean QR indices.

## Frontend (`frontend/`)
- **Runtime & Build**: React 19 with Vite (`main.jsx`, `vite.config.js`), styled via CSS modules and global styles.
- **Routing**: `App.jsx` uses React Router 7 for public (`/login`, `/register`) and protected dashboards (`/patient/dashboard`, `/medic-dashboard`, `/scanner`) wrapped with an `ErrorBoundary` and `PrivateRoute`.
- **State Management**: Redux Toolkit store (`store/index.js`) combines `authSlice` (Supabase session lifecycle, Mongo profile sync) and `mobileSlice` (responsive flags). Thunks coordinate API calls via `config/api.js`.
- **Key Pages & Components**:
  - `PatientDashboard` orchestrates patient data fetches (vitals, records, contacts, QR assets) and renders modular widgets (`HealthSummary`, `EditableHealthVitals`, `Medications`, `RecentVisits`, `EmergencyContacts`, `HealthIDCard`).
  - `MedicDashboard` aggregates analytics views (`AnalyticsChart`, `AnalyticsView`) for providers.
  - `QRScanner` & `QRScannerModal` leverage `jsqr` to decode patient QR codes for emergency access.
  - Shared UI pieces (e.g., editable forms, summary cards) rely on CSS modules (`*.module.css`) for scoped styling.
- **API Access**: `config/api.js` centralizes base URL, attaches Supabase tokens and `x-auth-id` header, and handles blob responses for QR images.

## Cross-Cutting Integrations
- **Supabase**: Primary auth provider for email/password and Google OAuth flows; tokens stored client-side and validated on the server. `supabaseClient.js` configures the shared client with environment variables (`config/env.js`).
- **MongoDB**: Persistent store for profiles, patient records, contacts, and analytics. Server scripts and routes assume consistent `authId` linkage to Supabase users.
- **QR Workflow**: Backend `qrController` renders QR codes tied to `authId`/`healthId`; front end displays and refreshes codes, and scanner components decode them in emergencies.
- **Security & Compliance**: Rate limiting, audit logging, request sanitization, and RBAC guard API usage. File uploads are stored on disk under `/uploads/patients` and exposed through Express static middleware.
- **Analytics & Notifications**: `Analytic` model and charting components support usage tracking; `Notifications` model provides extensibility for alerts (no UI surfaced yet).
- **Offline/Resilience**: `utils/offlineCache.js` supplies localStorage-backed caching for key patient payloads to mitigate connectivity gaps.

This overview highlights the macro structure; individual controllers, pages, and utilities follow consistent patterns (RBAC-aware routes, Redux thunks, CSS modules) that make extending the system predictable.

