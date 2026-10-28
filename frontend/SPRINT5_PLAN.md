# Hawalati Money Exchange — Sprint 5 Plan

**Status:** Phases 1–2 implemented; backend auth smoke checks passed; browser acceptance pending  
**Goal:** Integrate the existing React/Vite frontend with the tested Spring Boot + PostgreSQL backend, preserving the current presentation UI.  
**Scope:** MVP demo only; no live remittance providers, real payout, SMS delivery, or biometric verification.

## 1. Baseline reviewed

Uploaded `front.zip` was inspected. It contains the existing React UI, routes, and local/mock services. `node_modules` is intentionally excluded and can be installed with `npm install`. The archive also contains generated `dist/` and `.vite/` folders; they are not needed for source changes.

- Frontend: React 19, React Router 7, Vite 8, Tailwind CSS 4 (package declarations).
- Backend: Spring Boot port `7171`, PostgreSQL, JWT, OTP, profile/document/KYC, mock remittance lookup/receive/history.
- Existing frontend routes: `/`, `/register`, `/login`, `/otp`, `/kyc`, `/home`, `/check-remittance`, `/remittance-result`, `/destination`, `/review`, `/success`, `/history`, `/profile`.
- Confirmed Sprint 4 backend checks: demo seed (7 records), AVAILABLE lookup, bank receipt, wallet receipt, duplicate receive (409), ALREADY_RECEIVED lookup, history, NOT_FOUND and PROVIDER_MISMATCH.

## 2. Architectural decision

**Spring Boot/PostgreSQL is the source of truth.** React keeps UI state and a demo authentication session only. Do **not** keep passwords, user databases, remittances, receipt history, or 'already received' flags in `localStorage`.

Suggested additions:

```
src/
  services/
    apiClient.js           # fetch, base URL, bearer auth, JSON/multipart, HTTP error handling
    authService.js         # /api/auth/*
    userService.js         # /api/user/* (new)
    remittanceService.js   # /api/remittances/*
  context/
    AuthContext.jsx        # current user, tokens/session, restore/refresh/logout
  config/                  # optional; only if needed
    demo.js                # explicitly labelled demo-only hints
.env.example              # VITE_API_BASE_URL=http://localhost:7171
```

Avoid adding a complex state framework or heavy dependencies. Native `fetch` is sufficient. Keep `src/data/providers.js` as UI option labels/IDs; no need for a provider API in this MVP.

## 3. Implementation phases and acceptance checks

### Phase 0 — Environment and baseline
1. Start Spring Boot using the `demo` profile; confirm `http://localhost:7171/swagger-ui/index.html` and PostgreSQL are available.
2. Run `npm install`, then `npm run dev` from the unpacked frontend.
3. Add `.env.example` with `VITE_API_BASE_URL=http://localhost:7171` and confirm backend CORS permits `http://localhost:5173`.
4. Run a baseline `npm run build` and identify existing frontend errors before edits.

**Pass:** Both services start, and the frontend reaches an authenticated test endpoint with a valid JWT.

### Phase 1 — Shared API client and session
1. Implement `apiClient.js`: JSON requests, `Authorization: Bearer <accessToken>`, `FormData` upload **without manually setting Content-Type**, robust error messages and `fieldErrors`.
2. Implement session/token management in `AuthContext` and `authService.js`; user profile comes from `/api/user/profile`, not `hawalati_users`.
3. Support `/api/auth/refresh` for expired access tokens (at most one retry) and `/api/auth/logout`; on failure clear the local session and redirect to login.
4. Preserve React `ProtectedRoute`; add KYC guard so unverified users cannot progress to receive.
5. For a local demo, if a browser storage mechanism is used for tokens, document its risks and never store passwords or national IDs in the session object unnecessarily.

**Pass:** Reload preserves a valid authenticated session; logout invalidates the refresh token; 401 results in controlled reauthentication.

### Phase 2 — Register, Login, OTP
Map the existing pages to these contracts:

| UI | HTTP request | Notes |
|---|---|---|
| Register | `POST /api/auth/register` | Send fullName, fullNameEn, nationalId, dateOfBirth, placeOfBirth, address, phone, documentType, username, password. A 201 response is **OTP pending**, not an authenticated login. |
| Login | `POST /api/auth/login` | `{username, password}`; returns OTP-pending user. |
| Verify OTP | `POST /api/auth/verify-otp` | `{username, code, purpose}` where purpose = `REGISTER` or `LOGIN`. Store `accessToken`, `refreshToken`, `user` only on success. |
| Resend OTP | `POST /api/auth/resend-otp` | `{username, password, purpose}` per backend DTO; keep password ephemeral in memory during OTP flow, never write to storage. |
| Refresh | `POST /api/auth/refresh` | `{refreshToken}`. |
| Logout | `POST /api/auth/logout` | `{refreshToken}`. |

Fix `OtpPage.jsx` reference to the undefined `flow` variable. Route `/otp` must retain OTP `purpose` and username. Don't trust the user object from OTP-pending response as an authenticated session.

**Pass:** Register→REGISTER OTP→JWT and Login→LOGIN OTP→JWT both work from the browser with real backend errors visible.

### Phase 3 — Real document upload and demo KYC
1. Current registration step 3 simulates success with `setTimeout`; replace with real file selection (JPEG/PNG/PDF, max 5MB), and clearly distinguish file **selected** from file **uploaded**.
2. Backend `PUT /api/user/document` requires an authenticated JWT. Therefore do the actual upload **after successful OTP**, using either an in-memory pending `File` passed to KYC or a file picker on `/kyc` as a reload-safe fallback. Do not try to send it to this protected API before authentication.
3. Send `FormData` keys `file` and `documentType` (`national_id`, `passport`, `license`), verifying the latest backend controller's accepted format.
4. After successful upload, call `POST /api/user/kyc`, then refresh `GET /api/user/profile`; show `DEMO_VERIFIED` and only then allow lookup.
5. Face recognition remains a presentation-only visual step. No claim of actual identity verification.

**Pass:** New user uploads an actual test image/PDF; `GET /api/user/document` reports metadata; KYC returns `DEMO_VERIFIED`.

### Phase 4 — Lookup & destination selection
1. Replace `verifyRemittance()` reading `mockRemittances.js` with `POST /api/remittances/lookup`.
2. Send **all** required fields: `{referenceNumber, providerId, approxAmount: Number(approxAmount)}`.
3. Input `approxAmount` represents **JOD**, not the transfer's source currency. Fix misleading text in `RemittanceResultPage.jsx` and `DEMO_GUIDE.md`.
4. Preserve result screens for `AVAILABLE`, `NOT_FOUND`, `ALREADY_RECEIVED`, `PROVIDER_MISMATCH`. Backend returns `{status, remittance, expectedProvider}`.
5. Pass `remittance.id` (backend UUID) through `/destination` and `/review`.
6. Keep `BANKS`, `WALLETS`, `EXCHANGE_PROVIDERS` as UI static choices, aligned with backend IDs.

**Pass:** Correct remittance found; wrong ref/provider shows correct response; wrong amount does not pass silently; available UUID is present.

### Phase 5 — Receive, success, history
1. On final review submit `POST /api/remittances/receive` only once per button press:

```json
{
  "remittanceId": "<UUID returned by lookup>",
  "agreed": true,
  "destination": {
    "type": "bank",
    "details": {
      "bankId": "arab_bank",
      "iban": "JO94CBJO0010000000012345678901",
      "accountName": "Demo User"
    }
  }
}
```

For a wallet, use `type: "wallet"` with `details: {"walletId":"zain_cash","walletPhone":"0791234567"}`.
2. Show loading/disable button to avoid accidental duplicate clicks; handle `409 Conflict` for an already received remittance.
3. Use the returned transaction object (backend-created UUID, server-calculated fee/net, status, masked destination) in `/success`. Do not fabricate a client transaction ID or calculate final amounts as authoritative.
4. Replace `getTransactions(userId)` with `GET /api/remittances/history` for `/history` and `/home` recent transactions; add loading, empty, and failure states.
5. Delete/disable the Home `resetDemoData()` button: clearing browser storage does not reverse PostgreSQL transactions. For repeated demonstrations, use unused reference numbers or a separate explicitly demo-only backend reseed/reset workflow (not publicly exposed).

**Pass:** Bank and wallet receipts work; a second receive yields 409; browser reload still shows the transaction from PostgreSQL.

### Phase 6 — Profile and finishing pass
1. `GET /api/user/profile` for current state.
2. `PUT /api/user/profile` using only permitted profile fields; no nationalId/password in body. Backend may reset KYC to PENDING after identity changes—reflect this in UI.
3. Optional but supported: `PUT /api/user/change-password` via separate UI, not via profile-save `password` field.
4. Remove actual usage of `storageService.js` for users, sessions, KYC, transactions and received flags. Remove `seedDemoUserIfNeeded()` from `main.jsx`.
5. Update `DEMO_GUIDE.md`, `.env.example`, `README.md`; run `npm run build` and full browser demo.

**Pass:** Profile edits survive reload, changed KYC flags are respected, and all main screens work without local mock state.

## 4. Critical integration risks identified in uploaded frontend

1. `OtpPage.jsx`: `flow` is undefined in the Header; needs fix.
2. `RegisterPage.jsx` step 3: fake document upload; must use a real file and JWT-protected API **after OTP**.
3. `CheckRemittancePage.jsx`: its service currently omits `approxAmount`; backend requires it in JOD.
4. `RemittanceResultPage.jsx`: formats approximate JOD amount using the original remittance currency; misleading.
5. `HomePage.jsx`: localStorage demo reset cannot reset PostgreSQL transactions.
6. `ProfilePage.jsx`: includes `password` in local profile edit, but backend requires a separate password-change endpoint.
7. `AuthContext.jsx`: authenticates based only on localStorage session, without a verified backend token/profile.
8. `main.jsx`/`storageService.js`: seeds a browser-only user with nationalId `0000000001`; backend seeded remittances are assigned to demo beneficiary nationalId `9912345678`. Browser-only user cannot log into backend.
9. The user's actual tested remittances `1234567890` and `ALW-2024-001` have already been received in the demo database. Reusing them should return ALREADY_RECEIVED.
10. A newly registered user with a *different* nationalId cannot claim remittances seeded for `9912345678`. This is intentional beneficiary matching. For an end-to-end fresh-registration/payout demo, seed **a separate fictional remittance tied to that new demo user's nationalId**; never disable beneficiary matching.
11. Several listed frontend providers have no matching seed entries. These can remain listed but will return NOT_FOUND unless matching demo data is added.

## 5. Acceptance test matrix

- [ ] New registration → OTP REGISTER → tokens
- [ ] Existing login → OTP LOGIN → tokens
- [ ] Wrong OTP shows server validation, doesn't log user in
- [ ] Authenticated document upload persists
- [ ] KYC transitions to DEMO_VERIFIED
- [ ] KYC PENDING user cannot receive
- [ ] Lookup AVAILABLE with correct JOD amount
- [ ] Lookup NOT_FOUND and PROVIDER_MISMATCH
- [ ] Lookup ALREADY_RECEIVED
- [ ] Receive to bank and wallet
- [ ] Duplicate receive rejected (409)
- [ ] History and Home show server transactions after reload
- [ ] Logout clears session and blocks protected routes
- [ ] Profile edits persist; expected KYC reset displays
- [ ] `npm run build` passes, demo guide and seed references match real database

## 6. Demo data and presentation plan

**Existing backend account:** Use a real backend user already registered and KYC-verified with fictional nationalId `9912345678` (do not rely on the frontend's `0000000001` local seed).

**Known test references and amount in JOD:**

| Reference | Provider | Approx amount (JOD) | Current state in tested DB |
|---|---|---:|---|
| `1234567890` | `western_union` | 141.80 | Already received in bank test |
| `ALW-2024-001` | `alawneh_exchange` | 400.00 | Already received in wallet test |
| `9876543210` | `moneygram` | 354.50 | Seeded AVAILABLE, unless later used |
| `SARF-2024-001` | `sarie_exchange` | 150.00 | Seeded AVAILABLE, unless later used |
| `DEMO-WU-2024` | `western_union` | 531.75 | Seeded AVAILABLE, unless later used |
| `ZAM-2024-001` | `zamzam_exchange` | 250.00 | Seeded AVAILABLE, unless later used |

**Presentation storyline:** Welcome → Register or Login → OTP (fixed demo code `123456`) → real document upload → demo KYC → Home → Lookup → Destination → Review agreement → Receive → Success → History. Distinguish the separate pre-registered receiving user from the new-signup demonstration unless their demo beneficiary records are prepared.

## 7. Out of scope for Sprint 5

Real provider integrations, banking transfers, real SMS, real face matching, production KYC compliance, production token storage hardening, complex Redux architecture, and a publicly exposed database reset API.

## 8. Execution order

**0 Setup → 1 API client/session → 2 Auth/OTP → 3 Document/KYC → 4 Lookup → 5 Receive/History → 6 Profile/final demo.**

Make changes incrementally, testing each phase in the browser and using Spring Boot's real API responses. Avoid rewriting the visual UI and avoid changes to the already-tested backend unless a verified contract mismatch forces a small fix.


## 9. Implementation checkpoint — 2026-10-29

- Implemented `apiClient.js`, token-only demo session, shared refresh rotation, single retry, JSON/multipart transport, server messages and field errors.
- Register, Login, verify OTP and resend OTP use the running backend contracts. OTP purpose and credentials stay in React memory. Login includes a registration-activation recovery action after an OTP-page reload.
- AuthContext restores the profile from the backend, and Logout revokes the current refresh token. Removed browser-user seeding and the old seeded login credential hint.
- Fixed undefined `flow`; protected lookup/receive routes require VERIFIED or DEMO_VERIFIED.
- Removed registration's simulated document-upload success. Actual authenticated file upload remains Phase 3.
- Compatibility changes: existing profile save and KYC submit now await server responses, show errors, and no longer mutate local users or fake successful verification. Passwords are rejected by profile save, pending dedicated password-change UI.
- Passed: 8 API-client tests, production build, and real Spring Boot Register → rejected wrong OTP → resend → REGISTER OTP → profile → refresh → restored client → Logout/revocation → Login → resend → LOGIN OTP → Logout.
- Manual smoke created fictional account `sprint5.1793224149488`; its credentials were ephemeral. No remittances were received during testing.
- Lint completes with warnings in existing areas; browser acceptance is still pending.
- Next: Phase 3 file picker, authenticated document upload/metadata and complete KYC browser flow, then phases 4–6 remittance/history/profile finishing work. Existing local remittance/reset behavior remains until those phases.
