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
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify({ usernameOrEmail, password }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Invalid username or password");
  }
  if (data.token) {
    localStorage.setItem("foureyes_jwt_token", data.token);
    localStorage.setItem("runestone_jwt_token", data.token);
    localStorage.setItem("jwt", data.token);
    localStorage.setItem("foureyes_user_profile", JSON.stringify(data));
    localStorage.setItem("runestone_user_profile", JSON.stringify(data));
    localStorage.setItem("accountInfo", JSON.stringify(data));
    localStorage.setItem("foureyes_active_persona", data.username);
    localStorage.setItem("runestone_active_persona", data.username);
    window.dispatchEvent(
      new CustomEvent("runestone_persona_changed", { detail: data.username })
    );
    window.dispatchEvent(
      new CustomEvent("foureyes_persona_changed", { detail: data.username })
    );
  }
  return data;
}

/** POST /auth/demo-switch/{personaUsername} — 1-click cryptographic demo persona swap */
export async function switchDemoPersonaJwt(personaUsername) {
  const response = await fetch(`${API_BASE_URL}/auth/demo-switch/${personaUsername}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Failed to switch to persona ${personaUsername}`);
  }
  if (data.token) {
    localStorage.setItem("foureyes_jwt_token", data.token);
    localStorage.setItem("runestone_jwt_token", data.token);
    localStorage.setItem("jwt", data.token);
    localStorage.setItem("foureyes_user_profile", JSON.stringify(data));
    localStorage.setItem("runestone_user_profile", JSON.stringify(data));
    localStorage.setItem("accountInfo", JSON.stringify(data));
    localStorage.setItem("foureyes_active_persona", data.username);
    localStorage.setItem("runestone_active_persona", data.username);
    window.dispatchEvent(
      new CustomEvent("runestone_persona_changed", { detail: data.username })
    );
    window.dispatchEvent(
      new CustomEvent("foureyes_persona_changed", { detail: data.username })
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
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
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
    "X-Requested-With": "XMLHttpRequest",
    Authorization: getAuthHeader(),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !options._retry) {
    const persona = getActivePersona();
  }

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
  try {
    return await treasuryFetch("/journal");
  } catch (e) {
    if (e?.status === 404) {
      return [];
    }
    throw e;
  }
}

/** GET /compliance/audit-logs Returns SHA-256 hash chained logs with verification */
export async function fetchComplianceAuditLogs() {
  return await treasuryFetch("/compliance/audit-logs");
}

/** POST /compliance/demo/seed-aml-scenarios Seeds 3-hop ring & triggers AI detective */
export async function seedDemoAmlScenario() {
  return await treasuryFetch("/compliance/demo/seed-aml-scenarios", {
    method: "POST",
  });
}

/** GET /compliance/investigations Returns all AI AML investigations */
export async function fetchAmlInvestigations() {
  return await treasuryFetch("/compliance/investigations");
}

/** GET /compliance/investigations/hold/{holdId} */
export async function fetchAmlInvestigationByHold(holdId) {
  return await treasuryFetch(`/compliance/investigations/hold/${holdId}`);
}

/** GET /compliance/approvals/pending Returns HITL approval queue */
export async function fetchPendingApprovals() {
  return await treasuryFetch("/compliance/approvals/pending");
}

/** POST /compliance/approvals/{id}/approve (with fallback to /compliance/approvals/id/{id}/approve) */
export async function approveHitlRequest(
  id,
  reviewerUserName,
  notes = "Approved by compliance lead",
  action = "RELEASE"
) {
  try {
    return await treasuryFetch(`/compliance/approvals/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ reviewerUserName, notes, action }),
    });
  } catch (err) {
    if (err?.status === 404 || err?.message?.includes("404") || err?.message?.includes("ROUTE_NOT_FOUND")) {
      return await treasuryFetch(`/compliance/approvals/id/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ reviewerUserName, notes, action }),
      });
    }
    throw err;
  }
}

/** POST /compliance/approvals/{id}/reject (with fallback to /compliance/approvals/id/{id}/reject) */
export async function rejectHitlRequest(
  id,
  reviewerUserName,
  notes = "Rejected after compliance review"
) {
  try {
    return await treasuryFetch(`/compliance/approvals/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reviewerUserName, notes }),
    });
  } catch (err) {
    if (err?.status === 404 || err?.message?.includes("404") || err?.message?.includes("ROUTE_NOT_FOUND")) {
      return await treasuryFetch(`/compliance/approvals/id/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reviewerUserName, notes }),
      });
    }
    throw err;
  }
}

/** GET /compliance/mcp/invocations/{investigationId} */
export async function fetchMcpInvocations(investigationId) {
  return await treasuryFetch(
    `/compliance/mcp/invocations/${investigationId}`
  );
}

/** GET /compliance/graph/account/{accountId} 5-hop recursive CTE subgraph */
export async function fetchAccountGraph(accountId) {
  return await treasuryFetch(`/compliance/graph/account/${accountId}`);
}

/** GET /compliance/policies Returns all regulatory policy chunks */
export async function fetchAllPolicies() {
  return await treasuryFetch("/compliance/policies");
}

/** GET /compliance/policies/search?query=...&topK=... RAG semantic search */
export async function searchPolicies(query, topK = 4) {
  const encoded = encodeURIComponent(query);
  return await treasuryFetch(
    `/compliance/policies/search?query=${encoded}&topK=${topK}`
  );
}

/** GET /admin/dlq Quarantined DLQ events */
export async function fetchDlqEvents() {
  return await treasuryFetch("/admin/dlq");
}

/** POST /admin/dlq/replay/{id} SRE DLQ replay */
export async function replayDlqEvent(id) {
  return await treasuryFetch(`/admin/dlq/replay/${id}`, {
    method: "POST",
  });
}

/* =====================================================================
   Phase 7: Multi-Currency FX & Bulk Settlement Batch Endpoints
   ===================================================================== */

/** GET /fx/rates Returns list of supported FX rate pairs and spread bps */
export async function fetchFxRates() {
  return await treasuryFetch("/fx/rates");
}

/** GET /fx/quote?from=...&to=...&amount=... Calculates live FX quote with fee */
export async function fetchFxQuote(from, to, amount) {
  return await treasuryFetch(
    `/fx/quote?from=${encodeURIComponent(from)}&to=${encodeURIComponent(
      to
    )}&amount=${encodeURIComponent(amount)}`
  );
}

/** GET /batch Returns historical settlement batches */
export async function fetchSettlementBatches() {
  return await treasuryFetch("/batch");
}

/** GET /batch/id/{batchId} Returns batch details and reconciliation items */
export async function fetchSettlementBatchById(batchId) {
  return await treasuryFetch(`/batch/id/${batchId}`);
}

/** POST /batch/upload Accepts JSON payload with fileName, sourceAccountId, csvContent or items */
export async function uploadBatchJson(payload) {
  return await treasuryFetch("/batch/upload", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** POST /batch/upload Accepts multipart file upload */
export async function uploadBatchFile(file, sourceAccountId) {
  const formData = new FormData();
  formData.append("file", file);
  if (sourceAccountId) {
    formData.append("sourceAccountId", sourceAccountId.toString());
  }

  const headers = {
    Authorization: getAuthHeader(),
  };

  const response = await fetch(`${API_BASE_URL}/batch/upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    let errorDetail = `HTTP ${response.status}: ${text}`;
    if (response.status === 409) {
      errorDetail = "Duplicate batch upload rejected: File hash has already been processed.";
    }
    const err = new Error(errorDetail);
    err.status = response.status;
    throw err;
  }
  return await response.json();
}

/** POST /batch/demo/generate-sample-batch 1-click execution of 15-row payroll batch */
export async function runSampleBatch() {
  return await treasuryFetch("/batch/demo/generate-sample-batch", {
    method: "POST",
  });
}

/* =====================================================================
   Phase 8: FinCEN SAR PDF, Webhook Gateway & Live SSE Endpoints
   ===================================================================== */

/** GET /compliance/investigations/hold/{holdId}/export-sar-pdf Downloads official FinCEN SAR filing PDF */
export async function downloadSarPdf(holdId) {
  const headers = {
    Authorization: getAuthHeader(),
  };
  const response = await fetch(`${API_BASE_URL}/compliance/investigations/hold/${holdId}/export-sar-pdf`, {
    headers,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`PDF Export failed (${response.status}): ${text}`);
  }
  return await response.blob();
}

/** Generates signed test payload and submits to POST /webhooks/inbound/swift-rail */
export async function sendTestWebhook(options = {}) {
  const opts = typeof options === "boolean" ? { tamper: options } : options;
  const {
    tamper = false,
    expired = false,
    eventId = "evt-swift-rail-test-99",
    eventType = "WIRE_DEPOSIT",
    targetAccountId = "1",
    amount = "5000.00",
    currency = "USD",
  } = opts;

  const testSigned = await treasuryFetch("/webhooks/test-inbound-signed", {
    method: "POST",
    body: JSON.stringify({
      tamper,
      expired,
      eventId,
      eventType,
      targetAccountId,
      amount,
      currency,
    }),
  });

  const headers = {
    "Content-Type": "application/json",
    "X-RuneStone-Timestamp": String(testSigned.timestamp),
    "X-RuneStone-Signature": testSigned.signature,
  };

  const inboundRes = await fetch(`${API_BASE_URL}/webhooks/inbound/swift-rail`, {
    method: "POST",
    headers,
    body: testSigned.payload,
  });

  let data;
  try {
    data = await inboundRes.json();
  } catch {
    data = { statusText: inboundRes.statusText };
  }

  return {
    httpStatus: inboundRes.status,
    response: data,
    signedPayload: testSigned,
  };
}

/** GET /webhooks/deliveries Returns log of webhook inbound/outbound deliveries */
export async function fetchWebhookDeliveries() {
  return await treasuryFetch("/webhooks/deliveries");
}

/** Connects to live SSE stream GET /stream/events */
export function createEventSource() {
  return new EventSource("/stream/events");
}

/* =====================================================================
   Phase 11 & 12: EOD Reconciliation & Maker-Checker Corporate Wires
   ===================================================================== */

/** POST /reconciliation/run-statement?simulateAnomalies=... */
export async function runEodStatement(simulateAnomalies = false, externalLines = null) {
  const url = `/reconciliation/run-statement?simulateAnomalies=${simulateAnomalies}`;
  return await treasuryFetch(url, {
    method: "POST",
    body: externalLines ? JSON.stringify(externalLines) : undefined,
  });
}

/** GET /reconciliation/runs */
export async function fetchReconciliationRuns() {
  return await treasuryFetch("/reconciliation/runs");
}

/** GET /reconciliation/runs/{runId}/discrepancies */
export async function fetchReconciliationDiscrepancies(runId) {
  return await treasuryFetch(`/reconciliation/runs/${runId}/discrepancies`);
}

/** POST /reconciliation/discrepancies/id/{discrepancyId}/resolve */
export async function resolveDiscrepancy(discrepancyId, notes = "") {
  return await treasuryFetch(`/reconciliation/discrepancies/id/${discrepancyId}/resolve`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
}

/** POST /corporate-wires */
export async function submitCorporateWire(wireDto) {
  return await treasuryFetch("/corporate-wires", {
    method: "POST",
    body: JSON.stringify(wireDto),
  });
}

/** POST /corporate-wires/id/{wireId}/approve */
export async function approveCorporateWire(wireId, notes = "") {
  return await treasuryFetch(`/corporate-wires/id/${wireId}/approve`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
}

/** GET /corporate-wires */
export async function fetchCorporateWires() {
  return await treasuryFetch("/corporate-wires");
}

/** GET /compliance/metrics/telemetry */
export async function fetchTelemetryMetrics() {
  return await treasuryFetch("/compliance/metrics/telemetry");
}





