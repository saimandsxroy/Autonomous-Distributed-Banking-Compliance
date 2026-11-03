/**
 * Enterprise Treasury & AML Compliance API Client
 * RuneStone Bank Treasury System (Standard JavaScript ES6)
 */

export const PERSONAS = {
  sarah_compliance: {
    username: "sarah_compliance",
    password: "password123",
    displayName: "Sarah Connor (Lead Compliance Officer)",
    role: "ADMIN, COMPLIANCE_OFFICER",
    email: "sarah@runestone.com",
  },
  alice: {
    username: "alice",
    password: "password123",
    displayName: "Alice Smith (Treasury Client)",
    role: "USER",
    accountId: 1,
    email: "alice@runestone.com",
  },
  bob: {
    username: "bob",
    password: "password123",
    displayName: "Bob Jones (Trading Counterparty)",
    role: "USER",
    accountId: 2,
    email: "bob@runestone.com",
  },
  charlie: {
    username: "charlie",
    password: "password123",
    displayName: "Charlie Day (Escrow Counterparty)",
    role: "USER",
    accountId: 3,
    email: "charlie@runestone.com",
  },
};

export const DEMO_PERSONAS = PERSONAS;

const PERSONA_STORAGE_KEY = "runestone_active_persona";

export function getActivePersona() {
  const stored = localStorage.getItem(PERSONA_STORAGE_KEY);
  if (stored && PERSONAS[stored]) {
    return stored;
  }
  return "sarah_compliance";
}

export function setActivePersona(persona) {
  localStorage.setItem(PERSONA_STORAGE_KEY, persona);
  window.dispatchEvent(
    new CustomEvent("runestone_persona_changed", { detail: persona })
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
  return localStorage.getItem("runestone_jwt_token") || localStorage.getItem("jwt");
}

export function clearStoredJwt() {
  localStorage.removeItem("runestone_jwt_token");
  localStorage.removeItem("jwt");
  localStorage.removeItem("runestone_user_profile");
}

export function getStoredUserProfile() {
  try {
    const raw = localStorage.getItem("runestone_user_profile");
    return raw ? JSON.parse(raw) : null;
  } catch {
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

export function getUserRoles() {
  const profile = getStoredUserProfile();
  if (profile && profile.roles && Array.isArray(profile.roles)) {
    return profile.roles;
  }
  const claims = getDecodedJwtClaims();
  if (claims && claims.roles && Array.isArray(claims.roles)) {
    return claims.roles;
  }
  const personaKey = getActivePersona();
  const info = PERSONAS[personaKey];
