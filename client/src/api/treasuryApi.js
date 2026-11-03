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
