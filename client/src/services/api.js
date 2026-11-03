const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("jwt");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("jwt");
      localStorage.removeItem("accountInfo");
      window.location.href = "/login";
      throw new Error("Session expired. Please log in again.");
    }

    const errorBody = await response.json().catch(() => null);
    const message =
      errorBody?.responseMessage ||
      errorBody?.message ||
      errorBody?.error ||
      (response.status === 403
        ? "403 Forbidden: Insufficient permissions for this action. Switch persona to Sarah Connor (Lead Compliance Officer)."
        : `Request failed with status ${response.status}`);
    throw new Error(message);
  }

  return response.json();
}

