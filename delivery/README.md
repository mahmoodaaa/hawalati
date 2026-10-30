# Windows demo delivery — maintainer notes

Owner instructions are in ../START_HERE_AR.html and ../START_HERE_AR.md. The owner needs Docker Desktop only; PowerShell is used internally by the BAT files.

## Create the prebuilt delivery ZIP

1. Review the current source and demo seed expiry (2026-12-31). Use a Windows x64 Docker Desktop engine in Linux-container mode.
2. Start Docker Desktop. Double-click `CREATE_DEMO_PACKAGE.bat` in the repository root. It builds both images with the sanitized container config, obtains `postgres:17-alpine`, and saves those three images. No containers or data volumes are exported.
3. Wait for `Ready to deliver`. Deliver **release/Hawalati-Demo.zip**; do not ZIP your working directory yourself.
4. On a second Windows machine, extract the ZIP to a writable folder and follow START_HERE_AR. Verify Start, registration, receipt, Stop/Start persistence and a deliberately confirmed Reset before the presentation.

CLI equivalent for maintainers: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File delivery/Create-Package.ps1 -Mode Prebuilt`.
`-SkipBuild` is only for repackaging images already built and checked against the current source.
Optional fallback: `-Mode Source` creates a separate `release/Hawalati-Demo-source-*.zip` with an explicit source allowlist. Its first Start downloads public base images/dependencies and builds locally; later Starts reuse the images.

The prebuilt ZIP contains runtime Compose, BAT/PowerShell launchers, owner/demo guides, a fictional test PNG, and a SHA-256-checked images archive. It excludes .env, the Git directory, user documents, PostgreSQL volumes, developer configuration, source credentials, dependencies and IDE settings. Create-Package never copies the developer's backend application.properties; source packages receive the environment-only container config instead.

## Operational details

- Project name is fixed to `hawalati-demo` regardless of extraction folder. It is intended as one local demo per Docker engine; extracting another copy is not a separate database.
- Volumes are `hawalati-demo_database` and `hawalati-demo_documents`. Stop uses Compose down without --volumes. Reset asks for `RESET HAWALATI`, checks both volume ownership labels before mutation, removes only this project's containers and those two owned volumes, and preserves image downloads/settings. It does not run Docker prune.
- First Start generates a 32-byte DB password and 64-byte JWT secret as hex in ignored .env. It reuses and validates them thereafter, including overriding conflicting inherited shell variables for that process. If .env is lost but project volumes remain, Start refuses to create replacement secrets. Restore the original .env or deliberately Reset.
- Only `127.0.0.1:5173` is published. Backend 7171 and PostgreSQL 5432 stay inside Compose. Nginx provides /api proxying and React Router fallback, and limits uploads consistently with Spring. Compose uses database/backend/frontend healthchecks plus an end-to-end API request before opening the browser.
- The Compose profile is always demo. Demo OTP, beneficiary matching, exact seeded amounts/refs, 1.50 JOD fee, KYC and duplicate-receipt protection stay in the existing application code.
- Logs are under the extracted folder's logs/. Do not share .env. Uploaded files and database data are local Docker volumes and are never part of a release archive. Uninstalling/clearing Docker data can remove those volumes.
- The release targets Linux/amd64 images on Windows x64. ARM hosts are not acceptance-tested. Initial Docker installation/WSL setup needs internet; the complete prebuilt app can then run its core flows offline. Google Fonts may be unavailable offline; fallback system fonts are configured.

## Verification

Executed on 2026-10-30:

- `npm.cmd test`: 45 frontend tests pass. `npm.cmd run build`: passes.
- Both Dockerfiles build successfully using Linux containers. Backend release compilation uses Java 21 and skips unit tests; no backend unit-test pass is inferred from that build.
- Inspected the actual backend runtime JAR: DB_PASSWORD/JWT_SECRET are environment placeholders; the developer's local application.properties was not included.
- A fresh isolated `hawalati-delivery-verify` Compose project on localhost:5175 passed Nginx/deep-route/API connectivity, JWT boundaries, phone OTP (including incorrect code), multipart registration, Demo KYC, LOGIN/resend OTP, refresh/logout, profile/DOB updates, document replacement, all lookup result statuses, bank/Alawneh Pay/Dinarak receive, server fee/net/masking, duplicate HTTP 409 and PostgreSQL history.
- Stop/Start preserved the account, edited profile, document metadata, transaction IDs and received status. Seed count stayed seven.
- Real Reset on that disposable project's own volumes produced 0 users, 0 transactions, 7 original seeded remittances and 0 document files; the former test phone could request registration again.
- 10 mocked launcher checks pass: secure first-run settings, restart reuse, inherited-environment isolation, invalid/lost settings, Reset cancellation/ownership/strict scope and corrupt-archive rejection. These checks perform no real Docker mutations.
- Generated the prebuilt ZIP, audited its entry list, extracted it into a new folder containing spaces and ran its actual Start launcher at localhost:5173. All three included images loaded locally and the services became healthy. The packaged Stop/Start preserved both volumes and the exact .env hash.
- An isolated real headless browser against that extracted Docker package passed the complete React registration/file/review/OTP/credentials/Home journey, lookup/bank destination/agreement/confirmation/success, history after reload, language switching with external font hosts blocked, and real Login/OTP/history after packaged Stop/Start. No API mocks or native-host backend were used.

Still pending: a clean **second Windows device** installation/WSL setup and the manual double-click/default-browser launch acceptance. Browser opening was intentionally suppressed during automated launcher checks. ARM is not tested. No production or real-payment readiness is implied.

Launcher tests (no real Docker mutations): `powershell.exe -NoProfile -ExecutionPolicy Bypass -File delivery/Test-Launcher.ps1`.

`delivery/Verify-Demo.mjs` is a maintainer integration check requiring host Node only for testing, not operation. It refuses targets other than explicit disposable localhost:5175/5176. Example: `node delivery/Verify-Demo.mjs --base=http://localhost:5175 --phase=initial`. It creates fictional accounts/receipts; do not point it at a presentation database. Use `--phase=persisted` after stopping/restarting that same disposable project and `--phase=reset` after explicitly resetting it. Test state is written under ignored frontend/.publish-prep. The verifier is not included in the owner ZIP.

## Files added or updated for delivery

Added: root runtime/build Compose files; START/STOP/CHECK/RESET BAT files; CREATE_DEMO_PACKAGE.bat; START_HERE_AR.md/html; frontend and backend Dockerfiles/.dockerignore; frontend/docker/nginx.conf; backend/docker/application.properties; delivery/Common.ps1, Hawalati.ps1, Create-Package.ps1, Test-Launcher.ps1, Verify-Demo.mjs, README.md and DEMO_DOCUMENT.png.

Updated: root README.md and DEMO_GUIDE.md, frontend/README.md and frontend/DEMO_GUIDE.md (points to the single canonical root demo guide), and root .gitignore for release/. Existing application business logic, schema, local credentials and native database were not edited for delivery. Pre-existing unrelated working-tree changes were left in place.
