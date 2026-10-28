# Hawalati Money Exchange — Sprint 4

**Remittances Backend — Implementation & Verified Swagger Tests**  
**Status:** Core MVP acceptance tests **PASSED (9/9)**  
**Tested:** 28–29 October 2026 (Asia/Amman)  
**Next:** Sprint 5 — React ↔ Spring Boot Integration

> **Demo-only application.** The remittances, identities, providers, bank/wallet destinations, KYC and completed transfers are simulations. No real provider API is contacted and no money moves. Never enter real banking credentials or real national IDs in demo data.

## 1. Sprint objective

Enable an authenticated, KYC-verified Hawalati user to:

1. Search for a transfer by **reference/MTCN**, provider and approximate JOD amount.
2. See its status (`AVAILABLE`, `NOT_FOUND`, `ALREADY_RECEIVED`, `PROVIDER_MISMATCH`).
3. Receive an available transfer into a **Jordanian bank account** or **wallet** (demo only).
4. Review the calculated fee/net amount and access **their own transaction history**.
5. Be prevented from receiving the same remittance twice.

## 2. Technology & structure

- Java 21, Spring Boot 4.1.2, Spring Security/JWT, Spring Data JPA, PostgreSQL 17, Lombok.
- Existing backend monolith (`localhost:7171`); React frontend is **not integrated yet**.
- `@Builder` + manual response mapping; **no ModelMapper**.
- Uses the existing authentication, `User`, and `KycStatus` from Sprints 1–3.

### New source files / packages

```text
src/main/java/com/hawalati/backend/
├── controller/RemittanceController.java
├── service/RemittanceService.java
├── service/impl/RemittanceServiceImpl.java
├── entity/MockRemittance.java
├── entity/Transaction.java
├── enums/RemittanceStatus.java
├── enums/TransactionStatus.java
├── repository/MockRemittanceRepository.java
├── repository/TransactionRepository.java
├── init/DemoRemittanceInitializer.java
├── dto/request/RemittanceLookupRequest.java
├── dto/request/ReceiveRemittanceRequest.java
├── dto/request/DestinationRequest.java
└── dto/response/
    ├── RemittanceLookupResponse.java
    ├── RemittanceResponse.java
    ├── DestinationResponse.java
    └── TransactionResponse.java
```

## 3. Database

New tables:

- `mock_remittances`: seeded fictional transfers (reference, provider, beneficiary national ID, amount/currency, JOD equivalent, sender, expiry, status).
- `transactions`: claims/receipts associated with an authenticated user and remittance, plus destination, fee, net amount, status, timestamp.

The transfer is marked `ALREADY_RECEIVED` and its receipt is saved in one `@Transactional` database transaction. The code uses a **pessimistic row lock** on the remittance and a unique remittance relationship to guard against duplicate claims; **simultaneous-request behavior has not been load-tested**.

Useful verification queries:

```sql
SELECT reference_number, provider, amount_jod, status
FROM mock_remittances ORDER BY reference_number;

SELECT COUNT(*) FROM transactions;

SELECT * FROM transactions ORDER BY confirmed_at DESC;
```

### Demo seed setup

`DemoRemittanceInitializer` is annotated `@Component` and `@Profile("demo")`.

1. In **IntelliJ → Run → Edit Configurations → Active profiles**, enter `demo`.
2. Restart `HawalatiBackendApplication`.
3. Check `SELECT COUNT(*) FROM mock_remittances;` — **7** seeded rows were confirmed.
4. Seed uses fictional beneficiary national ID `9912345678` (account must match).
5. The account must have `kycStatus = DEMO_VERIFIED` or `VERIFIED` for lookup/receive. For the demo flow, upload ID and call `POST /api/user/kyc` as needed.
6. Seed is idempotent: existing references are not reinserted on application restart.

Fictional seed transfers (original status **before** the tests):

| Reference | Provider ID | Original | Approx. JOD | Original status |
|---|---|---:|---:|---|
| `1234567890` | `western_union` | 200 USD | 141.80 | AVAILABLE |
| `9876543210` | `moneygram` | 500 USD | 354.50 | AVAILABLE |
| `SARF-2024-001` | `sarie_exchange` | 150 JOD | 150.00 | AVAILABLE |
| `ALREADY-RECEIVED` | `western_union` | 300 USD | 212.70 | ALREADY_RECEIVED |
| `DEMO-WU-2024` | `western_union` | 750 USD | 531.75 | AVAILABLE |
| `ALW-2024-001` | `alawneh_exchange` | 400 JOD | 400.00 | AVAILABLE |
| `ZAM-2024-001` | `zamzam_exchange` | 250 JOD | 250.00 | AVAILABLE |

All seed transfers expire on **2026-12-31**. **Note:** the two transfers received during tests are now `ALREADY_RECEIVED` in the local database, not `AVAILABLE`.

## 4. API contracts

All three endpoints require an access JWT (`Authorization: Bearer <ACCESS_TOKEN>`). Lookup/receive also require enabled user + completed demo KYC.

### 4.1 `POST /api/remittances/lookup`

```json
{
  "referenceNumber": "1234567890",
  "providerId": "western_union",
  "approxAmount": 141.80
}
```

- `approxAmount` is **JOD**, even if the remittance was originally sent in USD.
- Allowed demo tolerance: max(10% of expected JOD value, 2 JOD).
- Status may be `AVAILABLE`, `NOT_FOUND`, `ALREADY_RECEIVED`, `PROVIDER_MISMATCH`.
- `AVAILABLE` returns a `remittance.id` UUID needed for receive.
- Wrong beneficiary/unknown reference/expired/wrong approximate amount can return `NOT_FOUND`.
- `PROVIDER_MISMATCH` returns `expectedProvider` and `remittance: null`.

### 4.2 `POST /api/remittances/receive`

Bank example:

```json
{
  "remittanceId": "<UUID_FROM_LOOKUP>",
  "agreed": true,
  "destination": {
    "type": "bank",
    "details": {
      "bankId": "arab_bank",
      "iban": "JO94CBJO0010000000012345678901",
      "accountName": "Ahmad Mohammad Ali Khaled"
    }
  }
}
```

Wallet example:

```json
{
  "remittanceId": "<UUID_FROM_LOOKUP>",
  "agreed": true,
  "destination": {
    "type": "wallet",
    "details": {
      "walletId": "zain_cash",
      "walletPhone": "0791234567"
    }
  }
}
```

- User must explicitly agree (`agreed: true`).
- Fixed demo fee: **1.50 JOD**; backend computes `netAmount = amountJOD - fee`.
- Successful receipt: `200 OK`, `status: DEMO_COMPLETED`.
- A second attempt at receiving the same transfer: `409 Conflict`, `تم استلام الحوالة مسبقًا`.
- Response masks IBAN / wallet phone (e.g. `****8901`, `****4567`).
- IBAN/phone are shape-validated for the demo, but no provider verifies ownership or sends funds.

### 4.3 `GET /api/remittances/history`

- Returns the **authenticated user's own** receipts, newest first.
- Each item includes transfer/provider/sender details, amounts, 1.50 JOD fee, destination, masked sensitive destination info, `DEMO_COMPLETED` and confirmation time.

## 5. Actual Swagger test results — 9/9 PASSED

These results are from **actual responses shared during testing**, not unexecuted examples.

| # | Case | Actual HTTP/result | Result |
|---|---|---|---|
| 1 | Demo seed | SQL: 7 records in `mock_remittances` | **PASS** |
| 2 | Valid remittance lookup | 200 — `AVAILABLE` (ref `1234567890`) | **PASS** |
| 3 | Receive to bank | 200 — `DEMO_COMPLETED` | **PASS** |
| 4 | Duplicate bank receive | 409 — `تم استلام الحوالة مسبقًا` | **PASS** |
| 5 | Look up claimed transfer | 200 — `ALREADY_RECEIVED` | **PASS** |
| 6 | Get transaction history | 200 — returned bank receipt | **PASS** |
| 7 | Receive to wallet | 200 — `DEMO_COMPLETED` | **PASS** |
| 8 | Unknown reference lookup | 200 — `NOT_FOUND`, `remittance: null` | **PASS** |
| 9 | Provider mismatch lookup | 200 — `PROVIDER_MISMATCH`, expected `zamzam_exchange` | **PASS** |

### Verified bank receipt

- Reference: `1234567890`, provider: `western_union`.
- Original: **200 USD**; JOD equivalent: **141.80**.
- Destination: `arab_bank` / **البنك العربي**; IBAN returned as `****8901`.
- Fee: **1.50 JOD**; net: **140.30 JOD**.
- Transaction UUID: `565d9eee-74a6-490a-982c-b25a41cfb79f`.
- Status: `DEMO_COMPLETED`.
- Exact same remittance repeated → **409 Conflict**.
- Subsequent lookup → **`ALREADY_RECEIVED`**.
- Subsequent history → returned **the bank transaction**.

### Verified wallet receipt

- Reference: `ALW-2024-001`, provider: `alawneh_exchange`.
- Original/JOD equivalent: **400.00 JOD**.
- Destination: `zain_cash` / **زين كاش**; phone returned as `****4567`.
- Fee: **1.50 JOD**; net: **398.50 JOD**.
- Transaction UUID: `4bcd8ad6-32c1-4b40-a624-c4915ad682f0`.
- Status: `DEMO_COMPLETED`.
- **History after this second receipt was not separately tested**; do not confuse with the earlier successful bank-history test.

### Verified negative cases

**Unknown reference:**

```json
{
  "status": "NOT_FOUND",
  "remittance": null,
  "expectedProvider": null
}
```

**Wrong provider:** lookup for `ZAM-2024-001` with `providerId: "western_union"`, `approxAmount: 250` returned:

```json
{
  "status": "PROVIDER_MISMATCH",
  "remittance": null,
  "expectedProvider": "zamzam_exchange"
}
```

## 6. Validation and security behavior

- JWT-protected routes; current user obtained from Spring Security context.
- Lookup/receipt require verified demo KYC and matching beneficiary national ID.
- Prevent duplicate sequential claims (verified with Swagger).
- Lock + unique relationship intended to protect concurrent receipt claims (not independently stress-tested).
- Backend determines fee and net amount, not the frontend.
- Only configured demo banks/wallets accepted; basic bank IBAN and wallet phone validation.
- Sensitive destination identifiers masked in outgoing transaction responses.
- User-specific history query.

**Not verified in these nine tests:** unauthorized requests, wrong beneficiary, missing KYC, expired transfer, incorrect approximate amount, invalid bank/wallet fields, simultaneous requests, wallet receipt appearing in refreshed history. These can be exercised later if time allows.

**Security note:** Access JWT values pasted into Swagger curl logs were exposed in chat. Rotate local `JWT_SECRET`, restart, and obtain new tokens before publishing demo materials. Do not put real secrets into Git.

## 7. Sprint 5 handoff — React integration

The React app currently uses mock data/localStorage for remittance flows. Replace these data operations with actual HTTP calls:

1. Centralized API client with `http://localhost:7171` base URL, JWT bearer header, and clear 401/error handling.
2. Update auth flow (login/register → simulated OTP → JWT → authenticated state); fix known React `OtpPage.jsx` undefined `flow` reference if still present.
3. Connect profile/document/KYC screens to Sprint 3 endpoints.
4. `CheckRemittancePage.jsx` → POST lookup; use backend statuses.
5. `RemittanceResultPage.jsx` → display real lookup details and returned UUID.
6. `DestinationPage.jsx` / `ReviewPage.jsx` → capture bank/wallet fields, consent; POST receive with lookup `remittance.id`.
7. `SuccessPage.jsx` → render returned transaction, JOD fee/net, masked destination.
8. `HistoryPage.jsx` → GET authenticated history (not localStorage).
9. Keep `demo` Spring profile active locally; ensure backend CORS allows React Vite origin `http://localhost:5173`.
10. Smoke-test the complete presentation path from signup/login to OTP/KYC to lookup and receipt.

**Important frontend detail:** lookup `approxAmount` is **JOD**; the original transfer `amount` may be USD. Keep these currencies clearly labeled in the UI.

## 8. Sprint conclusion

**Sprint 4 is finished for the core demo MVP:** the three remittance APIs work with PostgreSQL and the nine agreed functional test cases passed. External payment/verification integrations and production-ready testing are out of scope. Proceed to **Sprint 5 — Frontend + Backend Integration**.
