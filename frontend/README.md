# Hawalati MVP frontend

React/Vite presentation UI connected incrementally to Spring Boot on port 7171.

## Local setup

Start Spring Boot with its demo profile and PostgreSQL. Copy `.env.example` to `.env` if you need a different API base URL. The default is `http://localhost:7171`.

```powershell
npm.cmd install
npm.cmd run dev
```

Backend CORS must allow the frontend origin, normally `http://localhost:5173`, including Authorization, JSON, and multipart requests. `npm.cmd` avoids PowerShell execution-policy restrictions on `npm.ps1`.

## Sprint 5 implementation status

API client and authentication/OTP are implemented. Register and Login request an OTP; only successful server OTP verification establishes a JWT session. Reload fetches the authenticated profile, and protected requests share one refresh rotation and retry at most once. Logout revokes the latest refresh token and clears local authentication. KYC guards protect lookup and receiving routes.

Use an actual backend account, or register a new one. The former browser-only `ahmad.demo` account is no longer seeded. Reloading the OTP page returns to Login because OTP credentials stay in memory. For an unfinished registration, enter the account credentials and select the activation button on Login.

Tokens are stored under `hawalati_api_session` for this local demo. Passwords, OTP credentials, and profile data are not persisted by the new auth flow. JavaScript-readable token storage is exposed to XSS and is a demo tradeoff; production storage hardening remains outside this sprint. Legacy mock data already in a browser is not automatically deleted.

Document upload is the next phase. Registration now chooses the document type and explains that upload follows OTP; the fake successful upload was removed. KYC submission and profile save now await backend responses and show server errors, so they cannot falsely report local success. Password changes require the dedicated endpoint and are not sent through profile update.

Remittance lookup, receive, Home/History, and Reset Demo still use their existing local logic and await later phases. Do not use them as evidence of PostgreSQL integration yet. See `SPRINT5_PLAN.md` for the remaining work.

## Verification

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run lint
```

Eight API-client tests cover token-only storage, concurrent refresh, retry limits, invalid refresh, logout during refresh, public OTP errors, multipart headers, and network failures.

Optional real-backend auth check:

```powershell
node tests/live-auth-smoke.mjs
```

Each manual run creates one fictional account in the local demo database, tests Register/LOGIN OTP, resend, profile, refresh rotation, session restoration, logout and refresh-token revocation. It prints the account username, never its credentials or JWTs. It does not run with `npm.cmd test`.

The initial backend smoke check passed with test account `sprint5.1793224149488`. Browser interaction checks remain pending; Node checks do not validate rendered navigation, file selection, or browser CORS.
