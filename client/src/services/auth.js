import { apiRequest } from "./api";

export async function loginUser(email, password) {
  const response = await apiRequest("/api/v1/user/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (response.jwt) {
    localStorage.setItem("jwt", response.jwt);
    localStorage.setItem("accountInfo", JSON.stringify(response.accountInfo));
  }

  return response;
}

export function logoutUser() {
  localStorage.removeItem("jwt");
  localStorage.removeItem("accountInfo");
}

export function getToken() {
  return localStorage.getItem("jwt");
}

export function getStoredAccountInfo() {
  const stored = localStorage.getItem("accountInfo");
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return !!getToken() && !isTokenExpired();
}

/**
 * Decode the JWT payload and read the `exp` claim (seconds since epoch).
 * Returns null if the token is missing or malformed.
 */
export function getTokenExpiry() {
  const token = getToken();
  if (!token) return null;

  try {
    let payload = token.split(".")[1];
    // Convert Base64Url to standard Base64
    payload = payload.replace(/-/g, "+").replace(/_/g, "/");
    // Add padding if needed
    const pad = payload.length % 4;
    if (pad) {
      payload += "=".repeat(4 - pad);
    }

    const decoded = JSON.parse(atob(payload));
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : null; // convert to ms
  } catch {
    return null;
  }
}

/**
 * Returns the number of milliseconds until the JWT expires.
 * Negative values mean the token is already expired.
 */
export function getTimeUntilExpiry() {
  const expiry = getTokenExpiry();
  if (!expiry) return -1;
  return expiry - Date.now();
}

export function isTokenExpired() {
  return getTimeUntilExpiry() <= 0;
}

