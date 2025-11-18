# Emergency Health ID Frontend Reference

Comprehensive guide to the React/Vite client so new contributors can become productive quickly.

---

## Quick Start

1. `cd frontend && npm install`
2. Copy `.env.example` → `.env` and define:
   ```text
   VITE_API_BASE_URL=http://localhost:5000
   VITE_SUPABASE_URL=<supabase-url>
   VITE_SUPABASE_ANON_KEY=<anon-key>
   ```
3. `npm run dev` launches Vite on `5173`; backend must expose matching CORS origin.

---

## Project Layout & Bootstrap

- `src/main.jsx` wires React 19, Redux Provider, global CSS, and initializes the offline cache before rendering the app.[^main]
- Global routes live in `App.jsx`, wrapped in an `ErrorBoundary`, React Router, and a `PrivateRoute` helper that blocks unauthenticated access.[^app-routes]
- Styling mixes Vite defaults (`App.css`, `index.css`) with CSS modules per component (e.g., `*.module.css`).[^styles]

```
src/
├── App.jsx              # Router + guards
├── App.css / index.css  # Global styles
├── components/          # Reusable UI
├── pages/               # Route-level screens
├── store/               # Redux slices
├── config/              # API/env helpers
├── utils/               # Offline cache, emergency helpers
└── assets/              # Static media
```

---

## State Management & Auth

- Store configured with `auth` and `mobile` slices only.[^store]
- `authSlice` orchestrates Supabase auth + Mongo profile syncing:
  - Registration signs up via Supabase, creates Mongo profile, and enforces email confirmation.[^auth-register]
  - Login pulls fresh Mongo role on each success.[^auth-login]
  - `loadUserFromSession`, `refreshUserData`, and the exported `setupAuthListener` keep Redux state aligned with Supabase session changes and prompt role refreshes.[^auth-session][^auth-listener]
  - Logout clears Supabase session plus local/session storage to avoid stale tokens.[^auth-logout]
- `mobileSlice` tracks `isMobile` for responsive rendering.

---

## API Client & Environment

- `config/env.js` centralizes Vite environment reads and validates Supabase keys in production.
- `config/api.js` wraps `fetch`, automatically attaching `Authorization` and `x-auth-id` headers, handling AbortController, and returning blobs for QR images.[^api-client]
- `utils/supabaseClient.js` builds a Supabase JS client from env vars, logging when credentials are missing.[^supabase-client]

**Pattern:** All data calls go through `apiClient`, which expects the caller to supply the Supabase authId so backend `identifyUser` middleware can resolve profiles.

---

## Routing, Guards & Navigation

- Public routes: `/login`, `/register`, `/auth/callback`.
- Protected routes are wrapped by `PrivateRoute` (auth check) and, for patient dashboards, `PatientRouteGuard` which redirects users without a patient document to `/welcome`.[^patient-guard]
- `/welcome` renders the onboarding wizard (`WelcomeSetup`) that collects safe “basicInfo” fields and posts them to `/api/patients`, leaving medical details empty for clinicians.[^welcome-setup]
- Unknown paths redirect to `/login`.

---

## Major Screens

### Login & Registration
- `Login.jsx` handles email/password + Google OAuth, redirecting patients to `/dashboard` and medics to `/medic-dashboard` once authenticated.[^login-redirect]
- `Register.jsx` mirrors the flow, surfacing success/error messaging and triggering email confirmation.
- `OAuthCallback.jsx` finalizes Supabase OAuth sessions and redirects by role.

### Patient Onboarding & Dashboard
- `WelcomeSetup.jsx` guides patients through basic info collection, validating input and posting a minimal payload (basicInfo + email) to create their Mongo record.[^welcome-setup]
- `PatientDashboard.jsx` is the central hub:
  - Restores responsive state, remembers active tab in localStorage, and uses an `AbortController` per request.[^patient-dashboard-setup]
  - Fetches patient info, emergency contacts (merging model + embedded contacts), QR assets (image + metadata), medical records, and medications via `apiClient`.[^patient-dashboard-fetch]
  - Provides handlers to refresh QR data, upload profile photos, and toggle between views.
  - Renders modular widgets: `HealthSummary`, `EditableHealthVitals`, `EditableBasicInfo`, `EditableEmergencyContacts`, `Medications`, `RecentVisits`, and `HealthIDCard`.

### Medic Dashboard
- `MedicDashboard.jsx` supports triage workflows:
  - Manages scanner modal state, cached patients, analytics tabs, and multi-casualty mode.
  - Loads medic profile data (with fallbacks), analytics summaries, and recent scans from `/api/analytics` endpoints.
  - Integrates offline cache (`savePatientToCache`, `getAllCachedPatients`) for repeated emergencies.[^medic-dashboard]
  - Provides QR scanning (modal), cached patient search, manual data edits, and logout via `logoutUser`.

---

## Key Components

| Component | Responsibility | Notes |
|-----------|----------------|-------|
| `HealthIDCard` | Displays patient ID card and exports a high-res PDF/print using `html2canvas` + `jsPDF`.[^health-id-card] | Handles image loading, fallback icons, and respects preview-only DOM via `data-no-pdf`. |
| `QRScanner` | Full-screen scanner that supports multi-camera selection, flashlight toggling, overlays, scan history, success tones, and clipboard export.[^qr-scanner] | Uses `jsqr`; runs scanning loop at 150 ms intervals with cleanup and permission error handling. |
| `QRScannerModal` | In-dashboard scanner modal for medics. Decrypts QR payloads (base64 format), computes priority via `calculatePriority`, plays alerts, caches results offline, and supports image uploads for QR decoding.[^qr-modal] | Works with `EmergencyPatientView` to surface triage-critical details. |
| `EmergencyPatientView` | Formats emergency data, calculates alerts/protocols using utilities, and offers print/export (PDF/DOC/CSV) helpers. |
| `AnalyticsView` | Fetches multiple analytics endpoints in parallel, providing dashboard stats, recent logs, blood type distribution, condition/allergy charts, and summary toggles.[^analytics-view] |
| `Editable*` modules | Allow patients to update basic info, vitals, and emergency contacts with optimistic feedback, validation, and `apiClient` integration.[^editable-basic][^editable-vitals][^editable-contacts] |
| `EmergencyContacts`, `Medications`, `RecentVisits`, `HealthSummary` | Present data-rich cards with icons, counts, and empty states.[^emergency-contacts][^medications][^recent-visits][^health-summary] |
| `ErrorBoundary` | Captures render errors, offering reset UI and dev-only stack traces.[^error-boundary] |

---

## Utilities & Offline Support

- `utils/offlineCache.js` manages a versioned localStorage cache (max 50 patients), exposing helpers to save, retrieve, export, import, and clear cached emergency data.[^offline-cache]
- `utils/emergencyUtils.js` houses medical heuristics: critical condition metadata, drug interactions, blood compatibility matrix, emergency protocols, alert audio cues, and helpers to format contact actions.[^emergency-utils]

These utilities underpin medic-facing experiences—QR scans trigger `calculatePriority`, while cached patients power offline triage workflows.

---

## Styling & UI Toolkit

- CSS Modules (`*.module.css`) encapsulate styles for each component; global resets live in `index.css`.[^styles]
- Material UI icons (`@mui/icons-material`) are heavily used across dashboards and widgets.
- UI micro-interactions (loading spinners, overlay animations) are implemented with plain CSS.

---

## External Dependencies

- `@supabase/supabase-js` for authentication.
- `jsqr`, `html2canvas`, `jspdf` for QR scanning and PDF export.
- `@reduxjs/toolkit`, `react-redux` for state management.
- `react-router-dom` v7 for routing.
- `@mui/icons-material` for iconography.

All dependencies are listed in `frontend/package.json`.

---

## Integration & Data Flow Patterns

- Each request includes `Authorization: Bearer <Supabase token>` and `x-auth-id` headers via `apiClient`, aligning with backend RBAC expectations.[^api-client]
- Thunks handle async flows with `AbortController` guards (e.g., dashboards, analytics) to avoid setState on unmounted components.
- Supabase session restoration runs once at app startup and is reinforced by the auth listener for real-time role changes.[^main][^app-routes][^auth-session][^auth-listener]
- QR code flows: backend generates minimal encrypted payloads; frontend decodes them, enriches with cached/backend data, and surfaces emergency-grade UIs.

---

## Follow-up Opportunities

- Add automated testing (none currently).
- Consolidate analytics error handling and RBAC (mirrors backend gaps).
- Consider extracting shared form validation utilities (WelcomeSetup vs. Editable components).
- Audit `apiClient` token storage—pitfalls around clearing `localStorage` during logout may wipe unrelated keys.

---

[^main]: ```1:18:frontend/src/main.jsx
import { StrictMode } from 'react'
...
initOfflineCache()
```
[^app-routes]: ```1:104:frontend/src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
...
          <Route path="*" element={<Navigate to="/login" replace />} />
```
[^styles]: ```1:11:frontend/src/index.css
/* General Reset */
* {
  box-sizing: border-box;
...
```
[^store]: ```1:9:frontend/src/store/index.js
import { configureStore } from '@reduxjs/toolkit';
...
```
[^auth-register]: ```129:199:frontend/src/store/authSlice.js
export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async ({ email, password, fullName }, { rejectWithValue }) => {
...
```
[^auth-login]: ```210:263:frontend/src/store/authSlice.js
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ email, password }, { rejectWithValue }) => {
...
```
[^auth-session]: ```393:424:frontend/src/store/authSlice.js
export const loadUserFromSession = createAsyncThunk(
  "auth/loadUserFromSession",
  async (_, { rejectWithValue }) => {
...
```
[^auth-logout]: ```365:388:frontend/src/store/authSlice.js
export const logoutUser = createAsyncThunk("auth/logoutUser", async (_, { rejectWithValue }) => {
...
```
[^auth-listener]: ```614:647:frontend/src/store/authSlice.js
export const setupAuthListener = (store) => {
  supabase.auth.onAuthStateChange(async (event, session) => {
...
```
[^api-client]: ```1:102:frontend/src/config/api.js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
...
```
[^supabase-client]: ```1:11:frontend/src/utils/supabaseClient.js
import { createClient } from '@supabase/supabase-js';
...
```
[^patient-guard]: ```1:93:frontend/src/components/PatientRouteGuard.jsx
const PatientRouteGuard = ({ children }) => {
...
```
[^welcome-setup]: ```171:219:frontend/src/pages/WelcomeSetup.jsx
const handleSubmit = async () => {
...
```
[^login-redirect]: ```47:105:frontend/src/pages/Login.jsx
useEffect(() => {
  if (isAuthenticated && role) {
...
```
[^patient-dashboard-setup]: ```44:89:frontend/src/pages/PatientDashboard.jsx
const PatientDashboard = () => {
...
```
[^patient-dashboard-fetch]: ```151:234:frontend/src/pages/PatientDashboard.jsx
const fetchPatientData = async () => {
...
```
[^medic-dashboard]: ```1:200:frontend/src/pages/MedicDashboard.jsx
import React, { useState, useEffect, useRef } from "react";
...
```
[^health-id-card]: ```1:187:frontend/src/components/HealthIDCard.jsx
import jsPDF from 'jspdf';
...
```
[^qr-scanner]: ```1:120:frontend/src/components/QRScanner.jsx
const QRScanner = () => {
...
```
[^qr-modal]: ```99:200:frontend/src/components/QRScannerModal.jsx
const handleScanSuccess = useCallback((code) => {
...
```
[^analytics-view]: ```18:176:frontend/src/components/AnalyticsView.jsx
const AnalyticsView = ({ medicId }) => {
...
```
[^editable-basic]: ```6:205:frontend/src/components/EditableBasicInfo.jsx
const EditableBasicInfo = ({ patient, patientAuthId, onUpdate }) => {
...
```
[^editable-vitals]: ```6:288:frontend/src/components/EditableHealthVitals.jsx
const EditableHealthVitals = ({ vitals, patientAuthId, patientHeight, onUpdate }) => {
...
```
[^editable-contacts]: ```9:274:frontend/src/components/EditableEmergencyContacts.jsx
const EditableEmergencyContacts = ({ contacts, patientId, patientAuthId, onUpdate }) => {
...
```
[^emergency-contacts]: ```1:182:frontend/src/components/EmergencyContacts.jsx
const EmergencyContacts = ({ contacts }) => {
...
```
[^medications]: ```1:178:frontend/src/components/Medications.jsx
const Medications = ({ medications = [], patient = {} }) => {
...
```
[^recent-visits]: ```1:158:frontend/src/components/RecentVisits.jsx
const RecentVisits = ({ visits = [] }) => {
...
```
[^health-summary]: ```1:266:frontend/src/components/HealthSummary.jsx
const HealthSummary = ({ patient = {} }) => {
...
```
[^error-boundary]: ```1:85:frontend/src/components/ErrorBoundary.jsx
class ErrorBoundary extends React.Component {
...
```
[^offline-cache]: ```1:129:frontend/src/utils/offlineCache.js
export const initOfflineCache = () => {
...
```
[^emergency-utils]: ```1:183:frontend/src/utils/emergencyUtils.js
export const CRITICAL_CONDITIONS = {
...
```

