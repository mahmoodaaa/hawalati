// ============================================================
// MOCK REMITTANCE DATA — Demo Only
// These are fictional records used solely for the MVP presentation.
// No real transactions, real companies, or real money involved.
// ============================================================

export const MOCK_REMITTANCES = [
  {
    referenceNumber: "1234567890",
    mtcn: "1234567890",
    provider: "western_union",
    amount: 200,
    currency: "USD",
    amountJOD: 141.8,
    senderName: "Mohammed Al-Ahmad",
    senderCountry: "Saudi Arabia",
    status: "AVAILABLE",
    expiryDate: "2026-12-31",
  },
  {
    referenceNumber: "9876543210",
    mtcn: "9876543210",
    provider: "moneygram",
    amount: 500,
    currency: "USD",
    amountJOD: 354.5,
    senderName: "Fatima Hassan",
    senderCountry: "UAE",
    status: "AVAILABLE",
    expiryDate: "2026-12-31",
  },
  {
    referenceNumber: "SARF-2024-001",
    mtcn: "SARF-2024-001",
    provider: "sarie_exchange",
    amount: 150,
    currency: "JOD",
    amountJOD: 150,
    senderName: "Ahmad Yousef",
    senderCountry: "Jordan",
    status: "AVAILABLE",
    expiryDate: "2026-12-31",
  },
  {
    referenceNumber: "ALREADY-RECEIVED",
    mtcn: "ALREADY-RECEIVED",
    provider: "western_union",
    amount: 300,
    currency: "USD",
    amountJOD: 212.7,
    senderName: "Khalid Omar",
    senderCountry: "Kuwait",
    status: "ALREADY_RECEIVED",
    expiryDate: "2026-12-31",
  },
  {
    referenceNumber: "DEMO-WU-2024",
    mtcn: "DEMO-WU-2024",
    provider: "western_union",
    amount: 750,
    currency: "USD",
    amountJOD: 531.75,
    senderName: "Sara Malik",
    senderCountry: "USA",
    status: "AVAILABLE",
    expiryDate: "2026-12-31",
  },
  // Al-Alawneh Exchange demo entries
  {
    referenceNumber: "ALW-2024-001",
    mtcn: "ALW-2024-001",
    provider: "alawneh_exchange",
    amount: 400,
    currency: "JOD",
    amountJOD: 400,
    senderName: "Samer Khoury",
    senderCountry: "Jordan",
    status: "AVAILABLE",
    expiryDate: "2026-12-31",
  },
  // Zamzam Exchange demo entry
  {
    referenceNumber: "ZAM-2024-001",
    mtcn: "ZAM-2024-001",
    provider: "zamzam_exchange",
    amount: 250,
    currency: "JOD",
    amountJOD: 250,
    senderName: "Lina Ali",
    senderCountry: "Jordan",
    status: "AVAILABLE",
    expiryDate: "2026-12-31",
  },
];

// Demo hint codes for presentation
export const DEMO_HINTS = {
  available: ["1234567890", "9876543210", "SARF-2024-001", "DEMO-WU-2024"],
  alreadyReceived: ["ALREADY-RECEIVED"],
  notFound: ["any other reference number"],
};

export const SERVICE_FEE_JOD = 1.5;
export const EXCHANGE_RATE_USD_TO_JOD = 0.709;

/**
 * Simulate a remittance lookup.
 * Validates BOTH the reference number AND the selected provider.
 * @param {string} referenceNumber
 * @param {string} providerId
 * @returns {{ status: 'AVAILABLE'|'ALREADY_RECEIVED'|'NOT_FOUND'|'PROVIDER_MISMATCH', remittance?: object }}
 */
export function lookupRemittance(referenceNumber, providerId) {
  const ref = referenceNumber.trim().toUpperCase();

  // Step 1: find by reference number only
  const byRef = MOCK_REMITTANCES.find(
    (r) =>
      r.referenceNumber.toUpperCase() === ref ||
      r.mtcn.toUpperCase() === ref
  );

  if (!byRef) return { status: "NOT_FOUND" };
  if (byRef.status === "ALREADY_RECEIVED") return { status: "ALREADY_RECEIVED", remittance: byRef };

  // Step 2: validate provider matches
  if (providerId && byRef.provider !== providerId) {
    return { status: "PROVIDER_MISMATCH", expectedProvider: byRef.provider };
  }

  return { status: "AVAILABLE", remittance: byRef };
}
