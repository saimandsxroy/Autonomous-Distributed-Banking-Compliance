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
  if (info && info.role) {
    return info.role.split(",").map((r) => r.trim());
  }
  return ["ROLE_USER"];
}

export function isOfficerRole() {
  const roles = getUserRoles();
  return roles.some(
    (r) =>
      r.includes("COMPLIANCE") ||
      r.includes("ADMIN") ||
      r === "ROLE_COMPLIANCE_OFFICER" ||
      r === "ROLE_ADMIN"
  );
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

/** POST /auth/login — authenticates with credentials, generates and stores stateless JWT */
export async function loginWithCredentials(usernameOrEmail, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernameOrEmail, password }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Invalid username or password");
  }
  if (data.token) {
    localStorage.setItem("runestone_jwt_token", data.token);
    localStorage.setItem("jwt", data.token);
    localStorage.setItem("runestone_user_profile", JSON.stringify(data));
    localStorage.setItem("runestone_active_persona", data.username);
    window.dispatchEvent(
      new CustomEvent("runestone_persona_changed", { detail: data.username })
    );
  }
  return data;
}

/** POST /auth/demo-switch/{personaUsername} — 1-click cryptographic demo persona swap */
export async function switchDemoPersonaJwt(personaUsername) {
  const response = await fetch(`${API_BASE_URL}/auth/demo-switch/${personaUsername}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Failed to switch to persona ${personaUsername}`);
  }
  if (data.token) {
    localStorage.setItem("runestone_jwt_token", data.token);
    localStorage.setItem("jwt", data.token);
    localStorage.setItem("runestone_user_profile", JSON.stringify(data));
    localStorage.setItem("runestone_active_persona", data.username);
    window.dispatchEvent(
      new CustomEvent("runestone_persona_changed", { detail: data.username })
    );
  }
  return data;
}

/** POST /auth/login — legacy alias for backward compatibility */
export async function login(username, password) {
  return loginWithCredentials(username, password);
}

/** POST /public/create-user — registers a new corporate user with BCrypt password hashing */
export async function registerUser({ userName, email, password }) {
  const response = await fetch(`${API_BASE_URL}/public/create-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userName, username: userName, email, password }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Registration failed. User may already exist.");
  }
  return await response.json();
}

/* =====================================================================
   Base Fetch Wrapper with Error Handling
   ===================================================================== */

async function treasuryFetch(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: getAuthHeader(),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson?.message) {
        errorDetail = errJson.message;
      } else if (errJson?.error) {
        errorDetail = errJson.error;
      }
    } catch {
      const text = await response.text().catch(() => "");
      if (text) errorDetail = text;
    }
    const err = new Error(errorDetail);
    err.status = response.status;
    throw err;
  }

  // Handle 204 or empty bodies
  if (response.status === 204) {
    return {};
  }

  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

/* =====================================================================
   Treasury & Compliance Endpoints
   ===================================================================== */

/** GET /account Returns accounts belonging to current logged in persona */
export async function fetchUserAccounts() {
  try {
    return await treasuryFetch("/account");
  } catch (e) {
    if (e?.status === 404) {
      return [];
    }
    throw e;
  }
}

/** GET /account/all Returns all treasury accounts in the institution */
export async function fetchAllTreasuryAccounts() {
  try {
    return await treasuryFetch("/account/all");
  } catch (e) {
    if (e?.status === 404) {
      return await fetchUserAccounts().catch(() => []);
    }
    throw e;
  }
}

/** POST /account Creates a new treasury account with initial liquidity */
export async function createTreasuryAccount(accountData) {
  return await treasuryFetch("/account", {
    method: "POST",
    body: JSON.stringify(accountData),
  });
}

/** POST /journal Creates a double-entry transfer with idempotency & AML checks */
export async function createJournalTransfer(entry, idempotencyKey) {
  return await treasuryFetch("/journal", {
    method: "POST",
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      currency: "USD",
      referenceType: "TRANSFER",
      idempotencyKey: idempotencyKey,
      ...entry,
    }),
  });
}

/** GET /journal Returns journal entries for current user */
export async function fetchUserJournalEntries() {
