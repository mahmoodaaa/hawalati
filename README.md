# Hawalati MVP

A demo remittance application with a React/Vite frontend and a Spring Boot/PostgreSQL backend. It demonstrates authentication with OTP and JWT, profile and document management, demo KYC, and seeded remittance workflows. It does not perform real payouts, send real SMS, or provide production identity verification.

## Repository layout

- `frontend/`: React application, UI, API services, and frontend tests.
- `hawalati-backend/`: Spring Boot application, API, persistence, and backend tests.
- `frontend/SPRINT5_PLAN.md`: frontend/backend integration plan and progress.
- `hawalati-backend/SPRINT3.md` and `SPRINT4.md`: backend sprint notes.

## Requirements

- Java 21 or later supported by the backend and its dependencies.
- PostgreSQL with a local database named `hawalati_db` (or set `DB_URL`).
- Node.js compatible with Vite 8 (20.19+ or 22.12+) and npm.

## Run the backend

Set local environment variables in your terminal or IDE. Never commit actual credentials. Spring Boot does not automatically load `.env` files; the example file documents the variables to configure.

```powershell
cd hawalati-backend
$env:DB_URL = 'jdbc:postgresql://localhost:5432/hawalati_db'
$env:DB_USERNAME = 'postgres'
$env:DB_PASSWORD = '<your-local-database-password>'
$env:JWT_SECRET = '<your-random-secret-at-least-32-bytes>'
.\mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=demo'
```

Backend: `http://localhost:7171`. Swagger: `http://localhost:7171/swagger-ui/index.html`.
The `demo` profile seeds fictional remittances. Uploaded identity files stay local under `uploads/` and are excluded from Git.

## Run the frontend

In a separate terminal:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Frontend: `http://localhost:5173`. The API URL defaults to `http://localhost:7171`; see `frontend/.env.example`. Backend CORS allows that frontend origin.

## Checks

```powershell
cd frontend
npm.cmd test
npm.cmd run build
npm.cmd run lint
```

```powershell
cd hawalati-backend
.\mvnw.cmd test
```

The backend application-context test requires local PostgreSQL, DB_PASSWORD and JWT_SECRET. In the upload environment it failed to load the database context even though its method is marked disabled; the 10 isolated unit tests passed. To run those without a database, use `./mvnw.cmd "-Dtest=UserMapperTest,JwtProviderTest,DocumentStorageServiceImplTest" test`. The separate frontend live-auth smoke script creates a fictional database account when explicitly run; see `frontend/README.md`.

## Integration status

Sprint 5 API client, JWT session, authentication and OTP are connected to the backend. Authenticated document upload and remaining remittance/history integration are still in progress. Some frontend screens continue to use local demo services. See the Sprint 5 plan for the exact checkpoint.

The public repository contains source code and fictional demo fixtures. Runtime secrets, uploaded documents, dependencies, builds, IDE settings, database files and local archives are excluded.


