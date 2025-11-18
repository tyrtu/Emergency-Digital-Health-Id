# Emergency Health ID Backend Reference

This document captures the current backend architecture, domain models, middleware pipeline, and API surface so new contributors can understand and extend the system with confidence.

---

## Quick Start Checklist

1. **Prerequisites**
   - Node.js 18+ and npm.
   - MongoDB instance reachable via `MONGO_URI`.
   - Supabase project configured for auth (public URL + anon key).
2. **Install dependencies**
   - `cd backend && npm install`
3. **Environment file (`backend/.env`)**
   ```text
   PORT=5000
   MONGO_URI=mongodb+srv://user:pass@cluster/db
   SUPABASE_URL=https://<project>.supabase.co
   SUPABASE_ANON_KEY=<public-anon-key>
   FRONTEND_URL=http://localhost:5173,http://localhost:3000
   NODE_ENV=development
   ```
4. **Run locally**
   - `npm run dev` (uses nodemon) or `npm start`.
5. **Static assets**
   - Patient photos are served from `backend/uploads/patients` via `/uploads/*` URL.

---

## Application Flow

1. `app.js` boots Express, loads `.env`, and connects to MongoDB using `connectDB()`.[^app-start]
2. CORS whitelist is derived from `FRONTEND_URL`, with ngrok domains auto-allowed.[^app-cors]
3. Global middleware stack:
   - `cors` with custom origin logic.
   - `express.json` / `express.urlencoded` limited to 10 MB.
   - `sanitizeBody` recursively strips angle brackets to limit HTML/script injection.[^sanitize]
   - Static file server for `/uploads`.
   - Global `apiLimiter` (15 min window, 100 req).[^^rate-general]
4. Public routes mounted before auth:
   - `/api/qr` (with dedicated limiter).
   - `/api/analytics` (analytics limiter).
   - `/api/emergency-contacts` (no limiter).
5. Protected pipeline:
   - `verifyToken` (Supabase JWT verification).
   - `identifyUser` (maps Supabase auth ID to `Profile`, `Patient`, or `Medic` documents and sets `req.userType`).
   - Route handlers (`/api/profiles`, `/api/patients`, `/api/medics`, `/api/records`, `/api/medication-log`), optionally applying `requireRole`.
6. Final middleware:
   - `notFoundHandler` for unmatched routes.
   - Central `errorHandler` that standardises responses, collapsing details outside development mode.[^errors]

---

## Directory Layout

```
backend/
├── app.js                  # Express entrypoint
├── package.json            # Scripts & dependencies
└── src/
    ├── config/
    │   └── db.js           # Mongoose connection helper
    ├── controllers/        # (currently empty placeholders)
    ├── middleware/         # Auth, RBAC, validation, uploads, rate limiting
    ├── models/             # Mongoose schemas (Patient, Medic, Analytics…)
    ├── routes/             # Express routers grouped by resource
    ├── scripts/            # DB maintenance & migration helpers
    └── utils/
        └── healthIdGenerator.js
```

---

## Core Middleware & Infrastructure

| Middleware | Responsibility | Notes |
|------------|----------------|-------|
| `auth.js` | Creates a Supabase client via `SUPABASE_URL`/`SUPABASE_ANON_KEY`, validates `Authorization: Bearer <token>`, and attaches Supabase user info to `req.user` without blocking failures.[^auth] | Logs missing env and exits to avoid misconfigured deployments. |
| `identifyUser.js` | Resolves `x-auth-id`/`authId` to a `Profile`, then hydrates `req.userType` (`patient`, `medic`, or `unknown`) and corresponding Mongo record for RBAC decisions.[^identify] | Falls back gracefully and logs only in development. |
| `requireRole.js` | Declarative RBAC guard; rejects when `req.userType` is missing or excluded.[^role] | Use per-route to enforce least privilege. |
| `rateLimiter.js` | Defines global, auth-specific, QR-specific, and analytics-specific rate limiters using `express-rate-limit`.[^rate] | Global limit sits at 100 requests / 15 min per IP. |
| `validation.js` | Provides recursive body sanitiser plus validation chains for patient basics, vitals, and common ID formats via `express-validator`.[^validation] | Ensure new routes re-use `sanitizeBody` before validations. |
| `upload.js` | Configures Multer to persist patient photos under `uploads/patients`, enforcing 5 MB size and image-only MIME.[^upload] | Files are named after the patient `authId`. |
| `auditLogger.js` | Lightweight helper to persist audit events in `AuditLog`, capturing action, user type, and IP.[^audit] | Certain models (e.g., `AuditLog`) are not yet fully wired into every route. |

---

## Authentication, Identity, and RBAC

- **Supabase Auth**: All protected routes expect a Supabase JWT in the `Authorization` header. Failure to verify does not immediately reject—the system allows anonymous access until `identifyUser` determines the effective role.[^auth-flow]
- **Identity Resolution**: The backend trusts the `x-auth-id` header (set by the frontend `apiClient`) to look up `Profile`, `Patient`, or `Medic` documents. It populates `req.profile` and `req.userRecord` for downstream logic.[^identify]
- **Role Enforcement**: `requireRole` wraps endpoints (e.g., patient CRUD, vitals updates) to ensure only authorised roles progress. Some older routes (e.g., `medicRoutes`, emergency contacts) currently lack RBAC and should be hardened before production.

---

## Domain Models (Mongoose)

| Model | Highlights |
|-------|------------|
| `Patient` | Rich schema capturing auth linkage (`authId`, `healthId`, email), personal info, emergency info, medical history, vitals, QR metadata, consent flags, and audit fields. Includes numerous indexes and virtuals to expose computed age.[^patient-model] |
| `Profile` | Supabase profile mirror storing `authId`, email, optional name, and role (`patient`/`medic`/`admin`).[^profile-model] |
| `Medic` | Provider directory with `authId`, name, contact info, and licensing metadata.[^medic-model] |
| `MedicalRecord` | Encounter entries referencing `Patient` and `Medic`, capturing diagnosis, visit details, prescriptions, notes, and optional follow-up date.[^record-model] |
| `EmergencyContact` | Per-patient emergency contacts, ensuring essential notification data.[^contact-model] |
| `Document` | (CommonJS) Stores uploaded document metadata per patient; note the mismatch with ESM elsewhere.[^document-model] |
| `Analytic` family | Extensive schemas for scans, practice metrics, monthly rollups, alerts, system health, patient activity, medic performance, real-time snapshots, and predictive analytics.[^analytic-model] |
| `AuditLog` & `Notification` | Skeleton models for event tracking and user notifications; integration points exist but require further wiring.[^audit-model][^notification-model] |

---

## API Surface

Each router lives under `src/routes` and is mounted in `app.js`.

### `/api/qr` — QR Code Services
- `GET /api/qr/:authId`: Streams a PNG QR code encoding minimal emergency data (name, blood group, allergies, medications, primary contact). Data is base64-encoded and size-limited for scanner compatibility.[^qr-stream]
- `GET /api/qr/data/:authId`: Returns a detailed JSON payload for dashboard display, including basic info, emergency info, medical info, QR metadata, and system timestamps.[^qr-data]

### `/api/profiles`
- `POST /api/profiles`: Creates a default `patient` profile if one does not already exist for the Supabase `authId`/email; idempotent.[^profile-post]
- `GET /api/profiles/:authId`: Fetches a profile when `x-auth-id` or JWT matches the requested `authId`; bypasses strict token matching to support onboarding flows.[^profile-get]
- `GET /api/profiles`: Lists all profiles (no pagination yet).
- `PATCH /api/profiles/:authId`: Partial updates with the same relaxed access check.

### `/api/patients`
- `GET /api/patients`: Restricted to `medic`/`admin`; returns all patients.[^patients-get]
- `POST /api/patients`: Allows `patient`, `medic`, or `admin` roles to register a patient; auto-generates unique `EMH-XXXXXX` health IDs and cleans QR metadata to avoid index collisions.[^patients-post]
- `GET /api/patients/:identifier`: Accepts Supabase `authId` or `EMH-` health ID; enforces self-access for patients and backfills missing health IDs.[^patients-ident]
- `POST /api/patients/:authId/photo`: Handles photo uploads, enforcing self-service and cleaning up stale files.[^patients-photo]
- `PUT /api/patients/:authId/basic-info`: Partial basic-info updates with patient self-edit restrictions.[^patients-basic]
- `PUT /api/patients/:authId`: Broad update endpoint; patient role automatically strips sensitive medical fields to prevent self-modification.[^patients-put]
- `PUT /api/patients/:authId/vitals`: Validates vitals, recalculates BMI, and guards against unrealistic values; throttled by `authLimiter`.[^patients-vitals]

### `/api/medics`
- CRUD endpoints (`GET`, `POST`, `PUT`, `DELETE`) manage `Medic` records but currently lack `requireRole`. Tighten before exposing publicly.[^medic-routes]

### `/api/emergency-contacts`
- `POST`: Adds contacts, prevents duplicate phone numbers, and verifies patient existence.[^ec-post]
- `GET /:patientId`: Lists contacts for a patient (ObjectId expected); returns 404 if none found.[^ec-get]
- `PUT /:id`: Updates a contact while preventing duplicate phone numbers per patient.[^ec-put]
- `DELETE /:id`: Deletes a contact.[^ec-delete]

### `/api/records`
- `GET /`: Lists all medical records (descending by `createdAt`).[^records-get]
- `POST /`: Creates a record by patient `authId` and medic ObjectId (from header `x-medic-id` or body). Links record to patient documents.[^records-post]
- `GET /patient/:authId`: Fetches patient-specific records ordered by visit date.[^records-patient]
- `GET /:id`, `PUT /:id`, `DELETE /:id`: Standard CRUD with validation ensuring only the original medic updates or deletes a record.[^records-crud]

### `/api/medication-log`
- Applies `identifyUser` internally.
- `POST /`: Logs a medication administration event, creates a corresponding medical record, and audits the action; restricted to medics/admins.[^medlog-post]
- `GET /patient/:patientId`: Fetches medication administration history; patients can only view their own history.[^medlog-patient]
- `GET /`: Lists recent medication administrations for medics/admins.[^medlog-list]

### `/api/analytics`

The largest router, providing dashboards for medics/admins:

- **Scan analytics**: `/scans`, `/scans/:id`, `/scans-stats/:medicId` with filtering, pagination, severity scoring, and practice analytics updates.[^analytics-scans]
- **Practice analytics**: `/practice/:medicId`, `/practice`, `/practice-comparison/:medicId` deriving trend summaries and comparisons.[^analytics-practice]
- **Monthly analytics**: `/monthly/:medicId`, `/monthly/generate` to build monthly aggregates from scan data.[^analytics-monthly]
- **Alert analytics**: CRUD and statistics endpoints to monitor triage alerts and response times.[^analytics-alerts]
- **System analytics**: `/system` for overall platform health metrics.[^analytics-system]
- **Patient activity**: `/patient-activity` logs and retrieves user actions with pagination.[^analytics-activity]
- **Medic performance**: `/medic-performance/:medicId` & `/medic-performance` track periodic evaluations.[^analytics-performance]
- **Real-time analytics**: `/real-time` fetches latest snapshot or synthesises one on demand; `/real-time` (POST) persists live metrics.[^analytics-realtime]
- **Predictive analytics**: `/predictive/:medicId` returns forecasted workload and risk metrics.[^analytics-predictive]

> **Note:** RBAC is not yet enforced inside analytic routes. If exposed publicly, wrap them with `requireRole(["medic","admin"])`.

---

## Utilities and Supporting Scripts

- `healthIdGenerator.js`: Generates unique `EMH-` IDs with retry, timestamp, and collision fallbacks.[^healthid]
- `scripts/addHealthIds.js`: Backfills missing `healthId` values across existing patients; safe to re-run.[^script-health]
- `scripts/fixQrCodeIdIndex.js`: Drops and recreates `qrMetadata.qrCodeId` index as sparse unique to allow duplicates of `null`.[^script-qr]

---

## File Handling

- Patient profile photos are uploaded via Multer to `uploads/patients/<authId>.ext`.
- Static files are served through `app.use('/uploads', express.static('uploads'))`, making them accessible under `http://<host>/uploads/patients/...`.
- Upload route deletes stale images if a new photo is saved.[^patients-photo]

---

## Logging & Error Handling

- `logAction` writes to `AuditLog`, but the schema still references a `User` model that does not exist—consider aligning fields to Supabase identities.
- Error responses are normalised by `errorHandler`, ensuring consistent `{ success: false, message }` payloads and redacting stack traces in production.[^errors]
- Several routes log verbose success/failure details only when `NODE_ENV === 'development'` to avoid noisy production logs.[^patients-logging]

---

## Integration Touchpoints

- **Frontend API client**: Attaches Supabase token in `Authorization` header and `x-auth-id` (Supabase user id). Backend trusts these headers for `identifyUser`.
- **Supabase**: Sole source of authentication. Backend never issues its own JWTs.
- **QR Workflow**: `qrRoutes` composes a minimal emergency payload, base64-encodes it, and renders it to PNG using `qrcode`. Frontend displays the image and calls `/api/qr/data/:authId` for expanded metadata.
- **Analytics**: Designed for medic dashboards (React components `AnalyticsView`, `AnalyticsChart`). Many endpoints expect optional filters and return aggregated counts suited to charting.

---

## Known Gaps & Follow-up Tasks

- `src/controllers/qrController.js` is empty; routing logic currently lives directly in `qrRoutes`.
- `medicRoutes` is named `doctorRoutes` internally and does not enforce authentication—apply `verifyToken`/`identifyUser` and `requireRole(["admin"])` before production exposure.[^medic-routes]
- `Document` model uses CommonJS while project defaults to ES modules; convert for consistency.[^document-model]
- Analytics routes lack RBAC and can potentially expose sensitive data if mounted publicly.
- `AuditLog` references a `User` model that is not present; either create one or align to `Profile`/Supabase IDs.[^audit-model]

---

## Extending the Backend

1. **Add a new resource**
   - Model definition in `src/models`.
   - Router under `src/routes`, importing necessary middleware.
   - Mount route in `app.js` after deciding whether it is public or protected.
2. **Enforce RBAC**
   - Ensure `verifyToken`/`identifyUser` run before the route.
   - Apply `requireRole([...])` for each endpoint.
3. **Validation**
   - Re-use `sanitizeBody` (already global) and add `express-validator` chains via `validation.js`.
4. **Auditing**
   - Call `logAction(req, ACTION_NAME, resourceId)` after sensitive operations for traceability.
5. **Rate limiting**
   - Use existing limiters or define a new one in `rateLimiter.js` for attack-prone endpoints.
6. **Testing**
   - There are no automated tests today. Introduce integration tests (e.g., Jest + Supertest) focused on critical patient and medic flows.

---

## Glossary

- **authId**: Supabase user UUID, primary cross-system identifier.
- **healthId**: Human-friendly `EMH-XXXXXX` identifier used on QR codes & cards.
- **Profile**: Role-bearing metadata tied to Supabase users.
- **Patient Record**: `Patient` document storing full medical history and emergency information.
- **MedicalRecord**: Individual encounter/visit log authored by a medic.

---

[^app-start]: ```1:100:backend/app.js
// ... Express app setup, middleware, and route mounting ...
```
[^app-cors]: ```28:52:backend/app.js
// ... CORS origin handling with allowedOrigins and ngrok allowance ...
```
[^sanitize]: ```24:38:backend/src/middleware/validation.js
export const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const sanitize = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = sanitizeString(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitize(obj[key]);
        }
      }
    };
    sanitize(req.body);
  }
  next();
};
```
[^rate-general]: ```60:78:backend/app.js
app.use(apiLimiter);
// Public routes...
```
[^errors]: ```4:43:backend/src/middleware/errorHandler.js
export const errorHandler = (err, req, res, next) => {
  // ...
  res.status(status).json(errorResponse);
};
```
[^auth]: ```2:55:backend/src/middleware/auth.js
// Supabase client creation and token verification
```
[^identify]: ```6:52:backend/src/middleware/identifyUser.js
// identifyUser resolves supabaseId to profile, medic, or patient
```
[^role]: ```5:15:backend/src/middleware/requireRole.js
export const requireRole = (allowed) => {
  const allowedArr = Array.isArray(allowed) ? allowed : [allowed];
  return (req, res, next) => {
    if (!req.userType || req.userType === "unknown") {
      return res.status(401).json({ success: false, message: "Unauthorized: user not identified" });
    }
    if (!allowedArr.includes(req.userType)) {
      return res.status(403).json({ success: false, message: "Forbidden: insufficient permissions" });
    }
    next();
  };
};
```
[^rate]: ```4:50:backend/src/middleware/rateLimiter.js
// apiLimiter, authLimiter, qrLimiter, analyticsLimiter definitions
```
[^validation]: ```41:85:backend/src/middleware/validation.js
// Validation chains for patient basics and vitals
```
[^upload]: ```1:54:backend/src/middleware/upload.js
// Multer storage configuration for patient photo uploads
```
[^audit]: ```4:17:backend/src/middleware/auditLogger.js
export const logAction = async (req, action, patientId = null) => {
  try {
    await AuditLog.create({
      action,
      userType: req.userType,
      userAuthId: req.profile?.authId || null,
      patient: patientId,
      ip: req.ip,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("Audit log failed:", err.message);
  }
};
```
[^auth-flow]: ```14:55:backend/src/middleware/auth.js
// verifyToken attaches Supabase user or leaves req.user null
```
[^patient-model]: ```3:258:backend/src/models/Patient.js
// Comprehensive patient schema definition
```
[^profile-model]: ```4:18:backend/src/models/Profile.js
// Profile schema enforces unique authId/email and role enum
```
[^medic-model]: ```4:19:backend/src/models/Medic.js
// Medic schema with licensing metadata
```
[^record-model]: ```1:64:backend/src/models/MedicalRecord.js
// Medical record schema linking patient and medic
```
[^contact-model]: ```3:18:backend/src/models/EmergencyContact.js
// Emergency contact fields
```
[^document-model]: ```1:14:backend/src/models/Document.js
const mongoose = require("mongoose");
// CommonJS model for patient documents
```
[^analytic-model]: ```1:400:backend/src/models/Analytic.js
// Extensive analytics schemas (truncated in this excerpt)
```
[^audit-model]: ```1:13:backend/src/models/AuditLog.js
// Audit log schema referencing non-existent User model
```
[^notification-model]: ```1:14:backend/src/models/Notifications.js
// Notification schema stub
```
[^qr-stream]: ```37:113:backend/src/routes/qrRoutes.js
// GET /api/qr/:authId generates PNG QR code with base64 payload
```
[^qr-data]: ```116:193:backend/src/routes/qrRoutes.js
// GET /api/qr/data/:authId returns expanded QR display data
```
[^profile-post]: ```7:73:backend/src/routes/profileRoutes.js
// POST /api/profiles creates profile with default role
```
[^profile-get]: ```75:132:backend/src/routes/profileRoutes.js
// GET /api/profiles/:authId with relaxed access checks
```
[^patients-get]: ```26:39:backend/src/routes/patientRoutes.js
// GET /api/patients restricted to medic/admin
```
[^patients-post]: ```41:82:backend/src/routes/patientRoutes.js
// POST /api/patients with healthId generation and qrMetadata cleanup
```
[^patients-ident]: ```85:125:backend/src/routes/patientRoutes.js
// GET /api/patients/:identifier with role checks and healthId backfill
```
[^patients-photo]: ```127:190:backend/src/routes/patientRoutes.js
// POST /api/patients/:authId/photo handles upload, auth, cleanup
```
[^patients-basic]: ```193:249:backend/src/routes/patientRoutes.js
// PUT basic info with field-level controls
```
[^patients-put]: ```252:291:backend/src/routes/patientRoutes.js
// PUT patient record with patient role restrictions
```
[^patients-vitals]: ```293:395:backend/src/routes/patientRoutes.js
// PUT vitals with validation and BMI calculation
```
[^medic-routes]: ```1:132:backend/src/routes/medicRoutes.js
// Medic CRUD routes (RBAC missing)
```
[^ec-post]: ```9:69:backend/src/routes/emergencyContactRoutes.js
// POST contact with duplicate phone prevention
```
[^ec-get]: ```72:109:backend/src/routes/emergencyContactRoutes.js
// GET contacts by patientId
```
[^ec-put]: ```112:156:backend/src/routes/emergencyContactRoutes.js
// PUT contact with duplicate phone check
```
[^ec-delete]: ```166:204:backend/src/routes/emergencyContactRoutes.js
// DELETE contact
```
[^records-get]: ```15:33:backend/src/routes/medicalRecordRoutes.js
// GET all records
```
[^records-post]: ```36:83:backend/src/routes/medicalRecordRoutes.js
// POST record with patient authId and medicId validation
```
[^records-patient]: ```86:105:backend/src/routes/medicalRecordRoutes.js
// GET records per patient authId
```
[^records-crud]: ```108:178:backend/src/routes/medicalRecordRoutes.js
// GET/PUT/DELETE record by ID with medic ownership check
```
[^medlog-post]: ```15:82:backend/src/routes/medicationLogRoutes.js
// POST medication administration, create medical record
```
[^medlog-patient]: ```86:135:backend/src/routes/medicationLogRoutes.js
// GET medication history with self-access control
```
[^medlog-list]: ```138:165:backend/src/routes/medicationLogRoutes.js
// GET all medication logs for medics/admins
```
[^analytics-scans]: ```34:226:backend/src/routes/analyticRoutes.js
// Scan analytics endpoints (excerpt)
```
[^analytics-practice]: ```228:327:backend/src/routes/analyticRoutes.js
// Practice analytics endpoints (excerpt)
```
[^analytics-monthly]: ```329:378:backend/src/routes/analyticRoutes.js
// Monthly analytics endpoints (excerpt)
```
[^analytics-alerts]: ```382:562:backend/src/routes/analyticRoutes.js
// Alert analytics endpoints (excerpt)
```
[^analytics-system]: ```565:620:backend/src/routes/analyticRoutes.js
// System analytics endpoints (excerpt)
```
[^analytics-activity]: ```622:686:backend/src/routes/analyticRoutes.js
// Patient activity endpoints (excerpt)
```
[^analytics-performance]: ```688:746:backend/src/routes/analyticRoutes.js
// Medic performance endpoints (excerpt)
```
[^analytics-realtime]: ```748:780:backend/src/routes/analyticRoutes.js
// Real-time analytics endpoints (excerpt)
```
[^analytics-predictive]: ```782:799:backend/src/routes/analyticRoutes.js
// Predictive analytics endpoints (excerpt)
```
[^healthid]: ```7:53:backend/src/utils/healthIdGenerator.js
// healthId generation logic
```
[^script-health]: ```1:64:backend/src/scripts/addHealthIds.js
// Backfill health IDs script
```
[^script-qr]: ```1:70:backend/src/scripts/fixQrCodeIdIndex.js
// Sparse index fix script for qrCodeId
```
[^patients-logging]: ```31:176:backend/src/routes/patientRoutes.js
// Multiple NODE_ENV === 'development' log branches
```

