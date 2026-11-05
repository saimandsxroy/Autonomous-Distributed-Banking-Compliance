/**
 * Enterprise Treasury & AML Compliance API Client
 * FourEyes Autonomous Core-Banking & Fraud Interception Core
 */

export const PERSONAS = {
  sarah_compliance: {
    username: "sarah_compliance",
    password: "password123",
    displayName: "Sarah Connor",
    roleLabel: "COMPLIANCE",
    subtitle: "Lead Compliance Officer • AML & AI Governance",
    role: "ADMIN, COMPLIANCE_OFFICER",
    email: "sarah@foureyes.io",
    badgeColor: "indigo",
  },
  alice: {
    username: "alice",
    password: "password123",
    displayName: "Alice Smith",
    roleLabel: "MAKER",
    subtitle: "Corporate Treasury Maker • Transfers & Payroll",
    role: "USER",
    accountId: 1,
    email: "alice@foureyes.io",
    badgeColor: "emerald",
  },
  bob: {
    username: "bob",
    password: "password123",
    displayName: "Bob Jones",
    roleLabel: "CHECKER",
    subtitle: "Dual-Control Approver • Nostro Reconciliation",
    role: "USER",
    accountId: 2,
    email: "bob@foureyes.io",
    badgeColor: "amber",
  },
  charlie: {
    username: "charlie",
    password: "password123",
    displayName: "Charlie Davis",
    roleLabel: "AUDITOR",
    subtitle: "Internal Audit & Zero-Sum Invariant Inspector",
    role: "USER",
    accountId: 3,
    email: "charlie@foureyes.io",
    badgeColor: "cyan",
  },
};

export const DEMO_PERSONAS = PERSONAS;

const PERSONA_STORAGE_KEY = "foureyes_active_persona";
const LEGACY_PERSONA_KEY = "runestone_active_persona";

export function getActivePersona() {
  const stored = localStorage.getItem(PERSONA_STORAGE_KEY) || localStorage.getItem(LEGACY_PERSONA_KEY);
  if (stored && PERSONAS[stored]) {
    return stored;
  }
  return "sarah_compliance";
}

export function setActivePersona(persona) {
  localStorage.setItem(PERSONA_STORAGE_KEY, persona);
  localStorage.setItem(LEGACY_PERSONA_KEY, persona);
  window.dispatchEvent(
    new CustomEvent("runestone_persona_changed", { detail: persona })
  );
  window.dispatchEvent(
    new CustomEvent("foureyes_persona_changed", { detail: persona })
  );
  // Asynchronously mint real JWT for seamless cryptographic session update
  switchDemoPersonaJwt(persona).catch((err) => {
    console.debug("Auto JWT mint on persona switch deferred:", err.message);
  });
}

export function getAuthHeader() {
  const jwt = getStoredJwt();
  if (jwt) {
    return "Bearer " + jwt;
  }
  const personaKey = getActivePersona();
  const info = PERSONAS[personaKey];
  if (info) {
    return "Basic " + btoa(`${info.username}:${info.password}`);
  }
  return "Basic " + btoa("sarah_compliance:password123");
}

export function getStoredJwt() {
  return (
    localStorage.getItem("foureyes_jwt_token") ||
    localStorage.getItem("runestone_jwt_token") ||
    localStorage.getItem("jwt")
  );
}

export function clearStoredJwt() {
  localStorage.removeItem("foureyes_jwt_token");
  localStorage.removeItem("runestone_jwt_token");
  localStorage.removeItem("jwt");
  localStorage.removeItem("foureyes_user_profile");
  localStorage.removeItem("runestone_user_profile");
}

export function getStoredUserProfile() {
  try {
    const raw =
      localStorage.getItem("foureyes_user_profile") ||
      localStorage.getItem("runestone_user_profile") ||
      localStorage.getItem("accountInfo");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function ensureAuthenticatedSession() {
  const existingToken = getStoredJwt();
  if (existingToken) {
    return existingToken;
  }
  const persona = getActivePersona() || "alice";
  try {
    const data = await switchDemoPersonaJwt(persona);
    return data?.token || null;
  } catch (err) {
    console.debug("Silent session bootstrap deferred:", err.message);
    return null;
  }
}

export function getDecodedJwtClaims() {
  const token = getStoredJwt();
  if (!token) return null;
  try {
    let payload = token.split(".")[1];
    if (!payload) return null;
    payload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const pad = payload.length % 4;
    if (pad) payload += "=".repeat(4 - pad);
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

