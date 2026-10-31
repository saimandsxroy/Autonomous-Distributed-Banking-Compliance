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
}

export function getAuthHeader() {
  const jwt = getStoredJwt();
  if (jwt) {
    return "Bearer " + jwt;
  }
  const personaKey = getActivePersona();
  const info = PERSONAS[personaKey];
  return "Basic " + btoa(`${info.username}:${info.password}`);
}

export function getStoredJwt() {
  return localStorage.getItem("runestone_jwt_token");
}

export function clearStoredJwt() {
  localStorage.removeItem("runestone_jwt_token");
}

/** POST /auth/login — authenticates and stores JWT token */
export async function login(username, password) {
  const response = await fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json();
  if (response.ok && data.token) {
    localStorage.setItem("runestone_jwt_token", data.token);
  }
  return data;
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

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson?.error) {
        errorDetail = errJson.error;
      } else if (errJson?.message) {
        errorDetail = errJson.message;
      }
    } catch {
      const text = await response.text().catch(() => "");
      if (text) errorDetail = text;
    }
    if (response.status === 403) {
      errorDetail =
        "403 Forbidden: Only Compliance Officers can access compliance dossiers and approve AML freezes. Please switch persona to Sarah Connor in the Persona Switcher.";
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

/** POST /compliance/approvals/{id}/approve */
export async function approveHitlRequest(
  id,
  reviewerUserName,
  notes = "Approved by compliance lead"
) {
  return await treasuryFetch(`/compliance/approvals/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ reviewerUserName, notes }),
  });
}

/** POST /compliance/approvals/{id}/reject */
export async function rejectHitlRequest(
  id,
  reviewerUserName,
  notes = "Rejected after compliance review"
) {
  return await treasuryFetch(`/compliance/approvals/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reviewerUserName, notes }),
  });
}

/** GET /compliance/mcp/invocations/{investigationId} */
export async function fetchMcpInvocations(investigationId) {
  return await treasuryFetch(
    `/compliance/mcp/invocations/${investigationId}`
  );
}

/** GET /compliance/graph/{accountId} 5-hop recursive CTE subgraph */
export async function fetchAccountGraph(accountId) {
  return await treasuryFetch(`/compliance/graph/${accountId}`);
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

  const response = await fetch("/batch/upload", {
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
  const response = await fetch(`/compliance/investigations/hold/${holdId}/export-sar-pdf`, {
    headers,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`PDF Export failed (${response.status}): ${text}`);
  }
  return await response.blob();
}

/** Generates signed test payload and submits to POST /webhooks/inbound/swift-rail */
export async function sendTestWebhook(tamper = false, expired = false) {
  const testSigned = await treasuryFetch("/webhooks/test-inbound-signed", {
    method: "POST",
    body: JSON.stringify({ tamper, expired }),
  });

  const headers = {
    "Content-Type": "application/json",
    "X-RuneStone-Timestamp": testSigned.timestamp,
    "X-RuneStone-Signature": testSigned.signature,
  };

  const inboundRes = await fetch("/webhooks/inbound/swift-rail", {
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





