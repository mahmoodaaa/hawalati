// ============================================================
// Storage Service — localStorage wrapper for Demo only
// ============================================================

const KEYS = {
  USERS: "hawalati_users",
  SESSION: "hawalati_session",
  TRANSACTIONS: "hawalati_transactions",
  KYC: "hawalati_kyc",
  RECEIVED_REMITTANCES: "hawalati_received",
};

function getItem(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setItem(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ── Users ──────────────────────────────────────────────
export function getUsers() {
  return getItem(KEYS.USERS) || [];
}

export function saveUser(user) {
  const users = getUsers();
  const existingIdx = users.findIndex((u) => u.id === user.id);
  if (existingIdx >= 0) {
    users[existingIdx] = user;
  } else {
    users.push(user);
  }
  setItem(KEYS.USERS, users);
}

export function findUserByUsername(username) {
  const users = getUsers();
  return users.find((u) => u.username?.toLowerCase() === username.trim().toLowerCase()) || null;
}

export function findUserByCredentials(username, password) {
  const user = findUserByUsername(username);
  if (!user) return null;
  if (user.password !== password) return null;
  return user;
}

export function findUserByNationalId(nationalId) {
  const users = getUsers();
  return users.find((u) => u.nationalId === nationalId.trim()) || null;
}

// ── Session ────────────────────────────────────────────
export function getSession() {
  return getItem(KEYS.SESSION);
}

export function saveSession(user) {
  setItem(KEYS.SESSION, { userId: user.id, loginTime: new Date().toISOString() });
}

export function clearSession() {
  localStorage.removeItem(KEYS.SESSION);
}

export function getCurrentUser() {
  const session = getSession();
  if (!session) return null;
  const users = getUsers();
  return users.find((u) => u.id === session.userId) || null;
}

// ── KYC ───────────────────────────────────────────────
export function getKycStatus(userId) {
  const kyc = getItem(KEYS.KYC) || {};
  return kyc[userId] || "PENDING";
}

export function setKycStatus(userId, status) {
  const kyc = getItem(KEYS.KYC) || {};
  kyc[userId] = status;
  setItem(KEYS.KYC, kyc);
}

// ── Transactions ──────────────────────────────────────
export function getTransactions(userId) {
  const all = getItem(KEYS.TRANSACTIONS) || [];
  return all.filter((t) => t.userId === userId);
}

export function saveTransaction(transaction) {
  const all = getItem(KEYS.TRANSACTIONS) || [];
  all.unshift(transaction);
  setItem(KEYS.TRANSACTIONS, all);
}

// ── Received Remittances (to prevent double receive) ──
export function markRemittanceReceived(referenceNumber) {
  const received = getItem(KEYS.RECEIVED_REMITTANCES) || [];
  if (!received.includes(referenceNumber)) {
    received.push(referenceNumber);
    setItem(KEYS.RECEIVED_REMITTANCES, received);
  }
}

export function isRemittanceReceived(referenceNumber) {
  const received = getItem(KEYS.RECEIVED_REMITTANCES) || [];
  return received.includes(referenceNumber);
}

// ── Demo Seeding ───────────────────────────────────────
// Pre-populates a ready-to-use demo user so the presenter
// can log in immediately without registering first.
// Uses a separate national ID (0000000001) so that 1234567890
// remains free for the "new user registration" demo scenario.
const DEMO_USER = {
  id: "demo-user-001",
  fullName: "أحمد محمد الأحمد",
  fullNameEn: "Ahmad Mohammed Al-Ahmad",
  nationalId: "0000000001",
  username: "ahmad.demo",
  password: "Demo@1234",
  phone: "0791234567",
  dateOfBirth: "1995-06-15",
  placeOfBirth: "عمّان",
  address: "عمّان",
  documentType: "national_id",
  documentVerified: true,
  kycStatus: "DEMO_VERIFIED",
  createdAt: "2024-01-01T00:00:00.000Z",
};

export function seedDemoUserIfNeeded() {
  const users = getUsers();
  const existingIdx = users.findIndex((u) => u.id === DEMO_USER.id);
  if (existingIdx >= 0) {
    // Always update demo user data to latest (fixes stale national ID)
    users[existingIdx] = DEMO_USER;
  } else {
    users.push(DEMO_USER);
  }
  setItem(KEYS.USERS, users);
  // Also mark KYC as verified for demo user
  const kyc = getItem(KEYS.KYC) || {};
  kyc[DEMO_USER.id] = "DEMO_VERIFIED";
  setItem(KEYS.KYC, kyc);
}

