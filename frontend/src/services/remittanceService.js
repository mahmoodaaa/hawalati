import { lookupRemittance, SERVICE_FEE_JOD } from "../data/mockRemittances";
import { isRemittanceReceived, markRemittanceReceived, saveTransaction } from "./storageService";

/**
 * Verify a remittance by reference number and provider
 */
export function verifyRemittance(referenceNumber, providerId) {
  // Check if already received on this browser
  if (isRemittanceReceived(referenceNumber.trim().toUpperCase())) {
    return { status: "ALREADY_RECEIVED" };
  }

  const result = lookupRemittance(referenceNumber, providerId);
  return result;
}

/**
 * Confirm and process the transaction (demo only)
 */
export function confirmTransaction({ userId, remittance, destination }) {
  const txId = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const transaction = {
    id: txId,
    userId,
    referenceNumber: remittance.referenceNumber,
    provider: remittance.provider,
    senderName: remittance.senderName,
    senderCountry: remittance.senderCountry,
    amount: remittance.amount,
    currency: remittance.currency,
    amountJOD: remittance.amountJOD,
    fee: SERVICE_FEE_JOD,
    netAmount: remittance.amountJOD - SERVICE_FEE_JOD,
    destination: {
      type: destination.type, // 'bank' | 'wallet'
      ...destination.details,
    },
    status: "DEMO_COMPLETED",
    confirmedAt: new Date().toISOString(),
  };

  // Mark remittance as received locally
  markRemittanceReceived(remittance.referenceNumber);
  // Save transaction to history
  saveTransaction(transaction);

  return { success: true, transaction };
}

export { SERVICE_FEE_JOD };
