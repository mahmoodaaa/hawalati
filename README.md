# Hawalati MVP

Source repository: https://github.com/hwaliti/hwaliti-mvp

React/Vite + Spring Boot (Java 21) + PostgreSQL demo. Authentication, registration OTP, JWT refresh, profile updates, document storage/demo KYC, remittance lookup/receive and transaction history use the backend. The UI supports Arabic/English. No real payouts, SMS or biometric verification are performed.

## Business-owner delivery

Use the prebuilt **Hawalati-Demo.zip**. Install Docker Desktop once, extract the entire ZIP, then double-click **START_HAWALATI.bat**. The website opens at **http://localhost:5173**. Java, Node, Maven, PostgreSQL, Git and IDEs are not needed on the owner's host.

- [START_HERE_AR.md](START_HERE_AR.md), or START_HERE_AR.html: simple owner instructions.
- [DEMO_GUIDE.md](DEMO_GUIDE.md): registration, fictional account/reference data and the demo journey.
- STOP_HAWALATI.bat: stop without deleting data.
- CHECK_SYSTEM.bat: Docker/service diagnostics.
- RESET_DEMO.bat: explicit confirmation before deleting only this demo project's data.
- [delivery/README.md](delivery/README.md): maintainer packaging and verification.

Docker Desktop must be running Linux containers on a supported Windows x64/WSL 2 setup. Consult [Docker's current Windows requirements](https://docs.docker.com/desktop/setup/install/windows-install/). Do not run the ZIP directly: extract to a writable folder first.

## Build the ZIP as maintainer

With Docker Desktop running, double-click **CREATE_DEMO_PACKAGE.bat** from this repository. It builds cached Docker images, includes the PostgreSQL image, exports images only (never volumes/containers), and creates **release/Hawalati-Demo.zip**. No runtime .env, user database, uploaded documents or local backend password is copied. The root release/ directory is ignored by Git.

The default owner ZIP contains prebuilt Linux/amd64 images and needs no application compilation or dependency downloads at first launch. An optional source fallback is available through `powershell.exe -NoProfile -ExecutionPolicy Bypass -File delivery/Create-Package.ps1 -Mode Source`; it builds on first Start and requires internet for image/dependency downloads.

## Local deployment behavior

- Compose runs PostgreSQL, Spring Boot with profile `demo`, and Nginx serving the built React UI.
- Only `127.0.0.1:5173` is published. PostgreSQL and the backend have no host ports.
- Nginx forwards `/api/` to the backend, supports React route reloads and multipart uploads. The frontend image builds with `VITE_API_BASE_URL=/`; the developer's frontend .env is excluded.
- PostgreSQL readiness precedes backend startup; backend health precedes frontend startup. Start also checks the API through Nginx.
- Docker volumes preserve PostgreSQL and uploaded files. `.env` is generated locally once with random DB/JWT secrets and reused. A missing .env with existing project data produces an error instead of silently rotating secrets.
- Container builds exclude the developer's backend `application.properties`. Only `hawalati-backend/docker/application.properties` with environment placeholders is baked into the backend image. Existing local developer credentials are not modified.
- DemoRemittanceInitializer and beneficiary checks are unchanged. Fresh fictional remittances match national ID `9912345678`; existing references are skipped. Seeds expire on **2026-12-31**.
- No cleanup/prune or automatic data reset runs during Start/Stop. Reset validates volume ownership and requires `RESET HAWALATI`.

## Repository and development

- `frontend/`: React source, tests, Dockerfile and Nginx configuration.
- `hawalati-backend/`: Spring Boot source, tests and Dockerfile.
- `docker-compose.yml`: runtime services; `docker-compose.build.yml`: source-build override.
- `delivery/`: Windows launcher, packager and fictional test PNG.

For native development, use Java 21, local PostgreSQL, and a Node version supported by the installed Vite release. Configure DB_URL, DB_USERNAME, DB_PASSWORD and JWT_SECRET in your IDE/terminal. Spring Boot does not automatically load .env files. Run the backend with profile `demo`, then `npm.cmd ci` and `npm.cmd run dev` in frontend. See [frontend/README.md](frontend/README.md). Never commit credentials or identity documents.

Frontend checks: `npm.cmd test`, `npm.cmd run build`, `npm.cmd run lint`. Selected isolated backend suites: `mvnw.cmd "-Dtest=UserMapperTest,JwtProviderTest,DocumentStorageServiceImplTest,AuthServiceImplTest,RemittanceWalletSupportTest" test`. The application-context suite needs its test database setup; do not treat skipped/unexecuted suites as passed. Container release builds skip tests; validation is recorded separately in delivery/README.md.
