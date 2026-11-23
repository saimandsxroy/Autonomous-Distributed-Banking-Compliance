import { getAuthHeader, getApiBaseUrl } from "../api/treasuryApi";

export async function apiRequest(endpoint, options = {}) {
  const token =
    localStorage.getItem("foureyes_jwt_token") ||
    localStorage.getItem("runestone_jwt_token") ||
    localStorage.getItem("jwt");

  const headers = {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    try {
      headers["Authorization"] = getAuthHeader();
    } catch {
      // Ignore if auth header cannot be computed
    }
  }

  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("foureyes_jwt_token");
      localStorage.removeItem("runestone_jwt_token");
      localStorage.removeItem("jwt");
      localStorage.removeItem("accountInfo");
      throw new Error("Session unauthorized or expired.");
    }

    const errorBody = await response.json().catch(() => null);
    const message =
      errorBody?.responseMessage ||
      errorBody?.message ||
      errorBody?.error ||
      (response.status === 403
        ? "403 Forbidden: Insufficient clearance. Switch persona to Sarah Connor (Lead Compliance Officer) or an authorized Officer."
        : `Request failed with status ${response.status}`);
    throw new Error(message);
  }

  return response.json();
}

