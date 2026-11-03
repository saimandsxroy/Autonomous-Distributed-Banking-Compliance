import { apiRequest } from "./api";

export async function loginUser(email, password) {
  // Call /auth/login for stateless enterprise JWT
  let response;
  try {
    const res = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernameOrEmail: email, password }),
    });
    if (res.ok) {
      const data = await res.json();
      const token = data.token;
      localStorage.setItem("runestone_jwt_token", token);
      localStorage.setItem("jwt", token);
      localStorage.setItem("runestone_user_profile", JSON.stringify(data));
      localStorage.setItem("accountInfo", JSON.stringify(data));
      localStorage.setItem("runestone_active_persona", data.username);
      return { jwt: token, accountInfo: data };
    }
  } catch (err) {
    console.warn("Falling back to legacy login endpoint:", err);
  }

  // Fallback to legacy endpoint if /auth/login fails
  response = await apiRequest("/api/v1/user/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (response.jwt) {
    localStorage.setItem("jwt", response.jwt);
    localStorage.setItem("runestone_jwt_token", response.jwt);
    localStorage.setItem("accountInfo", JSON.stringify(response.accountInfo));
    localStorage.setItem("runestone_user_profile", JSON.stringify(response.accountInfo));
  }

  return response;
}

export function logoutUser() {
  localStorage.removeItem("jwt");
  localStorage.removeItem("runestone_jwt_token");
  localStorage.removeItem("accountInfo");
  localStorage.removeItem("runestone_user_profile");
}

export function getToken() {
  return localStorage.getItem("runestone_jwt_token") || localStorage.getItem("jwt");
}

export function getStoredAccountInfo() {
  const stored = localStorage.getItem("runestone_user_profile") || localStorage.getItem("accountInfo");
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
    if (!payload) return null;
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
  const expiry = getTokenExpiry();
  if (!expiry) return false; // If no exp claim or basic auth fallback, treat as valid
  return getTimeUntilExpiry() <= 0;
}
