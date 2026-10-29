# Hawalati MVP frontend

React/Vite UI connected incrementally to Spring Boot on `http://localhost:7171`.

## Local setup

Run the backend from IntelliJ with its demo registration support and PostgreSQL configured. No backend files are changed by this frontend registration implementation.

From the frontend directory:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open `http://localhost:5173`. The local `.env` contains `VITE_API_BASE_URL=http://localhost:7171`; `.env.example` documents it. Backend CORS must allow the frontend origin, Authorization, JSON and multipart requests. Restart Vite after changing `.env`.

## Current registration flow

1. Personal information.
2. Contact/phone information.
3. Select document type and an actual JPEG/PNG/PDF up to 5 MiB; the selected File stays in React memory.
4. KYC preview and review. It clearly remains pending; nothing has been uploaded or verified yet. Back preserves the draft for editing.
5. Send OTP using `/api/auth/phone-otp/send`, then verify it using `/api/auth/phone-otp/verify`. The demo code is `123456`. Only a temporary registrationToken is returned here; there is no authenticated account session yet.
6. `/create-credentials`: enter Username, Password and Confirm Password for the first time.
7. Create Account submits `/api/auth/registration/complete` with multipart parts `data` (application/json Blob containing `{registrationToken, registration:{...}}`) and `file` (the selected File). The browser generates the outer Content-Type boundary.
8. Accept the normal access/refresh tokens and the server-returned user profile, clear the draft, and go directly to Home. The backend handles user/document persistence and demo KYC together; React does not duplicate upload or KYC calls.

The previous credentials-confirmation screen is replaced by actual credential creation. `/credentials` redirects to `/create-credentials` for old links. The legacy `/api/auth/register` API is not called by the new registration UI.

Registration information, File, registrationToken and token expiry stay only in React Context. Credentials stay only in the credentials form. Leaving registration for another area clears the draft. Reloading OTP or credentials loses the in-memory draft and offers a friendly restart; no unfinished account exists before final completion. Reloading the register wizard starts it fresh. Expired/rejected registration tokens offer phone reverification while retaining the draft within the current tab.

Normal access/refresh tokens use `hawalati_api_session` for this local demo; this JavaScript-readable storage remains a demo tradeoff. Never put passwords, document files or registration tokens in browser storage. Production storage hardening remains outside this sprint.

Existing Login stays Username/Password → `/api/auth/login` → LOGIN OTP (`/api/auth/verify-otp`, `/api/auth/resend-otp`) → normal session. KYC-pending existing users keep their existing KYC route. Login now accepts existing account credentials only; new accounts use the phone-first registration flow. The old activation button was removed.

The authenticated `/kyc` page remains available for old accounts to upload/replace a document and request demo KYC. Face recognition remains presentation-only. Home shows the actual KYC status; receipt routes still require VERIFIED or DEMO_VERIFIED. Remittance lookup/receive/history now use the backend API. Home loads the latest three server transactions, and History loads the complete server history. Review submits the lookup UUID only after explicit agreement, handles 409, and Success uses the returned transaction values. The browser-only Reset Demo action is removed. Header navigation links Home, History and Profile; the bottom navigation remains.

## Verification

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run lint
```

37 automated tests cover the API client, document/profile services, registration and remittance contracts. Checks include numeric JOD lookup, all lookup statuses, UUID/agreement on Bank/Wallet receive, server fee/net/masked destination, 409/validation/network errors, server-only history, JWT refresh, profile allowlisting, multipart documents, phone-only OTP and unchanged LOGIN payloads. HTTP responses are mocked; this does not establish browser or real-backend acceptance of the new flow.

Manual browser checks (pending for this new flow):

- Use a fresh fictional phone/national ID. Complete information, select a document and inspect review. Username/password must not appear yet; no register/user-document/user-KYC request should be sent before OTP.
- Send OTP and try a wrong code, then `123456`. Confirm only phone-otp endpoints are used, with no access JWT created at verification.
- Enter credentials, try mismatched passwords and an unavailable username, then complete successfully. Inspect FormData: `data` has application/json and a nested `registration`, and `file` is the selected document. No confirmation-password or UI state belongs in the payload.
- Confirm the server returns enabled=true, documentUploaded=true, DEMO_VERIFIED and normal tokens; Home must open directly. Check persisted metadata/profile via the existing backend tools.
- Go back from OTP/credentials to review and confirm information/File remain. Editing the phone invalidates its old registration token.
- Reload OTP/credentials and confirm friendly restart; leave to Login/Welcome then return and verify the previous draft was cleared.
- Wait past registration-token expiry (expiresIn=900 seconds) or exercise a server rejection; use reverification and confirm no normal auth-refresh request is made for this registration token.
- Log out, then log in using the newly created credentials, LOGIN OTP, session reload, and logout. Check an old PENDING-KYC account still follows `/kyc`.

`node tests/live-auth-smoke.mjs` is an optional real-backend check for phone-first registration, normal LOGIN/session/refresh/logout and rejection of the retired registration endpoints. Each explicit run creates a fictional backend account and uploads a small test PNG. It is not run by `npm.cmd test`, and does not verify rendered browser navigation.

## Files for the phone-first registration change

Updated: `src/services/authService.js`, `src/context/AuthContext.jsx`, `src/features/auth/pages/RegisterPage.jsx`, `src/features/auth/pages/OtpPage.jsx`, `src/App.jsx`, `README.md`, `SPRINT5_PLAN.md`.

Added: `src/features/auth/pages/CreateCredentialsPage.jsx`, `src/features/auth/components/RegistrationSteps.jsx`, `src/features/auth/components/RegistrationRestart.jsx`, `tests/registration.test.js`.

Removed: the obsolete frontend-only `CredentialsPage.jsx` confirmation screen. Other existing Phase 3 and backend working-tree changes were preserved.


## Remaining integration checkpoint — 2026-10-29

Lookup, receive, success, History, Home recent transactions, and Profile now use authenticated backend APIs. The current registration/AuthContext/JWT logic was preserved. No backend code, seed records or database data were changed by this integration.

- `remittanceService.js` now provides async lookupRemittance, receiveRemittance, getRemittanceHistory via apiRequest. No mock lookup, generated transaction IDs, local received flags or browser transaction history are used by active screens. Historical mock/storage helper files remain unimported rather than deleting unrelated code.
- Lookup sends numeric approxAmount in JOD. All four result statuses use backend results; PROVIDER_MISMATCH displays expectedProvider. AVAILABLE requires a backend UUID, carried into destination/review/receive.
- Destination preserves the existing bank/wallet choices, whose IDs match backend-supported maps. Jordanian IBAN input is checked as 30 characters, and wallet/account fields are normalized before review. Back navigation restores the relevant route state and destination details.
- Review labels the known 1.50 JOD demo fee/net as estimates. Explicit agreement and a confirmation click are required. A synchronous in-flight guard prevents double submission. 409 blocks repeat confirmation and links to History. Network uncertainty asks the user to check History; it never fabricates success.
- Success shows the returned transaction, UUID, status, confirmedAt, amount/fee/net and already-masked backend destination. No amount is recomputed as authoritative. Missing success state redirects to History.
- Shared history loading powers History and Home's latest three. Loading/empty/error/retry are distinct; no local history fallback. Reset Demo and misleading availability hints were removed from Home.
- Header provides accessible top links for Home, History and Profile; the existing bottom tabs remain.
- Profile fetches backend state on opening and updates AuthContext through refreshUser. Saving uses permitted fields only, and actual KYC status is displayed. Removed the nonfunctional password field from profile-save; password changes remain a separate endpoint. Profile links to the existing document/KYC page.
- Existing authenticated document GET/PUT is retained. Replacement immediately refreshes the profile, then KYC uses the existing endpoint and refreshes again. Selection/upload alone does not display DEMO_VERIFIED. New registration never uploads its initially selected document twice.

Verification: npm.cmd test passes 37 tests; npm.cmd run build passes; lint completes with four existing warnings outside the remittance/profile changes. The new tests use mocked HTTP and do not mark browser acceptance passed.

Demo source inspection: all seeded remittances belong to fictional national ID 9912345678 and expire on 2026-12-31. Seed initialization skips existing references; a previously received reference remains received. Fresh registrations with another national ID correctly get NOT_FOUND for those remittances. Exact references, provider IDs and JOD amounts are documented in frontend/DEMO_GUIDE.md. No beneficiary matching checks were bypassed.

Manual acceptance still pending:

- [ ] Matching beneficiary + AVAILABLE lookup with correct numeric JOD amount.
- [ ] NOT_FOUND, PROVIDER_MISMATCH, ALREADY_RECEIVED and wrong-amount behavior.
- [ ] Bank and wallet receipt using two different available references; explicit agreement required.
- [ ] Repeated clicks do not duplicate requests; stale lookup followed by 409 shows the duplicate explanation.
- [ ] Success values equal the server response; masked destination and UUID are preserved.
- [ ] History/Home retrieve transactions after reload, and failures show retry instead of an empty success state.
- [ ] Profile GET/PUT survives reload and actual KYC resets are respected.
- [ ] Profile → document replacement → profile refresh/KYC remains functional.
- [ ] LOGIN/registration/session refresh/regression check and top/bottom navigation work in the browser.

Current implementation is ready for the browser demo acceptance pass. See frontend/DEMO_GUIDE.md for setup and the full test journey.

Files changed for this remaining-integration checkpoint:

- Services: `src/services/remittanceService.js`, `src/services/userService.js`.
- Remittance screens: `src/features/remittance/pages/CheckRemittancePage.jsx`, `RemittanceResultPage.jsx`, `DestinationPage.jsx`, `ReviewPage.jsx`, `SuccessPage.jsx`, `HistoryPage.jsx`, `HomePage.jsx`.
- Shared/UI: `src/components/layout/Header.jsx`, `src/features/auth/pages/ProfilePage.jsx`, `src/features/kyc/pages/KycPage.jsx`.
- Added: `src/features/remittance/hooks/useRemittanceHistory.js`, `src/features/remittance/components/TransactionCard.jsx`, `tests/remittanceService.test.js`.
- Extended tests: `tests/userService.test.js`.
- Documentation: `README.md`, `SPRINT5_PLAN.md`, `DEMO_GUIDE.md`.

The registration pages, AuthContext, JWT client, App routes, and static provider IDs were not rewritten for this checkpoint. Existing backend working-tree changes belong to the separate backend work and were preserved.

